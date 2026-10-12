# Combat effects

`CombatEffects.svelte` renders four-frame muzzle flashes, impacts and destruction
sheets from `assets/effects/`. Effects do not alter damage, turn timing or input;
the combat controller owns sounds. Attacks and retaliation publish source/target
cells in multiplayer snapshots.

Muzzle positions live in `src/lib/game/combat-effects.json`. Coordinates use a
reference tile with the unit spanning x=0..1 and y=0.5..1.5; the component converts
them to its displayed sprite size. Update placement when changing unit artwork.

Movement and combat update the unit's horizontal `facing` through `facing.ts`.
Snapshots include facing for units and cargo. The local Unit facing preference
mirrors artwork and muzzle effects while leaving status icons fixed; disabling it
does not change shared state.

The animation preference disables effects. Reduced motion uses a brief still
frame and omits the second muzzle pulse. See [asset synchronization](../assets/README.md).
