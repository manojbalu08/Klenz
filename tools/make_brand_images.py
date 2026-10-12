"""Brand images from the client's files in Images/.

Run from klenz-website/:  python tools/make_brand_images.py
Writes the transparent round logo, the favicons and the hero photo into frontend/public/.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "Images"
PUBLIC = ROOT / "frontend" / "public"
NAVY = (1, 13, 37)  # the logo's background colour


def round_logo(size: int) -> Image.Image:
    """logo.jpeg has black corners; cut it to a circle just inside the copper ring."""
    logo = Image.open(IMAGES / "logo.jpeg").convert("RGB")
    w, h = logo.size
    scale = 4  # draw the mask large, then shrink, for a smooth edge
    mask = Image.new("L", (w * scale, h * scale), 0)
    inset = 6 * scale
    ImageDraw.Draw(mask).ellipse((inset, inset, w * scale - inset, h * scale - inset), fill=255)
    rgba = logo.convert("RGBA")
    rgba.putalpha(mask.resize((w, h), Image.Resampling.LANCZOS))
    return rgba.resize((size, size), Image.Resampling.LANCZOS)


def save(image: Image.Image, path: Path, **options) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, **options)
    print(f"{path.relative_to(ROOT)}  {image.size[0]}x{image.size[1]}")


save(round_logo(320), PUBLIC / "images" / "brand" / "klenz-logo.png", optimize=True)
save(round_logo(64), PUBLIC / "favicon.png", optimize=True)

# iOS home-screen icon: no transparency allowed, so fill the corners with the logo's navy.
touch = Image.new("RGB", (180, 180), NAVY)
icon = round_logo(180)
touch.paste(icon, (0, 0), icon)
save(touch, PUBLIC / "apple-touch-icon.png", optimize=True)

# Hero photo (also the poster of the hero video).
hero = Image.open(IMAGES / "facial_tissue.jpeg").convert("RGB")
hero.thumbnail((720, 1080))
save(hero, PUBLIC / "images" / "brand" / "hero-facial-tissue.jpg", quality=82, optimize=True, progressive=True)
