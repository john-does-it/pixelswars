# Computer opponent

Choose a map on the home page, then choose **Play against AI** and a difficulty.
The AI is blue (Player 1) and plays first;
the human is red (Player 2). The selected difficulty is kept in the URL, including on reload
and restart. Existing map links without an `ai` parameter still open local play.

All difficulties use the normal movement, damage, retaliation, capture, income,
healing and production rules. There are no bonus resources or hidden stat boosts.
The AI only reads the visible board. During its turn the action bar is hidden
while retaining its space; header settings remain accessible. The camera follows the
AI's active unit. Human game actions remain blocked until it finishes.
Both AI and human turns use staggered left-to-right bands in the player's color.
Reduced-motion preferences use a static announcement. Local and online multiplayer
use the same transition.

## Easy

- Attack the first legal target in army order, without evaluating retaliation.
- Follow legal, terrain-weighted paths toward targets and capturable buildings.
- Stay on a building after capturing so the second capture can finish next turn.
- Usually buy the cheapest affordable unit; buy a transport when two adjacent
  infantry face a long journey to an objective.

## Medium

- Score attacks by damage, destroyed unit value and expected retaliation.
- Prefer favourable exchanges and finishing blows; reject losing trades.
- Consider the enemy's next-turn movement and firing envelope when positioning.
- Value defensive terrain and send badly injured units toward owned hospitals.
- Capture and secure buildings; maintain infantry when more captures are needed.
- Purchase counters to the visible army, with extra priority for missing air defense.
- Reduce duplicate purchases to encourage a varied army.
- Save city income for missing air defense instead of spending each income tick.
- Clear occupied production buildings when reinforcements can be afforded.

## Hard

Uses medium rules, plus:

- Simulate two consecutive currently available attacks, including health-scaled
  retaliation. This can prioritize artillery before a tank's finishing shot.
- Re-evaluate targets after every attack, capture, move and purchase.
- Put units on owned buildings that enemy infantry can reach next turn.
- Give more weight to predicted exposure when choosing positions.
- Prefer durable front-line units inside friendly ranged coverage when they can
  survive the predicted attack. This is a bait/screen heuristic: it creates an
  opportunity, but does not assume the human will take it.
- Add ranged support when the army has none.
- Save for ranged support once enough capturing infantry is available.

## Expert

Uses hard tactics, plus:

- Compare attacks, movement, captures, recruitment and ending the turn against a
  projected enemy reply and the AI's following turn. Simulations use normal
  income, healing, capture progress, retaliation and refreshed action budgets.
- Coordinate recruitment across all available bases and airports using one budget.
  Weight enemy units by their value and remaining health, and account for counters
  already in the friendly army before ordering more.
- Recalculate recruitment after each purchase. Fill capture shortages, spread
  purchases across useful counters and favour reinforcements that can reach threats.
- Save up to two expected city-income payments for a substantially better counter,
  while favouring immediate affordable reinforcements when production is threatened.
- Value city ownership, future income and capture progress when comparing plans.
  Prioritize establishing an economy, denying enemy income and defending production.
- Plan capture relays: a first infantry captures, vacates using its remaining
  movement, then a second infantry finishes the same building during this turn.
  Check both paths and occupancy, and weigh immediate gains against discounted
  follow-up gains instead of continually postponing captures.
- Before choosing to end a turn, prefer an available uncontested capture or
  a legal advance toward a capturable building. Check participating units against
  the enemy's next-turn movement and attack ranges; waiting remains available
  when those units would be exposed. This prevents repeatedly borrowing the same
  future captures in the lookahead without ever starting them.

## Scope and limits

### Transport decisions

All levels can load, drive and unload infantry using the same rules as the player.
They avoid interrupting an available capture and compare riding with walking.
After unloading, passengers can spend their remaining movement, ammunition and
capture action. Transport never restores an action that was already spent.
Only approaching and entering the vehicle charges passenger movement, using the
normal terrain costs. Boarding and deployment cost no movement to the jeep.

- **Easy:** considers the nearest building and a simple distance-based purchase
  rule. It does not forecast combat or passenger losses when choosing a delivery.
- **Medium:** values objectives by income, considers shots after unloading and
  checks enemies at their current positions. Purchases compare estimated earlier
  income against the transport cost, without counting the same objective twice.
- **Hard:** additionally checks enemy movement envelopes, gives more weight to
  losing the jeep and its remaining passengers, and considers threatened buildings.
- **Expert:** includes transport actions in its bounded turn simulations, compares
  recruitment with other units, and counts carried soldiers in army value so their
  deaths matter when evaluating the opponent's reply.

Pickup currently requires adjacent infantry; this does not schedule distant
rendezvous or multiple shuttles. Recruitment avoids buying a second transport while
one is already present. Delivery checks at most six nearby objectives or threats
(one building on Easy). Estimated income savings and enemy threats are heuristics,
not guarantees of successful captures or exhaustive route optimization.

### Search bounds

This is a heuristic opponent, not a learning system or an exhaustive
multi-turn search. Hard's two-attack lookahead uses current firing positions.
Expert compares up to six action candidates plus ending the turn; each projection
includes up to four remaining current-turn actions, eight enemy actions and eight
follow-up actions. These are bounded heuristic projections, not full searches of
every unit's possible moves. The planner yields between simulated actions so the
interface can remain responsive, and cancels when the match is disposed.
Hard and Expert use an 80 ms soft budget for each heuristic decision. Once it is
spent, optional capture-relay searches, attack follow-ups and further movement
comparisons stop; a legal candidate is still evaluated before returning a move.
Expert additionally limits candidate comparisons and turn projections to a
180 ms soft budget per decision. It keeps the best fully evaluated plan, or its
heuristic fallback if no projection finished. Partial projections are discarded.
These are checkpoints, not hard deadlines: a single path search or candidate
evaluation can finish after the budget. Slower devices may therefore choose a
different, less deeply evaluated plan. Animation delays remain separate.
Threat estimates are deliberately conservative
and do not simulate competing enemies blocking one another's future routes.
Each unit normally receives one planned movement path per turn. Expert capture
relays can split movement while respecting the same total movement budget; purchases are limited to
one per production building per AI turn. Newly bought units can act immediately,
as permitted by the existing game rules. Difficulty is not a guarantee of victory.

The shared planner is in `src/lib/game/ai.ts`; `expert-ai.ts` handles turn projections,
`ai-economy.ts` handles coordinated recruitment, and `ai-transport.ts` handles
delivery and transport purchases using the shared `ai-threats.ts` estimates.
`match.ts` handles human input guards and
cancellation on navigation/restart. Actual actions use the existing controller.
Regression tests cover combat ordering, future enemy threats, income and healing
across turn boundaries, capture priorities, composition-aware production, saving,
movement legality, input locking, cancellation, navigation and map openings.

`tests/ai-budget.test.ts` injects a clock to cover budget exhaustion and cancellation
without timing-sensitive assertions. `tests/e2e/ai-performance.spec.ts` runs Hard
and Expert on maps 11 and 12 with a cold cache, 150 ms network latency, 192 KiB/s
downloads and 4× CPU slowdown. It checks first action latency, turn completion and
main-thread responsiveness, attaching timing metrics to each Playwright result.
Network throttling measures loading (including the lazy Expert module); CPU
throttling measures local AI computation. Run after building:

```sh
node node_modules/@playwright/test/cli.js test tests/e2e/ai-performance.spec.ts --project=desktop --workers=1
```
