# Game assets

`assets/` contains source sprites and audio. `static/assets/` is generated and ignored.
Keep one representation per bitmap: `.png.base64` or a native image, never both.

`cells/water/cell-water-junction-nw-se@2x.png.base64` preserves the supplied 532 × 532 PNG byte for byte. It joins the north-west cliff with the south-east bank; its companion SVG shimmer mask covers only the water highlight. The editor and game select it from neighboring terrain, with no extra brush to choose.

The other `cell-water-junction-*` variants retain the original 250 × 250 canvas and pixels outside their small corner corrections. Run `python scripts/generate-water-junctions.py` with Pillow to regenerate the PNG/base64 sprites, their PNG shimmer masks and a review sheet. `--check` verifies the stored outputs and palette. Northwest/northeast corners, narrow river entrances and T junctions use the original shore palette; no AI-generated pixels are included.

| Directory | Contents |
| --- | --- |
| `cells/` | Terrain, roads, buildings, capture variants, lighting and water masks |
| `units/` | One sprite per unit, team and damage stage |
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
≤40% and ≤20% of maximum HP. Each team and stage has a consistent canvas. There are no separate preview or resolution variants. Infantry animation transforms the same sprite.
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
The favicon reuses `units/infantry/red/infantry-red-damage-2.png.base64`.

For map thumbnails, run `npm run generate:map-previews` with the dev server running
and Playwright Chromium installed. For ship damage variants, run
`python scripts/generate-ship-damage.py` with Pillow installed, then synchronize assets.
The generator retains the hand-authored pixel impacts, silhouette and wake, and puts
its comparison sheet in ignored `tmp/`.

The artillery ship uses the approved blue SVG in `units/` as its source. Run
`node scripts/generate-artillery-ship.mjs` to regenerate the red palette and four
cumulative damage stages per team, then synchronize assets. Geometry, cannon and wake
stay unchanged; compact previews reuse the same SVGs.

## Unit naming and display sizes

Canonical files follow `units/{type}/{color}/{type}-{color}-{damage}`, where color is
`blue` or `red` and damage is `no-damage` or `damage-1` through `damage-4`.
Keep the highest-quality source once; do not add `-preview`, `-fit` or `@2x` copies.
`unitSpritePath` resolves this path directly, without an alias table.

Use the shared `Sprite` component for portraits: S = 40 × 40, M = 64 × 64,
L = 96 × 96, XL = 124 × 124 CSS pixels. It preserves proportions with
`object-fit: contain` and crisp edges with `image-rendering: pixelated`.
Board sprites remain proportional to their cells and use the same files.
