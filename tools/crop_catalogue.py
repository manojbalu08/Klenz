"""Cut the product pictures out of the Klenz catalogue (Images/products.jpeg, 1024 x 1536).

Run from klenz-website/:  python tools/crop_catalogue.py
Writes frontend/public/images/products/<slug>.jpg (product cards) with the real Klenz logo in place of
the catalogue's old "KLENZ + leaf" print (see brand_logo.py), and the range photo for the About page.
"""
from pathlib import Path

from PIL import Image, ImageFilter

from brand_logo import add_badge, erase, rebrand

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "Images" / "products.jpeg"
PRODUCTS_OUT = ROOT / "frontend" / "public" / "images" / "products"
EXTRA_OUT = ROOT / "frontend" / "public" / "images" / "catalogue"

# slug: (left, top, right, bottom) of the product picture, without its title and size text.
PRODUCTS = {
    "ultra-soft-tissue": (28, 548, 280, 694),
    "soft-tissue": (296, 548, 518, 694),
    "semi-soft-tissue": (538, 548, 762, 694),
    "hard-tissue": (780, 548, 1000, 694),
    "facial-tissue-box": (40, 770, 330, 926),
    "toilet-roll": (420, 768, 610, 924),
    "m-fold-tissue": (690, 772, 990, 922),
    "l-fold-tissue": (28, 1000, 312, 1104),
    "kitchen-roll": (385, 1001, 615, 1114),
    "hrt-roll": (660, 966, 872, 1124),
}
# Plain tissue stacks have no printed pack: they get the round logo in a corner instead.
NO_PACK = {"m-fold-tissue", "l-fold-tissue"}
# The navy box prints its logo in gold; search only the middle so its gold stripes are left alone.
DARK_PACKS = {"facial-tissue-box": (0.44, 0.74)}
# Where to look for the old print, as fractions of the photo width (default 0.22 to 0.78).
COLUMNS = {"kitchen-roll": (0.12, 0.6)}
# Bits of the old print on other faces (too small or too slanted for a new logo): painted over.
# slug: [(box in the 640 x 440 picture, blend top-to-bottom instead of left-to-right)]
COVER_UP = {
    "facial-tissue-box": [((86, 212, 138, 290), True)],  # "KLENZ" on the side face
    "toilet-roll": [((116, 122, 156, 214), False)],  # the print wrapping round the left edge
}
# Range photo for the About page.
BANNER = (395, 0, 1024, 405)

CANVAS = (640, 440)  # same shape as the product card picture (about 1.45 : 1)


def on_canvas(crop: Image.Image) -> Image.Image:
    """Centre the product on a card-shaped canvas filled with the catalogue's background colour."""
    corners = [crop.getpixel((2, 2)), crop.getpixel((crop.width - 3, 2)),
               crop.getpixel((2, crop.height - 3)), crop.getpixel((crop.width - 3, crop.height - 3))]
    background = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    scale = min(CANVAS[0] * 0.86 / crop.width, CANVAS[1] * 0.86 / crop.height)
    product = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
    product = product.filter(ImageFilter.UnsharpMask(radius=1.4, percent=60, threshold=2))
    canvas = Image.new("RGB", CANVAS, background)
    canvas.paste(product, ((CANVAS[0] - product.width) // 2, (CANVAS[1] - product.height) // 2))
    return canvas


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, quality=84, optimize=True, progressive=True)
    print(f"{path.relative_to(ROOT)}  {image.size[0]}x{image.size[1]}")


catalogue = Image.open(SOURCE).convert("RGB")
for slug, box in PRODUCTS.items():
    photo = on_canvas(catalogue.crop(box))
    if slug in NO_PACK:
        add_badge(photo)
    elif slug in DARK_PACKS:
        found = rebrand(photo, dark=True, columns=DARK_PACKS[slug])
    else:
        found = rebrand(photo, columns=COLUMNS.get(slug, (0.22, 0.78)))
    if slug not in NO_PACK and not found:
        raise SystemExit(f"{slug}: the old KLENZ print was not found; check its crop box")
    for box, vertical in COVER_UP.get(slug, []):
        erase(photo, box, vertical)
    save(photo, PRODUCTS_OUT / f"{slug}.jpg")

banner = catalogue.crop(BANNER)
banner = banner.resize((banner.width * 2, banner.height * 2), Image.Resampling.LANCZOS)
save(banner.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2)), EXTRA_OUT / "range-banner.jpg")
