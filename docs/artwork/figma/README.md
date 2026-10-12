# Figma asset catalog

Source: [Pixel’s War](https://www.figma.com/design/qXf7Ow0SFObOF7z0Q8dyLo/Pixel-s-War?node-id=0-1).

## Naming

Export roots use `category/name`, lowercase English words and hyphens. Export files add `@2x.png`. Keep the node ID as the stable identifier: renaming a node must not change its correspondence to code.

- `units/infantry-player-1@2x.png`: unit type and explicit player number.
- `cells/buildings/cell-city-on-grass-captured-by-1@2x.png`: terrain composition and ownership state.
- `cells/buildings-lit/…`: corresponding illuminated building variants.
- `icons/controls/zoom-in@2x.png`: action rather than visual appearance.
- `icons/cargo/passengers-2@2x.png`: passenger count.
- `source/kenney-tiny-battle/tile-0000@2x.png`: original source identifiers retained for traceability.
- `reference/…` and `units/damage-reference/…`: reference artwork, not automatically shipped to the game.

`-variant-2` disambiguates duplicate names without claiming that the drawings are identical. These variants must be visually compared before selecting a runtime replacement. Existing internal layer geometry and drawings are preserved.

## Export status

All 364 catalog entries have a PNG export preset at scale 2 with suffix `@2x` in Figma. The pages and principal asset groups have been renamed. `asset-catalog.json` records original names, Figma IDs, new names and export paths.

The browser ZIP contains 363 of the 364 catalogued exports. The old `icons/stats/icon-mov` node was not present in the ZIP; it is not used by the game. Files in `png-2x/` are base64-encoded PNG exports, matching this repository’s image storage convention.

The game uses 81 matched Figma assets through 261 runtime URLs, including derived damage stages and cropped unit variants. `runtime-mapping.json` records these correspondences; `src/lib/game/figma-assets.json` drives the URL resolver. Terrain CSS references the renamed PNGs directly. Display sizes stay unchanged, and unit placement is normalized to the original canvases before regenerating damage marks at double resolution.

Regenerate the runtime subset with `node scripts/import-figma-png.mjs`, then run `node --experimental-strip-types scripts/sync-assets.ts`. The import requires Playwright Chromium. Original PNG sources remain inputs for artwork generators. Assets without an unambiguous match, including anti-air and one oil-field partial-capture variant, keep their existing sources. Lit building exports are archived; the existing light overlays remain in use so animation timing and transparency are preserved.

The abandoned SVG export folder and duplicate road-preview SVGs were removed. Button controls keep their original SVG assets; their Figma PNG exports remain archived only. The approved road redesign and SVG authoring sources still required by generators remain intact.
