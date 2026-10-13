# Deploying the Klenz website

The site is hosted for free:

| Part | Service | Plan |
|---|---|---|
| Code and automatic deploys | GitHub + GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) | Free (public repo) |
| Website, admin and API | Render web service ([render.yaml](render.yaml), built from the [Dockerfile](Dockerfile)) | Free, address `https://klenz-tissue.onrender.com` |
| MySQL database | Aiven for MySQL | Free: 1 GB, backups included |

Every push to `main` runs the checks in GitHub Actions: backend tests (on SQLite, and on MySQL 8.4 set up as strictly as Aiven), website lint and build, and the Docker image. If they pass, Actions tells Render to deploy exactly that commit and waits until it is live. If anything fails, nothing is deployed and the site keeps the previous version.

## Current setup (13 October 2026)

| What | Where |
|---|---|
| Code | GitHub `manojbalu08/Klenz`, branch `main` |
| Live site | **https://klenz-tissue.onrender.com** (Render service `klenz-tissue`, free, Singapore) |
| Database | Aiven project `klenz`: MySQL 8.4, plan Free-1-1gb, DigitalOcean Bangalore |
| Admin | `/admin`, login `admin@klenz.com`; first password set in Render (`ADMIN_PASSWORD`), change it in **Admin → Settings** |
| Automatic deploys | Need the GitHub secret `RENDER_DEPLOY_HOOK_URL` and variable `SITE_URL` (step 3 below) |
| Prices, UPI, WhatsApp alerts | Set in the live admin (step 4 below). Products start with starting prices; checkout shows a sample QR until a UPI ID is saved; every order is sent to +91 95663 78152 automatically once the alerts are switched on |

Passwords and the database link are kept only in Render and Aiven, never in this repository. Project history and open items: [CHANGELOG.md](CHANGELOG.md).

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
1. Open **https://render.com/deploy?repo=https://github.com/manojbalu08/Klenz** and sign up / sign in with the GitHub account **manojbalu08**. (Or, in the Render dashboard: **New → Blueprint** → `manojbalu08/Klenz`.)
2. Render reads `render.yaml` and shows one free service, **klenz-tissue**, in Singapore. It asks for two values:
   - `DATABASE_URL`: the Aiven Service URI
   - `ADMIN_PASSWORD`: a strong password for `/admin` (the login is `admin@klenz.com`)
3. Click **Apply** (or **Deploy Blueprint**). The first build takes 5–10 minutes. The address is at the top of the **klenz-tissue** service page: `https://klenz-tissue.onrender.com`. Open it and sign in at `/admin`.

### 3. Connect GitHub Actions
1. Render → **klenz-tissue** service → **Settings → Deploy Hook** → copy the URL.
2. GitHub → `manojbalu08/Klenz` → **Settings → Secrets and variables → Actions**:
   - **Secrets → New repository secret:** name `RENDER_DEPLOY_HOOK_URL`, value the deploy hook URL.
   - **Variables → New repository variable:** name `SITE_URL`, value the Render address `https://klenz-tissue.onrender.com`.
3. **Actions → Test and deploy → Run workflow.** When it turns green, the site runs that commit.

### 4. Prices, payments and order alerts (in the live admin, no code)
1. **Admin → Products:** every product starts with a starting price (₹35–₹220 per pack). Replace them with the client's real prices: type the price in the list and press Enter. Empty shows "Price on request" (customers can then only choose Pay later).
   **Admin → Settings → WhatsApp number that receives orders** (default **+91 95663 78152**): every new order is sent to this WhatsApp automatically by the server, once the order alerts are switched on (point 3). The customer's browser opens nothing. The WhatsApp number shown on the website (footer, Contact page) is a separate setting.
2. **Admin → Settings → Payments (UPI QR):** enter the UPI ID that should receive payments (from GPay, PhonePe or the bank app, e.g. `9087312905@okicici`; a bank account works as `ACCOUNTNUMBER@IFSC.ifsc.npci`) and the name shown in UPI apps. Save, then scan the test QR with a phone: the UPI app should show that name. Until a UPI ID is saved, checkout shows a clearly marked **sample** QR that pays nothing.
3. **Admin → Settings → Order alerts on WhatsApp** (free, CallMeBot), so every order reaches WhatsApp by itself. On the phone that should get the alerts (by default the orders number, +91 95663 78152):
   - Save CallMeBot's number **+34 644 45 70 57** in contacts (number as of October 2026; CallMeBot changes it now and then, the current one is on [callmebot.com](https://www.callmebot.com/blog/free-api-whatsapp-messages/)) and send it the WhatsApp message `I allow callmebot to send me messages`. Or open Admin → Settings on that phone, tap **Open it in WhatsApp** and press Send.
   - CallMeBot replies with an API key within 2 minutes (no reply: try again after 24 hours). In Admin → Settings enter **the number of that phone** as *WhatsApp number for alerts*, paste the key, **Save alerts**, then **Send test message**.

   From then on every new order (items, total, payment, customer) arrives on that phone by itself. **A key only works for the WhatsApp number that asked for it.** If the test says *APIKey is invalid*, the number and the key don't belong together: activate again from the alert number (a key requested from WhatsApp Web on a PC belongs to the number logged in there). To move the alerts to another phone, activate CallMeBot on that phone and save its own key.

### 5. Share the link
Send the client the Render address and tell them the first visit after a quiet period takes about a minute. Every order is sent automatically to the WhatsApp number that receives orders (Admin → Settings), as long as the order alerts are on; the admin dashboard shows a warning while they are off.

## Updating the site after feedback

- **Text, products, prices, photos, videos, contact details, UPI ID:** change them in the live admin (`/admin`). No deploy needed; the site changes at once.
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

What a deploy does to the live database:
- **New columns are added automatically** on start (for example the prices and payment details added on 13 October). A column needs a default value for this; renaming or changing a column still needs SQL by hand (see [Live database](#live-database)).
- **Starter data is not touched.** `seed.py` (products, videos, page text) is copied into the database only on the first start; after that the live admin is the source of truth, so make such changes in the admin. A new text field in `content_schema.py` appears with its default; a changed default text replaces the live text only if it is listed in `PREVIOUS_DEFAULTS` and nobody edited it.

## Going live

1. Finish the client's changes as above.
2. **Own domain (optional).** Buy it (about ₹500–1,500 a year). Then Render → **klenz-tissue → Settings → Custom Domains** → add `www.yourdomain.com` and create the DNS records Render shows at your domain provider. HTTPS stays free. Change the `SITE_URL` variable to the new address.
3. **No sleeping (optional, paid).** Switch the Render service to a paid instance type, or move to Railway (about US$5 a month, see [Other hosts](#other-hosts)).
4. Before announcing the site:
   - **Admin → Settings:** change the admin password; check the WhatsApp number, phones, email, address (PIN **642001** on the visiting card, **642002** in the catalogue) and opening hours.
   - **Admin → Page content:** replace the About Us placeholder text.
   - **Admin → Products:** every product has its real price.
   - **Admin → Settings:** the real UPI ID is saved (no sample QR), and order alerts are on (test message received).
   - **Admin → Enquiries:** delete the "Sample …" and test enquiries.
   - Place one order from a phone with **Pay now**: pay a small amount, check the money reached the bank, then mark it **Paid** in Admin → Enquiries.

## Settings (environment variables)

Change them in Render → **klenz-tissue → Environment**; Render restarts the site.

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

The Aiven console (project **klenz** → the MySQL service → **Overview**) shows the host, port, user and password. Use them in MySQL Workbench or HeidiSQL with SSL turned on.

**Lost admin password:** in Command Prompt from `backend`:

```bat
set DATABASE_URL=<Aiven Service URI>
.venv\Scripts\python -m app.cli set-password admin@klenz.com
```

## Other hosts

The Dockerfile runs on any host that runs containers. **Railway** (paid, no sleeping, about US$5 a month): **New Project → Deploy from GitHub repo → manojbalu08/Klenz**, add **Database → MySQL**, then set the variables `DATABASE_URL=${{MySQL.MYSQL_URL}}`, `SECRET_KEY`, `ADMIN_PASSWORD` and `PORT=8000`, and click **Settings → Networking → Generate Domain**. Railway deploys on every push by itself; its Settings also show a deploy hook if you want GitHub Actions to start the deploys.

Every Actions run also builds the image, so you don't need Docker on your PC. To build it locally anyway: `docker build -t klenz .`
