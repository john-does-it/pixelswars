from base64 import b64decode, b64encode
from io import BytesIO
from pathlib import Path
import sys

from PIL import Image

# Run after rendering map previews. The PNG remains the fallback and source.
directory = Path(__file__).resolve().parents[1] / "assets" / "map-previews"
sources = [directory / f"map-{int(id)}.png.base64" for id in sys.argv[1:]] or sorted(directory.glob("*.png.base64"))
for source in sources:
    with Image.open(BytesIO(b64decode(source.read_bytes()))) as image:
        webp = BytesIO()
        image.save(webp, format="WEBP", lossless=True, exact=True, method=6)
        webp.seek(0)
        with Image.open(webp) as decoded:
            if image.convert("RGBA").tobytes() != decoded.convert("RGBA").tobytes():
                raise ValueError(f"Pixel mismatch in {source.name}")
        dest = source.with_name(source.name.replace(".png.base64", ".webp.base64"))
        dest.write_bytes(b64encode(webp.getvalue()) + b"\n")
