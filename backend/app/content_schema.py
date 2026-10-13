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
                "A tissue company built on softness, strength and trust.",
                help=HEADLINE_HELP,
            ),
            ContentField(
                "about.intro",
                "Intro text",
                "[Write a short introduction to Klenz here — who you are and what you make.]",
                "textarea",
            ),
            ContentField(
                "about.photo_url",
                "Story photo",
                "/images/catalogue/range-banner.jpg",
                "url",
                "A factory, team or product photo (https://… or /images/…). Leave empty to show a placeholder.",
            ),
            ContentField("about.story_title", "Story — title", "Our story"),
            ContentField(
                "about.story_p1", "Story — paragraph 1", "[Paragraph 1 — when and why Klenz was started.]", "textarea"
            ),
            ContentField(
                "about.story_p2",
                "Story — paragraph 2",
                "[Paragraph 2 — how the company has grown and who it serves.]",
                "textarea",
            ),
            ContentField("about.value1_title", "Value 1 — title", "Quality first"),
            ContentField(
                "about.value1_text",
                "Value 1 — text",
                "Every batch is checked for softness, strength and cleanliness.",
                "textarea",
            ),
            ContentField("about.value2_title", "Value 2 — title", "Honest dealing"),
            ContentField("about.value2_text", "Value 2 — text", "Clear pricing and clear delivery times.", "textarea"),
            ContentField("about.value3_title", "Value 3 — title", "Care for the planet"),
            ContentField(
                "about.value3_text", "Value 3 — text", "[Add your environmental commitments here.]", "textarea"
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
}
DEFAULTS: dict[str, str] = {key: field.default for key, field in FIELDS.items()}
PUBLISHED_PAGE_COUNT = sum(1 for page in PAGES if page.is_page)
