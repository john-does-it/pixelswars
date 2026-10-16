import { pathsFrom } from './movement.ts'
import { isProductionBuilding, buildingIncome, unitTypes } from './catalog.ts'
import * as actions from './actions.ts'
import * as transportActions from './transport.ts'
import { attackCells, canAttack, canCapture, effectiveRange } from './model.ts'
import { chooseAttack, chooseMovement, chooseHeuristicDecision, simulateAttack, type AiDecision, type MovementChoice } from './ai.ts'
import { economicObjectiveValue, inheritAiPlanning, planExpertProduction } from './ai-economy.ts'
import rules from './combat-rules.ts'
import type { GameState, Player, Unit } from './types.ts'

// Bounded rollouts keep large mobile games responsive. A turn is a real endTurn()
// boundary (income, healing and action refresh), not just another attack.
const candidateLimit = 6
const currentTurnActions = 4
const projectedTurnActions = 8
export const expertDecisionBudgetMs = 180

function copyState(state: GameState): GameState {
	const copy = {
		...state,
		units: state.units.map((unit) => ({ ...unit, ...(unit.cargo ? { cargo: unit.cargo.map((passenger) => ({ ...passenger })) } : {}) })),
		cells: state.cells.map((cell) => ({ ...cell, classes: [...cell.classes] })),
		money: { ...state.money },
		origin: state.origin ? { ...state.origin } : null,
		incomeCells: [...state.incomeCells],
		healedCells: { ...state.healedCells },
		capturedCells: [...state.capturedCells],
		securedCells: [...state.securedCells]
	}
	inheritAiPlanning(state, copy)
	return copy
}

function simulateDecision(state: GameState, decision: AiDecision, moved: Set<number>): GameState {
	if (decision.kind === 'relay') {
		for (const action of decision.steps) state = simulateDecision(state, action, moved)
	} else if (decision.kind === 'capture') {
		actions.select(state, decision.unitId)
		actions.capture(state)
		moved.add(decision.unitId)
	} else if (decision.kind === 'move') {
		actions.select(state, decision.unitId)
		for (const cell of decision.path) if (!actions.move(state, cell)) break
		actions.deselect(state)
		moved.add(decision.unitId)
	} else if (decision.kind === 'attack') {
		const attacker = state.units.find((unit) => unit.id === decision.attackerId)
		const defender = state.units.find((unit) => unit.id === decision.defenderId)
		if (attacker && defender && attacker.attacks > 0 && canAttack(state, attacker, defender)) {
			state = simulateAttack(state, attacker, defender)
			for (const player of [1, 2] as const) if (!state.units.some((unit) => unit.player === player)) state.winner = player === 1 ? 2 : 1
		}
	} else if (decision.kind === 'buy') {
		actions.openProduction(state, decision.buildingIndex)
		actions.buy(state, decision.type)
	} else if (decision.kind === 'embark' || decision.kind === 'deploy') {
		actions.select(state, decision.unitId)
		if (decision.kind === 'embark') transportActions.embark(state, decision.passengerId)
		else if (transportActions.deploy(state, decision.passengerId, decision.destination)) moved.delete(decision.passengerId)
	}
	return state
}

// Positional potential over a fresh turn, not an immediate damage prediction.
// Exact rollouts account for current ammunition, retaliation and health loss.
export function expertCombatPressure(state: GameState, unit: Unit, target: Unit): number {
	const definition = unitTypes[unit.type]
	const targetDefinition = unitTypes[target.type]
	const targetCover = targetDefinition.domain === 'air' ? 0 : state.cells[target.cell].defense
	const damage = rules.damage(definition.attack, unit.health, definition.maxHealth, targetDefinition.defense, targetCover, unit.type, target.type)
	const distance = Math.max(Math.abs((unit.cell % state.cols) - (target.cell % state.cols)), Math.abs(Math.floor(unit.cell / state.cols) - Math.floor(target.cell / state.cols)))
	const range = effectiveRange(state, unit)
	const approach = Math.max(0, distance - range.maximum, range.minimum - distance)
	// Keep this incentive below actual material gains so it does not reward
	// reckless advances just to threaten an expensive target.
	return (targetDefinition.cost * 0.5 * Math.min(target.health, damage * definition.attacks)) / targetDefinition.maxHealth / (1 + approach)
}

export function evaluateExpertPosition(state: GameState, player: Player): number {
	if (state.winner !== null) return state.winner === player ? 1000000 : -1000000
	const enemy = player === 1 ? 2 : 1
	// Keep a useful reserve, but investing excess cash in an army should beat
	// indefinitely banking income while the opponent takes the remaining territory.
	const reserveValue = (money: number) => Math.min(money, 2000) * 0.65 + Math.max(0, money - 2000) * 0.25
	let score = reserveValue(state.money[player]) - reserveValue(state.money[enemy])
	for (const unit of state.units) {
		const definition = unitTypes[unit.type]
		const sign = unit.player === player ? 1 : -1
		const healthValue = definition.cost * (0.25 + (0.75 * unit.health) / definition.maxHealth)
		const cover = definition.domain === 'air' ? 0 : state.cells[unit.cell].defense
		const protectedHealthValue = healthValue * (1 - rules.damage(100, 100, 100, 0, cover, 'probe', 'probe') / 100)
		score += sign * (healthValue + protectedHealthValue * 0.25 + (definition.captures ? 80 : 0))
		for (const passenger of unit.cargo ?? []) {
			const passengerDefinition = unitTypes[passenger.type]
			score += sign * (passengerDefinition.cost * (0.25 + (0.75 * passenger.health) / passengerDefinition.maxHealth) + 80)
		}
		// Reward deploying useful units rather than indefinitely delaying all progress
		// until the simulated follow-up turn. Combat losses still dominate this bonus.
		const distanceTo = (cell: number) => Math.abs((unit.cell % state.cols) - (cell % state.cols)) + Math.abs(Math.floor(unit.cell / state.cols) - Math.floor(cell / state.cols))
		const targets = state.units.filter((target) => target.player !== unit.player && rules.canTarget(unit.type, target.type))
		const pressure = Math.max(0, ...targets.map((target) => expertCombatPressure(state, unit, target)))
		const expansion = definition.captures ? Math.max(0, ...state.cells.filter((cell) => cell.building && cell.owner !== unit.player).map((cell) => (buildingIncome(cell.building) || (cell.building === 'factory' ? 180 : 90)) / (1 + distanceTo(cell.index)))) : 0
		score += sign * (pressure + expansion)
	}
	for (const cell of state.cells) {
		if (!cell.building) continue
		// Four income payments value growth and denying the opponent an income source.
		const value = buildingIncome(cell.building) ? buildingIncome(cell.building) * 4 : cell.building === 'factory' ? 650 : cell.building === 'airport' ? 400 : 180
		if (cell.owner !== 0) score += (cell.owner === player ? 1 : -1) * value
		if (cell.capturePoints < 20) {
			const capturer = state.units.find((unit) => unit.cell === cell.index && unitTypes[unit.type].captures)
			if (capturer && capturer.player !== cell.owner) score += (capturer.player === player ? 1 : -1) * value * 0.45
		}
	}
	return score
}

async function rollout(state: GameState, moved: Set<number>, limit: number, active: () => boolean, yieldControl: () => Promise<void>): Promise<GameState> {
	for (let step = 0; step < limit && state.winner === null && active(); step++) {
		const decision = chooseHeuristicDecision(state, 'expert', moved, active)
		if (decision.kind === 'end') break
		state = simulateDecision(state, decision, moved)
		await yieldControl()
	}
	return state
}

export async function projectExpertDecision(state: GameState, decision: AiDecision, moved: Set<number>, active: () => boolean = () => true, yieldControl: () => Promise<void> = async () => {}, depth = { current: currentTurnActions, projected: projectedTurnActions }, enemyHolds = false): Promise<GameState> {
	let projected = copyState(state)
	const plannedMoves = new Set(moved)
	projected = simulateDecision(projected, decision, plannedMoves)
	if (decision.kind !== 'end') projected = await rollout(projected, plannedMoves, depth.current, active, yieldControl)
	if (!active() || projected.winner !== null) return projected
	actions.endTurn(projected)
	if (!enemyHolds) projected = await rollout(projected, new Set(), depth.projected, active, yieldControl)
	if (!active() || projected.winner !== null) return projected
	actions.endTurn(projected)
	return rollout(projected, new Set(), depth.projected, active, yieldControl)
}

export function expertCandidates(state: GameState, moved: Set<number>, withinBudget: () => boolean = () => true): AiDecision[] {
	// Reserve reinforcement space before optional attack/movement alternatives.
	const plan = planExpertProduction(state)
	const alternatives: MovementChoice[] = []
	const fallback = chooseHeuristicDecision(state, 'expert', moved, withinBudget, alternatives)
	const choices: AiDecision[] = [fallback]
	if (plan?.affordable) choices.push({ kind: 'buy', buildingIndex: plan.buildingIndex, type: plan.type })
	const finish = () => {
		const unique = [...new Map(choices.filter((choice) => choice.kind !== 'end').map((choice) => [JSON.stringify(choice), choice])).values()]
		return [...unique.slice(0, candidateLimit), { kind: 'end' } as AiDecision]
	}
	if (!withinBudget()) return finish()
	const capturer = state.units.filter((unit) => canCapture({ ...state, selectedId: unit.id })).sort((left, right) => economicObjectiveValue(state, state.cells[right.cell]) - economicObjectiveValue(state, state.cells[left.cell]))[0]
	if (capturer) choices.push({ kind: 'capture', unitId: capturer.id })
	if (!withinBudget()) return finish()
	const attack = fallback.kind === 'attack' ? fallback : chooseAttack(state, 'expert', withinBudget)
	if (attack) {
		choices.push({ kind: 'attack', attackerId: attack.attackerId, defenderId: attack.defenderId })
		// Exclude the target from consideration, never from the board or follow-up simulation.
		const alternative = chooseAttack(state, 'expert', withinBudget, (_, defender) => defender.id !== attack.defenderId)
		if (alternative) choices.push({ kind: 'attack', attackerId: alternative.attackerId, defenderId: alternative.defenderId })
	}
	if (!withinBudget()) return finish()
	// Reuse the fallback's paths and threat estimates when it already searched movement.
	const movement = fallback.kind === 'move' ? fallback : chooseMovement(state, 'expert', moved, withinBudget, alternatives)
	if (movement) {
		choices.splice(plan?.affordable ? 2 : 1, 0, { kind: 'move', unitId: movement.unitId, path: movement.path })
		const ranked = alternatives.sort((a, b) => b.score - a.score)
		const otherUnit = ranked.find((choice) => choice.unitId !== movement.unitId)
		if (otherUnit) choices.splice(plan?.affordable ? 3 : 2, 0, { kind: 'move', unitId: otherUnit.unitId, path: otherUnit.path })
		const sameUnit = ranked.find((choice) => choice.unitId === movement.unitId && choice.path.at(-1) !== movement.path.at(-1))
		if (sameUnit) choices.push({ kind: 'move', unitId: sameUnit.unitId, path: sameUnit.path })
	}
	return finish()
}

function safeEconomicProgress(state: GameState, decision: AiDecision, moved: Set<number>, withinBudget: () => boolean): boolean {
	if (!withinBudget()) return false
	if (decision.kind !== 'move' && decision.kind !== 'capture' && decision.kind !== 'relay' && decision.kind !== 'buy') return false
	const after = simulateDecision(copyState(state), decision, new Set(moved))
	const participants = after.units.filter((unit) => {
		const before = state.units.find((original) => original.id === unit.id)
		return unit.player === state.player && (!before || unit.cell !== before.cell || unit.capture !== before.capture)
	})
	const advancesCapture = after.cells.some((cell) => cell.building && (cell.owner === state.player ? state.cells[cell.index].owner !== state.player || cell.capturePoints > state.cells[cell.index].capturePoints : cell.capturePoints < state.cells[cell.index].capturePoints))
	const approachesBuilding = participants.some((unit) => {
		if (!withinBudget()) return false
		if (!unitTypes[unit.type].captures || unit.capture <= 0) return false
		const before = state.units.find((original) => original.id === unit.id)
		if (!before) return false
		const previousPaths = pathsFrom(state, before)
		const nextPaths = pathsFrom(after, unit)
		return after.cells.some((cell) => cell.building && cell.owner !== state.player && (nextPaths.get(cell.index)?.cost ?? Infinity) < (previousPaths.get(cell.index)?.cost ?? Infinity))
	})
	// Leaving a safe factory can lose its cover bonus in the short horizon while
	// unlocking reinforcements. Do not let holding there starve production forever.
	const clearsProduction = participants.some((unit) => {
		if (!withinBudget()) return false
		const before = state.units.find((original) => original.id === unit.id)
		if (!before || before.cell === unit.cell) return false
		const cell = state.cells[before.cell]
		if (cell.owner !== state.player || !isProductionBuilding(cell.building) || after.units.some((other) => other.cell === cell.index)) return false
		const unavailable = new Set(after.cells.filter((other) => other.index !== cell.index && isProductionBuilding(other.building)).map((other) => other.index))
		return planExpertProduction(after, unavailable)?.affordable ?? false
	})
	if (!advancesCapture && !approachesBuilding && !clearsProduction && decision.kind !== 'buy') return false
	// Ending must not postpone uncontested captures forever. Holding remains an
	// option when any participating unit can be attacked on the enemy's next turn.
	for (const enemy of after.units.filter((unit) => unit.player !== state.player)) {
		if (!withinBudget()) return false
		const targets = participants.filter((unit) => rules.canTarget(enemy.type, unit.type))
		if (!targets.length) continue
		for (const cell of pathsFrom(after, enemy, unitTypes[enemy.type].movement).keys()) {
			const range = attackCells(after, { ...enemy, cell })
			if (targets.some((unit) => range.includes(unit.cell))) return false
		}
	}
	return withinBudget()
}

export async function chooseExpertDecision(state: GameState, moved: Set<number>, active: () => boolean = () => true, yieldControl: () => Promise<void> = async () => {}, budget: { milliseconds?: number; now?: () => number } = {}): Promise<AiDecision> {
	if (!active()) return { kind: 'end' }
	const now = budget.now ?? (() => performance.now())
	const deadline = now() + (budget.milliseconds ?? expertDecisionBudgetMs)
	const withinBudget = () => active() && now() < deadline
	// An immediate legal finishing shot is certain; no speculative reply can beat it.
	const enemies = state.units.filter((unit) => unit.player !== state.player)
	if (enemies.length === 1) {
		for (const attacker of state.units) {
			if (!withinBudget()) break
			if (attacker.player !== state.player || attacker.attacks <= 0 || !canAttack(state, attacker, enemies[0])) continue
			const after = simulateAttack(state, attacker, enemies[0])
			if (!after.units.some((unit) => unit.player !== state.player) && after.units.some((unit) => unit.player === state.player)) return { kind: 'attack', attackerId: attacker.id, defenderId: enemies[0].id }
		}
	}
	// Always prepare a legal heuristic fallback before spending time on rollouts.
	const choices = expertCandidates(state, moved, withinBudget)
	if (!active()) return { kind: 'end' }
	if (choices.length === 1) return choices[0]
	let best = choices[0]
	let bestValue = -Infinity
	const evaluated: { decision: AiDecision; value: number }[] = []
	for (const decision of choices) {
		if (!active()) return { kind: 'end' }
		if (!withinBudget()) break
		const projected = await projectExpertDecision(state, decision, moved, withinBudget, yieldControl)
		// An incomplete projection cannot be compared with a completed opponent reply.
		if (!withinBudget()) break
		const immediate = simulateDecision(copyState(state), decision, new Set(moved))
		// Discount speculative follow-up gains: owning a city now is better than
		// repeatedly postponing its capture to the end of the search horizon.
		let projectedValue = evaluateExpertPosition(projected, state.player)
		if (decision.kind === 'end') {
			// Passing must also work against an opponent who keeps its cover. Only
			// this candidate needs a second reply, within the same shared time budget.
			const holding = await projectExpertDecision(state, decision, moved, withinBudget, yieldControl, undefined, true)
			if (!withinBudget()) break
			projectedValue = Math.min(projectedValue, evaluateExpertPosition(holding, state.player))
		}
		const value = Math.abs(projectedValue) === 1000000 ? projectedValue : (projectedValue + evaluateExpertPosition(immediate, state.player)) / 2
		evaluated.push({ decision, value })
		if (value > bestValue) {
			bestValue = value
			best = decision
		}
		await yieldControl()
	}
	if (withinBudget() && best.kind === 'end') {
		const progress = evaluated.sort((left, right) => right.value - left.value).find(({ decision }) => safeEconomicProgress(state, decision, moved, withinBudget))
		if (progress) return progress.decision
	}
	return active() ? best : { kind: 'end' }
}
