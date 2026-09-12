from pathlib import Path
import re, base64, io, json, sys
from PIL import Image
out={}
for p in Path('temp-assets').glob('*.svg'):
    text=p.read_text()
    images=[Image.open(io.BytesIO(base64.b64decode(x))).convert('RGBA') for x in re.findall(r'data:image/png;base64,([^"\s]+)',text)]
    if p.name.startswith('cell-'):
        im=Image.new('RGBA',(125,125))
        for x,y,w,h in [(0,0,63,63),(63,0,62,63),(0,63,63,62),(63,63,62,62)]:
            im.paste(images[0].resize((w,h),Image.Resampling.NEAREST),(x,y))
        building=images[1].resize((100,100),Image.Resampling.NEAREST)
        if 'half' in p.name: building.putalpha(building.getchannel('A').point(lambda a:round(a*0.5)))
        im.alpha_composite(building,(13,13))
        folder='cells'
    else:
        im=Image.new('RGBA',(200,200))
        t=re.search(r'translate\(([\d.]+) ([\d.]+)\)',text)
        xy=tuple(round(float(v)*200) for v in t.groups()) if t else (37, 37)
        im.alpha_composite(images[0].resize((125,125),Image.Resampling.NEAREST),xy)
        folder='units'
    b=io.BytesIO();im.save(b,format='PNG');out[f'assets/{folder}/{p.stem}.png']=base64.b64encode(b.getvalue()).decode()
# The missing blue half-captured export uses the same 50% building opacity.
name='cell-airport-on-grass-captured-by-1'
p=Path('temp-assets')/(name+'.svg');text=p.read_text()
images=[Image.open(io.BytesIO(base64.b64decode(x))).convert('RGBA') for x in re.findall(r'data:image/png;base64,([^"\s]+)',text)]
im=Image.new('RGBA',(125,125))
for x,y,w,h in [(0,0,63,63),(63,0,62,63),(0,63,63,62),(63,63,62,62)]:im.paste(images[0].resize((w,h),Image.Resampling.NEAREST),(x,y))
building=images[1].resize((100,100),Image.Resampling.NEAREST);building.putalpha(building.getchannel('A').point(lambda a:round(a*0.5)));im.alpha_composite(building,(13,13));b=io.BytesIO();im.save(b,format='PNG');out['assets/cells/cell-airport-on-grass-halfcaptured-by-1.png']=base64.b64encode(b.getvalue()).decode()
out = {name.replace('/helico-', '/helicopter-'): content for name, content in out.items()}
if '--stdout' in sys.argv:
    print(json.dumps(out))
else:
    for name, content in out.items():
        path = Path(name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(base64.b64decode(content))
        path.with_suffix(path.suffix + '.base64').write_text(content + '\n')
