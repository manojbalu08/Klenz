"""Render the Klenz product videos (silent MP4 + poster JPG) from the client's photos.

Run from klenz-website/:  python tools/make_videos.py [facial|napkins|rolls|hero]
Needs:  pip install -r tools/requirements.txt  and  frontend/node_modules (for the site's fonts).
Reads Images/ and frontend/public/images/products/ (run crop_catalogue.py first);
writes frontend/public/videos/<name>.mp4 and a poster <name>.jpg next to it.
"""
import math
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "Images"
CROPS = ROOT / "frontend" / "public" / "images" / "products"
FONTS = ROOT / "frontend" / "node_modules" / "@fontsource"
OUT = ROOT / "frontend" / "public" / "videos"
ONLY = sys.argv[1] if len(sys.argv) > 1 else None
OUT.mkdir(parents=True, exist_ok=True)

FPS = 30
W, H = 1280, 720
FADE = 0.4  # scenes overlap by this much and cross-fade

# Ocean theme
NAVY = (10, 31, 68)
DEEP = (16, 46, 104)
BLUE = (29, 95, 224)
CYAN = (34, 211, 238)
SOFT = (220, 234, 255)
BG = (244, 249, 255)
MUTED = (70, 96, 138)
WHITE = (255, 255, 255)

PHONE = "+91 90873 12905"  # shown on the closing card of every video


# ── Drawing helpers ──────────────────────────────────────

@lru_cache
def font(face: str, size: int) -> ImageFont.FreeTypeFont:
    files = {
        "display": "bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff2",
        "body": "dm-sans/files/dm-sans-latin-500-normal.woff",
        "bold": "dm-sans/files/dm-sans-latin-700-normal.woff",
    }
    return ImageFont.truetype(str(FONTS / files[face]), size)


def clamp(x: float) -> float:
    return max(0.0, min(1.0, x))


def ease_out(t: float) -> float:
    return 1 - (1 - clamp(t)) ** 3


def smooth(t: float) -> float:
    t = clamp(t)
    return t * t * (3 - 2 * t)


def progress(t: float, start: float, length: float) -> float:
    return ease_out((t - start) / length)


@lru_cache
def text(content: str, face: str, size: int, color: tuple, tracking: int = 0, max_width: int = 0) -> Image.Image:
    """Text on a transparent layer; shrinks the font until it fits max_width."""
    while True:
        f = font(face, size)
        widths = [f.getlength(ch) + tracking for ch in content] if tracking else None
        width = int(sum(widths) if widths else f.getlength(content)) + 4
        if not max_width or width <= max_width or size <= 12:
            break
        size -= 2
    ascent, descent = f.getmetrics()
    layer = Image.new("RGBA", (width, ascent + descent + 4), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    if widths:
        x = 0.0
        for ch, w in zip(content, widths):
            draw.text((x, 0), ch, font=f, fill=color)
            x += w
    else:
        draw.text((0, 0), content, font=f, fill=color)
    return layer


def place(frame: Image.Image, layer: Image.Image, x: float, y: float, alpha: float = 1.0) -> None:
    if alpha <= 0.003:
        return
    if alpha < 0.997:
        layer = layer.copy()
        layer.putalpha(layer.getchannel("A").point(lambda a: int(a * alpha)))
    frame.alpha_composite(layer, (int(round(x)), int(round(y))))


def slide_in(frame, layer, x, y, t, start, length=0.7, distance=40):
    p = progress(t, start, length)
    place(frame, layer, x - distance * (1 - p), y, p)


@lru_cache
def pill(label: str, face: str, size: int, fg: tuple, bg: tuple) -> Image.Image:
    inner = text(label, face, size, fg)
    pad_x, pad_y = 22, 10
    layer = Image.new("RGBA", (inner.width + pad_x * 2, inner.height + pad_y * 2), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((0, 0, layer.width - 1, layer.height - 1), radius=layer.height // 2, fill=bg)
    layer.alpha_composite(inner, (pad_x, pad_y - 2))
    return layer


@lru_cache
def dot(color: tuple, size: int = 22) -> Image.Image:
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse((0, 0, size - 1, size - 1), fill=color)
    return layer


@lru_cache
def glow(size: tuple, center: tuple, radius: int, color: tuple, strength: float) -> Image.Image:
    """Soft round light (cached; never draw onto the returned image)."""
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse(
        (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
        fill=color + (int(255 * strength),),
    )
    return layer.filter(ImageFilter.GaussianBlur(radius * 0.45))


@lru_cache
def _gradient(size: tuple, left: tuple, right: tuple) -> Image.Image:
    strip = Image.new("RGB", (size[0], 1))
    for i in range(size[0]):
        f = i / max(1, size[0] - 1)
        strip.putpixel((i, 0), tuple(int(left[c] + (right[c] - left[c]) * f) for c in range(3)))
    return strip.resize(size).convert("RGBA")


def background(size: tuple, left: tuple, right: tuple) -> Image.Image:
    """A fresh frame to draw on."""
    return _gradient(size, left, right).copy()


def card(image: Image.Image, width: int, radius: int = 28, shadow: int = 26) -> Image.Image:
    """Product picture as a rounded card with a soft shadow (transparent padding = 2 x shadow)."""
    img = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, img.width - 1, img.height - 1), radius=radius, fill=255)
    img.putalpha(mask)
    pad = shadow * 2
    out = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    shade = Image.new("RGBA", out.size, (0, 0, 0, 0))
    ImageDraw.Draw(shade).rounded_rectangle(
        (pad, pad + shadow // 2, pad + img.width, pad + img.height + shadow // 2), radius=radius, fill=NAVY + (70,)
    )
    out.alpha_composite(shade.filter(ImageFilter.GaussianBlur(shadow)))
    out.alpha_composite(img, (pad, pad))
    return out


def scaled(layer: Image.Image, factor: float) -> Image.Image:
    if abs(factor - 1) < 0.002:
        return layer
    return layer.resize((max(1, round(layer.width * factor)), max(1, round(layer.height * factor))), Image.Resampling.BICUBIC)


def ken_burns(image: Image.Image, box_a, box_b, f: float, size) -> Image.Image:
    """Crop box moves from box_a to box_b (both must have the output's aspect ratio)."""
    f = smooth(f)
    box = tuple(a + (b - a) * f for a, b in zip(box_a, box_b))
    return image.resize(size, Image.Resampling.BICUBIC, box=box).convert("RGBA")


@lru_cache
def logo(size: int) -> Image.Image:
    src = Image.open(IMAGES / "logo.jpeg").convert("RGB")
    w, h = src.size
    big = 4
    mask = Image.new("L", (w * big, h * big), 0)
    ImageDraw.Draw(mask).ellipse((6 * big, 6 * big, w * big - 6 * big, h * big - 6 * big), fill=255)
    rgba = src.convert("RGBA")
    rgba.putalpha(mask.resize((w, h), Image.Resampling.LANCZOS))
    return rgba.resize((size, size), Image.Resampling.LANCZOS)


@lru_cache
def crop(name: str) -> Image.Image:
    return Image.open(CROPS / f"{name}.jpg").convert("RGB")


def crossfade(scenes, t: float) -> Image.Image:
    """scenes: (start, end, render) overlapping by FADE seconds; the newer one fades in."""
    active = [s for s in scenes if s[0] <= t < s[1]] or [scenes[-1]]
    start, _, render = active[-1]
    frame = render(t - start)
    if len(active) > 1:
        prev_start, _, prev_render = active[-2]
        frame = Image.blend(prev_render(t - prev_start), frame, smooth((t - start) / FADE))
    return frame


def encode(name: str, frames, size, poster_at: float, total: float) -> None:
    target = OUT / f"{name}.mp4"
    cmd = [imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{size[0]}x{size[1]}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow",
           "-crf", "24", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", "-an", str(target)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    poster_index = int(poster_at * FPS)
    count = int(round(total * FPS))
    for index in range(count):
        frame = frames(index / FPS).convert("RGB")
        if index == poster_index:
            frame.save(OUT / f"{name}.jpg", quality=84, optimize=True, progressive=True)
        proc.stdin.write(frame.tobytes())
    proc.stdin.close()
    if proc.wait() != 0:
        raise SystemExit(f"ffmpeg failed for {name}")
    print(f"{name}.mp4: {count / FPS:.1f}s {size[0]}x{size[1]}, {target.stat().st_size // 1024} KB")


def end_card(t: float) -> Image.Image:
    frame = background((W, H), NAVY, DEEP)
    frame.alpha_composite(glow((W, H), (W // 2, H // 2 - 60), 260, BLUE, 0.55))
    p = progress(t, 0.1, 0.9)
    mark = scaled(logo(220), 0.7 + 0.3 * p)
    place(frame, mark, (W - mark.width) / 2, 70 + (220 - mark.height) / 2, p)
    title = text("Order on WhatsApp", "display", 60, WHITE)
    slide_in(frame, title, (W - title.width) / 2 + 30, 330, t, 0.5, 0.7, 30)
    phone = text(PHONE, "bold", 38, CYAN, 1)
    slide_in(frame, phone, (W - phone.width) / 2 + 30, 420, t, 0.8, 0.7, 30)
    town = text("Klenz Tissue Products · Pollachi, Tamil Nadu", "body", 26, SOFT)
    place(frame, town, (W - town.width) / 2, 490, progress(t, 1.1, 0.6))
    return frame


# ── Video 1: Klenz Facial Tissue (landscape promo) ───────

def facial_tissue():
    photo = Image.open(IMAGES / "facial_tissue.jpeg").convert("RGB")  # 853 x 1280
    # Navy shade on the left two-thirds so the white text reads over the photo.
    ramp = Image.new("L", (W, 1))
    for x in range(W):
        ramp.putpixel((x, 0), int(235 * clamp(1 - x / (W * 0.66)) ** 1.15))
    shade = Image.new("RGBA", (W, H), NAVY + (0,))
    shade.putalpha(ramp.resize((W, H)))
    box_card = card(crop("facial-tissue-box"), 470)
    features = ["Soft on skin", "Hygienic & clean", "2 ply · 100 pulls", "Home · Office · Hotels · Travel"]

    def opening(t):
        frame = ken_burns(photo, (0, 380, 853, 860), (90, 470, 810, 875), t / 5.4, (W, H))
        frame.alpha_composite(shade)
        slide_in(frame, text("KLENZ", "bold", 26, CYAN, 6), 80, 200, t, 0.2)
        slide_in(frame, text("Facial Tissue", "display", 100, WHITE, max_width=640), 80, 236, t, 0.45)
        slide_in(frame, text("Soft · Clean · Everyday", "body", 36, SOFT), 84, 372, t, 0.8)
        slide_in(frame, pill("2 Ply · 100 Pulls", "bold", 28, NAVY, CYAN), 84, 440, t, 1.15)
        return frame

    def why(t):
        frame = background((W, H), NAVY, DEEP)
        frame.alpha_composite(glow((W, H), (935, 390), 300, BLUE, 0.6))
        p = progress(t, 0.1, 0.9)
        item = scaled(box_card, 0.88 + 0.12 * p)
        bob = math.sin(t * 1.6) * 8
        place(frame, item, 935 - item.width / 2, 390 - item.height / 2 + bob + 30 * (1 - p), p)
        slide_in(frame, text("Made for every moment", "display", 56, WHITE, max_width=600), 80, 110, t, 0.2)
        for i, line in enumerate(features):
            y = 240 + i * 74
            start = 0.6 + i * 0.35
            slide_in(frame, dot(CYAN), 84, y + 14, t, start)
            slide_in(frame, text(line, "body", 34, WHITE, max_width=520), 124, y, t, start)
        return frame

    scenes = [(0, 5.4, opening), (5.0, 10.4, why), (10.0, 14.0, end_card)]
    encode("facial-tissue", lambda t: crossfade(scenes, t), (W, H), poster_at=2.6, total=14.0)


# ── Videos 2 and 3: product range slideshows ─────────────

def range_video(name: str, title: str, subtitle: str, products, per_item: float = 2.6):
    cards = {slug: card(crop(slug), 500) for slug, *_ in products}

    def opening(t):
        frame = background((W, H), NAVY, BLUE)
        frame.alpha_composite(glow((W, H), (1040, 140), 260, CYAN, 0.35))
        place(frame, logo(120), 80, 110, progress(t, 0.05, 0.6))
        slide_in(frame, text(title, "display", 92, WHITE, max_width=1100), 80, 270, t, 0.25)
        slide_in(frame, text(subtitle, "body", 36, SOFT, max_width=1100), 84, 400, t, 0.6)
        return frame

    def slide(slug, label, spec, line):
        def render(t):
            frame = background((W, H), BG, BG)
            frame.alpha_composite(glow((W, H), (930, 370), 320, SOFT, 0.95))
            ring_x = int(1080 - t * 22)
            place(frame, dot(CYAN, 300), ring_x, -150, 0.22)
            p = progress(t, 0.05, 0.8)
            item = scaled(cards[slug], (0.9 + 0.1 * p) * (1 + 0.03 * t / per_item))
            place(frame, item, 930 - item.width / 2, 370 - item.height / 2 + 26 * (1 - p), p)
            slide_in(frame, text(label, "display", 64, NAVY, max_width=540), 80, 220, t, 0.15)
            slide_in(frame, pill(spec, "bold", 28, WHITE, BLUE), 84, 318, t, 0.4)
            slide_in(frame, text(line, "body", 30, MUTED, max_width=540), 84, 392, t, 0.65)
            return frame
        return render

    scenes = [(0, 2.2 + FADE, opening)]
    start = 2.2
    for slug, label, spec, line in products:
        scenes.append((start, start + per_item + FADE, slide(slug, label, spec, line)))
        start += per_item
    scenes.append((start, start + 3.4, end_card))
    encode(name, lambda t: crossfade(scenes, t), (W, H), poster_at=3.6, total=start + 3.4)


# ── Hero loop: portrait, loops without a visible jump ────

def hero_loop():
    photo = Image.open(IMAGES / "facial_tissue.jpeg").convert("RGB")  # 853 x 1280 (2:3)
    size = (560, 840)
    period = 8.0
    full = (0, 0, 853, 1280)
    close = (60, 130, 820, 1270)  # 760 x 1140, same 2:3 shape, nearer the box
    band = Image.new("RGBA", (220, 1400), (255, 255, 255, 0))
    draw = ImageDraw.Draw(band)
    for x in range(220):
        draw.line((x, 0, x, 1400), fill=(255, 255, 255, int(70 * math.sin(math.pi * x / 219) ** 2)))
    band = band.rotate(-18, expand=True, resample=Image.Resampling.BICUBIC)

    def frame_at(t):
        phase = (1 - math.cos(2 * math.pi * t / period)) / 2  # 0 -> 1 -> 0
        frame = ken_burns(photo, full, close, phase, size)
        sweep = (t % period) / 2.2  # a light sweep at the start of each loop
        if sweep < 1:
            x = -band.width + (size[0] + band.width) * ease_out(sweep)
            place(frame, band, x, -300)
        return frame

    encode("hero-facial-tissue", frame_at, size, poster_at=0, total=period)


JOBS = {
    "facial": facial_tissue,
    "napkins": lambda: range_video(
        "tissue-napkins",
        "Tissue Napkins",
        "80 g packs in four softness levels",
        [
            ("ultra-soft-tissue", "Ultra Soft Tissue", "80 grams", "Our softest napkins, gentle on skin."),
            ("soft-tissue", "Soft Tissue", "80 grams", "Soft and absorbent for every table."),
            ("semi-soft-tissue", "Semi Soft Tissue", "80 grams", "Softness with extra strength."),
            ("hard-tissue", "Hard Tissue", "80 grams", "Firm sheets for heavy-duty wiping."),
        ],
    ),
    "rolls": lambda: range_video(
        "rolls-and-folds",
        "Rolls & Fold Tissue",
        "For homes, kitchens and washrooms",
        [
            ("toilet-roll", "Toilet Roll", "100 pulls", "Soft, strong rolls for everyday use."),
            ("kitchen-roll", "Kitchen Roll", "100 pulls", "Absorbent sheets for kitchen spills."),
            ("hrt-roll", "HRT Roll", "1 kg · 40 GSM", "Large rolls for washroom dispensers."),
            ("m-fold-tissue", "M-Fold Tissue", "120 pulls", "Multi-fold hand towels."),
            ("l-fold-tissue", "L-Fold Tissue", "100 pulls", "Single-fold hand towels."),
        ],
        per_item=2.4,
    ),
    "hero": hero_loop,
}

for key, job in JOBS.items():
    if ONLY in (None, key):
        job()
