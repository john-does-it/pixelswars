# Pixel’s War

Local two-player strategy, built with **SvelteKit 2 and Svelte 5 runes**.

## Development

Node.js 22.14 or newer:

```sh
npm ci
npm run dev
```

Open the Vite address. Routes: `/` (map selection), `/play/1/` (8 × 8),
`/play/2/` (12 × 8), through `/play/9/`. The obsolete board HTML routes have been removed.

```sh
npm run check
npm run format:check
npm test
npm run build
npm run preview
```

The static production site is generated in `build/`. Serve it over HTTP;
opening source HTML via file:// is no longer supported.

### Browser tests

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

Tests cover all nine maps, desktop/mobile layouts, movement and cancellation, turns,
capture, income, purchases, occupied factories, combat, navigation, settings and minimap navigation.
To use installed Chrome instead, set `PW_CHANNEL=chrome`
(PowerShell: `$env:PW_CHANNEL = 'chrome'`).

## Architecture

### Code style

Use tabs, single quotes, no JavaScript semicolons and no trailing commas, as defined
in `.prettierrc`. Keep Svelte blocks and container children on separate indented
lines. Keep short text elements and attributes inline. Separate CSS rules with a
blank line; nest descendants, `&` variants and relevant media queries under their
own selector. Keep the `<script>`, markup and `<style>` sections distinct.

Run `npm run format` before committing. CI checks these conventions with
`npm run format:check`.

- `src/routes/`: map selection and game routes.
- `src/lib/components/`: Game, Board, Cell, Unit, GameHeader, StatsPanel,
  Controls, ProductionModal, VictoryModal and a shared native-dialog component.
- `src/lib/game/game.svelte.ts`: creates a separate `$state` for each game.
- `src/lib/game/model.ts`: initial state and rule queries.
- `src/lib/game/actions.ts`: movement, capture, economy and turn actions.
- `src/lib/game/controller.ts`: input and asynchronous combat coordination.
- `src/lib/game/combat-rules.ts`: pure attack geometry and damage multipliers.
- `src/lib/game/catalog.ts`: unit definitions, prices and terrain rules.
- `src/lib/data/board-N.json`: one explicit, editable JSON file per map.
- `assets/`: image sources stored as `.png.base64` / `.gif.base64` text files,
  plus the original MP3 sounds. The prepare, predev and prebuild scripts decode
  images into ignored `static/assets/` and copy the audio for SvelteKit.
  `favicon.png.base64` similarly generates `static/favicon.png`.
  The decoded image bytes and public URLs are unchanged, including GIF animation.
  To edit artwork, decode its source, edit the image, then encode it back into
  the corresponding `.base64` file. Run `node --experimental-strip-types scripts/sync-assets.ts` to refresh
  a running preview after changing an image source. Generated files should not
  be committed.
- `src/lib/app.css`: global styles and sprite mappings; layouts use scoped component CSS.
- `tests/`: Node rule tests and Playwright browser tests.

Components use `$props`, `$derived` and `$state`. Effects manage music and transient
income notifications. State belongs to a component instance: server rendering
and navigation never share another game's state. Pending combat work is
cancelled on disposal. Audio is created on mount and stopped on navigation.

The DOM renders game state; it no longer stores it. Board DOM measurements only
manage scrolling, keyboard focus and the minimap viewport.
To add a unit, extend the catalog, supply sprites/sounds and add non-neutral
matchups to combat-rules.ts. The army base enumerates the catalog automatically.

## Rules

Click/tap a unit and adjacent blue cells to move, or use arrows with the selectable ZQSD / WASD keyboard layout.
Enter confirms, Escape cancels, Space captures. On-screen controls provide
the same actions on touch devices. Mobile maps include an interactive overview:
tap or drag on the minimap to center the visible area, or use the edge arrow
buttons. Language, audio and keyboard settings live in Options and help.

Movement is orthogonal and pays the destination terrain cost. Attack ranges
are square and include diagonals. Artillery attacks at distances 2–4, excluding
all eight adjacent cells. Snipers attack at distances 2–3; anti-air attacks at 1–2.
Other current units attack at range 1. Mountains extend ranged ground units'
maximum range by one.

| Attacker  | Infantry | Jeep | Tank | Artillery |
| --------- | -------- | ---- | ---- | --------- |
| Infantry  | 1        | 0.5  | 0.5  | 1.5       |
| Jeep      | 1.5      | 1    | 0.5  | 1         |
| Tank      | 1.5      | 1.5  | 1    | 0.5       |
| Artillery | 0.5      | 1    | 1.5  | 1         |

Damage scales with the attacker's remaining health divided by its maximum health.
A fully healthy unit uses its listed attack without an extra bonus for having more
than 100 maximum health. Terrain and unit defense retain their existing formula.
Health is rounded and clamped to zero. A surviving defender retaliates if its
own range and matchup allow it; retaliation does not consume an attack point.
A zero multiplier forbids targeting. Tanks cannot target aircraft, planes or
helicopters. Unspecified matchups remain neutral.

Infantry removes 10 capture points per action from a 20-point building.
Capture and combat commit a unit's position, so cancellation cannot undo a
performed action. Cities pay 200$ to the incoming owner; hospitals heal that
owner's units by up to 25, capped at maximum health. Factories require ownership,
a free cell and sufficient funds. Turn changes reset capacities for all units,
as in the prototype. Eliminating all opposing units wins the game.

## GitHub Pages

The root HTML pages are replaced by the generated SvelteKit site.
Pages must publish the generated artifact, not the source branch.

After merging:

1. In Settings → Pages, select **GitHub Actions** as the source.
2. Run the manual **Deploy GitHub Pages** workflow on the branch to publish.

The workflow builds with `BASE_PATH=/pixelswars` for the repository URL.
For a custom domain/root deployment, change that value to an empty string.
To build for a repository path locally in PowerShell:

```powershell
$env:BASE_PATH = '/pixelswars'
npm run build
Remove-Item Env:BASE_PATH
```

A separate CI workflow checks components, rules, builds and desktop/mobile
browser behavior. Deployment is manual; pushing this migration does not
automatically deploy it.

## Credits

Programming: [John Does it](https://johndoesit.be).
Art: [Kenney](https://www.kenney.nl).
Sounds: [Pixabay](https://pixabay.com/fr/sound-effects).
Music: [Monolith](https://arcofdream.bandcamp.com/album/monolith-official-soundtrack).
QA: Gauthier Miessen.

Feedback and contributions: hello@johndoesit.be.

## Air units and airports

Map 2 has one neutral airport on a central tile (row 4, column 7).
Captured airports produce helicopters at 1800$ and planes at 3000$. Army bases
produce ground units, including rocket infantry at 400$. An occupied production
tile blocks purchases.
Planes have 120 health, 10 movement and one adjacent attack per turn. Each empty
tile costs exactly 1 movement, with no terrain defense bonus. They can attack
both ground and air targets; anti-air can target and retaliate against aircraft.
Helicopters have 110 health, 8 movement and one adjacent attack.
They are strong against infantry, neutral against vehicles and weak against planes.
Air units cannot capture buildings; one unit per tile still applies.
Rocket infantry has infantry health/defense, 4 movement and one attack per turn,
2.5× damage against every vehicle, and 0.5× against regular infantry. Every unit
deals increased damage to it, making it an offensive specialist. It can capture
and secure buildings. All units have five health-based sprite stages for both players.

## Snipers and high ground

Army bases train snipers for 500$: 100 health, 60 attack, 10 defense, 4 movement
and one attack per turn. Their range is 2–3, so they cannot retaliate at contact.
They deal ×1.5 damage against infantry, rockets and other snipers, ×1 against artillery, and can capture
buildings. They share infantry target restrictions and cannot attack aircraft.

Mountains cost 4 movement. Ranged ground units on a mountain gain +1 maximum
range while keeping their minimum range: sniper 2–4, artillery 2–5, anti-air 1–3.
Artillery costs 1400$ and has 4 movement; artillery and anti-air both have 30 defense.

The original sniper vectors are kept in `assets/temp/`. Run
`node scripts/export-sniper-sprites.mjs` to generate both teams' healthy and four
damage stages, full and cropped PNG sources, and `docs/sniper-damage-variants.png`.
Scratches use individual outline-colored pixel blocks. Red-team wounds use darker
reds for contrast. Run `npm run prebuild` afterward to synchronize public assets.
