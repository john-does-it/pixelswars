# Game assets

`assets/` contains source sprites and audio. `static/assets/` is generated and ignored.
Keep one representation per bitmap: `.png.base64` or a native image, never both.

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
Pixel sprites remain PNGs. UI controls and approved road tiles use SVG where supplied,
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
