import { useEffect, useMemo, useState } from "react";
import defaultContent from "./defaultContent.js";
import AdminContentEditor from "./AdminContentEditor.jsx";

const iconClasses = {
  github: "fab fa-github",
  linkedin: "fab fa-linkedin",
  instagram: "fab fa-instagram",
};
const contactEmailEndpoint = "https://formsubmit.co/ajax/mohammadirshad9163@gmail.com";

function Icon({ name }) {
  return <i className={`fas fa-${name}`} aria-hidden="true" />;
}

function Portfolio({ content, onAdmin }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const carouselSkills = useMemo(() => [...content.skills, ...content.skills], [content.skills]);

  async function submitMessage(event) {
    event.preventDefault();
    setSending(true);
    setNotice("");

    let emailSubmitted = false;
    try {
      const emailData = new FormData();
      emailData.append("name", form.name);
      emailData.append("email", form.email);
      emailData.append("message", form.message);

      const emailResponse = await fetch(contactEmailEndpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: emailData,
      });
      const emailResult = await emailResponse.json().catch(() => null);
      if (!emailResponse.ok || !emailResult?.success || emailResult.success === "false") {
        throw new Error("We couldn't submit your message. Please try again later.");
      }
      emailSubmitted = true;

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Your message could not be sent.");
      setForm({ name: "", email: "", message: "" });
      setNotice("Your message was submitted. Thank you for reaching out.");
    } catch (error) {
      if (emailSubmitted) {
        setForm({ name: "", email: "", message: "" });
        setNotice("Your message was submitted for email delivery, but could not be saved in the admin area.");
      } else {
        setNotice(error.message || "We couldn't submit your message. Please try again later.");
      }
    } finally {
      setSending(false);
    }
  }

  function sendWhatsApp() {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setNotice("Please fill in your name, email, and message first.");
      return;
    }
    const text = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nMessage: ${form.message}`);
    window.open(`https://wa.me/${content.contactPhone}?text=${text}`, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <nav className="navbar">
        <a className="logo" href="#home">{content.brand}</a>
        <details className="mobile-menu">
          <summary className="menu-icon" aria-label="Toggle navigation"><Icon name="bars" /></summary>
          <ul className="nav-links">
            {["Home", "About", "Skills", "Projects", "Contact"].map((item) => (
              <li key={item}><a href={`#${item.toLowerCase()}`}>{item}</a></li>
            ))}
          </ul>
        </details>
        <ul className="nav-links desktop-nav">
          {["Home", "About", "Skills", "Projects", "Contact"].map((item) => (
            <li key={item}><a href={`#${item.toLowerCase()}`}>{item}</a></li>
          ))}
        </ul>
      </nav>

      <main>
        <div id="home" className="hero-wrap">
          <section className="hero">
            <div className="hero-left">
              <p className="tagline">{content.tagline}</p>
              <h1>Hi, I am <span>{content.name}</span><br />{content.headline}</h1>
              <div className="buttons">
                <a href="#contact" className="btn primary">Hire me</a>
                <a href={content.resume} className="btn outline" download>Download CV</a>
              </div>
            </div>
            <div className="hero-right">
              <div className="bg-skew" />
              <img src={content.portrait} alt={content.name} />
            </div>
          </section>
        </div>

        <section id="about" className="about-section">
          <div className="container about-grid">
            <div className="about-img"><img src={content.aboutImage} alt={`${content.name} profile`} /></div>
            <div className="about-content">
              <h5 className="section-subtitle">MY INTRODUCTION</h5>
              <h2>About Me</h2>
              <p>{content.about}</p>
              <p><em>“Design is intelligence made visible. Code brings it to life.”</em></p>
              <div className="about-details">
                {content.details.map(([label, value]) => <p key={label}><strong>{label}:</strong> {value}</p>)}
              </div>
              <div className="interests">{content.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>
            </div>
          </div>
        </section>

        <section id="skills" className="skills-section">
          <h2>My Skills</h2>
          <div className="skills-slider"><div className="skills-track">
            {carouselSkills.map((skill, index) => (
              <article className="skill-card" key={`${skill.name}-${index}`}>
                <img src={skill.image} className="skill-icon" alt="" />
                <h4>{skill.name}</h4><div className="level-label">{skill.level}</div>
              </article>
            ))}
          </div></div>
        </section>

        <section id="projects" className="projects-section">
          <h2 className="section-title">My Projects</h2>
          <div className="projects-grid">
            {content.projects.map((project) => (
              <article className="project-card" key={`${project.title}-${project.url}`}>
                <img src={project.image} alt="" />
                <div className="project-info">
                  <h3>{project.title}</h3><p>{project.technologies}</p>
                  <a href={project.url} target="_blank" rel="noreferrer">View Project</a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="contact-section">
          <div className="container">
            <h2 className="section-title">Get In Touch</h2>
            <form className="contact-form" onSubmit={submitMessage}>
              <div className="form-group"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} placeholder="Your Name" autoComplete="name" required /></div>
              <div className="form-group"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} placeholder="Your Email" autoComplete="email" required /></div>
              <div className="form-group"><textarea rows="5" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={5000} placeholder="Your Message" required /></div>
              {notice && <p className="form-notice" role="status">{notice}</p>}
              <div className="button-group">
                <button type="button" className="btn primary" onClick={sendWhatsApp}>Send WhatsApp</button>
                <button type="submit" className="btn outline" disabled={sending}>{sending ? "Sending…" : "Send Message"}</button>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-container">
          <h3>{content.brand}</h3><p>Crafting frontend experiences with code &amp; creativity.</p>
          <div className="social-icons">
            {content.social.map((item) => <a key={item.label} href={item.url} aria-label={item.label} target="_blank" rel="noreferrer"><i className={iconClasses[item.icon] || "fas fa-link"} /></a>)}
          </div>
          <p className="copyright">© {new Date().getFullYear()} {content.name}. All rights reserved.</p>
          <button className="admin-link" onClick={onAdmin}>Portfolio admin</button>
        </div>
      </footer>
    </>
  );
}

function AdminPanel({ onClose, content, onSaveContent, dbReady }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [messages, setMessages] = useState([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function checkSession() {
    try {
      const response = await fetch("/api/admin/session");
      const result = await response.json();
      if (result.authenticated) setAuthenticated(true);
    } catch { /* The login form remains available while the API is offline. */ }
  }

  async function loadMessages() {
    const response = await fetch("/api/admin/messages");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load messages.");
    setMessages(result.messages);
  }

  useEffect(() => { checkSession(); }, []);
  useEffect(() => {
    if (authenticated) loadMessages().catch((error) => setNotice(error.message));
  }, [authenticated]);

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign-in failed.");
      setAuthenticated(true);
      setPassword("");
      setNotice("Signed in.");
    } catch (error) { setNotice(error.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthenticated(false);
    setMessages([]);
  }

  return (
    <div className="admin-overlay" role="dialog" aria-modal="true" aria-labelledby="admin-title">
      <section className="admin-panel">
        <div className="admin-heading"><div><p className="section-subtitle">PRIVATE DASHBOARD</p><h2 id="admin-title">Portfolio admin</h2></div><button className="close-admin" onClick={onClose} aria-label="Close admin">×</button></div>
        {!dbReady && <p className="database-notice">MongoDB isn’t connected. Add the required Replit Secrets to enable saving and messages. Your current portfolio preview stays available.</p>}
        {!authenticated ? (
          <form className="admin-login" onSubmit={login}>
            <label htmlFor="admin-password">Admin password</label>
            <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          </form>
        ) : (
          <>
            <div className="admin-toolbar"><p>Update profile details, skills, projects, and social links. Changes are stored in MongoDB.</p><button className="btn outline" onClick={logout}>Sign out</button></div>
            <AdminContentEditor content={content} onSave={onSaveContent} dbReady={dbReady} />
            <div className="admin-messages"><h3>Contact messages ({messages.length})</h3>
              {messages.length ? messages.map((message) => (
                <article className="admin-message" key={message._id}>
                  <div><strong>{message.name}</strong><a href={`mailto:${message.email}`}>{message.email}</a></div>
                  <time>{new Date(message.createdAt).toLocaleString()}</time><p>{message.message}</p>
                </article>
              )) : <p className="empty-messages">No messages yet.</p>}
            </div>
          </>
        )}
        {notice && <p className="admin-notice" role="status">{notice}</p>}
      </section>
    </div>
  );
}

export default function App() {
  const [content, setContent] = useState(defaultContent);
  const [dbReady, setDbReady] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  useEffect(() => {
    fetch("/api/content")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "MongoDB is not configured.");
        setContent(result.content);
        setDbReady(true);
      })
      .catch(() => setDbReady(false));
  }, []);

  return (
    <>
      {!dbReady && <div className="setup-banner">Preview mode — connect MongoDB in Replit Secrets to enable content management and message storage.</div>}
      <Portfolio content={content} onAdmin={() => setAdminOpen(true)} />
      {adminOpen && <AdminPanel content={content} onSaveContent={setContent} onClose={() => setAdminOpen(false)} dbReady={dbReady} />}
    </>
  );
}
