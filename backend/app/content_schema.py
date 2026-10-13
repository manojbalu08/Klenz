"""Every piece of website text the admin can edit, with the design's copy as default.

Headlines support *stars* around a word to show it in the theme colour.
"""

from dataclasses import dataclass
from typing import Literal

FieldKind = Literal["text", "textarea", "url"]


@dataclass(frozen=True)
class ContentField:
    key: str
    label: str
    default: str
    kind: FieldKind = "text"
    help: str = ""


@dataclass(frozen=True)
class ContentPage:
    id: str
    label: str
    fields: tuple[ContentField, ...]
    # Site-wide text is not a page, so it is left out of the "pages published" count.
    is_page: bool = True


HEADLINE_HELP = "Wrap a word in *stars* to show it in the theme colour."


def _person(number: int, name: str, role: str, bio: str) -> tuple[ContentField, ...]:
    """One of the (at most two) founders or partners on the About page."""
    return (
        ContentField(
            f"about.person{number}_name", f"Person {number} — name", name, help="Leave empty to hide this person."
        ),
        ContentField(f"about.person{number}_role", f"Person {number} — role", role),
        ContentField(f"about.person{number}_bio", f"Person {number} — about", bio, "textarea"),
        ContentField(
            f"about.person{number}_photo",
            f"Person {number} — photo",
            "",
            "url",
            "A square photo works best (https://… or /images/…). Empty shows an icon.",
        ),
    )

PAGES: tuple[ContentPage, ...] = (
    ContentPage(
        "home",
        "Home",
        (
            ContentField("home.badge", "Badge above the headline", "TISSUE PAPER, MADE BY KLENZ"),
            ContentField("home.headline", "Headline", "Soft on skin. *Strong* in every sheet.", help=HEADLINE_HELP),
            ContentField(
                "home.hero_image",
                "Hero photo",
                "/images/brand/hero-facial-tissue.jpg",
                "url",
                "Photo shown next to the headline. Leave empty to show the drawing from the design.",
            ),
            ContentField(
                "home.hero_video",
                "Hero video",
                "/videos/hero-facial-tissue.mp4",
                "url",
                "Short silent video that plays inside the hero photo frame. Leave empty to show only the photo.",
            ),
            ContentField(
                "home.intro",
                "Intro text",
                "Pick your tissue, add it to the cart and order in a minute. Pay now by UPI or pay later. "
                "Fresh stock for homes, shops, cafés and hotels.",
                "textarea",
            ),
            ContentField(
                "home.highlights",
                "Highlights strip",
                "Soft & safe\nHigh absorbency\nPremium quality\nCustom branding available\nPan India delivery\n"
                "Pay by UPI or later",
                "textarea",
                "One highlight per line.",
            ),
            ContentField("home.shop_eyebrow", "Products — small label", "ORDER HERE"),
            ContentField("home.shop_title", "Products — title", "Pick what you need"),
            ContentField(
                "home.shop_note",
                "Products — note",
                "Choose your products and quantities, then place your order. Pay now by UPI or pay later.",
            ),
            ContentField("home.ideal_eyebrow", "Ideal for — small label", "IDEAL FOR"),
            ContentField("home.ideal_title", "Ideal for — title", "Made for homes and businesses"),
            ContentField(
                "home.ideal_items",
                "Ideal for — list",
                "Hotels & Restaurants\nCafés & Bakeries\nOffices & Commercial Spaces\nHospitals & Clinics\n"
                "Theatres & Entertainment\nCatering",
                "textarea",
                "One per line.",
            ),
            ContentField("home.videos_eyebrow", "Videos — small label", "WATCH"),
            ContentField("home.videos_title", "Videos — title", "See Klenz tissue up close"),
            ContentField("home.videos_note", "Videos — note", "Short videos of our tissue range."),
            ContentField("home.steps_title", "Steps — title", "Ordering takes 3 steps"),
            ContentField("home.step1_title", "Step 1 — title", "Add to cart"),
            ContentField("home.step1_text", "Step 1 — text", "Choose your products and quantities above."),
            ContentField("home.step2_title", "Step 2 — title", "Place your order"),
            ContentField(
                "home.step2_text", "Step 2 — text", "Add your details, then pay with the UPI QR or choose to pay later."
            ),
            ContentField("home.step3_title", "Step 3 — title", "We confirm & deliver"),
            ContentField(
                "home.step3_text", "Step 3 — text", "We confirm your order on WhatsApp and deliver to your door."
            ),
            ContentField("home.branding_eyebrow", "Branding — small label", "PACKAGING & PRINTING"),
            ContentField("home.branding_title", "Branding — title", "Your brand on every pack"),
            ContentField(
                "home.branding_text",
                "Branding — text",
                "Custom packaging and printing for hotels, restaurants and businesses that want tissue in their "
                "own colours.",
                "textarea",
            ),
            ContentField(
                "home.branding_points",
                "Branding — list",
                "PP cover (40 micron)\nAdditional colour\nBox printing\nConsistent quality\nPan India delivery",
                "textarea",
                "One per line.",
            ),
            ContentField("home.bulk_title", "Bulk banner — title", "Need tissue in bulk?"),
            ContentField(
                "home.bulk_text",
                "Bulk banner — text",
                "Add your items to the cart and place your order. We confirm bulk orders and delivery on WhatsApp.",
            ),
        ),
    ),
    ContentPage(
        "about",
        "About Us",
        (
            ContentField("about.badge", "Badge above the headline", "ABOUT KLENZ"),
            ContentField(
                "about.headline",
                "Headline",
                "A tissue company built on softness, strength and *trust*.",
                help=HEADLINE_HELP,
            ),
            ContentField(
                "about.intro",
                "Intro text",
                "Klenz makes tissue and hygiene products in Pollachi, Tamil Nadu: napkins, facial tissues, rolls "
                "and fold tissues for homes and businesses across India. Soft on skin, strong in use, made for "
                "every day.",
                "textarea",
            ),
            ContentField(
                "about.hero_image",
                "Hero photo",
                "/images/brand/about-napkins.jpg",
                "url",
                "Photo next to the headline (https://… or /images/…). Leave empty to hide it.",
            ),
            ContentField("about.made_in", "Hero photo — badge", "Made in Pollachi, Tamil Nadu"),
            ContentField(
                "about.facts",
                "Facts strip",
                "Pan India | delivery\nCustom | branding on your packs",
                "textarea",
                "One per line: big text | small text. Shown after the live product and range counts.",
            ),
            ContentField("about.story_eyebrow", "Story — small label", "WHO WE ARE"),
            ContentField("about.story_title", "Story — title", "Our story"),
            ContentField(
                "about.story_p1",
                "Story — paragraph 1",
                "Klenz is a tissue brand from Pollachi, Tamil Nadu, built on a simple idea: the tissue you use every "
                "day should feel premium. Soft enough for your face, strong enough for the kitchen, and clean enough "
                "to trust at every table.",
                "textarea",
            ),
            ContentField(
                "about.story_p2",
                "Story — paragraph 2",
                "We make and market the whole range ourselves: 80 g tissue napkins in four grades from ultra soft to "
                "hard, 2-ply facial tissue boxes, toilet and kitchen rolls, 1 kg HRT rolls, and M-fold and L-fold "
                "tissues. It is made for homes as much as for hotels, cafés, offices, hospitals and caterers. "
                "Businesses can have their own brand printed on the pack, and we deliver anywhere in India.",
                "textarea",
            ),
            ContentField(
                "about.photo_url",
                "Story photo",
                "/images/brand/hero-facial-tissue.jpg",
                "url",
                "A factory, team or product photo (https://… or /images/…). Leave empty to hide it.",
            ),
            ContentField(
                "about.promise",
                "Story — promise",
                "Soft | Gentle on skin\nClean | Hygienic and pure\nEveryday | For every moment",
                "textarea",
                "One per line: word | short line.",
            ),
            ContentField("about.values_eyebrow", "Values — small label", "WHAT WE STAND FOR"),
            ContentField("about.values_title", "Values — title", "Four promises in every pack"),
            ContentField("about.value1_title", "Value 1 — title", "Soft & safe"),
            ContentField(
                "about.value1_text",
                "Value 1 — text",
                "Gentle on skin, sheet after sheet. Made for faces, hands and every table.",
                "textarea",
            ),
            ContentField("about.value2_title", "Value 2 — title", "Clean & hygienic"),
            ContentField(
                "about.value2_text",
                "Value 2 — text",
                "Packed in protective covers and boxes, so every sheet reaches you hygienic and pure.",
                "textarea",
            ),
            ContentField("about.value3_title", "Value 3 — title", "Consistent quality"),
            ContentField(
                "about.value3_text",
                "Value 3 — text",
                "Every batch is checked for softness, strength and absorbency, so each order matches the last.",
                "textarea",
            ),
            ContentField("about.value4_title", "Value 4 — title", "Honest dealing"),
            ContentField(
                "about.value4_text",
                "Value 4 — text",
                "Clear prices, clear delivery times, and a real person on WhatsApp whenever you need us.",
                "textarea",
            ),
            ContentField("about.range_eyebrow", "Range — small label", "OUR RANGE"),
            ContentField("about.range_title", "Range — title", "Our range at a glance"),
            ContentField(
                "about.range_text",
                "Range — text",
                "Tap a range to see its products and prices.",
                help="The ranges and their photos come from the products list.",
            ),
            ContentField("about.team_eyebrow", "Team — small label", "OUR FOUNDERS"),
            ContentField("about.team_title", "Team — title", "The people behind *Klenz*", help=HEADLINE_HELP),
            ContentField(
                "about.team_text", "Team — text", "Meet the founders who started Klenz and stand behind every pack."
            ),
            *_person(
                1,
                "Founder's name",
                "Founder",
                "Started Klenz to make everyday tissue that feels premium: soft on skin, strong in use and the same "
                "high quality in every pack.",
            ),
            *_person(
                2,
                "Co-founder's name",
                "Co-founder",
                "Works with customers on bulk orders, custom-branded packs and delivery, so every order reaches you "
                "as promised.",
            ),
            ContentField("about.customers_eyebrow", "Customers — small label", "OUR CUSTOMERS"),
            ContentField("about.customers_title", "Customers — title", "Who we *serve*", help=HEADLINE_HELP),
            ContentField(
                "about.customers_text",
                "Customers — text",
                "Homes and businesses that care about clean, from hotel rooms and café tables to offices, hospitals "
                "and events.",
            ),
            ContentField(
                "about.customer_types",
                "Customers — types",
                "Homes & Families | Napkins, facial tissue and kitchen rolls for every day at home.\n"
                "Hotels & Restaurants | Table napkins, facial tissue boxes and HRT rolls for rooms, tables and "
                "washrooms.\n"
                "Cafés & Bakeries | Soft napkins for every plate and kitchen rolls behind the counter.\n"
                "Offices & Commercial Spaces | Toilet rolls and M-fold and L-fold tissues for busy washrooms and "
                "pantries.\n"
                "Hospitals & Clinics | Hygienic tissue for wards, waiting rooms and staff.\n"
                "Theatres & Entertainment | Napkins and rolls that keep up with a full house.\n"
                "Catering | Napkins in bulk, with your own brand printed on the pack if you like.\n"
                "Shops & Supermarkets | Retail packs of napkins, facial tissue and rolls for your shelves.",
                "textarea",
                "One per line: type | short line. The icon is picked from the words.",
            ),
            ContentField("about.customer_names_title", "Customers — names title", "Some of the businesses we supply"),
            ContentField(
                "about.customer_names",
                "Customers — names",
                "",
                "textarea",
                "Customers or partners, one per line (a hotel, café, office or distributor). Leave empty to hide "
                "this list.",
            ),
            ContentField(
                "about.partner_title", "Partner banner — title", "Become a Klenz *partner*", help=HEADLINE_HELP
            ),
            ContentField(
                "about.partner_text",
                "Partner banner — text",
                "Distributors, wholesalers and shops: stock Klenz in your area. Hotels, cafés and caterers: get "
                "tissue with your own brand on the pack. Tell us what you need and we will get back to you.",
                "textarea",
            ),
        ),
    ),
    ContentPage(
        "contact",
        "Contact Us",
        (
            ContentField("contact.badge", "Badge above the headline", "CONTACT US"),
            ContentField("contact.headline", "Headline", "Talk to the *Klenz* team", help=HEADLINE_HELP),
            ContentField(
                "contact.intro",
                "Intro text",
                "Call or WhatsApp us for bulk orders, custom branding and delivery. "
                "To order, add products to your cart and place the order.",
                "textarea",
            ),
        ),
    ),
    ContentPage(
        "site",
        "Header & footer",
        (
            ContentField(
                "site.footer_tagline",
                "Footer tagline",
                "Everyday cleanliness for a better tomorrow. Tissue products for homes, hotels, cafés and offices.",
            ),
        ),
        is_page=False,
    ),
)

FIELDS: dict[str, ContentField] = {field.key: field for page in PAGES for field in page.fields}

# Earlier default texts. On start-up a stored value that still equals one of these (nobody edited it)
# is replaced by the current default, so wording changes reach existing databases too.
PREVIOUS_DEFAULTS: dict[str, tuple[str, ...]] = {
    "home.intro": (
        "Pick your tissue, add it to the cart and send your order on WhatsApp. "
        "Fresh stock for homes, shops, cafés and hotels.",
    ),
    "home.highlights": (
        "Soft & safe\nHigh absorbency\nPremium quality\nCustom branding available\nPan India delivery\n"
        "Order on WhatsApp",
    ),
    "home.shop_note": ("Choose your products and quantities — we reply on WhatsApp with prices and delivery.",),
    "home.step2_title": ("Send on WhatsApp",),
    "home.step2_text": ("Your cart is filled into a WhatsApp message with your details.",),
    "home.step3_text": ("We reply with the final price and delivery time.",),
    "home.bulk_text": ("Add your items, then tell us your quantity on the Contact page.",),
    "contact.badge": ("CONTACT & CHECKOUT",),
    "contact.headline": ("Almost there — send your order",),
    "contact.intro": (
        "Check your items, add your details and send the order on WhatsApp. "
        "We'll confirm the final price and delivery.",
    ),
    "about.headline": ("A tissue company built on softness, strength and trust.",),
    "about.intro": ("[Write a short introduction to Klenz here — who you are and what you make.]",),
    "about.photo_url": ("/images/catalogue/range-banner.jpg",),
    "about.story_p1": ("[Paragraph 1 — when and why Klenz was started.]",),
    "about.story_p2": ("[Paragraph 2 — how the company has grown and who it serves.]",),
    "about.value1_title": ("Quality first",),
    "about.value1_text": ("Every batch is checked for softness, strength and cleanliness.",),
    "about.value2_title": ("Honest dealing",),
    "about.value2_text": ("Clear pricing and clear delivery times.",),
    "about.value3_title": ("Care for the planet",),
    "about.value3_text": ("[Add your environmental commitments here.]",),
}
DEFAULTS: dict[str, str] = {key: field.default for key, field in FIELDS.items()}
PUBLISHED_PAGE_COUNT = sum(1 for page in PAGES if page.is_page)
