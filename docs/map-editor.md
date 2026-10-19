# Map editor

Water junctions inspect diagonal land as well as direct neighbors. North-west and north-east cliffs continue into open water, river bends and T junctions automatically. A narrow upstream river uses a matching narrow entrance. The original `-junction-nw-se` artwork remains unchanged. Decorative junction modifiers are recalculated when painting, importing, undoing, mirroring or loading a map; map edges never wrap around. Bridge supports, bridges and voids are excluded. Movement, terrain statistics and armies stay unchanged.

The corrective PNGs and shimmer masks are generated from existing sprites with `python scripts/generate-water-junctions.py` (Pillow required). `--check` verifies the assets, palette and unchanged pixels without writing files. The normal mode also creates an enlarged before/after comparison in `tmp/water-junctions/comparison.png`.

Open the map editor from the game homepage. The editor shares the game’s language preference (English, French, German or Japanese).
It uses the game's existing sprites and saves drafts only in the current browser.
For local development, run `npm run dev` and open http://127.0.0.1:5173/map-editor/.
The SvelteKit route in `src/routes/map-editor/+page.svelte` shares the root layout,
favicon, styles and language preferences. It is prerendered with the rest of the
site by `npm run build`; drawing and drafts run entirely in the browser.
`npm run map:editor` is a shortcut to start the same dev server and open the editor.

The route hosts `src/lib/components/MapEditor.svelte`. Development-only maps
can be opened directly with `?draft=ID`; each gets its own local editing save.
See [Draft maps](draft-maps.md) for generation, testing and publication.

1. Choose dimensions (2–32 columns and rows) and create a new grid, or load a copy
   of an existing map / import a JSON file.
2. Select a terrain or building and click or drag across the grid. Roads and
   water shores adapt to their neighbors. Choose an owner before painting buildings.
   Horizontal and vertical bridge brushes keep their chosen orientation. Paint them
   over water to create crossings, then connect roads at their ends. Bridges use
   road movement and defense rules; neighboring water stays open beneath them.
   Supports appear automatically on water directly below horizontal bridges and
   disappear when the bridge is removed; no separate water-under-bridge brush is needed.
   Water uses the existing shore sprites: use areas at least two cells thick for
   complete banks. Unsupported narrow shapes keep plain water rather than broken corners.
   Obstacles block ground units; only aircraft can cross or occupy them.
   **Void** cuts holes into the map using its background color, with no terrain stats.
   All units, including aircraft, are blocked. Painting void removes any unit on that
   cell; mirror mode and JSON export preserve the cutouts.
3. Choose a blue or red unit and place it. The eraser removes only units; painting
   water or obstacles removes ground units from that cell. Aircraft can be placed over both.
   Transport jeeps start empty; place their infantry separately. Players can load
   up to three adjacent infantry units during the match.
   Attack ships and transport ships can be placed on water and naval bases. Transport ships
   carry up to three infantry or ground vehicles (one slot each); loaded transports
   cannot be nested. Boarding from an adjacent shore costs one movement point.
   Deployment uses a free adjacent land cell and preserves remaining actions.
   Ships pass under bridges for 2 movement points per tile and cannot capture buildings.
   Ships cross straight under bridges without stopping, even beneath ground units.
   They need enough movement for the whole crossing and a free exit.
4. Set a name and numeric map ID, then **Exporter le JSON** to download `board-ID.json`.
   Submit it for review and integration into the game, translations and thumbnails.
   **JSON à copier** also provides the export as text if you prefer to copy and paste it.

The last draft is saved in this browser's local storage. Export important work:
clearing browser data removes that local copy. **Annuler** (Ctrl/Cmd + Z) restores
the last stroke, import or new grid; history lasts only until the page is reloaded.
Right-click paints grass in terrain mode or removes a unit in unit mode.
Cells also support keyboard activation with Enter/Space.

**Mirror mode → 180° rotation** pairs opposite cells and swaps blue/red units and
building owners. Both dimensions must be odd (3–31) while enabled. Start with an
odd-sized grid, then activate the mode: the top half replaces the bottom half,
and the left of the middle row replaces its right. Roads and shores reconnect
automatically. The centre cell stays neutral and cannot contain a unit. You can
paint from either side; undo restores both cells or reverses enabling the mode.
Bridge supports keep their downward perspective, never appearing above their
rotated counterpart or changing land into water. Vertical bridges keep their existing artwork.
The browser draft remembers the mode. Loading or importing a map disables it;
exported JSON contains only the playable map, without editor settings.

Export accepts an unfinished map with no armies, with a reminder to add both teams.
It validates dimensions, known terrain and unit types, ownership, duplicate units,
and ground units on water or obstacles. It does not automatically judge map balance or whether
both armies can reach each other. Loading/exporting never writes a game source file.

Run `npm run test:map-editor` for the browser smoke test. Editor rules and import/export
compatibility are also covered by the regular `npm test` command.

## Submit a map

Open an issue at https://github.com/john-does-it/pixelswars/issues/new and paste
the JSON inside a fenced code block. Include the map name, a short description
of its intended gameplay and optionally a screenshot. Make sure both armies are present
and can reach each other and the objectives. IDs can be reassigned on integration.
Submissions are reviewed; exporting does not automatically publish a map.

Naval bases belong on a coastline. Infantry can capture them, and their owner can
produce attack ships or transport ships using the usual production dialog. Ships
appear on the base and can sail onto adjacent water or under bridges.
Naval bases provide neither income nor repairs. Big cities provide 300$ per turn.
