# Deploying the Klenz website

The site runs as **one container** built from the [Dockerfile](Dockerfile). It builds the React site and starts FastAPI, which serves the website, the admin (`/admin`) and the API (`/api`) on one address. It needs one **MySQL** database. Nothing is saved on the server's disk: products, enquiries, page text and settings live in MySQL, and the photos and videos are part of the build (`frontend/public`).

- Code: https://github.com/manojb08/Klenz (branch `main`)
- Host: **[Railway](https://railway.com)**. It builds the Dockerfile straight from GitHub, runs MySQL, gives a free `https://….up.railway.app` address with HTTPS, and redeploys by itself after every `git push`. The trial credit covers the review stage; the live site needs the Hobby plan (about US$5 a month, see [railway.com/pricing](https://railway.com/pricing)).

## Stage 1: review link for the client (one time, about 20 minutes)

1. Sign in at [railway.com](https://railway.com) with the GitHub account **manojb08**.
2. **New Project → Deploy from GitHub repo → manojb08/Klenz.** If asked, let Railway's GitHub app see the repo. The first deployment crashes because there is no database yet; that is expected.
3. Add the database: **+ Create → Database → MySQL**.
4. Open the **Klenz** service (the one from GitHub) → **Variables** and add:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{MySQL.MYSQL_URL}}` (Railway fills in the database address) |
   | `SECRET_KEY` | a long random text. Make one with `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
   | `ADMIN_EMAIL` | the admin login, e.g. `admin@klenz.com` |
   | `ADMIN_PASSWORD` | a strong password, not the one on your PC |
   | `PORT` | `8000` |
   | `SEED_SAMPLE_DATA` | `true` adds three sample enquiries so the admin looks real in the demo; `false` starts empty |

   Click **Deploy** to apply the changes. `ADMIN_*` and `SEED_SAMPLE_DATA` are only used while the database is empty (first start).
5. **Settings → Networking → Generate Domain**, port `8000`. This is the link for the client, e.g. `https://klenz-production.up.railway.app`.
6. **Settings → Deploy → Healthcheck Path:** `/api/health`. Railway then switches to a new version only after it has started properly.
7. When the deployment shows **Active**, open the link and check the home page, an order, and `/admin`.
8. Send the client the link. Orders open WhatsApp to the number in **Admin → Settings** (the client's +91 90873 12905), so the client receives the test orders they place. Put your own number there while you test yourself.

## Updating the site after feedback (every time)

- **Text, products, photos, videos, contact details:** change them in the live admin (`/admin`). No deploy needed; the site changes at once.
- **Design or code changes:**
  1. Make the change and check it on your PC (`start-dev.cmd`, http://localhost:5173).
  2. Run the checks: in `backend` `.venv\Scripts\python -m pytest`; in `frontend` `npm run build` and `npm run lint`.
  3. Commit and push from this folder:
     ```bat
     git add -A
     git commit -m "Short description of the change"
     git push
     ```
  4. Railway builds and switches to the new version in a few minutes (**Deployments** tab). If a build fails, the old version keeps running and the log shows why. The database (products, enquiries, admin edits) is not touched.

A deploy does **not** change:
- **Starter data.** `seed.py` (products, videos, page text) is copied into the database only on the first start. After that the live admin is the source of truth: editing `seed.py`, or a default text in `content_schema.py`, does not change the live site, so make that change in the admin. A new text field added to `content_schema.py` does appear, with its default text.
- **Database columns.** A new column (for example a new product field) is not added to an existing database. Run the `ALTER TABLE` on the live database before pushing the code (see [Live database](#live-database)).

## Stage 2: go live

1. Finish the client's changes as above.
2. Move Railway to the **Hobby** plan before the trial credit runs out.
3. Buy the domain (for example from GoDaddy, Hostinger or Namecheap).
4. Railway → Klenz service → **Settings → Networking → Custom Domain** → `www.yourdomain.com`. Add the DNS records Railway shows (a CNAME, plus a TXT record if it asks) at the domain provider. HTTPS is automatic; DNS can take a few hours. In the provider's panel, forward `yourdomain.com` to `www.yourdomain.com`.
5. Before announcing the site:
   - **Admin → Settings:** change the admin password; check the WhatsApp number, phones, email, address (PIN **642001** on the visiting card, **642002** in the catalogue) and opening hours.
   - **Admin → Page content:** replace the About Us placeholder text.
   - **Admin → Enquiries:** delete the "Sample …" and test enquiries.
   - Place one order from a phone and check the WhatsApp message.
   - **Railway → MySQL → Backups:** turn on backups.

## Settings (environment variables)

| Variable | When | What it does |
|---|---|---|
| `DATABASE_URL` | always | MySQL address. `mysql://…` (Railway) and `mysql+pymysql://…?charset=utf8mb4` both work. |
| `SECRET_KEY` | always | Signs admin logins; changing it signs everyone out. Without it a new key is made on every deploy and the admin must sign in again. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | first start | The first admin account. With no password, one is generated and printed in the deploy log. |
| `SEED_SAMPLE_DATA` | first start | `true` adds the three sample enquiries. |
| `PORT` | always | Port the app listens on (default 8000). |
| `MAX_ORDERS_PER_HOUR` | optional | Orders allowed per visitor per hour (default 20). |
| `CORS_ORIGINS` | optional | Only if the website is ever hosted on a different domain than the API. |

## Live database

Railway → MySQL service → **Settings → Networking**: turn on public access. `MYSQL_PUBLIC_URL` then appears in the MySQL service's **Variables**; use it with any MySQL client (MySQL Workbench, HeidiSQL). Turn public access off again when you are done.

**Lost admin password:** with public access on, in Command Prompt from `backend`:

```bat
set DATABASE_URL=<MYSQL_PUBLIC_URL>
.venv\Scripts\python -m app.cli set-password admin@klenz.com
```

## Other hosts

The Dockerfile runs anywhere that runs containers (Render, DigitalOcean, a VPS with Docker). Give it the variables above, a MySQL 5.5+ database (8.x recommended) and HTTPS in front. To check that the image builds the way Railway builds it: `docker build -t klenz .` (needs Docker Desktop).
