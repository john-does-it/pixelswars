# Pixel’s War

Local two-player strategy, built with **SvelteKit 2 and Svelte 5 runes**.

## Development

Node.js 22.14 or newer:

```sh
npm ci
npm run dev
```

Open the Vite address. Routes: `/` (map selection), `/play/1/` (8 × 8),
`/play/2/` (12 × 8). Old board HTML URLs redirect to the new routes.

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

Tests cover both maps, desktop/mobile layouts, movement and cancellation, turns,
capture, income, purchases, occupied factories, combat, navigation and old URLs.
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

- `src/routes/`: map selection, game routes and compatibility redirects.
- `src/lib/components/`: Game, Board, Cell, Unit, GameHeader, StatsPanel,
  Controls, FactoryModal, VictoryModal and a shared native-dialog component.
- `src/lib/game/game.svelte.js`: creates a separate `$state` for each game.
- `src/lib/game/model.js`: initial state and rule queries.
- `src/lib/game/actions.js`: movement, capture, economy and turn actions.
- `src/lib/game/controller.js`: input and asynchronous combat coordination.
- `src/lib/game/combat-rules.js`: pure attack geometry and damage multipliers.
- `src/lib/game/catalog.js`: unit definitions, prices and terrain rules.
- `src/lib/data/`: original map layouts as JSON.
- `assets/`: image sources stored as `.png.base64` / `.gif.base64` text files,
  plus the original MP3 sounds. The prepare, predev and prebuild scripts decode
  images into ignored `static/assets/` and copy the audio for SvelteKit.
  `favicon.png.base64` similarly generates `static/favicon.png`.
  The decoded image bytes and public URLs are unchanged, including GIF animation.
  To edit artwork, decode its source, edit the image, then encode it back into
  the corresponding `.base64` file. Run `node scripts/sync-assets.js` to refresh
  a running preview after changing an image source. Generated files should not
  be committed.
- `static/css/sprites.css`: sprite mappings; layouts use scoped component CSS.
- `tests/`: Node rule tests and Playwright browser tests.

Components use `$props`, `$derived` and `$state`. Effects manage music and transient
income notifications. State belongs to a component instance: server rendering
and navigation never share another game's state. Pending combat work is
cancelled on disposal. Audio is created on mount and stopped on navigation.

The DOM renders state; it no longer stores it. There are no global game scripts,
DOM queries, manual HTML insertion or MutationObservers.
To add a unit, extend the catalog, supply sprites/sounds and add non-neutral
matchups to combat-rules.js. The factory enumerates the catalog automatically.

## Rules

Click/tap a unit and adjacent blue cells to move, or use arrows / ZQSD.
Enter confirms, Escape cancels, Space captures. On-screen controls provide
the same actions on touch devices.

Movement is orthogonal and pays the destination terrain cost. Attack ranges
are square and include diagonals. Artillery attacks at distances 2–3, excluding
all eight adjacent cells. Other current units attack at range 1.

| Attacker  | Infantry | Jeep | Tank | Artillery |
| --------- | -------- | ---- | ---- | --------- |
| Infantry  | 1        | 0.5  | 0.5  | 1.5       |
| Jeep      | 1.5      | 1    | 0.5  | 1         |
| Tank      | 1.5      | 1.5  | 1    | 0.5       |
| Artillery | 0.5      | 1    | 1.5  | 1         |

Damage preserves the original health/100 scaling and terrain defense formula.
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
