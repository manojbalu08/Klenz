# Klenz website: project history

What was built and decided, in order, so the next round of changes can start from here. How-to guides: [README.md](README.md) (run it on your PC), [DEPLOY.md](DEPLOY.md) (hosting and updates), [CLAUDE.md](CLAUDE.md) (code map for developers and Claude Code).

## 13 October 2026 (late night): new About Us page

- The About Us page was rebuilt with real content from the visiting card and catalogue, replacing the "[ … ]" placeholders:
  - a hero photo of the Klenz napkin pack (the client's photo, real logo) with "Made in Pollachi" and "Soft · Clean · Everyday" badges;
  - a facts strip with the live product and range counts, pan-India delivery and custom branding;
  - the story;
  - four values;
  - a dark "Our range at a glance" band whose cards open the shop on that range;
  - the founders;
  - "Who we serve" (eight customer types);
  - a "Become a Klenz partner" banner with Talk to us / WhatsApp buttons.
- **Founders / partners:** at most two people, each with name, role, a few lines and a photo, edited in Admin → Page content → About Us. The names are placeholders ("Founder's name", "Co-founder's name") until the client gives the real ones. An empty name hides that person, and without a photo an icon is shown.
- **Customers and partners:** the eight customer types are shown with icons. Real customer or partner names can be listed in Admin → Page content → About Us → *Customers — names*, one per line. The list stays hidden while it is empty: no names were invented.
- All of it is editable in the admin. The old unedited About texts on the live site are replaced on the next start; the old catalogue banner photo had the old "KLENZ + leaf" print and is no longer used.

## 13 October 2026 (late night): CallMeBot's new number

- CallMeBot now uses **+34 644 45 70 57** for activation (it was +34 644 31 95 65). Admin → Settings and DEPLOY.md use the new number and explain that a key only works for the WhatsApp number that asked for it. A test that CallMeBot rejects with "APIKey is invalid" now says so in plain words. The live alerts (number +91 73973 83403) had a key that did not belong to that number, so they need activating again from that phone.

## 13 October 2026 (night): orders reach WhatsApp without opening anything

- Placing an order no longer opens a WhatsApp tab or WhatsApp Web for the customer. The popup only says **Order placed successfully** with the order number, and has a **Done** button. The customer never sends a WhatsApp message. The server sends every order to the admin's WhatsApp (+91 95663 78152) by itself through the CallMeBot alert, which must be switched on once in Admin → Settings (one-tap activation link there). The admin dashboard warns while it is off.

## 13 October 2026 (evening): orders to WhatsApp, starting prices, branding pictures

- **Orders go to WhatsApp +91 95663 78152 by default.** Placing an order now opens WhatsApp by itself with the order addressed to that number (new setting "WhatsApp number that receives orders"; the number shown on the website stays the visiting card's). The automatic CallMeBot alert goes to the same number once its key is saved.
- **Every product has a price.** Starting prices were filled in (₹35–₹220 per pack, to be confirmed by the client), also on existing databases, once. The admin changes a price by typing it straight into the products list (Enter saves) or in the edit form.
- **"Your brand on every pack" pictures** are smaller, framed in white, tilted and overlapping, with a "Your logo, your colours" badge (they had been stretched).

## 13 October 2026: checkout with UPI payment, prices and design round

Requested after the first review:
1. **Ordering and payment.** Checkout now happens in the cart popup: cart → details → payment. The customer either **pays now** by scanning a UPI QR for the exact total (with an optional UPI reference number) or **pays later**. Every order is saved in the database, shown in Admin → Enquiries with its total and payment, and sent to the admin's WhatsApp automatically (free CallMeBot service, set up in Admin → Settings). At the end the customer can also send the order from their own WhatsApp. Until a UPI ID is saved in Admin → Settings, the QR is a marked sample that pays nothing.
2. **Prices are back**, as asked: a price per pack on product cards, in the cart, the WhatsApp messages and the admin. A product without a price shows "Price on request" (and can only be paid later). Admin can mark a payment as "Customer says paid" or "Paid".
3. **Cart as a popup** instead of the side panel; full screen on phones. The Contact page is now a plain contact page (call, WhatsApp, email, map link).
4. **Removed** the "Watch video" button and the announcement bar.
5. **Same logo on every product:** the catalogue photos had an older "KLENZ + leaf" print; it was replaced by the real "Klenz" logo with the copper swoosh (navy letters on white packs, copper on the navy box). The fold tissues, which have no pack, got the round logo.
6. **Video controls:** play/pause and full screen buttons (also click to pause, double-click for full screen).
7. **"Your brand on every pack"** now uses the client's sharp product photos instead of blurry catalogue crops.
8. **Footer** redesigned: about half the height, one row with logo, links and contact buttons.
9. **Products section** has a soft brand-blue background; product photos sit on a light blue glow.

Also: new database columns (prices, payment) are added automatically when the site starts, so the live database updates itself on deploy. Page text that mentioned the old WhatsApp-only ordering was updated (only where nobody had edited it).

Checks: 36 backend tests (SQLite, MySQL 5.0 on this PC, MySQL 8.4 in GitHub Actions); browser test of the whole checkout, payment QR, WhatsApp message, admin payment marking, videos and full screen; no sideways scrolling from phone to 4K TV.

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
- No prices at the time: customers sent the order on WhatsApp and Klenz replied with a quote (prices came back on 13 October).
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

## Open items
- Add the GitHub secret `RENDER_DEPLOY_HOOK_URL` and the variable `SITE_URL` ([DEPLOY.md](DEPLOY.md), step 3) so every push deploys by itself; until then use Render → **Manual Deploy**.
- In the live admin: the client's real prices (replace the starting prices), the real UPI ID (replaces the sample QR) and the WhatsApp order alerts ([DEPLOY.md](DEPLOY.md), step 4).
- From the client: real prices, UPI ID, PIN code (642001 on the visiting card or 642002 in the catalogue), the founders' or partners' names, roles, photos and a line about each (About Us), customer names they want shown, opening hours, their own photos and videos, and the WhatsApp number for orders.
- Before announcing the site: change the admin password if it was shared, and delete the sample and test enquiries.
- Optional: the client's own domain. `klenztissue.com` and `klenztissue.in` were free on 13 October; `klenz.com`, `klenz.in` and `pollachi.com` are taken.
