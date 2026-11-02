# Running the portfolio

This imported project is a static HTML, CSS, and JavaScript website. Its existing structure and design are preserved.

## Development

Click **Run** to start the **Start application** workflow, then open Replit's web preview.

The workflow runs:

```sh
python3 -m http.server 5000 --bind 0.0.0.0
```

No package installation, build step, database, or secrets are required. Python's standard-library HTTP server is used for development only.

The entry point is `index.html`; styles are in `style.css`, and images and résumé files are in `assets/`. Refresh the preview after editing static files.

Google Fonts, Font Awesome, and ScrollReveal load from external services and require internet access.

## Existing items to review before publishing

- The contact form in `index.html` submits to an existing FormSubmit recipient. Confirm ownership and configure the intended recipient before using it to collect messages.
- One project link points to `127.0.0.1:5500`, which will not work for visitors.
- The page title still uses a different name from the visible portfolio branding.
