# MERN portfolio

This project uses React for the portfolio interface, an Express/Node.js API, and MongoDB via Mongoose. The existing portfolio images and visual styling are retained.

## Run in Replit

Click **Run** to start the `Project` workflow, which runs `npm run dev` on `0.0.0.0:5000`. Vite serves the React interface through the same server as the API.

## Configure Replit Secrets

Add these values in Replit Secrets. Do not put real credentials in `.env` files or source control:

- `MONGODB_URI`: a MongoDB connection URI for an accessible MongoDB database.
- `ADMIN_PASSWORD`: a strong password for the private portfolio admin area.
- `SESSION_SECRET`: a long, random value used to sign secure admin sessions. A `SESSION_SECRET` is already available in the current workspace.

Restart the workflow after changing secrets. Without a valid MongoDB URI, the site shows the imported content in preview mode; saving content, signing in, and storing contact messages are disabled until the database is reachable.

## Admin area and data

Use **Portfolio admin** in the footer to sign in. The admin area can update the portfolio JSON and read the latest contact messages. The initial portfolio content is seeded into MongoDB on first load. Contact submissions are stored in MongoDB; they are not sent to an email address.

The project link for the portfolio now opens the GitHub profile instead of a local-only address. The browser title matches the portfolio owner.

## Production

Run `npm run build` to create the React production build. `npm start` serves the build and API. Configure all three secrets in the production environment before publishing. The Express session cookie is `httpOnly`, `SameSite=Strict`, and secure in production; login and contact endpoints are rate limited.
