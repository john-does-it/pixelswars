import rules from './combat-rules.ts'
import { isProductionBuilding, buildingIncome, createUnit, unitTypes } from './catalog.ts'
import { attackCells, productionBuilding, unitAt } from './model.ts'
import { pathsFrom } from './movement.ts'
import type { AiDifficulty, Cell, GameState, UnitTypeId } from './types.ts'
import { arrivalTurns, transportPurchaseScore } from './ai-transport.ts'

export interface RecruitmentPlan {
	buildingIndex: number
	type: UnitTypeId
	cost: number
	score: number
	affordable: boolean
	reason?: 'economy' | 'transport' | 'counter' | 'offensive'
}

export interface PlanningMemory {
	unitPreferences: Partial<Record<UnitTypeId, number>>
	recentPurchases: readonly UnitTypeId[]
}

// Session-only preferences, shared read-only with projections. Purchases in a
// simulated future must never alter the real army's memory.
const planningMemory = new WeakMap<GameState, PlanningMemory>()

export function getAiPlanning(state: GameState): PlanningMemory | null {
	return planningMemory.get(state) ?? null
}

export function restoreAiPlanning(state: GameState, memory: PlanningMemory | null): void {
	if (memory) planningMemory.set(state, JSON.parse(JSON.stringify(memory)))
}

export function initializeAiPlanning(state: GameState, random = Math.random): void {
	if (!planningMemory.has(state)) planningMemory.set(state, { unitPreferences: Object.fromEntries(Object.keys(unitTypes).map((type) => [type, 0.94 + random() * 0.12])), recentPurchases: [] })
}

export function inheritAiPlanning(source: GameState, target: GameState): void {
	const memory = planningMemory.get(source)
	if (memory) planningMemory.set(target, memory)
}

export function rememberAiPurchase(state: GameState, type: UnitTypeId): void {
	const memory = planningMemory.get(state)
	if (memory) planningMemory.set(state, { ...memory, recentPurchases: [...memory.recentPurchases.slice(-3), type] })
}

function productionSites(state: GameState, excludedBuildings: Set<number>): Cell[] {
	return state.cells.filter((cell) => cell.owner === state.player && isProductionBuilding(cell.building) && !unitAt(state, cell.index) && !excludedBuildings.has(cell.index))
}

function planningScore(state: GameState, plan: RecruitmentPlan): number {
	const memory = planningMemory.get(state)
	if (!memory) return plan.score
	const repetitions = memory.recentPurchases.filter((type) => type === plan.type).length
	return (plan.score * (memory.unitPreferences[plan.type] ?? 1)) / (1 + repetitions * 0.02)
}

export function planEconomicProduction(state: GameState, difficulty: AiDifficulty, excludedBuildings = new Set<number>()): RecruitmentPlan | null {
	const sites = productionSites(state, excludedBuildings)
	const targets = state.cells.filter((cell) => buildingIncome(cell.building) > 0 && cell.owner !== state.player)
	if (!sites.length || !targets.length) return null
	const enemies = state.units.filter((unit) => unit.player !== state.player)
	// Uncontested income first. Contested cities are objectives for the combat planner.
	const safeTargets = targets.filter((cell) => !enemies.some((enemy) => rules.canTarget(enemy.type, 'infantry') && cellDistance(state, cell.index, enemy.cell) <= unitTypes[enemy.type].movement + unitTypes[enemy.type].range))
	if (!safeTargets.length) return null
	const horizon = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4
	const assigned = new Set<number>()
	// Assign each existing capturer one near-term target, rather than counting
	// the same infantry as sufficient coverage for every city on the map.
	for (const unit of state.units.filter((unit) => unit.player === state.player && unitTypes[unit.type].captures)) {
		const routes = pathsFrom(state, unit, unitTypes[unit.type].movement * horizon)
		const target = safeTargets.filter((cell) => !assigned.has(cell.index) && routes.has(cell.index)).sort((left, right) => routes.get(left.index)!.cost - routes.get(right.index)!.cost)[0]
		if (target) assigned.add(target.index)
	}
	const plans: RecruitmentPlan[] = []
	for (const site of sites) {
		if (site.building !== 'factory') continue
		const infantry = createUnit('infantry', state.player, site.index, state.nextId)
		const routes = pathsFrom(state, infantry, infantry.movement * horizon)
		for (const target of safeTargets) {
			if (assigned.has(target.index)) continue
			const route = routes.get(target.index)
			if (!route) continue
			const turns = arrivalTurns(state, infantry, route.path, infantry.movement) + Math.ceil(target.capturePoints / 10)
			const profit = buildingIncome(target.building) * Math.max(0, 6 - turns) - unitTypes.infantry.cost
			if (profit > 0) plans.push({ buildingIndex: site.index, type: 'infantry', cost: unitTypes.infantry.cost, score: profit, affordable: state.money[state.player] >= unitTypes.infantry.cost, reason: 'economy' })
		}
	}
	// Medium and above compare walking with boarding, driving/flying and deploying.
	// The transport planner only offers a vehicle when passengers already exist
	// and the saved capture income justifies its cost.
	if (difficulty !== 'easy') {
		const income = state.cells.reduce((total, cell) => total + (cell.owner === state.player ? buildingIncome(cell.building) : 0), 0)
		for (const site of sites) {
			const type = site.building === 'airport' ? 'transport-helicopter' : site.building === 'naval-base' ? 'transport-ship' : 'transport'
			const cost = unitTypes[type].cost
			if (cost > state.money[state.player] + income * 2) continue
			const score = transportPurchaseScore(state, site.index, difficulty)
			if (score > 0) plans.push({ buildingIndex: site.index, type, cost, score, affordable: cost <= state.money[state.player], reason: 'transport' })
		}
	}
	return plans.sort((left, right) => planningScore(state, right) - planningScore(state, left))[0] ?? null
}

export function planOffensiveProduction(state: GameState, difficulty: AiDifficulty, excludedBuildings = new Set<number>()): RecruitmentPlan | null {
	if (difficulty === 'easy') return null
	const enemies = state.units.filter((unit) => unit.player !== state.player)
	const allies = state.units.filter((unit) => unit.player === state.player)
	const value = (units: typeof allies) => units.reduce((total, unit) => total + (unitTypes[unit.type].cost * unit.health) / unitTypes[unit.type].maxHealth, 0)
	const plans: RecruitmentPlan[] = []
	for (const site of productionSites(state, excludedBuildings)) {
		const nearbyEnemies = enemies.filter((enemy) => cellDistance(state, site.index, enemy.cell) <= 12)
		if (!nearbyEnemies.length) continue
		const nearbyAllies = allies.filter((unit) => !unitTypes[unit.type].capacity && cellDistance(state, site.index, unit.cell) <= 12)
		const enemyValue = value(nearbyEnemies)
		const allyValue = value(nearbyAllies)
		// Exploit a modest lead, then stop reinforcing an already overwhelming front.
		if (allyValue < enemyValue * 1.05 || allyValue >= enemyValue * 1.8) continue
		for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
			const definition = unitTypes[type]
			if (!definition.attack || productionBuilding(type) !== site.building || definition.cost > state.money[state.player]) continue
			const recruit = createUnit(type, state.player, site.index, state.nextId)
			const horizon = difficulty === 'medium' ? 2 : 3
			const routes = pathsFrom(state, recruit, definition.movement * horizon)
			const reachable = nearbyEnemies.filter((enemy) => rules.canTarget(type, enemy.type) && [...routes].some(([cell, route]) => arrivalTurns(state, recruit, route.path, definition.movement) < horizon && attackCells(state, { ...recruit, cell }).includes(enemy.cell)))
			if (!reachable.length) continue
			const damage = reachable.reduce((total, enemy) => total + Math.min(enemy.health, estimatedTurnDamage(type, enemy.type)), 0)
			const score = damage / Math.sqrt(definition.cost / 200)
			plans.push({ buildingIndex: site.index, type, cost: definition.cost, score, affordable: true, reason: 'offensive' })
		}
	}
	return plans.sort((left, right) => planningScore(state, right) - planningScore(state, left))[0] ?? null
}

export function planStrategicProduction(state: GameState, difficulty: AiDifficulty, excludedBuildings = new Set<number>()): RecruitmentPlan | null {
	return planEconomicProduction(state, difficulty, excludedBuildings) ?? planCounterProduction(state, excludedBuildings) ?? planOffensiveProduction(state, difficulty, excludedBuildings)
}

// Re-evaluate concrete counters after every action: a reserve expires as soon as
// its threat, income or production site disappears. Never save beyond two incomes.
export function planCounterProduction(state: GameState, excludedBuildings = new Set<number>()): RecruitmentPlan | null {
	const factories = state.cells.filter((cell) => cell.owner === state.player && cell.building === 'factory' && !unitAt(state, cell.index) && !excludedBuildings.has(cell.index))
	if (!factories.length) return null
	const enemies = state.units.filter((unit) => unit.player !== state.player)
	const allies = state.units.flatMap((unit) => (unit.player === state.player ? [unit, ...(unit.cargo ?? [])] : []))
	const strength = (units: typeof allies) => units.reduce((total, unit) => total + unit.health / unitTypes[unit.type].maxHealth, 0)
	// First ensure that the army can expand its economy instead of waiting for a counter.
	if (!allies.some((unit) => unitTypes[unit.type].captures) && state.cells.some((cell) => cell.building && cell.owner !== state.player)) return null
	const air = strength(enemies.filter((unit) => unitTypes[unit.type].domain === 'air' && unitTypes[unit.type].attack > 0))
	const armor = strength(enemies.filter((unit) => ['tank', 'jeep', 'artillery'].includes(unit.type)))
	const infantry = strength(enemies.filter((unit) => unitTypes[unit.type].captures))
	const entrenched = strength(enemies.filter((unit) => unitTypes[unit.type].domain !== 'air' && state.cells[unit.cell].defense >= 30))
	const counters: { type: UnitTypeId; needed: boolean; score: number }[] = [
		{ type: 'anti-air', needed: air > 0 && strength(allies.filter((unit) => unit.type === 'anti-air' || unit.type === 'plane')) < air / 2, score: 400 },
		{ type: 'infantry-rocket', needed: armor > 0 && strength(allies.filter((unit) => unit.type === 'infantry-rocket' || unit.type === 'tank')) < armor / 2, score: 300 },
		{ type: 'jeep', needed: infantry >= 3 && strength(allies.filter((unit) => unit.type === 'jeep' || unit.type === 'tank' || unit.type === 'helicopter')) < infantry / 3, score: 200 },
		{ type: 'artillery', needed: entrenched >= 2 && !allies.some((unit) => unitTypes[unit.type].range > 1 && unit.type !== 'anti-air'), score: 100 }
	]
	const budget = state.money[state.player]
	const income = state.cells.reduce((total, cell) => total + (cell.owner === state.player ? buildingIncome(cell.building) : 0), 0)
	for (const counter of counters) {
		const cost = unitTypes[counter.type].cost
		if (!counter.needed || cost > budget + income * 2) continue
		const building = factories.reduce((best, candidate) => {
			const distance = (cell: Cell) => Math.min(...enemies.map((enemy) => cellDistance(state, cell.index, enemy.cell)))
			return distance(candidate) < distance(best) ? candidate : best
		})
		if (cost > budget && (!allies.length || factories.some((factory) => enemies.some((enemy) => cellDistance(state, factory.index, enemy.cell) <= unitTypes[enemy.type].movement + unitTypes[enemy.type].range)))) return null
		return { buildingIndex: building.index, type: counter.type, cost, score: counter.score, affordable: cost <= budget, reason: 'counter' }
	}
	return null
}

function cellDistance(state: GameState, originCellIndex: number, targetCellIndex: number): number {
	return Math.abs((originCellIndex % state.cols) - (targetCellIndex % state.cols)) + Math.abs(Math.floor(originCellIndex / state.cols) - Math.floor(targetCellIndex / state.cols))
}

function estimatedTurnDamage(attackerType: UnitTypeId, defenderType: UnitTypeId, healthRatio = 1): number {
	const definition = unitTypes[attackerType]
	return rules.damage(definition.attack, definition.maxHealth * healthRatio, definition.maxHealth, unitTypes[defenderType].defense, 0, attackerType, defenderType) * definition.attacks
}

export function economicObjectiveValue(state: GameState, cell: Cell): number {
	const income = state.cells.reduce((total, candidate) => total + (candidate.owner === state.player ? buildingIncome(candidate.building) : 0), 0)
	const production = state.cells.filter((candidate) => candidate.owner === state.player && isProductionBuilding(candidate.building)).length
	if (buildingIncome(cell.building)) return (440 * buildingIncome(cell.building)) / 200 + (income === 0 ? 120 : 0) + (cell.owner !== 0 && cell.owner !== state.player ? 120 : 0)
	if (cell.building === 'factory') return production === 0 ? 600 : 440
	if (cell.building === 'airport' || cell.building === 'naval-base') return production === 0 ? 420 : 300
	return 140
}

// One budget and one demand model for every base/airport, recalculated after each purchase.
export function planExpertProduction(state: GameState, excludedBuildings = new Set<number>()): RecruitmentPlan | null {
	const strategic = planStrategicProduction(state, 'expert', excludedBuildings)
	if (strategic) return strategic
	const buildings = state.cells.filter((cell) => cell.owner === state.player && isProductionBuilding(cell.building) && !unitAt(state, cell.index) && !excludedBuildings.has(cell.index))
	if (!buildings.length) return null
	const enemies = state.units.filter((unit) => unit.player !== state.player)
	const allies = state.units.filter((unit) => unit.player === state.player)
	const income = state.cells.reduce((total, cell) => total + (cell.owner === state.player ? buildingIncome(cell.building) : 0), 0)
	const budget = state.money[state.player]
	const enemyValue = enemies.reduce((total, enemy) => total + (unitTypes[enemy.type].cost * enemy.health) / unitTypes[enemy.type].maxHealth, 0)
	const economicTargets = state.cells.filter((cell) => cell.building && cell.owner !== state.player).length
	// Larger battlefields need more independent capturing units, not just enough
	// combat strength to counter the army currently visible near a production site.
	const desiredCapturers = Math.min(8, Math.max(2, Math.ceil(economicTargets / 3)))
	const capturers = allies
		.flatMap((unit) => [unit, ...(unit.cargo ?? [])])
		.filter((unit) => unitTypes[unit.type].captures)
		.reduce((total, unit) => total + unit.health / unitTypes[unit.type].maxHealth, 0)
	const uncovered = enemies.map((enemy) => {
		const threatValue = (unitTypes[enemy.type].cost * enemy.health) / unitTypes[enemy.type].maxHealth
		// Allocate existing firepower across the whole opposing army, not once per enemy.
		const coverage = allies.reduce((total, ally) => total + (estimatedTurnDamage(ally.type, enemy.type, ally.health / unitTypes[ally.type].maxHealth) * threatValue) / Math.max(1, enemyValue), 0)
		return { enemy, threatValue, deficit: Math.max(0, 1 - coverage / Math.max(1, enemy.health * 1.3)) }
	})
	const offers: RecruitmentPlan[] = []
	for (const building of buildings) {
		for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
			const definition = unitTypes[type]
			if (productionBuilding(type) !== building.building || definition.cost > budget + income * 2) continue
			if (definition.capacity) {
				const score = transportPurchaseScore(state, building.index)
				if (score > 0) offers.push({ buildingIndex: building.index, type, cost: definition.cost, score, affordable: definition.cost <= budget })
				continue
			}
			let combatValue = 0
			for (const { enemy, threatValue, deficit } of uncovered) {
				const damageDealt = Math.min(enemy.health, estimatedTurnDamage(type, enemy.type))
				const reach = 1 / (1 + cellDistance(state, building.index, enemy.cell) / Math.max(1, definition.movement * 3))
				combatValue += (damageDealt / unitTypes[enemy.type].maxHealth) * threatValue * deficit * reach
			}
			const rangedSafety = definition.range > 1 ? 1.3 : 1
			let score = (combatValue * rangedSafety) / Math.sqrt(definition.cost / 200)
			if (definition.captures && capturers < desiredCapturers && economicTargets > 0) score += (desiredCapturers - capturers) * 85 * Math.sqrt(200 / definition.cost)
			const duplicates = allies.filter((unit) => unit.type === type).length
			score /= 1 + duplicates * 0.2
			offers.push({ buildingIndex: building.index, type, cost: definition.cost, score, affordable: definition.cost <= budget })
		}
	}
	offers.sort((firstOffer, secondOffer) => planningScore(state, secondOffer) - planningScore(state, firstOffer) || firstOffer.cost - secondOffer.cost)
	const best = offers[0]
	if (!best || best.score <= 0) return null
	const affordable = offers.find((offer) => offer.affordable && offer.score > 0)
	if (best.affordable || !affordable) return best
	const emergency = allies.length <= 2 || buildings.some((building) => enemies.some((enemy) => cellDistance(state, building.index, enemy.cell) <= unitTypes[enemy.type].movement / 2 + unitTypes[enemy.type].range))
	// Wait at most two income payments, and only for a materially better reinforcement.
	return !emergency && best.score > affordable.score * 1.3 ? best : affordable
}
