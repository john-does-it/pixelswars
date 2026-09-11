# Game scripts

Both boards load the same classic scripts at the end of the HTML body. No build
step is required. These files still share the game's global scope: this split
organizes the existing code without changing its rules or introducing modules.

| File | Responsibility |
| --- | --- |
| combat-rules.js | Pure attack range and unit matchup rules; also usable from Node tests |
| world.js | Grid dimensions, sizing, terrain and initial cell/unit data |
| state.js | Shared DOM references, device detection and mutable game state |
| units.js | Factory unit HTML templates |
| selection.js | Selecting units and attaching their controls |
| movement.js | Keyboard/touch movement, cancellation and reachable cells |
| combat.js | Targets, attack sequence, retaliation and unit deaths |
| economy.js | Factories, purchases, building capture, healing and income |
| turns.js | Player turns and capacity resets |
| audio.js | Sound references, playback and music |
| ui.js | Player/money display, animations, victory dialog and stat preview |
| playground.js | Startup and global event listeners |

Keep the script list identical in board-1.html and board-2.html. Load world.js
before state.js, since state initialization reads the grid dimensions. Load
playground.js last: it starts the game only after every dependency is defined.
Do not add async to these script tags. Put new behavior in its responsible file;
keep startup calls and global control bindings in playground.js.

## Verification

Run the pure rules tests with:

`node --test tests/combat-rules.test.cjs`

Serve the repository with a local HTTP server and open tests/combat-browser.html,
tests/factory-browser.html and tests/startup-browser.html. Repeat with ?map=2 for the rectangular board;
factory tests also accept ?mobile (or ?map=2&mobile).
