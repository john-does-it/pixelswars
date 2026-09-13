import rules from './combat-rules.ts'
import { createUnit, isUnitTypeId, terrainTypes, unitTypes } from './catalog.ts'
import type { Cell, GameMap, GameState, PurchaseStatus, TerrainId, Unit, UnitDomain, UnitTypeId } from './types.ts'

const buildingIds = ['city', 'factory', 'hospital', 'airport'] as const

export function initialState(map: GameMap): GameState {
	return {
		mapId: map.id,
		cols: map.cols,
		rows: map.rows,
		cells: map.cells.map((cell, index) => {
			// Later terrain definitions override grass on forest/building cells, as in the POC.
			const terrain: TerrainId = (Object.keys(terrainTypes) as TerrainId[]).filter((type) => cell.classes.includes('-' + type)).at(-1) || 'grass'
			return { ...cell, classes: [...cell.classes], index, terrain, ...terrainTypes[terrain], building: buildingIds.find((type) => cell.classes.includes('-' + type)) ?? null }
		}),
		units: map.units.map((unit, id) => createUnit(unit.type, unit.player, unit.cell, id)),
		nextId: map.units.length,
		player: 1,
		round: 1,
		money: { 1: 0, 2: 0 },
		selectedId: null,
		origin: null,
		productionIndex: null,
		hoveredIndex: null,
		fighting: false,
		winner: null,
		explosion: null,
		incomeCells: [],
		capturedCells: [],
		securedCells: [],
		music: false,
		sound: true,
		keyboardLayout: 'azerty'
	}
}

export const selectedUnit = (state: GameState): Unit | undefined => state.units.find((unit) => unit.id === state.selectedId)
export const unitAt = (state: GameState, index: number): Unit | undefined => state.units.find((unit) => unit.cell === index && unit.health > 0)
export const locked = (state: GameState): boolean => state.fighting || state.winner !== null

export function neighbors(state: GameState, index: number): number[] {
	const column = index % state.cols
	return [column > 0 ? index - 1 : -1, column < state.cols - 1 ? index + 1 : -1, index - state.cols, index + state.cols].filter((neighborIndex) => neighborIndex >= 0 && neighborIndex < state.cells.length)
}

export function movementCostForDomain(domain: UnitDomain, cell: Pick<Cell, 'terrain' | 'cost'>): number {
	if (domain === 'air') return 1
	if (domain === 'naval') return cell.terrain === 'water' ? cell.cost : Infinity
	return cell.terrain === 'water' ? Infinity : cell.cost
}

export const movementCost = (unit: Unit, cell: Cell): number => movementCostForDomain(unitTypes[unit.type].domain ?? 'ground', cell)
export const productionBuilding = (type: UnitTypeId): string => unitTypes[type].production ?? 'factory'

export function reachableCells(state: GameState, unit = selectedUnit(state)): number[] {
	return unit ? neighbors(state, unit.cell).filter((index) => movementCost(unit, state.cells[index]) <= unit.movement && !unitAt(state, index)) : []
}

export function effectiveRange(state: GameState, unit: Unit): { minimum: number; maximum: number; bonus: number } {
	const definition = unitTypes[unit.type]
	const cell = state.cells[unit.cell]
	const bonus = (definition.domain ?? 'ground') === 'ground' && definition.range > 1 && cell?.terrain === 'moutain' && movementCost(unit, cell) <= definition.movement ? 1 : 0
	return { minimum: definition.exclusion + 1, maximum: definition.range + bonus, bonus }
}

export function attackCells(state: GameState, unit = selectedUnit(state)): number[] {
	if (!unit) return []
	const range = effectiveRange(state, unit)
	return rules.attackCells(unit.cell, state.cols, state.rows, range.maximum, range.minimum - 1)
}

export function canAttack(state: GameState, attacker?: Unit, defender?: Unit): boolean {
	return !!(attacker && defender && attacker.health > 0 && defender.health > 0 && state.units.includes(attacker) && state.units.includes(defender) && attacker.player !== defender.player && rules.canTarget(attacker.type, defender.type) && attackCells(state, attacker).includes(defender.cell))
}

export function canCapture(state: GameState): boolean {
	const unit = selectedUnit(state)
	if (!unit || locked(state) || unit.capture <= 0 || unit.player !== state.player) return false
	const cell = state.cells[unit.cell]
	return !!cell?.building && (cell.owner !== state.player || cell.capturePoints < 20)
}

export function purchaseStatus(state: GameState, type: string): PurchaseStatus {
	const cell = state.productionIndex === null ? undefined : state.cells[state.productionIndex]
	const definition = isUnitTypeId(type) ? unitTypes[type] : undefined
	const cost = definition?.cost
	const missing = Math.max(0, (cost ?? Infinity) - state.money[state.player])
	const occupied = !!cell && !!unitAt(state, cell.index)
	return { missing, occupied, available: !locked(state) && !!cell && !!definition && cell.building === productionBuilding(type as UnitTypeId) && cell.owner === state.player && !occupied && missing === 0 }
}

export function applyDamage(state: GameState, attacker: Unit, defender: Unit): void {
	const attackerDefinition = unitTypes[attacker.type]
	const defenderDefinition = unitTypes[defender.type]
	const damageAmount = rules.damage(attackerDefinition.attack, attacker.health, attackerDefinition.maxHealth, defenderDefinition.defense, defenderDefinition.domain === 'air' ? 0 : state.cells[defender.cell].defense, attacker.type, defender.type)
	defender.health = Math.max(0, Math.round(defender.health - damageAmount))
}
