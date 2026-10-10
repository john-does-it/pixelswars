"""Extract the supplied GIF's effects and build a standalone combat preview.

Usage: python scripts/preview-combat-effects.py [path/to/pack.gif] [--export]
Requires Pillow and Node. --export also updates the in-game sprite sheets.
"""

import base64
import io
import json
import sys
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'tmp' / 'combat-effects'
OUTPUT.mkdir(parents=True, exist_ok=True)


def data_url(image):
    buffer = io.BytesIO()
    image.save(buffer, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(buffer.getvalue()).decode()


arguments = [arg for arg in sys.argv[1:] if arg != '--export']
pack = Image.open(arguments[0] if arguments else io.BytesIO(base64.b64decode((ROOT / 'scripts/source-assets/combat-effects.gif.base64').read_text())))
effects = {}
# The pack uses a 9 × 7 grid of 96px effects, animated over four GIF frames.
for name, column, row in [('muzzle', 7, 0), ('impact', 7, 3), ('destruction', 5, 5)]:
    frames = []
    for frame in range(pack.n_frames):
        pack.seek(frame)
        source = pack.convert('RGBA')
        background = source.getpixel((863, 0))[:3]
        crop = source.crop((column * 96, row * 96, (column + 1) * 96, (row + 1) * 96))
        crop.putdata([(r, g, b, 0 if (r, g, b) == background else a) for r, g, b, a in crop.getdata()])
        # Keep all frames on the same canvas: individual trimming would jitter.
        frames.append(crop.resize((48, 48), Image.Resampling.NEAREST))
    strip = Image.new('RGBA', (48 * len(frames), 48))
    for frame, image in enumerate(frames):
        strip.paste(image, (48 * frame, 0))
    strip.save(OUTPUT / f'{name}.png')
    effects[name] = data_url(strip)
    if '--export' in sys.argv:
        destination = ROOT / 'assets' / 'effects'
        destination.mkdir(parents=True, exist_ok=True)
        (destination / f'{name}.png.base64').write_text(effects[name].split(',')[1] + '\n')


def sprite(name):
    path = ROOT / 'assets' / 'units' / (name + '.png.base64')
    return 'data:image/png;base64,' + ''.join(path.read_text().split())


catalog = json.loads(subprocess.check_output(
    ['node', '--experimental-strip-types', '--input-type=module', '-e',
     "import {unitTypes} from './src/lib/game/catalog.ts'; console.log(JSON.stringify(unitTypes))"],
    cwd=ROOT, text=True))
sprites = {f'{unit}-{team}': sprite(f'{unit}-{team}') for unit in catalog for team in [1, 2]}
sprites['tank-2-damage-2'] = sprite('tank-2-damage-2')
sounds = {}
for name in {'bombing', *(unit['fightSound'] for unit in catalog.values()), *(unit['impactSound'] for unit in catalog.values() if 'impactSound' in unit)}:
    sounds[name] = 'data:audio/mpeg;base64,' + base64.b64encode((ROOT / 'assets' / 'mp3' / f'{name}.mp3').read_bytes()).decode()
grass_path = ROOT / 'assets' / 'cells' / 'cell-grass.png.base64'
grass = 'data:image/png;base64,' + ''.join(grass_path.read_text().split())
template = (ROOT / 'scripts' / 'combat-effects-preview.html').read_text(encoding='utf-8')
positions = json.loads((ROOT / 'src/lib/game/combat-effects.json').read_text())
html = template.replace('__PREVIEW_DATA__', json.dumps({'effects': effects, 'sprites': sprites, 'grass': grass, 'units': catalog, 'sounds': sounds, 'muzzlePositions': positions}))
(OUTPUT / 'preview.html').write_text(html, encoding='utf-8')
print(OUTPUT / 'preview.html')
