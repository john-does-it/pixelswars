import { pathsFrom } from './movement.ts'
import rules from './combat-rules.ts'
import { buildingIncome, unitTypes } from './catalog.ts'
import { economicObjectiveValue, planExpertProduction } from './ai-economy.ts'
import { planTransport, transportedValue, transportPurchaseScore } from './ai-transport.ts'
import { threatens, damage, enemyPositions, exposure } from './ai-threats.ts'
import { neighbors, canAttack, applyDamage, canCapture, unitAt, productionBuilding } from './model.ts'
import type { AiDifficulty, GameController, GameState, Unit, UnitTypeId } from './types.ts'

export function isAiDifficulty(value: unknown): value is AiDifficulty {
	return value === 'easy' || value === 'medium' || value === 'hard' || value === 'expert'
}

function attackValue(state: GameState, attacker: Unit, defender: Unit): number {
	const dealt = damage(state, attacker, defender)
	const survivor = { ...defender, health: defender.health - dealt }
	const retaliation = survivor.health > 0 && threatens(state, survivor, attacker) ? damage(state, survivor, attacker) : 0
	const targetValue = unitTypes[defender.type].cost + (defender.cargo ?? []).reduce((value, passenger) => value + unitTypes[passenger.type].cost, 0)
	return (dealt / unitTypes[defender.type].maxHealth) * targetValue + (survivor.health <= 0 ? targetValue * 0.6 : 0) - (retaliation / unitTypes[attacker.type].maxHealth) * unitTypes[attacker.type].cost * 1.2
}

export function simulateAttack(state: GameState, attacker: Unit, defender: Unit): GameState {
	const simulated = { ...state, units: state.units.map((unit) => ({ ...unit })) }
	const simulatedAttacker = simulated.units.find((unit) => unit.id === attacker.id)!
	const simulatedDefender = simulated.units.find((unit) => unit.id === defender.id)!
	applyDamage(simulated, simulatedAttacker, simulatedDefender)
	simulatedAttacker.attacks--
	if (simulatedDefender.health > 0 && canAttack(simulated, simulatedDefender, simulatedAttacker)) applyDamage(simulated, simulatedDefender, simulatedAttacker)
	simulated.units = simulated.units.filter((unit) => unit.health > 0)
	return simulated
}

export function chooseAttack(state: GameState, difficulty: AiDifficulty, withinBudget: () => boolean = () => true): { attackerId: number; defenderId: number; score: number } | null {
	let best: ReturnType<typeof chooseAttack> = null
	for (const attacker of state.units.filter((unit) => unit.player === state.player && unit.attacks > 0)) {
		for (const defender of state.units.filter((unit) => unit.player !== state.player)) {
			if (best && !withinBudget()) return best
			if (!canAttack(state, attacker, defender)) continue
			if (difficulty === 'easy') return { attackerId: attacker.id, defenderId: defender.id, score: 1 }
			let score = attackValue(state, attacker, defender)
			if ((difficulty === 'hard' || difficulty === 'expert') && withinBudget()) {
				// Two-ply ordering: an artillery hit can make the next tank shot lethal, removing retaliation.
				const simulated = simulateAttack(state, attacker, defender)
				const followUp = chooseAttack(simulated, 'medium')
				score += followUp?.score ?? 0
				if (!threatens(state, defender, attacker)) score += 1
			}
			if (score > 0 && (!best || score > best.score)) best = { attackerId: attacker.id, defenderId: defender.id, score }
		}
	}
	return best
}

export function chooseMovement(state: GameState, difficulty: AiDifficulty, moved: Set<number>, withinBudget: () => boolean = () => true): { unitId: number; path: number[]; score: number } | null {
	let best: ReturnType<typeof chooseMovement> = null
	const enemies = state.units.filter((unit) => unit.player !== state.player)
	const positions = difficulty === 'easy' ? new Map<number, number[]>() : enemyPositions(state)
	for (const unit of state.units.filter((candidate) => candidate.player === state.player && candidate.movement > 0 && !moved.has(candidate.id))) {
		if (best && !withinBudget()) break
		const definition = unitTypes[unit.type]
		const paths = pathsFrom(state, unit)
		const currentCell = state.cells[unit.cell]
		const blocksProduction = currentCell.owner === unit.player && (currentCell.building === 'factory' || currentCell.building === 'airport') && Object.entries(unitTypes).some(([type, offer]) => productionBuilding(type as UnitTypeId) === currentCell.building && offer.cost <= state.money[unit.player])
		if (definition.capacity && !blocksProduction) continue
		const objectives: { cell: number; value: number }[] = []
		for (const cell of state.cells) {
			if (!paths.has(cell.index)) continue
			if (cell.building && definition.captures && (cell.owner !== unit.player || cell.capturePoints < 20)) {
				objectives.push({ cell: cell.index, value: difficulty === 'expert' ? economicObjectiveValue(state, cell) + (cell.capturePoints < 20 ? 160 : 0) : (cell.capturePoints < 20 ? 280 : 180) + (cell.building === 'factory' ? 50 : 0) })
			}
			if (difficulty !== 'easy' && cell.building === 'hospital' && cell.owner === unit.player && unit.health < definition.maxHealth * 0.6) objectives.push({ cell: cell.index, value: 250 })
			if ((difficulty === 'hard' || difficulty === 'expert') && cell.building && cell.owner === unit.player && enemies.some((enemy) => unitTypes[enemy.type].captures && [cell.index, ...neighbors(state, cell.index)].some((approach) => positions.get(enemy.id)?.includes(approach)))) {
				objectives.push({ cell: cell.index, value: difficulty === 'expert' ? economicObjectiveValue(state, cell) : 230 })
			}
			if (unit.attacks > 0 && enemies.some((enemy) => threatens(state, { ...unit, cell: cell.index }, enemy))) objectives.push({ cell: cell.index, value: 150 })
		}
		const candidates = new Map<number, number>([[unit.cell, 0]])
		if (blocksProduction) for (const [cell, route] of paths) if (route.cost <= unit.movement) candidates.set(cell, 0)
		for (const objective of objectives) {
			const route = paths.get(objective.cell)!
			const endpoint = route.path.filter((cell) => paths.get(cell)!.cost <= unit.movement).at(-1) ?? unit.cell
			const progress = paths.get(endpoint)!.cost
			const value = objective.value / (1 + (route.cost - progress) / 3)
			candidates.set(endpoint, Math.max(candidates.get(endpoint) ?? 0, value))
		}
		for (const [cell, route] of paths) if (route.cost <= unit.movement && unit.attacks > 0 && enemies.some((enemy) => threatens(state, { ...unit, cell }, enemy))) candidates.set(cell, Math.max(150, candidates.get(cell) ?? 0))
		let preferred = { cell: unit.cell, score: -Infinity }
		for (const [cell, objectiveValue] of candidates) {
			if (preferred.cell !== unit.cell && !withinBudget()) break
			const projected = { ...unit, cell }
			let score = objectiveValue
			if (blocksProduction && cell === unit.cell) score -= 300
			if (difficulty !== 'easy') {
				const shot = unit.attacks > 0 ? Math.max(0, ...enemies.filter((enemy) => threatens(state, projected, enemy)).map((enemy) => attackValue(state, projected, enemy))) : 0
				const risk = exposure(state, projected, positions)
				score += shot + ((definition.domain ?? 'ground') === 'ground' ? state.cells[cell].defense * 0.5 : 0)
				score -= (risk / definition.maxHealth) * transportedValue(unit) * (difficulty === 'hard' || difficulty === 'expert' ? 0.7 : 0.35)
				if (difficulty === 'hard' || difficulty === 'expert') {
					// Prefer a durable screen inside friendly ranged coverage, but never reward suicidal bait.
					const support = state.units.filter((ally) => ally.player === unit.player && ally.id !== unit.id && unitTypes[ally.type].range > 1 && enemies.some((enemy) => (positions.get(enemy.id) ?? []).some((enemyCell) => threatens(state, { ...enemy, cell: enemyCell }, projected) && threatens(state, ally, { ...enemy, cell: enemyCell })))).length
					if (definition.range === 1 && definition.defense >= 20 && risk > 0 && risk < unit.health * 0.6) score += Math.min(2, support) * 70
				}
			}
			// A small movement cost breaks ties in favour of holding a useful position.
			score -= paths.get(cell)!.cost * 0.1
			if (score > preferred.score) preferred = { cell, score }
		}
		if (preferred.cell !== unit.cell && (!best || preferred.score > best.score)) best = { unitId: unit.id, path: paths.get(preferred.cell)!.path, score: preferred.score }
	}
	return best
}

export function choosePurchase(state: GameState, buildingIndex: number, difficulty: AiDifficulty): UnitTypeId | null {
	if (difficulty === 'expert') {
		const plan = planExpertProduction(state)
		return plan?.affordable && plan.buildingIndex === buildingIndex ? plan.type : null
	}
	const cell = state.cells[buildingIndex]
	if (!cell || cell.owner !== state.player || unitAt(state, buildingIndex)) return null
	const offers = (Object.keys(unitTypes) as UnitTypeId[]).filter((type) => productionBuilding(type) === cell.building && unitTypes[type].cost <= state.money[state.player])
	const enemies = state.units.filter((unit) => unit.player !== state.player)
	const allies = state.units.filter((unit) => unit.player === state.player)
	if (difficulty === 'easy') {
		// Easy uses a simple distance rule, without combat or economic forecasts.
		const nearbyInfantry = allies.filter((unit) => unitTypes[unit.type].captures && neighbors(state, buildingIndex).includes(unit.cell))
		if (offers.includes('transport') && nearbyInfantry.length >= 2 && !allies.some((unit) => unit.type === 'transport')) {
			const routes = pathsFrom(state, nearbyInfantry[0])
			if (state.cells.some((target) => target.building && target.owner !== state.player && (routes.get(target.index)?.cost ?? 0) > unitTypes.infantry.movement * 3)) return 'transport'
		}
		return offers.sort((left, right) => unitTypes[left].cost - unitTypes[right].cost)[0] ?? null
	}
	const needsCapture = state.cells.some((candidate) => candidate.building && candidate.owner !== state.player) && allies.filter((unit) => unitTypes[unit.type].captures).length < 2
	const airThreat = enemies.some((unit) => unitTypes[unit.type].domain === 'air') && !allies.some((unit) => unit.type === 'anti-air')
	const hasIncome = state.cells.some((candidate) => buildingIncome(candidate.building) > 0 && candidate.owner === state.player)
	const transportScore = cell.building === 'factory' && !airThreat ? transportPurchaseScore(state, buildingIndex, difficulty) : 0
	// Do not spend every 200$ income tick on infantry when an important counter needs saving.
	if (cell.building === 'factory' && hasIncome && allies.some((unit) => unitTypes[unit.type].captures)) {
		if (airThreat && state.money[state.player] < unitTypes['anti-air'].cost) return null
		if (transportScore > 120 && state.money[state.player] < unitTypes.transport.cost) return null
		if (difficulty === 'hard' && !needsCapture && !allies.some((unit) => unitTypes[unit.type].range > 1) && state.money[state.player] < unitTypes['infantry-sniper'].cost) return null
	}
	return (
		offers
			.map((type) => {
				if (type === 'transport') return { type, score: transportScore }
				const definition = unitTypes[type]
				const matchups = enemies.length ? enemies.reduce((total, enemy) => total + rules.typeModifier(type, enemy.type), 0) / enemies.length : 1
				const diversity = 1 + allies.filter((unit) => unit.type === type).length * 0.5
				let score = (matchups * definition.attack * definition.attacks * Math.sqrt(definition.maxHealth)) / Math.sqrt(definition.cost) / diversity
				if (needsCapture && definition.captures) score += 70
				if (airThreat && type === 'anti-air') score += 180
				if (difficulty === 'hard' && definition.range > 1 && !allies.some((unit) => unitTypes[unit.type].range > 1)) score += 60
				return { type, score }
			})
			.sort((left, right) => right.score - left.score)[0]?.type ?? null
	)
}

export type CaptureStep = { kind: 'capture'; unitId: number } | { kind: 'move'; unitId: number; path: number[] }
export type AiDecision = CaptureStep | { kind: 'embark'; unitId: number; passengerId: number } | { kind: 'deploy'; unitId: number; passengerId: number; destination: number } | { kind: 'relay'; steps: CaptureStep[] } | { kind: 'attack'; attackerId: number; defenderId: number } | { kind: 'buy'; buildingIndex: number; type: UnitTypeId } | { kind: 'end' }

export function chooseTransportDecision(state: GameState, moved: Set<number>, difficulty: AiDifficulty = 'medium', withinBudget: () => boolean = () => true): AiDecision | null {
	return planTransport(state, moved, difficulty, withinBudget)?.decision ?? null
}

// Capture progress belongs to the building. Two infantry can therefore complete
// it in one turn if the first can vacate and the second can reach it legally.
export function chooseCaptureRelay(state: GameState, withinBudget: () => boolean = () => true): Extract<AiDecision, { kind: 'relay' }> | null {
	const infantry = state.units.filter((unit) => unit.player === state.player && unitTypes[unit.type].captures && unit.health > 0)
	if (infantry.length < 2) return null
	let best: { steps: CaptureStep[]; score: number } | null = null
	for (const building of state.cells.filter((cell) => cell.building && cell.owner !== state.player)) {
		const occupant = unitAt(state, building.index)
		if (occupant && (occupant.player !== state.player || !unitTypes[occupant.type].captures)) continue
		for (const first of infantry) {
			if (occupant && occupant.id !== first.id) continue
			if (building.capturePoints > 10 && first.capture <= 0) continue
			// A single available capture already finishes this building; no relay needed.
			if (building.capturePoints <= 10 && first.capture > 0) continue
			const approach = pathsFrom(state, first, first.movement).get(building.index)
			if (!approach) continue
			const onBuilding = { ...first, cell: building.index, movement: first.movement - approach.cost }
			const afterApproach = { ...state, units: state.units.map((unit) => (unit.id === first.id ? onBuilding : unit)) }
			for (const [destination, exit] of pathsFrom(afterApproach, onBuilding, onBuilding.movement)) {
				if (!withinBudget()) return best ? { kind: 'relay', steps: best.steps } : null
				if (!exit.path.length) continue
				const afterExit = { ...afterApproach, units: afterApproach.units.map((unit) => (unit.id === first.id ? { ...onBuilding, cell: destination } : unit)) }
				for (const second of infantry.filter((unit) => unit.id !== first.id && unit.capture > 0)) {
					const replacement = pathsFrom(afterExit, second, second.movement).get(building.index)
					if (!replacement?.path.length) continue
					const nextBuilding = state.cells[destination]
					const setup = nextBuilding.building && nextBuilding.owner !== state.player ? economicObjectiveValue(state, nextBuilding) * 0.15 : 0
					const score = economicObjectiveValue(state, building) + setup - (approach.cost + exit.cost + replacement.cost) * 5
					if (best && score <= best.score) continue
					const steps: CaptureStep[] = []
					if (approach.path.length) steps.push({ kind: 'move', unitId: first.id, path: approach.path })
					if (building.capturePoints > 10) steps.push({ kind: 'capture', unitId: first.id })
					steps.push({ kind: 'move', unitId: first.id, path: exit.path }, { kind: 'move', unitId: second.id, path: replacement.path }, { kind: 'capture', unitId: second.id })
					best = { steps, score }
				}
			}
		}
	}
	return best ? { kind: 'relay', steps: best.steps } : null
}

export function chooseHeuristicDecision(state: GameState, difficulty: AiDifficulty, moved: Set<number>, produced: Set<number>, withinSearchBudget: () => boolean = () => true): AiDecision {
	const deadline = performance.now() + 80
	const withinBudget = () => withinSearchBudget() && (difficulty === 'easy' || difficulty === 'medium' || performance.now() < deadline)
	const transport = chooseTransportDecision(state, moved, difficulty, withinBudget)
	if (transport) return transport
	if (difficulty === 'expert' && withinBudget()) {
		const relay = chooseCaptureRelay(state, withinBudget)
		if (relay) return relay
	}
	const capturers = state.units.filter((unit) => unit.player === state.player && canCapture({ ...state, selectedId: unit.id }))
	if (difficulty === 'expert') capturers.sort((left, right) => economicObjectiveValue(state, state.cells[right.cell]) - economicObjectiveValue(state, state.cells[left.cell]))
	if (capturers[0]) return { kind: 'capture', unitId: capturers[0].id }
	const attack = chooseAttack(state, difficulty, withinBudget)
	if (attack) return { kind: 'attack', attackerId: attack.attackerId, defenderId: attack.defenderId }
	const movement = chooseMovement(state, difficulty, moved, withinBudget)
	if (movement) return { kind: 'move', unitId: movement.unitId, path: movement.path }
	if (difficulty === 'expert') {
		const plan = planExpertProduction(state, produced)
		if (plan?.affordable) return { kind: 'buy', buildingIndex: plan.buildingIndex, type: plan.type }
	} else {
		const purchase = state.cells
			.filter((cell) => !produced.has(cell.index))
			.map((cell) => ({ index: cell.index, type: choosePurchase(state, cell.index, difficulty) }))
			.find((offer) => offer.type)
		if (purchase?.type) return { kind: 'buy', buildingIndex: purchase.index, type: purchase.type }
	}
	return { kind: 'end' }
}

export async function runAiTurn(controller: GameController, difficulty: AiDifficulty, active: () => boolean, delay: (milliseconds: number) => Promise<void>): Promise<void> {
	const state = controller.state
	const player = state.player
	const moved = new Set<number>()
	const produced = new Set<number>()
	const continuing = () => active() && state.player === player && state.winner === null
	const expert = difficulty === 'expert' ? await import('./expert-ai.ts') : null
	for (let step = 0; continuing() && step < state.cells.length * 4; step++) {
		// Yield between decisions so touch scrolling, options and navigation stay responsive.
		await delay(550)
		if (!continuing()) return
		const decision = expert ? await expert.chooseExpertDecision(state, moved, produced, continuing, () => delay(0)) : chooseHeuristicDecision(state, difficulty, moved, produced)
		if (!continuing()) return
		if (decision.kind === 'embark' || decision.kind === 'deploy') {
			controller.select(decision.unitId)
			if (decision.kind === 'embark') controller.embark(decision.passengerId)
			else {
				controller.deploy(decision.passengerId, decision.destination)
				moved.delete(decision.passengerId)
			}
			continue
		}
		if (decision.kind === 'relay' || decision.kind === 'capture' || decision.kind === 'move') {
			const steps = decision.kind === 'relay' ? decision.steps : [decision]
			for (const [index, action] of steps.entries()) {
				if (!continuing()) return
				controller.select(action.unitId)
				if (action.kind === 'capture') controller.capture()
				else {
					for (const cell of action.path) {
						if (!continuing()) return
						controller.move(cell)
						await delay(200)
					}
					if (!continuing()) return
					controller.confirm()
				}
				moved.add(action.unitId)
				if (index < steps.length - 1) await delay(550)
			}
			continue
		}
		if (decision.kind === 'attack') {
			controller.select(decision.attackerId)
			await controller.fight(state.units.find((unit) => unit.id === decision.defenderId)!)
			continue
		}
		if (decision.kind === 'buy') {
			produced.add(decision.buildingIndex)
			controller.openProduction(decision.buildingIndex)
			controller.buy(decision.type)
			continue
		}
		break
	}
	if (continuing()) controller.endTurn()
}
