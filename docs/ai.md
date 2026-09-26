# Computer opponent

Choose a map on the home page, then choose **Play against AI** and a difficulty,
or **Play with someone on this device**. The human is blue (Player 1); the AI is
red (Player 2). The selected difficulty is kept in the URL, including on reload
and restart. Existing map links without an `ai` parameter still open local play.

All difficulties use the normal movement, damage, retaliation, capture, income,
healing and production rules. There are no bonus resources or hidden stat boosts.
The AI only reads the visible board. Scrolling, previews and options remain
available during its turn; human game actions are blocked until it finishes.

## Easy

- Attack the first legal target in army order, without evaluating retaliation.
- Follow legal, terrain-weighted paths toward targets and capturable buildings.
- Stay on a building after capturing so the second capture can finish next turn.
- Buy the cheapest affordable unit for each available production building.

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

## Scope and limits

This is a deterministic heuristic opponent, not a learning system or an exhaustive
multi-turn search. The attack lookahead uses current firing positions; it does not
search every possible future move. Threat estimates are deliberately conservative
and do not simulate competing enemies blocking one another's future routes.
Each unit receives one planned movement path per turn; purchases are limited to
one per production building per AI turn. Newly bought units can act immediately,
as permitted by the existing game rules. Difficulty is not a guarantee of victory.

The planner is in `src/lib/game/ai.ts`; `match.ts` handles human input guards and
cancellation on navigation/restart. Actual actions use the existing controller.
Regression tests cover combat ordering, captures, production, movement legality,
input locking, navigation and all twelve maps.
