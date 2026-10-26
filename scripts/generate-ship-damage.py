from pathlib import Path
import base64
import io
from PIL import Image, ImageDraw

# Reuse the recovered utility's palette and inclusive/exclusive drawing convention.
DARK = '#3f2631'
METAL = '#929fb7'
SCORCH = '#63505a'
ROOT = Path(__file__).resolve().parents[1]
MARKS = {
    'attack-ship': [
        [(60, 94, 76, 102, SCORCH), (60, 94, 68, 98, METAL)],
        [(92, 62, 100, 70, DARK), (84, 70, 100, 78, SCORCH),
         (124, 86, 132, 94, DARK)],
        [(100, 118, 116, 126, DARK), (108, 126, 124, 134, SCORCH),
         (100, 118, 108, 122, METAL)],
        [(60, 126, 76, 134, DARK), (68, 134, 84, 138, DARK),
         (108, 102, 124, 110, SCORCH), (116, 110, 132, 118, DARK),
         (116, 110, 124, 114, '#e78146')],
    ],
    'transport-ship': [
        [(60, 94, 76, 102, SCORCH), (60, 94, 68, 98, METAL)],
        [(100, 70, 108, 78, DARK), (108, 78, 116, 86, SCORCH),
         (124, 86, 132, 94, DARK)],
        [(68, 118, 84, 126, DARK), (76, 126, 92, 134, SCORCH),
         (68, 118, 76, 122, METAL)],
        [(108, 118, 124, 126, DARK), (100, 126, 116, 134, DARK),
         (124, 102, 140, 110, SCORCH), (116, 110, 132, 118, DARK),
         (116, 110, 124, 114, '#e78146')],
    ],
}

def load(kind, player):
    path = ROOT / f'assets/units/{kind}/{"blue" if player == 1 else "red"}/{kind}-{"blue" if player == 1 else "red"}-no-damage.png.base64'
    return Image.open(io.BytesIO(base64.b64decode(path.read_text()))).convert('RGBA')

sheet = Image.new('RGB', (1000, 4 * 220 + 35), '#243226')
labels = ImageDraw.Draw(sheet)
for stage, label in enumerate(['Healthy', 'Light damage', 'Moderate damage', 'Heavy damage', 'Critical']):
    labels.text((stage * 200 + 25, 10), label, fill='white')

for row, (kind, player) in enumerate((kind, player) for kind in MARKS for player in (1, 2)):
    original = load(kind, player)
    image = original.copy()
    offset = original.getbbox()[1] - load(kind, 1).getbbox()[1]
    previous = original
    for stage in range(5):
        if stage:
            draw = ImageDraw.Draw(image)
            # The original utility used 200px sprites. Current exports are exactly 2x.
            for left, top, right, bottom, color in MARKS[kind][stage - 1]:
                draw.rectangle((left * 2, top * 2 + offset, right * 2 - 1, bottom * 2 - 1 + offset), fill=color)
            image.putalpha(original.getchannel('A'))
            assert image.getchannel('A').tobytes() == original.getchannel('A').tobytes()
            assert image.tobytes() != previous.tobytes()
            # Preserve the water wake and the original silhouette.
            assert image.crop((0, 280 + offset, 400, 400)).tobytes() == original.crop((0, 280 + offset, 400, 400)).tobytes()
            data = io.BytesIO()
            image.save(data, format='PNG', optimize=True)
            color = 'blue' if player == 1 else 'red'
            name = f'{kind}/{color}/{kind}-{color}-damage-{stage}.png'
            (ROOT / f'assets/units/{name}.base64').write_text(base64.b64encode(data.getvalue()).decode() + '\n')
            previous = image.copy()
        preview = image.resize((200, 200), Image.Resampling.NEAREST)
        sheet.paste(preview, (stage * 200, row * 220 + 35), preview)
    labels.text((5, row * 220 + 235), f'{kind} - player {player}', fill='white')
(ROOT / 'tmp').mkdir(exist_ok=True)
sheet.save(ROOT / 'tmp/ship-damage-preview.png')
print('Created 16 damage variants using the recovered pixel-damage method. Alpha, silhouette, wake and stage progression verified.')
