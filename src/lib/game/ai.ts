import rules from './combat-rules.ts'
import { unitTypes } from './catalog.ts'
import { neighbors, movementCost, effectiveRange, canAttack, applyDamage, canCapture, unitAt, productionBuilding } from './model.ts'
import type { AiDifficulty, GameController, GameState, Unit, UnitTypeId } from './types.ts'

export function isAiDifficulty(value: unknown): value is AiDifficulty {
	return value === 'easy' || value === 'medium' || value === 'hard'
}

// Weighted paths use exactly the same adjacent steps, occupancy and terrain costs as move().
export function pathsFrom(state: GameState, unit: Unit, budget = Infinity): Map<number, { cost: number; path: number[] }> {
	const paths = new Map([[unit.cell, { cost: 0, path: [] as number[] }]])
	const occupied = new Set(state.units.filter((other) => other.id !== unit.id && other.health > 0).map((other) => other.cell))
	const pending = new Set([unit.cell])
	while (pending.size) {
		const index = [...pending].reduce((best, candidate) => (paths.get(candidate)!.cost < paths.get(best)!.cost ? candidate : best))
		pending.delete(index)
		const current = paths.get(index)!
		for (const neighbor of neighbors(state, index)) {
			const cost = current.cost + movementCost(unit, state.cells[neighbor])
			if (occupied.has(neighbor) || !Number.isFinite(cost) || cost > budget || cost >= (paths.get(neighbor)?.cost ?? Infinity)) continue
			paths.set(neighbor, { cost, path: [...current.path, neighbor] })
			pending.add(neighbor)
		}
	}
	return paths
}

function threatens(state: GameState, attacker: Unit, defender: Unit): boolean {
	const range = effectiveRange(state, attacker)
	const distance = Math.max(Math.abs((attacker.cell % state.cols) - (defender.cell % state.cols)), Math.abs(Math.floor(attacker.cell / state.cols) - Math.floor(defender.cell / state.cols)))
	return rules.canTarget(attacker.type, defender.type) && distance >= range.minimum && distance <= range.maximum
}

function damage(state: GameState, attacker: Unit, defender: Unit): number {
	const after = { ...defender }
	applyDamage(state, attacker, after)
	return defender.health - after.health
}

function attackValue(state: GameState, attacker: Unit, defender: Unit): number {
	const dealt = damage(state, attacker, defender)
	const survivor = { ...defender, health: defender.health - dealt }
	const retaliation = survivor.health > 0 && threatens(state, survivor, attacker) ? damage(state, survivor, attacker) : 0
	const targetValue = unitTypes[defender.type].cost
	return (dealt / unitTypes[defender.type].maxHealth) * targetValue + (survivor.health <= 0 ? targetValue * 0.6 : 0) - (retaliation / unitTypes[attacker.type].maxHealth) * unitTypes[attacker.type].cost * 1.2
}

function simulateAttack(state: GameState, attacker: Unit, defender: Unit): GameState {
	const simulated = { ...state, units: state.units.map((unit) => ({ ...unit })) }
	const simulatedAttacker = simulated.units.find((unit) => unit.id === attacker.id)!
	const simulatedDefender = simulated.units.find((unit) => unit.id === defender.id)!
	applyDamage(simulated, simulatedAttacker, simulatedDefender)
	simulatedAttacker.attacks--
	if (simulatedDefender.health > 0 && canAttack(simulated, simulatedDefender, simulatedAttacker)) applyDamage(simulated, simulatedDefender, simulatedAttacker)
	simulated.units = simulated.units.filter((unit) => unit.health > 0)
	return simulated
}

export function chooseAttack(state: GameState, difficulty: AiDifficulty): { attackerId: number; defenderId: number; score: number } | null {
	let best: ReturnType<typeof chooseAttack> = null
	for (const attacker of state.units.filter((unit) => unit.player === state.player && unit.attacks > 0)) {
		for (const defender of state.units.filter((unit) => unit.player !== state.player)) {
			if (!canAttack(state, attacker, defender)) continue
			if (difficulty === 'easy') return { attackerId: attacker.id, defenderId: defender.id, score: 1 }
			let score = attackValue(state, attacker, defender)
			if (difficulty === 'hard') {
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

// Threat envelopes include the opponent's next-turn movement, including mountain range bonuses.
function enemyPositions(state: GameState): Map<number, number[]> {
	return new Map(state.units.filter((unit) => unit.player !== state.player).map((unit) => [unit.id, [...pathsFrom(state, unit, unitTypes[unit.type].movement).keys()]]))
}

function exposure(state: GameState, unit: Unit, positions: Map<number, number[]>): number {
	let total = 0
	for (const enemy of state.units.filter((candidate) => candidate.player !== unit.player)) {
		if (positions.get(enemy.id)?.some((cell) => cell !== unit.cell && threatens(state, { ...enemy, cell }, unit))) {
			// A possible future approach is less certain than a shot already lined up.
			total += damage(state, enemy, unit) * unitTypes[enemy.type].attacks * (threatens(state, enemy, unit) ? 1 : 0.35)
		}
	}
	return total
}

export function chooseMovement(state: GameState, difficulty: AiDifficulty, moved: Set<number>): { unitId: number; path: number[]; score: number } | null {
	let best: ReturnType<typeof chooseMovement> = null
	const enemies = state.units.filter((unit) => unit.player !== state.player)
	const positions = difficulty === 'easy' ? new Map<number, number[]>() : enemyPositions(state)
	for (const unit of state.units.filter((candidate) => candidate.player === state.player && candidate.movement > 0 && !moved.has(candidate.id))) {
		const definition = unitTypes[unit.type]
		const paths = pathsFrom(state, unit)
		const currentCell = state.cells[unit.cell]
		const blocksProduction = currentCell.owner === unit.player && (currentCell.building === 'factory' || currentCell.building === 'airport') && Object.entries(unitTypes).some(([type, offer]) => productionBuilding(type as UnitTypeId) === currentCell.building && offer.cost <= state.money[unit.player])
		const objectives: { cell: number; value: number }[] = []
		for (const cell of state.cells) {
			if (!paths.has(cell.index)) continue
			if (cell.building && definition.captures && unit.capture > 0 && (cell.owner !== unit.player || cell.capturePoints < 20)) {
				objectives.push({ cell: cell.index, value: (cell.capturePoints < 20 ? 280 : 180) + (cell.building === 'factory' ? 50 : 0) })
			}
			if (difficulty !== 'easy' && cell.building === 'hospital' && cell.owner === unit.player && unit.health < definition.maxHealth * 0.6) objectives.push({ cell: cell.index, value: 250 })
			if (difficulty === 'hard' && cell.building && cell.owner === unit.player && enemies.some((enemy) => unitTypes[enemy.type].captures && [cell.index, ...neighbors(state, cell.index)].some((approach) => positions.get(enemy.id)?.includes(approach)))) {
				objectives.push({ cell: cell.index, value: 230 })
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
			const projected = { ...unit, cell }
			let score = objectiveValue
			if (blocksProduction && cell === unit.cell) score -= 300
			if (difficulty !== 'easy') {
				const shot = unit.attacks > 0 ? Math.max(0, ...enemies.filter((enemy) => threatens(state, projected, enemy)).map((enemy) => attackValue(state, projected, enemy))) : 0
				const risk = exposure(state, projected, positions)
				score += shot + ((definition.domain ?? 'ground') === 'ground' ? state.cells[cell].defense * 0.5 : 0)
				score -= (risk / definition.maxHealth) * definition.cost * (difficulty === 'hard' ? 0.7 : 0.35)
				if (difficulty === 'hard') {
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
	const cell = state.cells[buildingIndex]
	if (!cell || cell.owner !== state.player || unitAt(state, buildingIndex)) return null
	const offers = (Object.keys(unitTypes) as UnitTypeId[]).filter((type) => productionBuilding(type) === cell.building && unitTypes[type].cost <= state.money[state.player])
	if (difficulty === 'easy') return offers.sort((left, right) => unitTypes[left].cost - unitTypes[right].cost)[0] ?? null
	const enemies = state.units.filter((unit) => unit.player !== state.player)
	const allies = state.units.filter((unit) => unit.player === state.player)
	const needsCapture = state.cells.some((candidate) => candidate.building && candidate.owner !== state.player) && allies.filter((unit) => unitTypes[unit.type].captures).length < 2
	const airThreat = enemies.some((unit) => unitTypes[unit.type].domain === 'air') && !allies.some((unit) => unit.type === 'anti-air')
	const hasIncome = state.cells.some((candidate) => candidate.building === 'city' && candidate.owner === state.player)
	// Do not spend every 200$ income tick on infantry when an important counter needs saving.
	if (cell.building === 'factory' && hasIncome && allies.some((unit) => unitTypes[unit.type].captures)) {
		if (airThreat && state.money[state.player] < unitTypes['anti-air'].cost) return null
		if (difficulty === 'hard' && !needsCapture && !allies.some((unit) => unitTypes[unit.type].range > 1) && state.money[state.player] < unitTypes['infantry-sniper'].cost) return null
	}
	return (
		offers
			.map((type) => {
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

export async function runAiTurn(controller: GameController, difficulty: AiDifficulty, active: () => boolean, delay: (milliseconds: number) => Promise<void>): Promise<void> {
	const state = controller.state
	const moved = new Set<number>()
	const produced = new Set<number>()
	const continuing = () => active() && state.player === 2 && state.winner === null
	for (let step = 0; continuing() && step < state.cells.length * 4; step++) {
		// Yield between decisions so touch scrolling, options and navigation stay responsive.
		await delay(550)
		if (!continuing()) return
		const capturer = state.units.find((unit) => unit.player === state.player && canCapture({ ...state, selectedId: unit.id }))
		if (capturer) {
			controller.select(capturer.id)
			controller.capture()
			moved.add(capturer.id)
			continue
		}
		const attack = chooseAttack(state, difficulty)
		if (attack) {
			controller.select(attack.attackerId)
			await controller.fight(state.units.find((unit) => unit.id === attack.defenderId)!)
			continue
		}
		const movement = chooseMovement(state, difficulty, moved)
		if (movement) {
			moved.add(movement.unitId)
			controller.select(movement.unitId)
			for (const cell of movement.path) {
				if (!continuing()) return
				controller.move(cell)
				await delay(200)
			}
			if (!continuing()) return
			controller.confirm()
			continue
		}
		const purchase = state.cells
			.filter((cell) => !produced.has(cell.index))
			.map((cell) => ({ index: cell.index, type: choosePurchase(state, cell.index, difficulty) }))
			.find((offer) => offer.type)
		if (purchase?.type) {
			produced.add(purchase.index)
			controller.openProduction(purchase.index)
			controller.buy(purchase.type)
			continue
		}
		break
	}
	if (continuing()) controller.endTurn()
}
