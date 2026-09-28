import { pathsFrom } from './movement.ts'
import { unitTypes } from './catalog.ts'
import * as actions from './actions.ts'
import { attackCells, canAttack, canCapture } from './model.ts'
import { chooseAttack, chooseMovement, chooseHeuristicDecision, simulateAttack, type AiDecision } from './ai.ts'
import { economicObjectiveValue, planExpertProduction } from './ai-economy.ts'
import rules from './combat-rules.ts'
import type { GameState, Player } from './types.ts'

// Bounded rollouts keep large mobile games responsive. A turn is a real endTurn()
// boundary (income, healing and action refresh), not just another attack.
const candidateLimit = 6
const currentTurnActions = 4
const projectedTurnActions = 8

function copyState(state: GameState): GameState {
	return {
		...state,
		units: state.units.map((unit) => ({ ...unit })),
		cells: state.cells.map((cell) => ({ ...cell, classes: [...cell.classes] })),
		money: { ...state.money },
		origin: state.origin ? { ...state.origin } : null,
		incomeCells: [...state.incomeCells],
		healedCells: { ...state.healedCells },
		capturedCells: [...state.capturedCells],
		securedCells: [...state.securedCells]
	}
}

function simulateDecision(state: GameState, decision: AiDecision, moved: Set<number>, produced: Set<number>): GameState {
	if (decision.kind === 'relay') {
		for (const action of decision.steps) state = simulateDecision(state, action, moved, produced)
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
		produced.add(decision.buildingIndex)
	}
	return state
}

export function evaluateExpertPosition(state: GameState, player: Player): number {
	if (state.winner !== null) return state.winner === player ? 1000000 : -1000000
	const enemy = player === 1 ? 2 : 1
	let score = (state.money[player] - state.money[enemy]) * 0.75
	for (const unit of state.units) {
		const definition = unitTypes[unit.type]
		const sign = unit.player === player ? 1 : -1
		const healthValue = definition.cost * (0.25 + (0.75 * unit.health) / definition.maxHealth)
		const cover = definition.domain === 'air' ? 0 : state.cells[unit.cell].defense
		score += sign * (healthValue + cover + (definition.captures ? 80 : 0))
		// Reward deploying useful units rather than indefinitely delaying all progress
		// until the simulated follow-up turn. Combat losses still dominate this bonus.
		const distanceTo = (cell: number) => Math.abs((unit.cell % state.cols) - (cell % state.cols)) + Math.abs(Math.floor(unit.cell / state.cols) - Math.floor(cell / state.cols))
		const targets = state.units.filter((target) => target.player !== unit.player && rules.canTarget(unit.type, target.type))
		const pressure = Math.max(0, ...targets.map((target) => (unitTypes[target.type].cost * 0.2 * unit.health) / definition.maxHealth / (1 + Math.max(0, distanceTo(target.cell) - definition.range))))
		const expansion = definition.captures ? Math.max(0, ...state.cells.filter((cell) => cell.building && cell.owner !== unit.player).map((cell) => (cell.building === 'city' ? 150 : 90) / (1 + distanceTo(cell.index)))) : 0
		score += sign * (pressure + expansion)
	}
	for (const cell of state.cells) {
		if (!cell.building) continue
		// Three future income payments value growth and denying the opponent an income source.
		const value = cell.building === 'city' ? 600 : cell.building === 'factory' ? 400 : cell.building === 'airport' ? 300 : 180
		if (cell.owner !== 0) score += (cell.owner === player ? 1 : -1) * value
		if (cell.capturePoints < 20) {
			const capturer = state.units.find((unit) => unit.cell === cell.index && unitTypes[unit.type].captures)
			if (capturer && capturer.player !== cell.owner) score += (capturer.player === player ? 1 : -1) * value * 0.45
		}
	}
	return score
}

async function rollout(state: GameState, moved: Set<number>, produced: Set<number>, limit: number, active: () => boolean, yieldControl: () => Promise<void>): Promise<GameState> {
	for (let step = 0; step < limit && state.winner === null && active(); step++) {
		const decision = chooseHeuristicDecision(state, 'expert', moved, produced)
		if (decision.kind === 'end') break
		state = simulateDecision(state, decision, moved, produced)
		await yieldControl()
	}
	return state
}

export async function projectExpertDecision(state: GameState, decision: AiDecision, moved: Set<number>, produced: Set<number>, active: () => boolean = () => true, yieldControl: () => Promise<void> = async () => {}): Promise<GameState> {
	let projected = copyState(state)
	const plannedMoves = new Set(moved)
	const plannedProduction = new Set(produced)
	projected = simulateDecision(projected, decision, plannedMoves, plannedProduction)
	if (decision.kind !== 'end') projected = await rollout(projected, plannedMoves, plannedProduction, currentTurnActions, active, yieldControl)
	if (!active() || projected.winner !== null) return projected
	actions.endTurn(projected)
	projected = await rollout(projected, new Set(), new Set(), projectedTurnActions, active, yieldControl)
	if (!active() || projected.winner !== null) return projected
	actions.endTurn(projected)
	return rollout(projected, new Set(), new Set(), projectedTurnActions, active, yieldControl)
}

function candidates(state: GameState, moved: Set<number>, produced: Set<number>): AiDecision[] {
	const choices: AiDecision[] = [chooseHeuristicDecision(state, 'expert', moved, produced)]
	const capturer = state.units.filter((unit) => canCapture({ ...state, selectedId: unit.id })).sort((left, right) => economicObjectiveValue(state, state.cells[right.cell]) - economicObjectiveValue(state, state.cells[left.cell]))[0]
	if (capturer) choices.push({ kind: 'capture', unitId: capturer.id })
	const attack = chooseAttack(state, 'expert')
	if (attack) {
		choices.push({ kind: 'attack', attackerId: attack.attackerId, defenderId: attack.defenderId })
		const alternativeTarget = chooseAttack({ ...state, units: state.units.filter((unit) => unit.id !== attack.defenderId) }, 'expert')
		if (alternativeTarget) choices.push({ kind: 'attack', attackerId: alternativeTarget.attackerId, defenderId: alternativeTarget.defenderId })
	}
	const movement = chooseMovement(state, 'expert', moved)
	if (movement) {
		choices.push({ kind: 'move', unitId: movement.unitId, path: movement.path })
		// Rejecting one unit's advance must not strand the rest of the army.
		const alternativeMovement = chooseMovement(state, 'expert', new Set([...moved, movement.unitId]))
		if (alternativeMovement) choices.push({ kind: 'move', unitId: alternativeMovement.unitId, path: alternativeMovement.path })
	}
	const plan = planExpertProduction(state, produced)
	if (plan?.affordable) choices.push({ kind: 'buy', buildingIndex: plan.buildingIndex, type: plan.type })
	if (attack) {
		const alternative = chooseAttack({ ...state, units: state.units.map((unit) => (unit.id === attack.attackerId ? { ...unit, attacks: 0 } : unit)) }, 'expert')
		if (alternative) choices.push({ kind: 'attack', attackerId: alternative.attackerId, defenderId: alternative.defenderId })
	}
	const unique = [...new Map(choices.filter((choice) => choice.kind !== 'end').map((choice) => [JSON.stringify(choice), choice])).values()]
	return [...unique.slice(0, candidateLimit), { kind: 'end' }]
}

function safeEconomicProgress(state: GameState, decision: AiDecision, moved: Set<number>, produced: Set<number>): boolean {
	if (decision.kind !== 'move' && decision.kind !== 'capture' && decision.kind !== 'relay') return false
	const after = simulateDecision(copyState(state), decision, new Set(moved), new Set(produced))
	const participants = after.units.filter((unit) => {
		const before = state.units.find((original) => original.id === unit.id)
		return unit.player === state.player && before && (unit.cell !== before.cell || unit.capture !== before.capture)
	})
	const advancesCapture = after.cells.some((cell) => cell.building && (cell.owner === state.player ? state.cells[cell.index].owner !== state.player || cell.capturePoints > state.cells[cell.index].capturePoints : cell.capturePoints < state.cells[cell.index].capturePoints))
	const approachesBuilding = participants.some((unit) => {
		if (!unitTypes[unit.type].captures || unit.capture <= 0) return false
		const before = state.units.find((original) => original.id === unit.id)!
		const previousPaths = pathsFrom(state, before)
		const nextPaths = pathsFrom(after, unit)
		return after.cells.some((cell) => cell.building && cell.owner !== state.player && (nextPaths.get(cell.index)?.cost ?? Infinity) < (previousPaths.get(cell.index)?.cost ?? Infinity))
	})
	if (!advancesCapture && !approachesBuilding) return false
	// Ending must not postpone uncontested captures forever. Holding remains an
	// option when any participating unit can be attacked on the enemy's next turn.
	for (const enemy of after.units.filter((unit) => unit.player !== state.player)) {
		const targets = participants.filter((unit) => rules.canTarget(enemy.type, unit.type))
		if (!targets.length) continue
		for (const cell of pathsFrom(after, enemy, unitTypes[enemy.type].movement).keys()) {
			const range = attackCells(after, { ...enemy, cell })
			if (targets.some((unit) => range.includes(unit.cell))) return false
		}
	}
	return true
}

export async function chooseExpertDecision(state: GameState, moved: Set<number>, produced: Set<number>, active: () => boolean = () => true, yieldControl: () => Promise<void> = async () => {}): Promise<AiDecision> {
	const choices = candidates(state, moved, produced)
	if (choices.length === 1) return choices[0]
	let best = choices[0]
	let bestValue = -Infinity
	const evaluated: { decision: AiDecision; value: number }[] = []
	for (const decision of choices) {
		if (!active()) return { kind: 'end' }
		const projected = await projectExpertDecision(state, decision, moved, produced, active, yieldControl)
		const immediate = simulateDecision(copyState(state), decision, new Set(moved), new Set(produced))
		// Discount speculative follow-up gains: owning a city now is better than
		// repeatedly postponing its capture to the end of the search horizon.
		const value = projected.winner !== null ? evaluateExpertPosition(projected, state.player) : (evaluateExpertPosition(projected, state.player) + evaluateExpertPosition(immediate, state.player)) / 2
		evaluated.push({ decision, value })
		if (value > bestValue) {
			bestValue = value
			best = decision
		}
		await yieldControl()
	}
	if (active() && best.kind === 'end') {
		const progress = evaluated.sort((left, right) => right.value - left.value).find(({ decision }) => safeEconomicProgress(state, decision, moved, produced))
		if (progress) return progress.decision
	}
	return best
}
