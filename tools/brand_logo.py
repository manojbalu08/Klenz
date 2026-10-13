"""The Klenz wordmark from Images/logo.jpeg, and helpers that put it on product photos.

The catalogue mock-ups (Images/products.jpeg) print an older "KLENZ + leaf" mark; the real logo is the
"Klenz" script with a copper swoosh. crop_catalogue.py uses these helpers so every product photo shows
the real logo. Run this file directly to save a preview of the extracted wordmark.
"""
from collections import deque
from collections.abc import Iterator
from functools import cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "Images" / "logo.jpeg"
NAVY_TEXT = (16, 33, 84)  # the navy of the old "KLENZ" print on the white packs

Box = tuple[int, int, int, int]


@cache
def wordmark() -> tuple[Image.Image, Image.Image]:
    """(letters, swoosh): copper RGBA images of the same size, cut out of the round logo."""
    logo = Image.open(LOGO).convert("RGB")
    size = logo.width
    # Copper on navy: the red channel alone tells them apart (the navy has almost no red).
    alpha = logo.getchannel("R").point(lambda v: max(0, min(255, (v - 24) * 255 // 110)))
    # Leave out the copper ring and the black corners: keep the inside of the circle.
    inside = Image.new("L", logo.size, 0)
    inset = round(size * 0.09)
    ImageDraw.Draw(inside).ellipse((inset, inset, size - inset, size - inset), fill=255)
    alpha = Image.composite(alpha, Image.new("L", logo.size, 0), inside)
    box = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
    copper = logo.crop(box).convert("RGBA")
    alpha = alpha.crop(box)
    copper.putalpha(alpha)

    # The swoosh is the shape that sits wholly above the letters; the letters end on the baseline.
    blobs = [blob for blob in _blobs(alpha.point(lambda v: 255 if v > 90 else 0)) if len(blob[1]) > 40]
    baseline = sorted(bottom for (_, _, _, bottom), _ in blobs)[len(blobs) // 2]
    swoosh_area = Image.new("L", alpha.size, 0)
    for (_, _, _, bottom), pixels in blobs:
        if bottom < baseline * 0.55:
            for xy in pixels:
                swoosh_area.putpixel(xy, 255)
    swoosh_area = swoosh_area.filter(ImageFilter.MaxFilter(5))  # include its soft edge
    nothing = Image.new("L", alpha.size, 0)
    swoosh, letters = copper.copy(), copper.copy()
    swoosh.putalpha(Image.composite(alpha, nothing, swoosh_area))
    letters.putalpha(Image.composite(nothing, alpha, swoosh_area))
    return letters, swoosh


def logo_on_light(width: int) -> Image.Image:
    """Navy letters with the copper swoosh, for white packs (as on Klenz's own posters)."""
    letters, swoosh = wordmark()
    navy = Image.new("RGBA", letters.size, NAVY_TEXT + (255,))
    navy.putalpha(letters.getchannel("A"))
    return _scaled(Image.alpha_composite(navy, swoosh), width)


def logo_on_dark(width: int) -> Image.Image:
    """The copper logo as it is, for dark packs such as the navy facial tissue box."""
    letters, swoosh = wordmark()
    return _scaled(Image.alpha_composite(letters, swoosh), width)


def round_logo(size: int) -> Image.Image:
    """The round logo with transparent corners (logo.jpeg has black ones), cut just inside the copper ring."""
    logo = Image.open(LOGO).convert("RGB")
    width, height = logo.size
    scale = 4  # draw the mask large, then shrink, for a smooth edge
    mask = Image.new("L", (width * scale, height * scale), 0)
    inset = 6 * scale
    ImageDraw.Draw(mask).ellipse((inset, inset, width * scale - inset, height * scale - inset), fill=255)
    rgba = logo.convert("RGBA")
    rgba.putalpha(mask.resize((width, height), Image.Resampling.LANCZOS))
    return rgba.resize((size, size), Image.Resampling.LANCZOS)


# ── Replacing the old mark on the catalogue product photos ────────────────────


def _navy_ink(rgb: tuple[int, int, int]) -> bool:
    red, green, blue = rgb
    return red < 100 and green < 100 and blue < 170 and blue >= red


def _gold_ink(rgb: tuple[int, int, int]) -> bool:
    red, green, blue = rgb
    return red > 160 and green > 115 and blue < 120 and red - blue > 80


def _copper(rgb: tuple[int, int, int]) -> bool:
    red, green, blue = rgb
    return red > 140 and 70 < green < 210 and blue < 150 and red - blue > 55 and red - green > 20


def find_old_mark(photo: Image.Image, dark: bool, columns: tuple[float, float]) -> Box | None:
    """The box around the old "KLENZ" lettering and the leaf above it, or None.

    The lettering is the topmost band of tall, text-like rows inside `columns` (fractions of the width);
    the leaf is the copper above it.
    """
    width, height = photo.size
    pixels = photo.load()
    is_ink = _gold_ink if dark else _navy_ink
    x0, x1 = int(width * columns[0]), int(width * columns[1])
    def is_word(rows: list[tuple[int, list[int]]]) -> bool:
        """Tall enough for the big letters and wide like a word (the gold leaf on the box is not)."""
        span = max(max(row) for _, row in rows) - min(min(row) for _, row in rows)
        return len(rows) >= 16 and span >= 2.2 * len(rows)

    band: list[tuple[int, list[int]]] = []
    for y in range(int(height * 0.12), int(height * 0.75)):
        xs = [x for x in range(x0, x1) if is_ink(pixels[x, y])]
        if 3 <= len(xs) <= 0.45 * (x1 - x0):
            band.append((y, xs))
        elif band and is_word(band):
            break  # the first band of big letters is the "KLENZ"
        else:
            band = []
    if not band or not is_word(band):
        return None
    top, bottom = band[0][0], band[-1][0]
    xs = sorted(x for _, row in band for x in row)
    left, right = xs[len(xs) // 100], xs[-1 - len(xs) // 100]
    leaf = [
        (x, y)
        for y in range(max(0, top - int(2.2 * (bottom - top))), top)
        for x in range(left, right)
        if _copper(pixels[x, y])
    ]
    if leaf:
        top = min(top, min(y for _, y in leaf))
    return left, top, right, bottom


def erase(photo: Image.Image, box: Box, vertical: bool = False) -> None:
    """Paint over a box with the colours just outside it, blended across each row (or each column)."""
    left, top, right, bottom = box
    pixels = photo.load()

    def average(points: list[tuple[int, int]]) -> tuple[float, ...]:
        samples = [pixels[point] for point in points]
        return tuple(sum(channel) / len(samples) for channel in zip(*samples))

    def blend(start: tuple[float, ...], end: tuple[float, ...], t: float) -> tuple[int, ...]:
        return tuple(round(a + (b - a) * t) for a, b in zip(start, end))

    if vertical:  # e.g. a box side face with white background to its left
        for x in range(left, right + 1):
            start = average([(x, y) for y in range(top - 5, top)])
            end = average([(x, y) for y in range(bottom + 1, bottom + 6)])
            for y in range(top, bottom + 1):
                pixels[x, y] = blend(start, end, (y - top) / (bottom - top))
    else:
        for y in range(top, bottom + 1):
            start = average([(x, y) for x in range(left - 5, left)])
            end = average([(x, y) for x in range(right + 1, right + 6)])
            for x in range(left, right + 1):
                pixels[x, y] = blend(start, end, (x - left) / (right - left))


def rebrand(photo: Image.Image, dark: bool = False, columns: tuple[float, float] = (0.22, 0.78)) -> bool:
    """Swap the old "KLENZ + leaf" on a product photo for the real Klenz logo. False if none was found."""
    box = find_old_mark(photo, dark, columns)
    if box is None:
        return False
    left, top, right, bottom = box
    # Only 2 px below: the pack's next line ("FACIAL TISSUES", "TOILET ROLL") sits close underneath.
    erase(photo, (left - 6, top - 6, right + 6, bottom + 2))
    mark = (logo_on_dark if dark else logo_on_light)(right - left)
    # Letters sit where the old ones were; the swoosh rises into the space the leaf left.
    photo.paste(mark, (left, bottom + 2 - mark.height), mark)
    return True


def add_badge(photo: Image.Image, size: int = 92, margin: int = 22) -> None:
    """The round logo in the bottom-right corner, for products with no printed pack (the fold tissues)."""
    badge = round_logo(size)
    shadow = Image.new("RGBA", (size + 24, size + 24), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((12, 16, size + 12, size + 20), fill=(10, 31, 68, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(6))
    x, y = photo.width - size - margin, photo.height - size - margin
    photo.paste(shadow, (x - 12, y - 12), shadow)
    photo.paste(badge, (x, y), badge)


def _scaled(mark: Image.Image, width: int) -> Image.Image:
    return mark.resize((width, round(mark.height * width / mark.width)), Image.Resampling.LANCZOS)


def _blobs(mask: Image.Image) -> Iterator[tuple[Box, list[tuple[int, int]]]]:
    """Each connected white shape in a black-and-white mask: (bounding box, pixels)."""
    width, height = mask.size
    data = mask.load()
    seen = bytearray(width * height)
    for y in range(height):
        for x in range(width):
            if not data[x, y] or seen[y * width + x]:
                continue
            seen[y * width + x] = 1
            queue, pixels = deque([(x, y)]), []
            left, top, right, bottom = x, y, x, y
            while queue:
                px, py = queue.popleft()
                pixels.append((px, py))
                left, top, right, bottom = min(left, px), min(top, py), max(right, px), max(bottom, py)
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if 0 <= nx < width and 0 <= ny < height and data[nx, ny] and not seen[ny * width + nx]:
                        seen[ny * width + nx] = 1
                        queue.append((nx, ny))
            yield (left, top, right, bottom), pixels


if __name__ == "__main__":
    import sys

    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "wordmark-preview.png"
    light, dark = logo_on_light(600), logo_on_dark(600)
    sheet = Image.new("RGB", (640, light.height + dark.height + 60), "white")
    sheet.paste(light, (20, 20), light)
    band = Image.new("RGB", (640, dark.height + 20), (12, 26, 66))
    band.paste(dark, (20, 10), dark)
    sheet.paste(band, (0, light.height + 40))
    sheet.save(out)
    print("saved", out, "| wordmark size", wordmark()[0].size)
