# Deploying the Klenz website

The site is hosted for free:

| Part | Service | Plan |
|---|---|---|
| Code and automatic deploys | GitHub + GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) | Free (public repo) |
| Website, admin and API | Render web service ([render.yaml](render.yaml), built from the [Dockerfile](Dockerfile)) | Free, address like `https://klenz.onrender.com` |
| MySQL database | Aiven for MySQL | Free: 1 GB, backups included |

Every push to `main` runs the checks in GitHub Actions: backend tests (on SQLite, and on MySQL 8.4 set up as strictly as Aiven), website lint and build, and the Docker image. If they pass, Actions tells Render to deploy exactly that commit and waits until it is live. If anything fails, nothing is deployed and the site keeps the previous version.

Limits of the free plans:
- **Render puts the site to sleep after 15 minutes without visitors.** The next visitor waits about a minute while it wakes up. Tell the client.
- **Aiven may switch off a free database it sees as unused.** It emails first; switch it back on in the Aiven console.
- **GitHub Pages can't be used.** GitHub does not allow online shops or password logins on Pages, and Pages cannot run the Python API or MySQL.

## One-time setup (about 30 minutes)

### 1. Database: Aiven
1. Sign up at https://console.aiven.io (no card needed).
2. **Create service → MySQL → Free plan.** Pick the region nearest to India that the free plan offers, name it `klenz-mysql`, and create it.
3. When it shows **Running**, copy the **Service URI** from its Overview page. It looks like `mysql://avnadmin:…@….aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED`. Keep it secret.

Do step 2 right away: Aiven may switch off a new free database that nothing connects to in its first hours.

### 2. Website: Render
1. Sign up at https://render.com with the GitHub account **manojb08**.
2. **New → Blueprint** → choose `manojb08/Klenz`. Render reads `render.yaml` and asks for two values:
   - `DATABASE_URL`: the Aiven Service URI
   - `ADMIN_PASSWORD`: a strong password for `/admin` (the login is `admin@klenz.com`)
3. Click **Apply**. The first build takes 5–10 minutes. The address is at the top of the **klenz** service page, e.g. `https://klenz.onrender.com`. Open it and sign in at `/admin`.

### 3. Connect GitHub Actions
1. Render → **klenz** service → **Settings → Deploy Hook** → copy the URL.
2. GitHub → `manojb08/Klenz` → **Settings → Secrets and variables → Actions**:
   - **Secrets → New repository secret:** name `RENDER_DEPLOY_HOOK_URL`, value the deploy hook URL.
   - **Variables → New repository variable:** name `SITE_URL`, value the Render address (e.g. `https://klenz.onrender.com`).
3. **Actions → Test and deploy → Run workflow.** When it turns green, the site runs that commit.

### 4. Share the link
Send the client the Render address and tell them the first visit after a quiet period takes about a minute. Orders open WhatsApp to the number in **Admin → Settings** (the client's +91 90873 12905), so the client receives the test orders they place. Put your own number there while you test yourself.

## Updating the site after feedback

- **Text, products, photos, videos, contact details:** change them in the live admin (`/admin`). No deploy needed; the site changes at once.
- **Design or code changes:**
  1. Make the change and check it on your PC (`start-dev.cmd`, http://localhost:5173).
  2. Commit and push from this folder:
     ```bat
     git add -A
     git commit -m "Short description of the change"
     git push
     ```
  3. Watch it in the repo's **Actions** tab (about 10 minutes). Green means live. Red means a check or the deploy failed: open the run to see which step. The site keeps the old version.

  Pushes that only change `.md` files, `Images/` or `tools/` don't deploy.

A deploy does **not** change:
- **Starter data.** `seed.py` (products, videos, page text) is copied into the database only on the first start. After that the live admin is the source of truth: editing `seed.py`, or a default text in `content_schema.py`, does not change the live site, so make that change in the admin. A new text field added to `content_schema.py` does appear, with its default text.
- **Database columns.** A new column (for example a new product field) is not added to an existing database. Run the `ALTER TABLE` on the live database before pushing the code (see [Live database](#live-database)).

## Going live

1. Finish the client's changes as above.
2. **Own domain (optional).** Buy it (about ₹500–1,500 a year). Then Render → **klenz → Settings → Custom Domains** → add `www.yourdomain.com` and create the DNS records Render shows at your domain provider. HTTPS stays free. Change the `SITE_URL` variable to the new address.
3. **No sleeping (optional, paid).** Switch the Render service to a paid instance type, or move to Railway (about US$5 a month, see [Other hosts](#other-hosts)).
4. Before announcing the site:
   - **Admin → Settings:** change the admin password; check the WhatsApp number, phones, email, address (PIN **642001** on the visiting card, **642002** in the catalogue) and opening hours.
   - **Admin → Page content:** replace the About Us placeholder text.
   - **Admin → Enquiries:** delete the "Sample …" and test enquiries.
   - Place one order from a phone and check the WhatsApp message.

## Settings (environment variables)

Change them in Render → **klenz → Environment**; Render restarts the site.

| Variable | When | What it does |
|---|---|---|
| `DATABASE_URL` | always | MySQL link. Aiven's Service URI, Railway's `mysql://…` and `mysql+pymysql://…?charset=utf8mb4` all work. |
| `SECRET_KEY` | always | Signs admin logins (Render generates it). Changing it signs everyone out. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | first start | The first admin account. With no password, one is generated and printed in the deploy log. |
| `SEED_SAMPLE_DATA` | first start | `true` adds the three sample enquiries. |
| `PORT` | set by the host | Port the app listens on (Render uses 10000; default 8000). |
| `MAX_ORDERS_PER_HOUR` | optional | Orders allowed per visitor per hour (default 20). |
| `CORS_ORIGINS` | optional | Only if the website is ever hosted on a different domain than the API. |

## Live database

The Aiven console (**klenz-mysql → Overview**) shows the host, port, user and password. Use them in MySQL Workbench or HeidiSQL with SSL turned on.

**Lost admin password:** in Command Prompt from `backend`:

```bat
set DATABASE_URL=<Aiven Service URI>
.venv\Scripts\python -m app.cli set-password admin@klenz.com
```

## Other hosts

The Dockerfile runs on any host that runs containers. **Railway** (paid, no sleeping, about US$5 a month): **New Project → Deploy from GitHub repo → manojb08/Klenz**, add **Database → MySQL**, then set the variables `DATABASE_URL=${{MySQL.MYSQL_URL}}`, `SECRET_KEY`, `ADMIN_PASSWORD` and `PORT=8000`, and click **Settings → Networking → Generate Domain**. Railway deploys on every push by itself; its Settings also show a deploy hook if you want GitHub Actions to start the deploys.

Every Actions run also builds the image, so you don't need Docker on your PC. To build it locally anyway: `docker build -t klenz .`
