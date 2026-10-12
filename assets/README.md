# Game assets

`assets/` contains source artwork and audio. `static/assets/` is generated and ignored.
Keep one representation per bitmap: `.png.base64` or a native image, never both.

| Directory       | Contents                                                                               |
| --------------- | -------------------------------------------------------------------------------------- |
| `figma/`        | Runtime PNG ×2 exports, including healthy/damaged units and cropped `-fit` variants    |
| `cells/`        | Approved road SVGs, oil-field sprites, building-light overlays and water-shimmer masks |
| `icons/`        | Original pixel UI buttons and passenger badges                                         |
| `effects/`      | Combat sprite sheets                                                                   |
| `mp3/`          | Music and sound effects                                                                |
| `map-previews/` | Homepage thumbnails                                                                    |
| `units/`        | Original damaged red infantry artwork retained for the favicon                         |

The [Figma source](https://www.figma.com/design/qXf7Ow0SFObOF7z0Q8dyLo/Pixel-s-War)
is organized by asset category. `src/lib/game/figma-assets.json` maps stable gameplay
paths to exported PNG filenames through `asset-path.ts`. Terrain CSS uses exported
paths directly. Keep both mappings consistent when renaming artwork.

Units have five health bands: healthy above 80%, then damage stages at ≤80%, ≤60%,
≤40% and ≤20% of maximum HP. Each team and stage has a consistent canvas; `-fit`
variants serve compact previews. Infantry animation transforms the same sprite.
UI buttons and approved roads retain their original SVGs.

[Road connections](cells/ROAD_TILE_MAPPING.md) and [water tile naming](cells/WATER_TILE_MAPPING.md)
document the tile conventions. Oil-field lighting states share one identical overlay.
Other building overlays preserve ownership and partial-capture variations.

```sh
node scripts/sync-assets.mjs
```

Synchronization decodes Base64, copies native media, removes stale public files,
generates the visual preload manifest and updates the favicon. `npm ci`, `npm run dev`
and `npm run build` run it automatically. Do not commit generated public assets.

For map thumbnails, run `npm run generate:map-previews` with the dev server running
and Playwright Chromium installed. Promotional artwork belongs in `docs/artwork/`.
