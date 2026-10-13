# Klenz website

Online shop and admin dashboard for Klenz tissue products. Customers pick products from the Klenz catalogue and place the order in the cart popup: they pay now with a UPI QR for the exact total, or choose to pay later. Every order is saved, sent to the admin's WhatsApp automatically, and the customer can send it on WhatsApp too. Staff manage products and prices, orders and payments, page text, videos and business details from `/admin`.

- **Frontend:** React 19 + TypeScript + Vite (`frontend/`)
- **Backend:** Python FastAPI + SQLAlchemy (`backend/`)
- **Database:** MySQL

Live for review: **https://klenz-tissue.onrender.com**

| Document | For |
|---|---|
| [README.md](README.md) | Running the site on your PC (this page) |
| [DEPLOY.md](DEPLOY.md) | Hosting: current setup, one-time setup, shipping updates, going live |
| [CHANGELOG.md](CHANGELOG.md) | What was built and decided so far, open items |
| [CLAUDE.md](CLAUDE.md) | Code map and how to make common changes (developers and Claude Code) |

## Run it on this computer

Double-click **`start-dev.cmd`**. The first run installs the Python and Node packages. Then open:

- Website: http://localhost:5173
- Admin: http://localhost:5173/admin (email and password are in `backend/.env`)
- API docs: http://localhost:8000/api/docs

MySQL must be running (WAMP). The database `klenz` and its tables are created automatically on first start, with the products, videos and text from the design.

### Manual setup

```bat
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements-dev.txt
copy .env.example .env          & rem then edit DATABASE_URL and ADMIN_PASSWORD
.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

In a second terminal:

```bat
cd frontend
npm install
npm run dev
```

Requires Python 3.12+ and Node.js 22+.

## MySQL settings

`DATABASE_URL` in `backend/.env`:

```
mysql+pymysql://USER:PASSWORD@HOST:3306/klenz?charset=utf8mb4
```

- MySQL 5.5 or newer, 8.x, MariaDB: use `charset=utf8mb4`.
- The old WAMP MySQL 5.0 on this PC: use `charset=utf8`.
- If the MySQL user may not create databases (shared hosting), create `klenz` first; `backend/sql/schema.sql` lists the tables.

## Product photos and videos

The client's original files are in `Images/`. The `tools/` scripts turn them into what the site uses:

```bat
pip install -r tools\requirements.txt
python tools\crop_catalogue.py       & rem product photos from Images\products.jpeg, with the real Klenz logo
python tools\make_brand_images.py    & rem round logo, favicons, hero photo, "Your brand on every pack" pictures
python tools\make_videos.py          & rem the four product videos (needs frontend\node_modules for fonts)
```

Your own video: put `name.mp4` in `frontend\public\videos\` (optionally a poster `name.jpg`) and add `/videos/name.mp4` in **Admin → Page content → Home page videos**. YouTube and Vimeo links also work there.

## Admin password

The first admin account is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env`. Change the password later in **Admin → Settings**. If it is lost:

```bat
cd backend
.venv\Scripts\python -m app.cli set-password admin@klenz.com
```

## Going live

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/manojbalu08/Klenz)

See **[DEPLOY.md](DEPLOY.md)** first (the database comes before the button). Hosting is free: GitHub Actions tests every push to `manojbalu08/Klenz` and deploys it to Render (website, admin and API in one Docker container), with the database on Aiven's free MySQL. It covers the one-time setup, shipping updates with `git push`, the custom domain and the go-live checklist.

## Tests

```bat
cd backend
.venv\Scripts\python -m pytest
```

```bat
cd frontend
npm run build
npm run lint
```
