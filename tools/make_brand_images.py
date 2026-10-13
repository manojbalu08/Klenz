"""Brand images from the client's files in Images/.

Run from klenz-website/:  python tools/make_brand_images.py
Writes the transparent round logo, the favicons, the hero photo and the two "Your brand on every pack"
pictures into frontend/public/.
"""
from pathlib import Path

from PIL import Image, ImageFilter

from brand_logo import round_logo

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "Images"
PUBLIC = ROOT / "frontend" / "public"
NAVY = (1, 13, 37)  # the logo's background colour

# Home page "Your brand on every pack": (source photo, crop box) -> 900 x 660 pictures.
BRANDING = {
    "branding-box.jpg": ("facial_tissue.jpeg", (100, 520, 853, 1072)),
    "branding-napkins.jpg": ("napkin_tissue.jpeg", (130, 160, 1150, 908)),
}


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

for name, (source, box) in BRANDING.items():
    picture = Image.open(IMAGES / source).convert("RGB").crop(box).resize((900, 660), Image.Resampling.LANCZOS)
    picture = picture.filter(ImageFilter.UnsharpMask(radius=1.2, percent=50, threshold=2))
    save(picture, PUBLIC / "images" / "catalogue" / name, quality=84, optimize=True, progressive=True)
