# Map editor

Open the map editor from the game homepage. The editor shares the game’s language preference (English, French or German).
It uses the game's existing sprites and saves drafts only in the current browser.
For local development, run `npm run map:editor` and open http://127.0.0.1:5182/.
The same editor is bundled into `static/map-editor/` before `npm run dev` and
`npm run build`, so GitHub Pages also serves it at `/map-editor/index.html`.
Run `npm run build:map-editor` to refresh that generated copy after editor changes.

1. Choose dimensions (2–32 columns and rows) and create a new grid, or load a copy
   of an existing map / import a JSON file.
2. Select a terrain or building and click or drag across the grid. Roads and
   water shores adapt to their neighbors. Choose an owner before painting buildings.
   Horizontal and vertical bridge brushes keep their chosen orientation. Paint them
   over water to create crossings, then connect roads at their ends. Bridges use
   road movement and defense rules; neighboring water stays open beneath them.
   Water uses the existing shore sprites: use areas at least two cells thick for
   complete banks. Unsupported narrow shapes keep plain water rather than broken corners.
3. Choose a blue or red unit and place it. The eraser removes only units; painting
   water removes ground units from that cell. Aircraft can be placed over water.
   Transport jeeps start empty; place their infantry separately. Players can load
   up to three adjacent infantry units during the match.
4. Set a name and numeric map ID, then **Exporter le JSON** to download `board-ID.json`.
   Submit it for review and integration into the game, translations and thumbnails.
   **JSON à copier** also provides the export as text if you prefer to copy and paste it.

The last draft is saved in this browser's local storage. Export important work:
clearing browser data removes that local copy. **Annuler** (Ctrl/Cmd + Z) restores
the last stroke, import or new grid; history lasts only until the page is reloaded.
Right-click paints grass in terrain mode or removes a unit in unit mode.
Cells also support keyboard activation with Enter/Space.

Export accepts an unfinished map with no armies, with a reminder to add both teams.
It validates dimensions, known terrain and unit types, ownership, duplicate units,
and ground units on water. It does not automatically judge map balance or whether
both armies can reach each other. Loading/exporting never writes a game source file.

Run `npm run test:map-editor` for the browser smoke test. Editor rules and import/export
compatibility are also covered by the regular `npm test` command.

## Submit a map

Open an issue at https://github.com/john-does-it/pixelswars/issues/new and paste
the JSON inside a fenced code block. Include the map name, a short description
of its intended gameplay and optionally a screenshot. Make sure both armies are present
and can reach each other and the objectives. IDs can be reassigned on integration.
Submissions are reviewed; exporting does not automatically publish a map.
