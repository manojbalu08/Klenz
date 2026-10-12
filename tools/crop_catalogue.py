"""Cut the product pictures out of the Klenz catalogue (Images/products.jpeg, 1024 x 1536).

Run from klenz-website/:  python tools/crop_catalogue.py
Writes frontend/public/images/products/<slug>.jpg (product cards) and
frontend/public/images/catalogue/ (packaging pictures and the range photo).
"""
from pathlib import Path

from PIL import Image, ImageFilter

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
# Packaging & printing pictures (Home page branding section) and the banner photo (About page).
EXTRAS = {
    "pp-cover": (36, 1186, 290, 1266),
    "box-printing": (498, 1158, 684, 1279),
}
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
    save(on_canvas(catalogue.crop(box)), PRODUCTS_OUT / f"{slug}.jpg")
for slug, box in EXTRAS.items():
    save(on_canvas(catalogue.crop(box)), EXTRA_OUT / f"{slug}.jpg")

banner = catalogue.crop(BANNER)
banner = banner.resize((banner.width * 2, banner.height * 2), Image.Resampling.LANCZOS)
save(banner.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2)), EXTRA_OUT / "range-banner.jpg")
