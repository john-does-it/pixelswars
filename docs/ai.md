# Computer opponent

Choose a map on the home page, then choose **Play against AI** and a difficulty,
or **Play with someone on this device**. The AI is blue (Player 1) and plays first;
the human is red (Player 2). The selected difficulty is kept in the URL, including on reload
and restart. Existing map links without an `ai` parameter still open local play.

All difficulties use the normal movement, damage, retaliation, capture, income,
healing and production rules. There are no bonus resources or hidden stat boosts.
The AI only reads the visible board. Scrolling, previews and options remain
available during its turn; human game actions are blocked until it finishes.
Each human turn is announced with a fading message. Local multiplayer announces
the current player at the start of every turn.

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

## Scope and limits

This is a deterministic heuristic opponent, not a learning system or an exhaustive
multi-turn search. Hard's two-attack lookahead uses current firing positions.
Expert compares up to six action candidates plus ending the turn; each projection
includes up to four remaining current-turn actions, eight enemy actions and eight
follow-up actions. These are bounded heuristic projections, not full searches of
every unit's possible moves. The planner yields between simulated actions so the
interface can remain responsive, and cancels when the match is disposed.
Threat estimates are deliberately conservative
and do not simulate competing enemies blocking one another's future routes.
Each unit normally receives one planned movement path per turn. Expert capture
relays can split movement while respecting the same total movement budget; purchases are limited to
one per production building per AI turn. Newly bought units can act immediately,
as permitted by the existing game rules. Difficulty is not a guarantee of victory.

The shared planner is in `src/lib/game/ai.ts`; `expert-ai.ts` handles turn projections
and `ai-economy.ts` handles coordinated recruitment. `match.ts` handles human input guards and
cancellation on navigation/restart. Actual actions use the existing controller.
Regression tests cover combat ordering, future enemy threats, income and healing
across turn boundaries, capture priorities, composition-aware production, saving,
movement legality, input locking, cancellation, navigation and all twelve maps.
