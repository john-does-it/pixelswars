# Solo match saves

One unfinished AI match is kept in browser storage under `pixelswars-saved-match`.
The home page offers Resume, New game and Discard. Starting a different AI match
or restarting an unfinished one requires confirmation. Local multiplayer, online
matches, the tutorial and the development map do not replace this save.

The versioned save embeds the original map and keeps the units (including cargo),
health, ammunition, movement, capture state, ownership, economy, turn, selection,
undo origin, difficulty and AI purchasing preferences. Later map edits therefore
do not alter a saved battlefield. Incompatible rule/schema changes must increment
the save version or provide a migration.

Human actions are saved after their movement/combat animation completes. An
interruption during an animation restores the preceding complete action. AI turns
are checkpointed as a whole: interruption restores the beginning of that AI turn
and runs it again, without applying turn income twice. A finished match clears its
save. UI preferences remain in their existing separate storage.

Invalid or unsupported saves are preserved until the player explicitly replaces
or discards them. Storage errors are visible; a stale tab cannot overwrite a save
updated or deleted by another tab. Stored data is validated before restoration.

The profile JSON backup still contains only nickname, medals and preferences;
it does **not** include the unfinished match. Clearing site data removes that
match. No server account or cloud synchronization is involved.

## Map chooser metadata

`npm run generate:map-details` derives the chooser metadata from the map files;
development and production builds run it automatically. The chooser displays
only the Symmetrical and Mobile friendly badges below each preview. Symmetry compares gameplay terrain,
building ownership and starting armies under reflection or half-turn; decorative
variants do not matter. Mobile friendly estimates the fitted tile size inside a
320 × 480 px portrait board area, reserving the rest of a phone screen for controls.
Tiles must remain at least 32 px wide: this favours narrow portrait maps while
excluding overly tall maps too. It is a presentation heuristic, not a guarantee
for every phone or a game rule.

Transported passenger counts use the digit sprites in `assets/icons/numbers`.
Medal history lives on Progression only. Map titles stay on one line with an
ellipsis; the complete name remains available to assistive technology and on hover.

The chooser combines size checkboxes (XXS–XXL, using the same tile-count bands as
the cards) with optional Symmetrical and Mobile friendly tags. Selected sizes
are combined with OR; no size selected means all sizes. Selected tags
must all match. Results retain their ascending size order, with a result count,
an empty state and a reset button using the movement undo icon. Filters apply only to the map list, not the
saved match or development map.

Sizes and characteristics are separate groups of checkbox pills. “All sizes”
clears only size choices; the undo icon clears every filter. Filter state comes
from the URL (`size=XXS,XS`, `symmetrical=1`, `mobile=1`), so reloads, shared links
and browser Back restore it. Changes replace the current history entry without
scrolling or adding a history entry for every click. Unknown sizes are ignored;
unrelated query parameters and anchors are preserved.

At widths up to 640 px, the options start collapsed behind a Filters button.
Its count includes each selected size and each selected characteristic; “All
sizes” counts as zero. Results and reset remain accessible while collapsed.
Desktop always shows the options, independently of the mobile panel state.

`src/lib/game/map-catalog.ts` records retired map IDs. They are excluded from the
chooser and progression rows, while their routes, translations and data remain
available for existing saves, shared links and regression tests. Existing medals
are retained in profile backups. Retired IDs must not be reused.
