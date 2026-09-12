"""Normalize an exported transparent sprite onto the game's 200px canvas."""

import base64
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image

OUTLINE_COLOR = (63, 38, 49, 255)


def normalize_outline(image: Image.Image) -> None:
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            if alpha >= 16 and 40 <= red <= 90 and green <= 55 and 15 <= blue <= 70 and red > green and blue >= green:
                pixels[x, y] = OUTLINE_COLOR


def normalize(source: Path, destination: Path) -> None:
    image = Image.open(source).convert('RGBA')
    alpha = image.getchannel('A').point(lambda value: 255 if value >= 16 else 0)
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError(f'{source} does not contain a visible sprite')

    image.putalpha(alpha)
    normalize_outline(image)
    sprite = image.crop(bounds)
    sprite.thumbnail((125, 118), Image.Resampling.NEAREST)
    canvas = Image.new('RGBA', (200, 200))
    canvas.alpha_composite(sprite, ((200 - sprite.width) // 2, 42))

    output = BytesIO()
    canvas.save(output, format='PNG', optimize=True)
    content = output.getvalue()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    destination.with_suffix(destination.suffix + '.base64').write_text(base64.b64encode(content).decode() + '\n')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('usage: normalize-unit-sprite.py INPUT OUTPUT')
    normalize(Path(sys.argv[1]), Path(sys.argv[2]))
