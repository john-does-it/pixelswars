import rules from './combat-rules.ts'
import { unitTypes } from './catalog.ts'
import { productionBuilding, unitAt } from './model.ts'
import type { Cell, GameState, Unit, UnitTypeId } from './types.ts'

export interface RecruitmentPlan {
	buildingIndex: number
	type: UnitTypeId
	cost: number
	score: number
	affordable: boolean
}

function distance(state: GameState, left: number, right: number): number {
	return Math.abs((left % state.cols) - (right % state.cols)) + Math.abs(Math.floor(left / state.cols) - Math.floor(right / state.cols))
}

function attackCapacity(attacker: UnitTypeId, defender: UnitTypeId, healthRatio = 1): number {
	const definition = unitTypes[attacker]
	return rules.damage(definition.attack, definition.maxHealth * healthRatio, definition.maxHealth, unitTypes[defender].defense, 0, attacker, defender) * definition.attacks
}

export function economicObjectiveValue(state: GameState, cell: Cell): number {
	const income = state.cells.filter((candidate) => candidate.owner === state.player && candidate.building === 'city').length * 200
	const production = state.cells.filter((candidate) => candidate.owner === state.player && (candidate.building === 'factory' || candidate.building === 'airport')).length
	if (cell.building === 'city') return 380 + (income === 0 ? 120 : 0) + (cell.owner !== 0 && cell.owner !== state.player ? 120 : 0)
	if (cell.building === 'factory') return production === 0 ? 500 : 300
	if (cell.building === 'airport') return production === 0 ? 350 : 220
	return 140
}

// One budget and one demand model for every base/airport, recalculated after each purchase.
export function planExpertProduction(state: GameState, produced = new Set<number>()): RecruitmentPlan | null {
	const buildings = state.cells.filter((cell) => cell.owner === state.player && (cell.building === 'factory' || cell.building === 'airport') && !unitAt(state, cell.index) && !produced.has(cell.index))
	if (!buildings.length) return null
	const enemies = state.units.filter((unit) => unit.player !== state.player)
	const allies = state.units.filter((unit) => unit.player === state.player)
	const income = state.cells.filter((cell) => cell.building === 'city' && cell.owner === state.player).length * 200
	const budget = state.money[state.player]
	const enemyValue = enemies.reduce((total, enemy) => total + (unitTypes[enemy.type].cost * enemy.health) / unitTypes[enemy.type].maxHealth, 0)
	const economicTargets = state.cells.filter((cell) => cell.building && cell.owner !== state.player).length
	const desiredCapturers = Math.min(5, Math.max(2, Math.ceil(economicTargets / 3)))
	const capturers = allies.filter((unit) => unitTypes[unit.type].captures).reduce((total, unit) => total + unit.health / unitTypes[unit.type].maxHealth, 0)
	const uncovered = enemies.map((enemy) => {
		const threatValue = (unitTypes[enemy.type].cost * enemy.health) / unitTypes[enemy.type].maxHealth
		// Allocate existing firepower across the whole opposing army, not once per enemy.
		const coverage = allies.reduce((total, ally) => total + (attackCapacity(ally.type, enemy.type, ally.health / unitTypes[ally.type].maxHealth) * threatValue) / Math.max(1, enemyValue), 0)
		return { enemy, threatValue, deficit: Math.max(0, 1 - coverage / Math.max(1, enemy.health * 1.3)) }
	})
	const offers: RecruitmentPlan[] = []
	for (const building of buildings) {
		for (const type of Object.keys(unitTypes) as UnitTypeId[]) {
			const definition = unitTypes[type]
			if (productionBuilding(type) !== building.building || definition.cost > budget + income * 2) continue
			let combatValue = 0
			for (const { enemy, threatValue, deficit } of uncovered) {
				const dealt = Math.min(enemy.health, attackCapacity(type, enemy.type))
				const reach = 1 / (1 + distance(state, building.index, enemy.cell) / Math.max(1, definition.movement * 3))
				combatValue += (dealt / unitTypes[enemy.type].maxHealth) * threatValue * deficit * reach
			}
			const rangedSafety = definition.range > 1 ? 1.3 : 1
			let score = (combatValue * rangedSafety) / Math.sqrt(definition.cost / 200)
			if (definition.captures && capturers < desiredCapturers && economicTargets > 0) score += (desiredCapturers - capturers) * 85 * Math.sqrt(200 / definition.cost)
			const duplicates = allies.filter((unit) => unit.type === type).length
			score /= 1 + duplicates * 0.2
			offers.push({ buildingIndex: building.index, type, cost: definition.cost, score, affordable: definition.cost <= budget })
		}
	}
	offers.sort((left, right) => right.score - left.score || left.cost - right.cost)
	const best = offers[0]
	if (!best || best.score <= 0) return null
	const affordable = offers.find((offer) => offer.affordable && offer.score > 0)
	if (best.affordable || !affordable) return best
	const emergency = allies.length <= 2 || buildings.some((building) => enemies.some((enemy) => distance(state, building.index, enemy.cell) <= unitTypes[enemy.type].movement / 2 + unitTypes[enemy.type].range))
	// Wait at most two income payments, and only for a materially better reinforcement.
	return !emergency && best.score > affordable.score * 1.3 ? best : affordable
}
