# Klenz website: project history

What was built and decided, in order, so the next round of changes can start from here. How-to guides: [README.md](README.md) (run it on your PC), [DEPLOY.md](DEPLOY.md) (hosting and updates), [CLAUDE.md](CLAUDE.md) (code map for developers and Claude Code).

## 12–13 October 2026: first version, live for the client's review

### Built from the design
- Source: the design file "Kenz Website Design.html": shop (Home, About, Contact), admin login, admin dashboard.
- React 19 + TypeScript website, Python FastAPI API, MySQL database (on this PC: WAMP MySQL 5.0).
- Admin: dashboard, products, enquiries, page text, videos and settings.
- Brand name **Klenz**, as on the logo, packaging and visiting card. Phone, WhatsApp, email and address from the visiting card.

### Client's images, every screen size
- Logo, product photos and the catalogue in `Images/` became the website images (scripts in `tools/`).
- Works on phones, tablets, desktops and TVs (checked from 390 px wide up to 4K).

### Catalogue round (client feedback)
- Only the 10 products in the catalogue (`Images/products.jpeg`), each with its pack size.
- No prices anywhere: customers send the order on WhatsApp and Klenz replies with a quote.
- One colour theme ("Ocean" blue); the theme switcher was removed.
- Product videos made from the client's photos: facial tissue, tissue napkins, rolls and folds, and a loop in the home page hero.
- Livelier home page: moving highlights strip, sections that fade in on scroll, "Ideal for" and "Your brand on every pack" sections.

### Code on GitHub
- Repository **https://github.com/manojbalu08/Klenz** (first pushed to `manojb08/Klenz`, moved on 13 October).

### Hosting (free)
- Looked at: Railway (about US$5 a month, no sleeping) and GitHub Pages (not allowed: GitHub forbids online shops and password logins there, and it cannot run Python or MySQL).
- Chosen: GitHub Actions tests every push and deploys to **Render** (free web service `klenz-tissue`, Singapore). Database on **Aiven** (free MySQL 8.4, Bangalore).
- Live for review at **https://klenz-tissue.onrender.com** since 13 October.
- Free-plan limit: the site sleeps after 15 minutes without visitors and takes about a minute to wake.

### Checks
- 28 backend tests pass on SQLite and on MySQL 8.4 set up as strictly as Aiven (encrypted connections only).
- The production build looks exactly like the version the client reviewed at phone, tablet and desktop widths.
- Live site checked: pages, the 10 products, videos, admin login page and the database connection.

### Open items
- Add the GitHub secret `RENDER_DEPLOY_HOOK_URL` and the variable `SITE_URL` ([DEPLOY.md](DEPLOY.md), step 3) so every push deploys by itself.
- From the client: PIN code (642001 on the visiting card or 642002 in the catalogue), About Us text, opening hours, their own photos and videos, and the WhatsApp number for orders.
- Before announcing the site: change the admin password if it was shared, and delete the sample and test enquiries.
- Optional: the client's own domain. `klenztissue.com` and `klenztissue.in` were free on 13 October; `klenz.com`, `klenz.in` and `pollachi.com` are taken.
