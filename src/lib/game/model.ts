import rules from './combat-rules.ts'
import { buildingIncome, createUnit, isUnitTypeId, terrainTypes, unitTypes } from './catalog.ts'
import { faceOpponents } from './facing.ts'
import type { Cell, GameMap, GameState, Player, PurchaseStatus, TerrainId, Unit, UnitDomain, UnitTypeId } from './types.ts'

const buildingIds = ['city', 'big-city', 'factory', 'hospital', 'airport', 'naval-base'] as const

export function initialState(map: GameMap): GameState {
	const units = map.units.map((unit, id) => createUnit(unit.type, unit.player, unit.cell, id))
	faceOpponents(units, map.cols)
	return {
		network: null,
		mapId: map.id,
		cols: map.cols,
		rows: map.rows,
		cells: map.cells.map((cell, index) => {
			// Older exported maps used oil fields for the same 300$ income building.
			const classes = cell.classes.map((name) => (name === '-oil-field' ? '-big-city' : name))
			// Later terrain definitions override grass on forest/building cells, as in the POC.
			const terrain: TerrainId = (Object.keys(terrainTypes) as TerrainId[]).filter((type) => classes.includes('-' + type)).at(-1) || 'grass'
			return { ...cell, classes, index, terrain, ...terrainTypes[terrain], building: buildingIds.find((type) => classes.includes('-' + type)) ?? null }
		}),
		units,
		nextId: map.units.length,
		player: 1,
		round: 1,
		money: { 1: 0, 2: 0 },
		selectedId: null,
		deployingPassengerId: null,
		inspectedEnemyId: null,
		origin: null,
		productionIndex: null,
		previewIndex: null,
		fighting: false,
		moving: false,
		bridgeTransit: null,
		combatTargetIndex: null,
		combatSourceIndex: null,
		winner: null,
		explosion: null,
		incomeCells: [],
		healedCells: {},
		capturedCells: [],
		securedCells: [],
		music: false,
		sound: true,
		keyboardLayout: 'azerty',
		aiThinking: false
	}
}

export const selectedUnit = (state: GameState): Unit | undefined => state.units.find((unit) => unit.id === state.selectedId)
export const inspectedEnemy = (state: GameState): Unit | undefined => (!locked(state) && !state.aiThinking ? state.units.find((unit) => unit.id === state.inspectedEnemyId && unit.player !== (state.network?.player ?? state.player) && unit.health > 0) : undefined)
export const unitAt = (state: GameState, index: number): Unit | undefined => state.units.find((unit) => unit.cell === index && unit.health > 0)
export const locked = (state: GameState): boolean => state.fighting || state.moving || state.winner !== null

export function neighbors(state: GameState, index: number): number[] {
	const column = index % state.cols
	return [column > 0 ? index - 1 : -1, column < state.cols - 1 ? index + 1 : -1, index - state.cols, index + state.cols].filter((neighborIndex) => neighborIndex >= 0 && neighborIndex < state.cells.length)
}

export function movementCostForDomain(domain: UnitDomain, cell: Pick<Cell, 'terrain' | 'cost'> & Partial<Pick<Cell, 'building' | 'classes'>>): number {
	if (cell.terrain === 'void') return Infinity
	if (domain === 'air') return 1
	if (cell.terrain === 'blocker') return Infinity
	if (domain === 'naval') {
		return cell.terrain === 'water' || cell.building === 'naval-base' ? cell.cost : Infinity
	}
	return cell.terrain === 'water' ? Infinity : cell.cost
}

export const movementCost = (unit: Unit, cell: Cell): number => movementCostForDomain(unitTypes[unit.type].domain ?? 'ground', cell)
export function productionBuilding(type: UnitTypeId): string | null {
	const production = unitTypes[type].production
	return production === undefined ? 'factory' : production
}

// Bridge crossings are one atomic move: a ship never occupies the road deck.
export function movementSteps(state: GameState, unit: Unit, from = unit.cell, occupants = new Map(state.units.filter((other) => other.health > 0 && other.id !== unit.id).map((other) => [other.cell, other]))): { index: number; cost: number; direction: number }[] {
	return neighbors(state, from).flatMap((neighbor) => {
		const direction = neighbor - from
		let index = neighbor
		let cost = 0
		if (unitTypes[unit.type].domain === 'naval') {
			while (state.cells[index].terrain === 'road' && state.cells[index].classes.includes('-bridge')) {
				const cell = state.cells[index]
				const occupant = occupants.get(index)
				// Cross perpendicular to the road, beneath either team's ground units.
				if (!cell.classes.includes(Math.abs(direction) === 1 ? '-v' : '-h') || (occupant && (unitTypes[occupant.type].domain ?? 'ground') !== 'ground')) return []
				cost += terrainTypes.water.cost
				if (!neighbors(state, index).includes(index + direction)) return []
				index += direction
			}
		}
		cost += movementCost(unit, state.cells[index])
		return occupants.has(index) || !Number.isFinite(cost) || cost > unitTypes[unit.type].movement ? [] : [{ index, cost, direction }]
	})
}

export function reachableCells(state: GameState, unit = selectedUnit(state)): number[] {
	return unit
		? movementSteps(state, unit)
				.filter((step) => step.cost <= unit.movement)
				.map((step) => step.index)
		: []
}

export function effectiveRange(state: GameState, unit: Unit): { minimum: number; maximum: number; bonus: number } {
	const definition = unitTypes[unit.type]
	const cell = state.cells[unit.cell]
	const bonus = (definition.domain ?? 'ground') === 'ground' && definition.range > 1 && cell?.terrain === 'moutain' && movementCost(unit, cell) <= definition.movement ? 1 : 0
	return { minimum: definition.exclusion + 1, maximum: definition.range + bonus, bonus }
}

export function attackCells(state: GameState, unit = selectedUnit(state)): number[] {
	if (!unit || unitTypes[unit.type].attack === 0) return []
	const range = effectiveRange(state, unit)
	return rules.attackCells(unit.cell, state.cols, state.rows, range.maximum, range.minimum - 1).filter((index) => state.cells[index].terrain !== 'void')
}

export function canAttack(state: GameState, attacker?: Unit, defender?: Unit): boolean {
	return !!(attacker && defender && attacker.health > 0 && defender.health > 0 && state.units.includes(attacker) && state.units.includes(defender) && attacker.player !== defender.player && rules.canTarget(attacker.type, defender.type) && attackCells(state, attacker).includes(defender.cell))
}

export function canRetaliate(state: GameState, defender: Unit, attacker: Unit): boolean {
	return defender.attacks > 0 && canAttack(state, defender, attacker)
}

export function canCapture(state: GameState, unit = selectedUnit(state)): boolean {
	if (!unit || locked(state) || unit.capture <= 0 || unit.player !== state.player) return false
	const cell = state.cells[unit.cell]
	return !!cell?.building && (cell.owner !== state.player || cell.capturePoints < 20)
}

export function playerIncome(state: GameState, player: Player): number {
	return state.cells.reduce((income, cell) => income + (cell.owner === player ? buildingIncome(cell.building) : 0), 0)
}

export function purchaseStatus(state: GameState, type: string): PurchaseStatus {
	const cell = state.productionIndex === null ? undefined : state.cells[state.productionIndex]
	const definition = isUnitTypeId(type) ? unitTypes[type] : undefined
	const cost = definition?.cost
	const missing = Math.max(0, (cost ?? Infinity) - state.money[state.player])
	const occupied = !!cell && !!unitAt(state, cell.index)
	return { missing, occupied, available: !locked(state) && !!cell?.building && !!definition && cell.building === productionBuilding(type as UnitTypeId) && cell.owner === state.player && !occupied && missing === 0 }
}

export function applyDamage(state: GameState, attacker: Unit, defender: Unit): void {
	const attackerDefinition = unitTypes[attacker.type]
	const defenderDefinition = unitTypes[defender.type]
	const damageAmount = rules.damage(attackerDefinition.attack, attacker.health, attackerDefinition.maxHealth, defenderDefinition.defense, defenderDefinition.domain === 'air' ? 0 : state.cells[defender.cell].defense, attacker.type, defender.type)
	defender.health = Math.max(0, Math.round(defender.health - damageAmount))
}
