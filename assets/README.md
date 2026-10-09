# Game assets

This directory contains the game's source assets. `static/assets/` is generated and ignored by Git.

- `cells/`: terrain and building art. Water-tile provenance is documented in [WATER_TILE_MAPPING.md](cells/WATER_TILE_MAPPING.md).
	Oil fields use six native `cell-oil-field-on-grass*.png` sprites for neutral, captured and partially captured states.
	`cells/water-shimmer/` contains ripple-only masks derived from the existing water sprites. Regenerate them with `node scripts/generate-water-shimmer.mjs`, then run asset synchronization. They leave shorelines untouched.
  Road connections and junction variants are documented in [ROAD_TILE_MAPPING.md](cells/ROAD_TILE_MAPPING.md).
- `units/`: healthy and damaged sprites for both armies, plus cropped `-fit` variants used in previews and production menus.
- `icons/`: shared interface and resource icons.
  Pixel UI controls use the supplied SVGs through `UiIcon.svelte`; button labels and keyboard shortcuts remain on the controls themselves.
- `gifs/`: combat animation.
- `mp3/`: music and sound effects, including the infantry selection variants.
- `map-previews/`: homepage thumbnails generated from the maps.

Keep one source representation per bitmap, either the existing `.png.base64`/`.gif.base64`
text format or a native image. Do not keep both copies. Editable sniper SVGs are authoring
sources for their PNG exports and should be kept.

```sh
node --experimental-strip-types scripts/sync-assets.ts
```

This decodes Base64 sources, copies native assets and updates the visual preload manifest.
It also removes generated files whose source no longer exists. `npm ci`, `npm run dev`
and `npm run build` run synchronization automatically.

To regenerate artwork:

| Task | Command | Requirement |
| --- | --- | --- |
| Bitmap unit damage | `python scripts/draw-unit-damage.py` | Python and Pillow |
| One unit's damage | `python scripts/draw-unit-damage.py --only tank` | Python and Pillow |
| Sniper sprites and contact sheet | `node scripts/export-sniper-sprites.mjs` | Playwright Chromium |
| Transport sprites from supplied SVGs | `node scripts/export-transport-sprites.mjs`, then `python scripts/draw-unit-damage.py --only transport` | Playwright Chromium, Python and Pillow |
| Normalize an imported unit | `python scripts/normalize-unit-sprite.py INPUT OUTPUT.png` | Python and Pillow, writes `OUTPUT.png.base64` |
| Map thumbnails | `npm run generate:map-previews` | Running dev server and Playwright Chromium |

Run synchronization after modifying source files. See [damage artwork notes](../docs/unit-damage.md)
for health thresholds. Promotional artwork belongs in `docs/artwork/`, not this preloadable asset tree.
Keep experiments in the ignored root `tmp/` or `output/` directories.
