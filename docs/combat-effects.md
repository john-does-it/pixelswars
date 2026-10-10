# Combat effects

`CombatEffects.svelte` renders muzzle flashes, impact puffs, and destruction
bursts above the battlefield without changing combat damage or turn timing.
Sounds remain owned by the combat controller. Both attacks and retaliation
publish their source and target cells in multiplayer snapshots (protocol 3).

The four-frame sprite sheets come from the supplied GIF in
`scripts/source-assets/combat-effects.gif.base64`. Frames share a fixed canvas,
have their solid background removed, and are resized with nearest-neighbor
sampling. The game preloads the three sheets in `assets/effects/`.

Regenerate the sheets and standalone preview with Pillow and Node installed:

```sh
python scripts/preview-combat-effects.py --export
node --experimental-strip-types scripts/sync-assets.ts
```

Open `tmp/combat-effects/preview.html` to compare all units with sound. Muzzle
centers are shared by the preview and game in `src/lib/game/combat-effects.json`.
Coordinates use the preview tile: the unit spans x=0..1 and y=0.5..1.5. The game
converts those positions to its centered 90% sprite size.

Runtime units retain their last horizontal `facing`. Movement and combat update
it through `facing.ts`; snapshots include facing for units and cargo. The local
Unit facing preference mirrors only artwork and muzzle effects, leaving status
icons fixed. Disabling it uses the original sprite orientation without changing
the shared match state.

The animation preference disables these effects. Reduced motion shows a brief
still frame instead of sprite animation and omits the second muzzle pulse.
Effects are decorative and cannot intercept board input.
