# Computer opponent

The AI commands blue and plays first. Difficulty is stored in `?ai=easy`, `medium`,
`hard` or `expert`; links without it use local multiplayer. All levels obey the same
rules and budgets as players, with no hidden information or stat bonuses.

| Level  | Decisions                                                                                                                                |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Easy   | Attack legal targets, approach nearby objectives, buy affordable units and use simple transport delivery                                 |
| Medium | Compare damage and retaliation, avoid losing trades, consider enemy reach, seek healing, recruit counters and clear production buildings |
| Hard   | Add two-attack sequences, building defense, ranged support and stronger exposure checks; re-evaluate after each action                   |
| Expert | Compare bounded turn projections, coordinate recruitment, prioritize income and capture progress, and plan capture relays                |

## Expert priorities

- Take an immediately winning legal shot before speculative projections.
- Retain useful affordable recruitment among candidate actions, then reconsider
  purchases after each order. Value existing counters and the visible enemy army.
- Treat cities as four future income payments and prioritize factories. Scale
  capturer demand up to eight on large unclaimed maps. Cash above 2,000 has reduced
  positional value; saving briefly for a useful counter is still possible.
- Clear factories for affordable reinforcements and prefer safe economic progress
  to repeatedly waiting for projected future captures.
- Coordinate a capture relay when one infantry can capture and vacate, allowing
  another to complete the capture in the same turn.
- Compare plans against an enemy reply and a friendly follow-up. Before ending a
  turn, also consider the enemy holding position and use the less favorable outcome.
  This avoids assuming enemies will leave cover and indefinitely postponing attacks.

Projections use the actual combat formula, remaining HP, retaliation, income,
healing, capture progress and action refresh. Purchases are coordinated across
production buildings with one budget. A building produces at most once per AI turn;
new units can act immediately.

## Transport

Every level can embark adjacent infantry and deploy them without restoring spent
actions. Medium values earlier income and immediate attacks after delivery; Hard
also checks enemy movement and passenger risk. Expert includes transport actions
in turn projections and values passengers as part of the army.

Pickup does not schedule distant rendezvous or multiple shuttles. Recruitment
avoids a second transport while one exists. Delivery considers at most six nearby
objectives or threats (one building on Easy), using heuristic travel estimates.

## Performance and limits

Hard and Expert share an 80 ms soft budget for heuristic decisions. Expert compares
up to six candidates plus ending the turn, projecting at most four remaining
friendly actions, eight enemy actions and eight follow-up actions within a 180 ms
soft budget. It yields between simulated actions, cancels on disposal and keeps
the best complete projection, or the heuristic fallback if none completed.

These are checkpoints, not hard deadlines: one path search can exceed them.
Slower devices may choose a shallower plan. Threat estimates conservatively ignore
competing enemies blocking each other. The AI is heuristic, not a learning system
or an exhaustive search; extra material does not guarantee conversion into victory.

The planner is split by responsibility: `ai.ts` (shared tactics), `expert-ai.ts`
(projections), `ai-economy.ts` (recruitment), `ai-transport.ts` (delivery) and
`ai-threats.ts` (threat estimates). Animation delays are separate from planning.

## Regression checks

`npm test` covers tactics, economy, transports, budget exhaustion, cancellation and
endgame progress. `tests/fixtures/expert-endgame.json` preserves a position where
speculative replies previously made Expert wait instead of finishing the game;
`expert-progress.test.ts` checks it without a match dashboard or benchmark server.

After building, measure responsiveness separately from other browser tests:

```sh
npm run test:e2e -- tests/e2e/ai-performance.spec.ts --project desktop --workers 1
```

This checks Hard/Expert on large maps with cold caches, network latency and CPU
slowdown, including action latency, turn completion and main-thread responsiveness.
For future strength comparisons, use balanced openings, swap camps, compare timing
on identical positions and distinguish actual wins from progress at a time limit.
The previous balanced sample split 3–3; it did not establish general superiority.
