"""Hand-authored pixel damage; run with Python + Pillow to regenerate assets.

Coordinates are on the original 200px canvases. Each stage adds deliberately
placed blocks, never random noise or a whole-sprite tint. Originals stay intact.
"""
import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/units'
DARK = '#3f2631'
METAL = '#929fb7'
SCORCH = '#63505a'
WOUND = '#ba343c'
RED = '#f44840'
OUTPUTS = {}

# Rectangles use exclusive right/bottom edges and follow the existing ~8px grid.
MARKS = {
    'infantry': [
        [(84, 85, 92, 93, RED), (84, 93, 88, 101, WOUND),
         (92, 64, 100, 72, DARK)],
        [(76, 116, 84, 132, WOUND), (76, 124, 84, 132, RED),
         (68, 112, 76, 120, DARK)],
        [(76, 140, 84, 156, RED), (68, 148, 76, 156, WOUND),
         (92, 136, 100, 144, DARK)],
        [(84, 132, 92, 148, WOUND), (84, 140, 92, 148, RED),
         (108, 62, 116, 70, DARK), (100, 70, 116, 78, DARK),
         (116, 109, 124, 117, SCORCH), (108, 144, 116, 152, DARK)],
    ],
    'jeep': [
        [(60, 86, 76, 94, SCORCH), (60, 86, 68, 90, METAL)],
        [(116, 70, 124, 78, DARK), (124, 78, 132, 94, DARK),
         (132, 94, 140, 102, METAL)],
        [(84, 118, 100, 126, DARK), (92, 126, 108, 134, SCORCH),
         (84, 118, 92, 122, METAL)],
        [(60, 134, 76, 142, DARK), (68, 142, 84, 150, DARK),
         (116, 102, 132, 110, SCORCH), (124, 110, 140, 118, DARK),
         (124, 110, 132, 114, '#e78146')],
    ],
    'tank': [
        [(76, 78, 92, 86, SCORCH), (76, 78, 84, 82, METAL)],
        [(108, 62, 116, 70, DARK), (100, 70, 116, 78, SCORCH),
         (132, 86, 140, 94, DARK)],
        [(68, 110, 84, 118, DARK), (76, 118, 92, 126, SCORCH),
         (68, 110, 76, 114, METAL)],
        [(60, 134, 76, 142, DARK), (68, 142, 84, 150, DARK),
         (108, 102, 124, 110, SCORCH), (116, 110, 132, 118, DARK),
         (116, 110, 124, 114, '#e78146')],
    ],
    'artillery': [
        [(116, 94, 132, 102, SCORCH), (116, 94, 124, 98, METAL)],
        [(76, 70, 84, 78, DARK), (84, 78, 92, 86, SCORCH),
         (76, 70, 80, 78, METAL)],
        [(60, 110, 76, 118, DARK), (68, 118, 84, 126, SCORCH),
         (60, 110, 68, 114, METAL)],
        [(108, 110, 124, 118, SCORCH), (116, 118, 132, 126, DARK),
         (116, 118, 124, 122, '#e78146'), (92, 142, 108, 150, DARK),
         (60, 54, 68, 62, DARK)],
    ],
}


def read(name):
    return Image.open(io.BytesIO(base64.b64decode((ASSETS / f'{name}.png.base64').read_text()))).convert('RGBA')


def save(image, name):
    data = io.BytesIO()
    image.save(data, format='PNG', optimize=True)
    encoded = base64.b64encode(data.getvalue()).decode()
    OUTPUTS[f'assets/units/{name}.png'] = encoded
    OUTPUTS[f'assets/units/{name}.png.base64'] = encoded + '\n'


MARKS['infantry-rocket'] = [
    [(108, 87, 116, 95, RED), (100, 64, 108, 72, DARK)],
    [(116, 106, 124, 122, WOUND), (116, 114, 124, 122, RED),
     (76, 104, 84, 112, DARK)],
    [(76, 137, 84, 153, RED), (68, 145, 76, 153, WOUND),
     (84, 112, 92, 120, DARK)],
    [(108, 135, 116, 151, WOUND), (116, 143, 124, 151, RED),
     (92, 65, 100, 73, DARK), (68, 152, 76, 160, DARK)]
]
MARKS['plane'] = [
    [(84, 94, 100, 102, SCORCH), (84, 94, 92, 98, METAL)],
    [(68, 70, 76, 86, DARK), (76, 78, 84, 86, METAL)],
    [(108, 102, 124, 110, DARK), (116, 110, 124, 118, SCORCH)],
    [(68, 126, 84, 134, DARK), (76, 134, 92, 142, SCORCH), (116, 94, 124, 102, '#e78146')]
]
MARKS['helicopter'] = [
    [(76, 94, 92, 102, SCORCH), (76, 94, 84, 98, METAL)],
    [(116, 78, 124, 94, DARK), (108, 86, 116, 94, METAL)],
    [(92, 118, 108, 126, DARK), (100, 126, 116, 134, SCORCH)],
    [(60, 110, 76, 118, DARK), (68, 118, 84, 126, SCORCH),
     (124, 102, 132, 110, '#e78146')],
]
MARKS['anti-air'] = [
    [(76, 103, 92, 111, SCORCH), (76, 103, 84, 107, METAL)],
    [(116, 87, 124, 103, DARK), (108, 95, 116, 103, METAL)],
    [(92, 127, 108, 135, DARK), (100, 135, 116, 143, SCORCH)],
    [(60, 119, 76, 127, DARK), (68, 127, 84, 135, SCORCH),
     (124, 111, 132, 119, '#e78146')],
]
only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
selected_marks = {only: MARKS[only]} if only else MARKS
# Cropped originals for the supplied new units.
for kind in selected_marks:
    for player in (1, 2):
        original = read(f'{kind}-{player}')
        save(original.crop(original.getbbox()), f'{kind}-{player}-fit')

sheet = Image.new('RGB', (1060, len(selected_marks) * 2 * 190 + 55), '#20232c')
labels = ImageDraw.Draw(sheet)
for stage, label in enumerate(['Healthy', 'Light damage', 'Moderate damage', 'Heavy damage', 'Critical']):
    labels.text((75 + stage * 200, 18), label, fill='#ffffff')
for row, (kind, player) in enumerate((kind, player) for kind in selected_marks for player in (1, 2)):
    name = f'{kind}-{player}'
    original = read(name)
    image = original.copy()
    # Match the small vertical offsets already present in the team sprites.
    offset = original.getbbox()[1] - read(f'{kind}-1').getbbox()[1]
    for stage in range(5):
        if stage:
            draw = ImageDraw.Draw(image)
            for left, top, right, bottom, color in MARKS[kind][stage - 1]:
                # Crimson blood stays distinct from player two's orange-red cloth.
                # Preserve the same face, arm and leg wound progression as blue.
                if kind in ('infantry', 'infantry-rocket') and player == 2:
                    color = {RED: '#76031c', WOUND: '#380211'}.get(color, color)
                draw.rectangle((left, top + offset, right - 1, bottom - 1 + offset), fill=color)
            # Keep every original silhouette/transparent pixel, even at critical health.
            image.putalpha(original.getchannel('A'))
            save(image, f'{name}-damage-{stage}')
            fit = original.crop(original.getbbox()) if kind in ('plane', 'infantry-rocket', 'helicopter', 'anti-air') else read(f'{name}-fit')
            fitted = Image.new('RGBA', fit.size)
            box = fit.getbbox()
            crop = image.crop(original.getbbox()).resize((box[2] - box[0], box[3] - box[1]), Image.Resampling.NEAREST)
            fitted.paste(crop, (box[0], box[1]))
            save(fitted, f'{name}-damage-{stage}-fit')
        sheet.paste(image, (45 + stage * 200, 40 + row * 190), image)
    labels.text((10, 55 + row * 190), name, fill='#ffffff')
if not only:
    preview = io.BytesIO()
    sheet.save(preview, format='PNG')
    OUTPUTS['docs/unit-damage-variants.png'] = base64.b64encode(preview.getvalue()).decode()
if '--stdout' in sys.argv:
    print(json.dumps(OUTPUTS))
else:
    for name, content in OUTPUTS.items():
        path = ROOT / name
        path.parent.mkdir(parents=True, exist_ok=True)
        if name.endswith('.png'):
            path.write_bytes(base64.b64decode(content))
        else:
            path.write_text(content)
