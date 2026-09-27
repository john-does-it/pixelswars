# Pixel’s War

**Capture cities. Build your army. Outsmart the AI or a friend.**

A pixel-art, turn-based strategy game for desktop and mobile. Choose your battlefield,
secure its economy and combine infantry, armor and air power to win.

**[Play in your browser](https://john-does-it.github.io/pixelswars/)** · No installation required

![Map selection in Pixel’s War](docs/screenshots/home.png)

- **12 battlefields:** roads, forests, mountain positions and narrow water crossings.
- **9 unit types:** capture with infantry, cover advances with artillery and contest the skies.
- **4 AI difficulties:** Easy, Medium, Hard and Expert, or local two-player battles on one device.
- **Online duels:** invite a friend on another device through a direct WebRTC connection.
- **Desktop and mobile:** keyboard, mouse and touch controls, with interactive minimaps on narrow screens.
- **English, French and German:** language, audio and keyboard settings in Options and help.

![A battlefield with the selected unit’s actions and statistics](docs/screenshots/battlefield.png)

<p align="center">
  <img src="docs/screenshots/mobile.png" width="360" alt="Mobile battlefield with minimap navigation and touch controls">
</p>

## How to play

Destroy every opposing unit to win. During your turn, you can move and use the
available actions of **all your units**, in any order. End the turn when finished.
Blue plays first; in AI matches, the AI commands blue and you command red.

Select a unit, then click or tap diamond-marked neighboring cells to move, or an
eligible enemy to attack. Confirm finishes the selection; cancel restores movement
to the last committed position. Attacking or capturing commits that position,
so cancelling cannot undo those actions.

Both friendly and enemy attack ranges use the same striped overlay, in the
unit's team color. Movement diamonds remain visible on cells within that range.

With no friendly unit selected, click or tap an enemy to inspect its attack range.
Striped cells show the range from its **current position**, including mountain
bonuses and minimum-range exclusions. Unit targeting restrictions still apply;
the overlay does not predict movement or damage. Click the enemy again, an empty cell, or
press Escape to dismiss. Inspecting an out-of-range enemy preserves any pending
friendly movement; an eligible attack still takes priority when a friendly unit
is selected.

| Action           | Keyboard                                      |
| ---------------- | --------------------------------------------- |
| Move             | Arrow keys or the selected ZQSD / WASD layout |
| Confirm          | Enter                                         |
| Cancel / close   | Escape                                        |
| Capture / secure | Space                                         |

On mobile, use the contextual action buttons, swipe the battlefield horizontally,
or tap/drag either minimap to reposition the view. Minimap navigation appears
when the board overflows its container. The camera follows AI and online opponent actions.
Settings are stored in browser session cookies; English is the default language.
Turning sound off also disables music.

### Play with a friend online

Choose a map, then **Play 1v1 online**:

1. The host creates an invitation and sends its link to a friend.
2. The friend opens the link and clicks **Join**. The connection is automatic; there is no response code to send back.
3. The host commands blue and plays first; the guest commands red.

Keep both game pages open. A temporary connection loss pauses play and reconnecting
resynchronizes the match. Closing or refreshing either page ends the session;
matches are not saved. After victory, both players must agree to a rematch.

The browsers exchange game data through WebRTC, directly or through a TURN relay. The host validates
actions and supplies the shared game state. This is intended for friends: the host
can technically alter that state. No account or game server is required.
[PeerJS Cloud](https://peerjs.com/server/cloud) exchanges the connection details
automatically. When configured, Metered supplies STUN/TURN servers so WebRTC can
use a relay when a direct path is unavailable. Without Metered settings, development
uses Google's public STUN service only. Creating or joining contacts these services,
but browsing maps or opening an invitation does not. Network restrictions, provider
outages and exhausted relay quotas can still prevent connections.

The invitation contains a random session identifier, map and game fingerprint;
it no longer contains the full WebRTC session description. Share it only with your
opponent. A session accepts one guest, and expired, occupied or incompatible
invitations show a recoverable error. Existing manual `PW1` invitations must be recreated.

The [terms, privacy and cookies page](https://john-does-it.github.io/pixelswars/terms/)
explains session cookies, third-party services and connection limits in all three
languages. The invitation screen focuses on creating or joining a game.

Use the published site when inviting someone on another device. A development
link containing `127.0.0.1` points to the recipient's own computer.

### Buildings and economy

All three infantry types can capture and secure buildings. Buildings have 20
capture points, and a capture removes 10. Each infantry unit can capture once per
turn, so two units can finish a capture together. Securing a building you already
own restores all its capture points in one action.

| Building  | Benefit                                                                              |
| --------- | ------------------------------------------------------------------------------------ |
| City      | Adds 200$ at the start of each owner's turn                                          |
| Hospital  | Heals a friendly unit standing on it by up to 50 HP at the start of the owner's turn |
| Army base | Produces ground units                                                                |
| Airport   | Produces helicopters and planes                                                      |

Healing never exceeds maximum health; a floating label shows the HP actually
recovered at the start of the turn. To buy a unit, you must own the production
building, leave its cell empty and have enough money. New units can act immediately.

### Units

Movement is a points budget, not a number of cells. Attack and defense are inputs
to the damage formula below; attack is not the final damage dealt.

| Unit       |  Cost |  HP | Movement | Attacks / turn | Attack | Defense | Range |
| ---------- | ----: | --: | -------: | -------------: | -----: | ------: | ----- |
| Infantry   |  200$ | 100 |        5 |              2 |     40 |      10 | 1     |
| Rocket     |  400$ | 100 |        4 |              1 |     40 |      10 | 1     |
| Sniper     |  500$ | 100 |        4 |              1 |     60 |      10 | 2–3   |
| Jeep       |  600$ | 125 |        8 |              2 |     50 |      20 | 1     |
| Tank       | 1200$ | 180 |        6 |              2 |     70 |      40 | 1     |
| Artillery  | 1600$ | 120 |        4 |              1 |     60 |      30 | 2–4   |
| Anti-air   | 1000$ | 120 |        6 |              2 |     70 |      30 | 1–2   |
| Helicopter | 1800$ | 110 |        8 |              1 |     65 |      15 | 1     |
| Plane      | 3000$ | 120 |       10 |              1 |     80 |      25 | 1     |

Infantry captures objectives. Rockets counter vehicles; snipers counter infantry.
Jeeps are fast and effective against infantry, while tanks combine armor and two
attacks. Artillery softens ground targets from a distance, but cannot fire at
adjacent cells. Anti-air attacks only flying units. Helicopters hunt infantry;
planes can attack both ground and air units. Other ground units cannot target
flying units.

### Terrain and range

Movement is orthogonal and pays the destination cell's cost. One unit occupies a
cell at a time. Attack ranges are square, including diagonals.

| Terrain  | Ground movement cost | Defense |
| -------- | -------------------: | ------: |
| Road     |                    1 |       0 |
| Grass    |                    2 |       0 |
| Building |                    2 |      40 |
| Forest   |                    3 |      30 |
| Mountain |                    4 |      50 |
| Water    |           Impassable |       0 |

Flying units spend 1 movement point per cell regardless of terrain, and receive
no terrain defense. There are no playable naval units yet.

Ranged ground units on a mountain gain **+1 maximum range**, keeping their minimum
range: sniper 2–4, artillery 2–5, anti-air 1–3. Melee and flying units gain no range.

On grass, infantry can cross two cells per turn, tanks three and jeeps four.
Roads stretch these distances; forests and mountains shorten them.

### Combat and artillery balance

Damage is calculated before rounding the defender's remaining health:

```text
base damage = max(0, attack − (unit defense + terrain defense) / 10)
damage = base damage × (attacker HP / attacker maximum HP) × matchup multiplier
remaining HP = max(0, round(defender HP − damage))
```

A surviving defender retaliates if its own range and matchup allow it. Retaliation
uses its remaining health and does not spend an attack point. Snipers and artillery
cannot retaliate at contact. A forbidden matchup cannot be selected as a target.

A full-health artillery shot against a full-health target on grass or road gives:

| Target                     | Matchup multiplier | Starting HP | Remaining HP |
| -------------------------- | -----------------: | ----------: | -----------: |
| Infantry, Rocket or Sniper |              ×1.35 |         100 |       **20** |
| Jeep                       |              ×1.45 |         125 |       **41** |
| Anti-air                   |              ×1.25 |         120 |       **49** |
| Tank                       |              ×1.60 |         180 |       **90** |
| Artillery                  |              ×1.00 |         120 |       **63** |

All infantry types take the same artillery damage under the same conditions.
Terrain protection and damage to the attacker reduce these losses. Artillery
cannot destroy any of these full-health targets with one shot; its single attack,
price and adjacent blind spot leave room for faster units to close in.

The complete matchup table lives in [combat-rules.ts](src/lib/game/combat-rules.ts).
Unit and terrain statistics live in [catalog.ts](src/lib/game/catalog.ts).

### AI opponents

Easy, Medium, Hard and Expert use the same units, budgets and rules as the player.
Higher levels improve targeting, positioning and purchases. Expert also evaluates
short sequences of future actions and economic opportunities; it is a bounded
search, not an exhaustive solution of the game.

See [AI rules and implementation notes](docs/ai.md) for each difficulty's behavior.

## Development

Built with **SvelteKit 2, Svelte 5 runes and Paraglide**. Requires Node.js 22.14 or newer:

```sh
npm ci
npm run dev
```

Open the Vite address. The home route is `/`; games use `/play/1/` through
`/play/12/`. Add `?ai=easy`, `?ai=medium`, `?ai=hard` or `?ai=expert`
to play against the AI, or `?online=1` for online setup. Without either parameter,
the game is local two-player.

```sh
npm run check
npm run format:check
npm test
npm run build
npm run preview
```

The production site is generated in `build/`; serve it over HTTP.
`npm run check` generates Paraglide messages and declarations before checking
Svelte. `npm run generate:i18n` runs generation separately. Both generation and
Vite use `paraglide.config.js`; generated `src/lib/paraglide/` files are ignored.

### Browser tests

```sh
node node_modules/@playwright/test/cli.js install chromium
npm run build
npm run test:e2e
```

Playwright covers desktop/mobile play, map navigation, movement, combat, capture,
economy, settings, minimaps, AI and real WebRTC matches between two browser contexts.
Online browser tests start a real local PeerServer and use local ICE candidates;
they do not depend on the public signaling service or verify connectivity across
different internet connections. Their browser contexts bypass CSP only to allow
the temporary local signaling port. Production CSP allows the PeerJS Cloud
WebSocket endpoint explicitly. To use installed Chrome, set
`PW_CHANNEL=chrome` (PowerShell: `$env:PW_CHANNEL = 'chrome'`).

### Project layout

| Location                                     | Responsibility                                           |
| -------------------------------------------- | -------------------------------------------------------- |
| `src/routes/`                                | Map selection and game routes                            |
| `src/lib/components/`                        | Board, controls, stats, dialogs and other UI             |
| `src/lib/game/game.svelte.ts`, `model.ts`    | Per-game state and rule queries                          |
| `src/lib/game/actions.ts`, `controller.ts`   | Actions, input and asynchronous combat                   |
| `src/lib/game/catalog.ts`, `combat-rules.ts` | Statistics, terrain, attack geometry and damage          |
| `src/lib/game/ai*.ts`, `expert-ai.ts`        | AI decisions, economy and bounded lookahead              |
| `src/lib/game/peer.ts`, `online.ts`          | WebRTC invitations, authoritative commands and snapshots |
| `src/lib/data/board-N.json`                  | Explicit, editable map layouts                           |
| `messages/`                                  | English, French and German source translations           |
| `assets/`, `src/lib/app.css`                 | Artwork/audio sources, global styles and sprite mappings |
| `tests/`                                     | Node rule tests and Playwright browser tests             |

Components use Svelte runes. Each game owns its state; navigation disposes pending
combat and audio. The DOM displays state rather than storing game rules. Board
measurements control scrolling, focus and minimap positioning.

Online peers check a fingerprint of the map, unit statistics, terrain and protocol
version before connecting. Bump `protocolVersion` in `peer.ts` when changing command
semantics or combat rules so incompatible clients cannot start a match together.

To add a unit, extend the catalog, provide sprites and translations, and define
non-neutral matchups. Production menus enumerate the catalog automatically.

Use tabs, single quotes, no JavaScript semicolons and no trailing commas. Keep
Svelte script, markup and style sections distinct. Nest CSS variants and relevant
media queries under their selector, with blank lines between rules.
Run `npm run format` before committing; CI checks formatting.

### Assets

Assets include SVGs, original audio and bitmap sources stored as `.png.base64`
or `.gif.base64`. Prepare, predev and prebuild synchronize these into ignored
`static/assets/`, decoding Base64 files and copying other sources. Native image
files take precedence over their Base64 equivalents. The favicon is generated
from `favicon.png.base64`.

Visual assets are preloaded when entering a game and reused across map navigation.
To refresh generated assets after editing sources:

```sh
node --experimental-strip-types scripts/sync-assets.ts
```

All units have a healthy sprite and four damage stages for both teams. Sniper
vectors live in `assets/temp/`; `node scripts/export-sniper-sprites.mjs`
regenerates their sprites and `docs/sniper-damage-variants.png`. Scratches use
single outline-colored pixel blocks, with darker red wounds for contrast.
Synchronize public assets afterward. Do not commit generated static assets.

## GitHub Pages deployment

### Metered TURN setup

Create a TURN credential in the Metered dashboard. Copy `.env.example` to `.env.local`
and set `VITE_METERED_APP` to the app name (or its `.metered.live` hostname) and
`VITE_METERED_TURN_API_KEY` to that credential's API key. Restart Vite after changes.
Use the credential-scoped key, **never the account Secret Key or Project API Key**.
This integration needs no additional SDK or backend. See the
[Metered TURN reference](https://www.metered.ca/docs/llms-turn-server.txt).

The browser retrieves ICE servers when creating or joining a game. It keeps the
provider's UDP, TCP and TLS endpoints, so the dashboard controls the available
relay region. A failed credential request shows an error instead of silently
turning the relay off. Keep the credential enabled and valid throughout your tests.

In GitHub **Settings → Secrets and variables → Actions**, add:

| Type                | Name                   | Value                          |
| ------------------- | ---------------------- | ------------------------------ |
| Repository variable | `METERED_APP`          | Metered app name or hostname   |
| Repository secret   | `METERED_TURN_API_KEY` | Credential-scoped TURN API key |

The workflow passes these values to Vite at build time. `.env` files on your PC
are not uploaded by Git. The Pages workflow stops if either setting is missing.
The TURN key is intentionally included in the public
browser bundle, even when supplied through a GitHub secret. Anyone can extract
and use the relay credential, so monitor its quota and revoke/replace it if abused.
For wider distribution, consider issuing rotating credentials from a backend.

For a local connectivity check, run `npm run test:turn`. It uses the `.env` values
and two browser peers forced through TURN, exchanges a small payload and verifies
the selected relay candidates. It consumes a small amount of relay bandwidth.
Alternatively, set `VITE_TURN_RELAY_ONLY=true` locally and restart Vite to test a
full game through TURN. Keep it `false` for normal play to allow direct connections.
Provider quotas and credential expiry can interrupt or prevent relayed games.

### Publish the site

1. In **Settings → Pages**, choose **GitHub Actions** as the source.
2. In **Actions → Deploy GitHub Pages → Run workflow**, select the branch to publish.

The manual workflow builds with `BASE_PATH=/pixelswars` and publishes the generated
`build/` artifact. Publishing the source branch instead can display the README
rather than the app. For a custom domain at its root, use an empty base path.

To test a repository-path build in PowerShell:

```powershell
$env:BASE_PATH = '/pixelswars'
npm run build
Remove-Item Env:BASE_PATH
```

CI checks formatting, components, rules, the build and browser behavior separately.
Pushing or merging does not automatically deploy the site.

## Credits

Programming: [John Does it](https://johndoesit.be).
Sprites: [Kenney](https://www.kenney.nl).
Sounds: [Pixabay](https://pixabay.com/fr/sound-effects).
Music: [Monolith](https://arcofdream.bandcamp.com/album/monolith-official-soundtrack).
QA: Gauthier Miessen.

Feedback and contributions: hello@johndoesit.be.
