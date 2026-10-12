# Klenz website — project guide

Online shop + admin for **Klenz** tissue products (Pollachi, Tamil Nadu). Built from the design "Kenz Website Design.html"; the logo, packaging, catalogue and visiting card say **Klenz**. **No prices anywhere**: shoppers pick products and quantities, send the order on WhatsApp, and Klenz replies with a quote. Read this file instead of exploring the code; open only the files a change needs.

## Stack and ports
- `frontend/` React 19 + TypeScript 6 + Vite 8, React Router 8 (declarative `<Routes>`), CSS Modules, no UI library. Dev server :5173 proxies `/api` to :8000.
- `backend/` FastAPI + SQLAlchemy 2.1 (sync) + PyMySQL, Pydantic v2, PyJWT. Port :8000. In production it also serves `frontend/dist` (one port, SPA fallback).
- Database: MySQL via `DATABASE_URL` in `backend/.env`. This PC: WAMP **MySQL 5.0.27**, user `root`, no password, database `klenz`, **`?charset=utf8`** (5.0 has no utf8mb4; use utf8mb4 on MySQL 5.5+/8). Tests use SQLite unless `TEST_DATABASE_URL` is set.
- `Images/` the client's originals (logo, catalogue `products.jpeg`, product photos, visiting card). `tools/` scripts that turn them into web images and videos.
- Hosting: GitHub **https://github.com/manojb08/Klenz** (public, branch `main`) → **Railway** builds the root `Dockerfile` (Node builds `frontend/dist`, then uvicorn on `$PORT`, proxy headers trusted, non-root) with a Railway MySQL (`DATABASE_URL=${{MySQL.MYSQL_URL}}`). Every push to `main` redeploys. Steps, variables and go-live checklist: `DEPLOY.md`.

## Commands (Windows, from `klenz-website/`)
| Task | Command |
|---|---|
| Start everything | `start-dev.cmd` (first run installs packages) |
| API only | `cd backend` → `.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000` (if a reload hangs on Windows, stop and start it again) |
| Website only | `cd frontend` → `npm run dev -- --host` |
| Backend tests | `cd backend` → `.venv\Scripts\python -m pytest` (MySQL: set `TEST_DATABASE_URL=mysql+pymysql://root:@127.0.0.1:3306/klenz_test?charset=utf8`) |
| Frontend checks | `cd frontend` → `npm run build` (type-check + bundle), `npm run lint` |
| Reset admin password | `cd backend` → `.venv\Scripts\python -m app.cli set-password admin@klenz.com` |
| Create DB + starter data | `.venv\Scripts\python -m app.cli init-db` (also happens on API start) |
| MySQL DDL reference | `.venv\Scripts\python -m app.cli schema-sql > sql\schema.sql` |
| Ship a change to the live site | `git add -A` → `git commit -m "…"` → `git push` (Railway rebuilds; database untouched) |
| Production image locally | `docker build -t klenz .` (Docker Desktop; on this PC Norton's HTTPS scanning breaks pip/npm inside Docker, so a local test build needs Norton's root certificate added. Railway builds are not affected) |
| Media (needs `pip install -r tools/requirements.txt` in any Python env) | `python tools/crop_catalogue.py` (product photos), `python tools/make_brand_images.py` (logo, favicons, hero photo), `python tools/make_videos.py [facial\|napkins\|rolls\|hero]` |

URLs: site http://localhost:5173 · admin http://localhost:5173/admin · API docs http://localhost:8000/api/docs. Admin login is in `backend/.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, used only to create the first admin).

## Backend map (`backend/app/`)
- `main.py` `create_app()`: lifespan creates the MySQL database if missing → `create_all` tables → `seed_database`; mounts routers; serves `frontend/dist`.
- `config.py` `AppConfig` (env vars / `.env`; plain `mysql://` URLs are switched to PyMySQL). `database.py` engine, `UTCDateTime` (naive UTC, whole seconds), MySQL charset/InnoDB handling, `get_db`.
- `models.py` tables `admin_users, products (name, category, spec = pack size, description, art, tint, image_url, is_live, sort_order), orders (no totals), order_items (product_name + product_spec snapshot, quantity), videos, page_content, site_settings`. Order reference = `KZ-` + (10000 + id).
- `schemas.py` request/response models + validators (`is_link`: `https://…` or `/path`). `content_schema.py` **every editable site text**: `PAGES` → fields `page.key` with label, default, kind text/textarea/url.
- `store.py` `SETTING_DEFAULTS` (WhatsApp, phones, email, address, hours, country code) + key/value read/write. `seed.py` first-run data: the 10 catalogue products, 3 videos, page text, settings, 3 sample enquiries; runs once (marker `_seeded_at`); `ensure_admin`.
- `security.py` PBKDF2 passwords, JWT (`sub`, `ver`=token_version, `rem`), `get_current_admin`. `ratelimit.py` in-memory limits (login failures, orders/hour).
- `routers/public.py` `GET /api/site` (settings, content, live products, videos in one call), `POST /api/orders` (copies name + pack size, 409 if a product is unavailable). `routers/auth.py` login, me.
- `routers/admin/` (all need a Bearer token): `dashboard`, `products` (+`/reorder`), `orders` (filter/search/status/delete), `content`, `videos` (+`/reorder`), `settings` (+`/account/password`, bumps token_version).
- `cli.py` init-db, set-password, schema-sql. `tests/` pytest; `conftest.make_client(**config_overrides)`.

## Frontend map (`frontend/src/`)
- `main.tsx` fonts + global CSS + BrowserRouter → `App.tsx` routes (admin is lazy-loaded at `/admin/*`).
- `styles/global.css` **the theme**: `:root` colour variables (Klenz "Ocean" blue), resets, reduced-motion rules.
- `lib/` `api.ts` (all endpoints, `ApiError.fields` for form errors), `types.ts` (mirrors schemas.py), `format.ts` (`packs`, `timeAgo`, `dateTime`, headline `*stars*`, `lines`), `whatsapp.ts` (wa.me link, order message without prices), `video.ts` (YouTube/Vimeo/file + `posterFor`), `storage.ts`.
- `components/` `Dialog` (native `<dialog>`, `modal` | `drawer`), `Logo`, `PageLoader`, `icons` (incl. `IdealIcon` picked by keyword), `motion.tsx` (`Reveal`, `useInView`, `useReducedMotion`, `revealClass`).
- `shop/` `SiteDataContext` (loads `/api/site` once), `CartContext` (cart in localStorage `klenz.cart`, customer details in sessionStorage), `ShopLayout` (announcement, header, footer, floating cart on phones), `Header`, `Footer`, `CartDrawer`, `HomePage` (hero with looping video, highlights marquee, product grid + filters, Ideal for, videos, steps, branding, bulk banner), `AboutPage`, `ContactPage` (validate → POST order → open WhatsApp tab), `ProductCard` (pack size, reveal, hover) + `ProductArt` (CSS drawings when no photo), `VideoShowcase` (autoplays muted while on screen, moves to the next video at the end), `Headline`, `ui.module.css` (shared shop styles).
- `admin/` `AdminApp` (routes), `AuthContext` (token in localStorage if "keep me signed in", else sessionStorage; any 401 signs out), `AdminLayout` (sidebar + admin colour variables), `shared.tsx` (`PageHeader`, pills, `useLoad`, `useFlash`), `DashboardPage`, `ProductsPage` + `ProductForm`, `EnquiriesPage` (+ detail dialog, `?open=id`), `ContentPage` + `VideosEditor`, `SettingsPage`, `LoginPage`, `admin.module.css`.
- `public/` `images/brand/` (logo, hero photo), `images/products/<slug>.jpg` (from the catalogue), `images/catalogue/` (PP cover, box printing, range banner), `videos/<name>.mp4` + `<name>.jpg` poster, `favicon.png`, `apple-touch-icon.png`.

## Recipes
- **Change site text, products, photos, videos, WhatsApp number**: no code; use the admin (Page content, Products, Settings).
- **New text on a page**: add a `ContentField` in `content_schema.py`, then render `c['page.key']` in the page component. No migration needed.
- **New setting**: `SETTING_DEFAULTS` (store.py) + `SiteSettingsIn/Out` (schemas.py) + `SiteSettings` (types.ts) + `TEXT_FIELDS` in `SettingsPage.tsx`.
- **New product field**: `Product` model + `ProductIn`/`ProductOut` + `types.ts` + `ProductForm`. `create_all` only makes new tables, so an existing database needs `ALTER TABLE products ADD …` (no Alembic yet; in development you can drop database `klenz` and restart).
- **Product photo**: copy the file to `frontend/public/images/products/` and set the product's photo to `/images/products/<name>.jpg` (or any https link). From the catalogue: adjust the boxes in `tools/crop_catalogue.py`.
- **Video**: put `name.mp4` (+ optional poster `name.jpg`) in `frontend/public/videos/` and add `/videos/name.mp4` in Admin → Page content → videos. YouTube/Vimeo links work too. Regenerate the made videos with `tools/make_videos.py` (text, phone number and timings are at the top and in `JOBS`).
- **Colours**: edit the `:root` variables in `styles/global.css` (shop and login) and the `--a-*` variables at the top of `admin/AdminLayout.module.css` (admin).
- **New shop page**: `shop/XPage.tsx` + route in `App.tsx` + `NAV` in `Header.tsx`. **New admin page**: `admin/XPage.tsx` + route in `AdminApp.tsx` + `NAV` in `AdminLayout.tsx`.
- **New endpoint**: router in `routers/` (admin ones in `routers/admin/` are protected automatically) + function in `lib/api.ts` + type in `types.ts` + a test.
- **Animate a new block**: wrap it in `<Reveal delay={ms}>` (fade-up on scroll). Keep motion behind `useReducedMotion()` / `prefers-reduced-motion`.

## Conventions and gotchas
- Styles follow the design's pixel values. Colours only through CSS vars: `--ink --primary --soft --soft2 --accent --bg --muted --card --on-ink-muted`; `--focus` sets the focus-ring colour.
- When a component module overrides a class from `ui.module.css`/`admin.module.css`, use a two-class selector; CSS order between modules is not guaranteed. Reveal uses the `translate` property so hover effects can use `transform`; elements with both list their transitions together (see `ProductCard.module.css`).
- Responsive: phones ≤760px (header scrolls away, floating cart button), admin sidebar becomes a top bar ≤960px, TVs/large screens scale with `zoom` 1.1 / 1.33 / 2 at ≥1880 / 2400 / 3200px (ShopLayout, AdminLayout, LoginPage CSS). Build target is old enough for Smart TV browsers (`vite.config.ts`).
- Videos must be muted to autoplay; `HeroArt` and `VideoShowcase` set `muted` on the element before `play()`.
- TypeScript: `erasableSyntaxOnly` (no enums or parameter properties), `verbatimModuleSyntax` (`import type`). React 19: `<Context value>` providers, `<title>` inside pages.
- MySQL compatibility: indexed VARCHAR ≤191 chars, no JSON columns or CHECK constraints, datetimes via `UTCDateTime`. SQLAlchemy `URL.set(database=None)` means "unchanged", so use `database=""`.
- Starlette 1.x TestClient needs `httpx2` (in requirements-dev.txt).
- Starter data is added once. To start a dev database fresh: drop database `klenz`, restart the API. On the live site the admin is the source of truth: changes to `seed.py` or to existing default texts never reach it (new `content_schema` fields do), and new columns need an `ALTER TABLE` on the live MySQL before the push.
- Open question for the client: the visiting card says Pollachi **642001**, the catalogue **642002** (setting `address`).
- After changes: backend `pytest`; frontend `npm run build` + `npm run lint`; check phone/tablet/desktop widths in the browser's device toolbar.
