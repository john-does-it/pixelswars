"""Rebuild shoreline repairs from existing pixels. Requires Pillow.

Never resample the source sprites. Draw a small, palette-matched corner on their
logical 16-pixel grid; everything outside that corner stays byte-for-byte equal.
Run with --check to verify the checked-in PNGs without changing them.
"""
import base64
import io
from pathlib import Path
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WATER = ROOT / 'assets/cells/water'
MASKS = ROOT / 'assets/cells/water-shimmer'
CHECK = '--check' in sys.argv

# Colours sampled from the existing Kenney shore sprites, not the AI preview.
PALETTE = {
    'g': '#84c669', 'l': '#8bd87d', 'd': '#65a556', 'b': '#cf8254',
    's': '#eaa56c', 'f': '#d9f7ff', 'c': '#45c2e0',
}
# A concave cliff: its top edge meets the vertical bank, its left edge meets
# the horizontal cliff. Dots leave the original water and waves untouched.
REGULAR = [
    'ggggfc.',
    'lllbfc.',
    'ddbsfc.',
    'dbsfc..',
    'ssfcc..',
    'sfcc...',
    'fcc....',
    'cc.....',
    'c......',
]
NARROW = [
    'gdf....',
    'lbf....',
    'dsfc...',
    'dbsfc..',
    'ssfcc..',
    'sfcc...',
    'fcc....',
    'cc.....',
    'c......',
]
BASES = {
    'open': ('0037', 'cell-water.png'),
    'east': ('0038', 'cell-water-grass-on-left.png'),
    'west': ('0036', 'cell-water-grass-on-right.png'),
    'south': ('0055', 'cell-water-grass-on-bottom.png'),
    'southwest': ('0054', 'cell-water-grass-corner-on-right-and-bottom.png'),
}
VARIANTS = {
    'open': ['nw', 'ne', 'nw-ne'],
    'east': ['nw', 'nw-narrow'],
    'west': ['ne', 'ne-narrow'],
    'south': ['nw', 'ne', 'nw-ne'],
    'southwest': ['ne', 'ne-narrow'],
}


def read_source(name):
    data = base64.b64decode((WATER / f'tile-{name}@2x.png.base64').read_text())
    return Image.open(io.BytesIO(data)).convert('RGBA')


def png_bytes(image):
    buffer = io.BytesIO()
    image.save(buffer, format='PNG', optimize=True)
    return buffer.getvalue()


def store(path, data):
    if CHECK:
        assert path.read_bytes() == data, f'Out-of-date generated asset: {path}'
    else:
        path.write_bytes(data)


def repair(bank, variant):
    source_id, mask_name = BASES[bank]
    source = read_source(source_id)
    result = source.copy()
    mask = Image.open(MASKS / mask_name).convert('RGBA').resize(source.size, Image.Resampling.NEAREST)
    touched = Image.new('L', source.size)
    draw, mask_draw, touched_draw = ImageDraw.Draw(result), ImageDraw.Draw(mask), ImageDraw.Draw(touched)
    pattern = NARROW if variant.endswith('narrow') or variant == 'nw-ne' else REGULAR
    for corner in ['nw', 'ne']:
        if corner not in variant:
            continue
        for y, row in enumerate(pattern):
            for x, colour in enumerate(row):
                if colour == '.':
                    continue
                column = x if corner == 'nw' else 15 - x
                # The original 250px exports represent a 16px logical tile.
                box = (round(column * source.width / 16), round(y * source.height / 16),
                       round((column + 1) * source.width / 16) - 1, round((y + 1) * source.height / 16) - 1)
                draw.rectangle(box, fill=PALETTE[colour])
                mask_draw.rectangle(box, fill=(0, 0, 0, 0))
                touched_draw.rectangle(box, fill=255)
    # The corner patch must neither recolour the untouched bank nor introduce
    # antialiasing/new palette colours. The shoreline itself must not shimmer.
    difference = ImageChops.difference(source, result)
    assert not ImageChops.multiply(difference.convert('RGB'), ImageChops.invert(touched).convert('RGB')).getbbox()
    colours = lambda image: {colour for _, colour in image.getcolors(image.width * image.height)}
    assert colours(result) <= colours(source) | {tuple(bytes.fromhex(value[1:])) + (255,) for value in PALETTE.values()}
    assert not ImageChops.multiply(mask.getchannel('A'), touched).getbbox()
    name = f'cell-water-junction-{bank}-{variant}'
    store(WATER / f'{name}@2x.png.base64', base64.b64encode(png_bytes(result)) + b'\n')
    store(MASKS / f'{name}.png', png_bytes(mask))
    return result


sprites = {(bank, variant): repair(bank, variant) for bank, variants in VARIANTS.items() for variant in variants}

if not CHECK:
    # Review the actual deterministic sprites in the three validated contexts.
    grass = Image.open(io.BytesIO(base64.b64decode((ROOT / 'assets/cells/grass/grass-variant-1@2x.png.base64').read_text()))).convert('RGBA')
    scenes = [
        ('Coude / riviere etroite', ['grass', '0057', 'grass', '0018', '0038', 'grass'], 4, ('east', 'nw-narrow')),
        ('Jonction en T', ['grass', '0057', 'grass', '0018', '0055', '0020', '0054', 'grass', '0038'], 4, ('south', 'nw-ne')),
        ('Angle en eau ouverte', ['grass', '0018', '0037', '0019', '0037', '0037'], 4, ('open', 'nw')),
    ]
    preview = Image.new('RGB', (700, 820), '#101a13')
    draw = ImageDraw.Draw(preview)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19) if Path('C:/Windows/Fonts/arial.ttf').exists() else ImageFont.load_default()
    draw.text((30, 18), 'AVANT', fill='#f3d16b', font=font)
    draw.text((380, 18), 'APRES - pixels des sprites d\u2019origine', fill='#f3d16b', font=font)
    top = 65
    for title, tiles, replaced, key in scenes:
        draw.text((30, top), title, fill='white', font=font)
        top += 30
        for i, tile in enumerate(tiles):
            before = grass if tile == 'grass' else read_source(tile)
            after = sprites[key] if i == replaced else before
            for left, image in [(30, before), (380, after)]:
                preview.paste(image.resize((80, 80), Image.Resampling.NEAREST), (left + i % 3 * 80, top + i // 3 * 80))
        top += (len(tiles) // 3) * 80 + 35
    output = ROOT / 'tmp/water-junctions'
    output.mkdir(parents=True, exist_ok=True)
    preview.save(output / 'comparison.png')

print(f'{len(sprites)} shoreline variants {"verified" if CHECK else "generated"}; palette, unchanged pixels and shimmer masks verified.')
