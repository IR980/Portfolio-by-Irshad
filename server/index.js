import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import defaultContent from "../src/defaultContent.js";

const app = express();
const port = Number(process.env.PORT || 5000);
const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const isProduction = process.env.NODE_ENV === "production";
const mongoUri = process.env.MONGODB_URI;
const adminPassword = process.env.ADMIN_PASSWORD;
const sessionSecret = process.env.SESSION_SECRET;

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "80kb", strict: true }));

const Portfolio = mongoose.model(
  "Portfolio",
  new mongoose.Schema({
    _id: { type: String, default: "portfolio" },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: Date.now },
  }, { versionKey: false }),
);
const ContactMessage = mongoose.model(
  "ContactMessage",
  new mongoose.Schema({
    name: { type: String, required: true, maxlength: 120, trim: true },
    email: { type: String, required: true, maxlength: 254, trim: true, lowercase: true },
    message: { type: String, required: true, maxlength: 5000, trim: true },
    createdAt: { type: Date, default: Date.now, index: true },
  }, { versionKey: false }),
);

const sessionOptions = {
  name: "portfolio_admin",
  secret: sessionSecret || "unconfigured-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "strict", secure: isProduction, maxAge: 1000 * 60 * 60 * 8 },
};
if (mongoUri) {
  sessionOptions.store = MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: "portfolio_sessions",
    ttl: 60 * 60 * 8,
    autoRemove: "native",
  });
}
app.use(session(sessionOptions));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
const messageLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-8", legacyHeaders: false });
const requireAdmin = (req, res, next) => {
  if (!req.session?.admin) return res.status(401).json({ error: "Sign in to access the admin area." });
  next();
};
const databaseReady = () => Boolean(mongoUri && mongoose.connection.readyState === 1);
const databaseRequired = (req, res, next) => {
  if (!databaseReady()) return res.status(503).json({ error: "MongoDB is not connected. Add a valid MONGODB_URI Replit Secret and restart the app." });
  next();
};

function isSafeContent(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const requiredStrings = ["brand", "name", "tagline", "headline", "about", "portrait", "aboutImage", "resume"];
  if (requiredStrings.some((key) => typeof data[key] !== "string" || data[key].length > 2000)) return false;
  if (!Array.isArray(data.skills) || data.skills.length > 80) return false;
  if (!Array.isArray(data.projects) || data.projects.length > 80) return false;
  if (!Array.isArray(data.details) || data.details.length > 40) return false;
  if (!Array.isArray(data.interests) || data.interests.length > 40) return false;
  if (!Array.isArray(data.social) || data.social.length > 40) return false;
  if (typeof data.contactPhone !== "string" || !/^\d{7,15}$/.test(data.contactPhone)) return false;

  let safe = true;
  const visit = (value, depth = 0) => {
    if (depth > 8) { safe = false; return; }
    if (typeof value === "string" && value.length > 5000) safe = false;
    else if (Array.isArray(value)) {
      if (value.length > 100) safe = false;
      value.forEach((item) => visit(item, depth + 1));
    } else if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (["__proto__", "prototype", "constructor"].includes(key)) safe = false;
        visit(child, depth + 1);
      }
    } else if (typeof value === "function" || typeof value === "undefined") safe = false;
  };
  visit(data);
  const isAllowedLink = (value) => typeof value === "string" && (
    value.startsWith("/") && !value.startsWith("//") ||
    /^https:\/\/[^\s]+$/i.test(value)
  );
  if (!isAllowedLink(data.portrait) || !isAllowedLink(data.aboutImage) || !isAllowedLink(data.resume)) safe = false;
  for (const project of data.projects) {
    if (!project || typeof project.title !== "string" || typeof project.technologies !== "string" ||
        !isAllowedLink(project.url) || !isAllowedLink(project.image)) safe = false;
  }
  for (const social of data.social) {
    if (!social || typeof social.label !== "string" || !isAllowedLink(social.url)) safe = false;
  }
  for (const skill of data.skills) {
    if (!skill || typeof skill.name !== "string" || typeof skill.level !== "string" || !isAllowedLink(skill.image)) safe = false;
  }
  if (data.details.some((item) => !Array.isArray(item) || item.length !== 2 || item.some((part) => typeof part !== "string"))) safe = false;
  if (data.interests.some((interest) => typeof interest !== "string")) safe = false;
  return safe;
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: databaseReady() ? "connected" : "disconnected",
    adminConfigured: Boolean(adminPassword && sessionSecret),
  });
});

app.get("/api/content", databaseRequired, async (req, res, next) => {
  try {
    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: "portfolio" },
      { $setOnInsert: { data: defaultContent, updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ content: portfolio.data });
  } catch (error) { next(error); }
});

app.put("/api/content", databaseRequired, requireAdmin, async (req, res, next) => {
  try {
    if (!isSafeContent(req.body)) return res.status(400).json({ error: "Portfolio content is invalid. Check the required fields and project links." });
    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: "portfolio" },
      { $set: { data: req.body, updatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.json({ content: portfolio.data });
  } catch (error) { next(error); }
});

app.post("/api/messages", messageLimiter, databaseRequired, async (req, res, next) => {
  try {
    const { name, email, message } = req.body || {};
    const cleaned = {
      name: typeof name === "string" ? name.trim() : "",
      email: typeof email === "string" ? email.trim().toLowerCase() : "",
      message: typeof message === "string" ? message.trim() : "",
    };
    if (cleaned.name.length < 1 || cleaned.name.length > 120) return res.status(400).json({ error: "Enter a name under 120 characters." });
    if (cleaned.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) return res.status(400).json({ error: "Enter a valid email address." });
    if (cleaned.message.length < 1 || cleaned.message.length > 5000) return res.status(400).json({ error: "Enter a message under 5,000 characters." });
    await ContactMessage.create(cleaned);
    res.status(201).json({ message: "Message received." });
  } catch (error) { next(error); }
});

app.get("/api/admin/session", (req, res) => {
  res.json({ authenticated: Boolean(req.session?.admin) });
});

app.post("/api/admin/login", loginLimiter, databaseRequired, async (req, res, next) => {
  try {
    if (!adminPassword || !sessionSecret) {
      return res.status(503).json({ error: "Admin access is not configured. Add the ADMIN_PASSWORD and SESSION_SECRET Replit Secrets." });
    }
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const expectedHash = crypto.createHash("sha256").update(adminPassword).digest();
    const suppliedHash = crypto.createHash("sha256").update(password).digest();
    if (!crypto.timingSafeEqual(expectedHash, suppliedHash)) return res.status(401).json({ error: "Incorrect password." });
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.admin = true;
      req.session.save((saveError) => {
        if (saveError) return next(saveError);
        res.json({ authenticated: true });
      });
    });
  } catch (error) { next(error); }
});

app.post("/api/admin/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("portfolio_admin", { httpOnly: true, sameSite: "strict", secure: isProduction });
    res.json({ authenticated: false });
  });
});

app.get("/api/admin/messages", databaseRequired, requireAdmin, async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ messages });
  } catch (error) { next(error); }
});

app.use("/api", (error, req, res, next) => {
  console.error("API request failed:", error.message);
  res.status(500).json({ error: "The request could not be completed. Please try again." });
});

if (process.env.NODE_ENV !== "test") {
  if (!mongoUri) console.warn("MONGODB_URI is missing. The portfolio will start in preview mode; database features are unavailable.");
  else mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
    .then(() => console.log("Connected to MongoDB."))
    .catch((error) => console.error(`MongoDB connection failed: ${error.message}`));

  if (isProduction) {
    app.use(express.static(path.join(rootDir, "dist"), { index: false, maxAge: "1h" }));
    app.get(/.*/, (req, res) => res.sendFile(path.join(rootDir, "dist", "index.html")));
    app.listen(port, "0.0.0.0", () => console.log(`Portfolio server listening on port ${port}.`));
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      root: rootDir,
      configFile: path.join(rootDir, "vite.config.js"),
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.listen(port, "0.0.0.0", () => console.log(`Portfolio server listening on port ${port}.`));
  }
}
