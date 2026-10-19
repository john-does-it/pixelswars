# Game assets

`assets/` contains source sprites and audio. `static/assets/` is generated and ignored.
Keep one representation per bitmap: `.png.base64` or a native image, never both.

`cells/water/cell-water-junction-nw-se@2x.png.base64` preserves the supplied 532 × 532 PNG byte for byte. It joins the north-west cliff with the south-east bank; its companion SVG shimmer mask covers only the water highlight. The editor and game select it from neighboring terrain, with no extra brush to choose.

The other `cell-water-junction-*` variants retain the original 250 × 250 canvas and pixels outside their small corner corrections. Run `python scripts/generate-water-junctions.py` with Pillow to regenerate the PNG/base64 sprites, their PNG shimmer masks and a review sheet. `--check` verifies the stored outputs and palette. Northwest/northeast corners, narrow river entrances and T junctions use the original shore palette; no AI-generated pixels are included.

| Directory | Contents |
| --- | --- |
| `cells/` | Terrain, roads, buildings, capture variants, lighting and water masks |
| `units/` | Team sprites, damage stages and cropped previews |
| `icons/` | UI buttons, stats and passenger badges |
| `effects/` | Combat sprite sheets |
| `mp3/` | Music and sound effects |
| `map-previews/` | Homepage thumbnails |
| `temp/` | Incoming artwork, excluded from synchronization and preloading |

Assets are organized by their purpose, regardless of the design tool used to create them.
`src/lib/game/asset-aliases.json` maps stable gameplay paths to runtime filenames via
`asset-path.ts`. Terrain CSS also references runtime paths directly. Update both when
renaming sprites. The alias layer preserves existing gameplay naming conventions.

Units have five health bands: healthy above 80%, then damage stages at ≤80%, ≤60%,
≤40% and ≤20% of maximum HP. Each team and stage has a consistent canvas. `-fit`
variants serve compact previews. Infantry animation transforms the same sprite.
Pixel sprites use PNGs or hand-authored SVGs on a fixed pixel grid. UI controls and approved road tiles use SVG where supplied,
including some SVG exports that embed raster artwork. Converting a PNG wrapper to SVG
does not improve its resolution.

[Road connections](cells/ROAD_TILE_MAPPING.md) and [water tile naming](cells/WATER_TILE_MAPPING.md)
document tile conventions. Naval-base lighting uses a shared overlay. Other building
overlays preserve ownership and partial-capture variants.

```sh
node scripts/sync-assets.mjs
```

Synchronization decodes Base64, copies media, removes retired public files,
generates the visual preload manifest and updates the favicon. `npm ci`, `npm run dev`
and `npm run build` run it automatically. Files in `static/assets/temp/` are preserved
as incoming work and never added to the preload manifest. Do not commit generated public assets.
The favicon uses the original `units/infantry-2-damage-2-fit.png.base64` artwork.

For map thumbnails, run `npm run generate:map-previews` with the dev server running
and Playwright Chromium installed. For ship damage variants, run
`python scripts/generate-ship-damage.py` with Pillow installed, then synchronize assets.
The generator retains the hand-authored pixel impacts, silhouette and wake, and puts
its comparison sheet in ignored `tmp/`.

The artillery ship uses the approved blue SVG in `units/` as its source. Run
`node scripts/generate-artillery-ship.mjs` to regenerate the red palette and four
cumulative damage stages per team, then synchronize assets. Geometry, cannon and wake
stay unchanged; compact previews reuse the same SVGs.
