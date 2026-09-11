import rules from './combat-rules.js'
import { createUnit, terrainTypes, unitTypes } from './catalog.js'

export function initialState(map) {
	return {
		mapId: map.id,
		cols: map.cols,
		rows: map.rows,
		cells: map.cells.map((cell, index) => {
			// Later terrain definitions override grass on forest/building cells, as in the POC.
			const terrain =
				Object.keys(terrainTypes)
					.filter((type) => cell.classes.includes('-' + type))
					.at(-1) || 'grass'
			return { ...cell, classes: [...cell.classes], index, terrain, ...terrainTypes[terrain], building: ['city', 'factory', 'hospital'].find((type) => cell.classes.includes('-' + type)) || null }
		}),
		units: map.units.map((unit, id) => createUnit(unit.type, unit.player, unit.cell, id)),
		nextId: map.units.length,
		player: 1,
		round: 1,
		money: { 1: 0, 2: 0 },
		selectedId: null,
		origin: null,
		factoryIndex: null,
		hoveredIndex: null,
		fighting: false,
		winner: null,
		explosion: null,
		incomePlayer: null,
		music: false
	}
}

export const selectedUnit = (state) => state.units.find((unit) => unit.id === state.selectedId)
export const unitAt = (state, index) => state.units.find((unit) => unit.cell === index && unit.health > 0)
export const locked = (state) => state.fighting || state.winner !== null

export function neighbors(state, index) {
	const x = index % state.cols
	return [x > 0 ? index - 1 : -1, x < state.cols - 1 ? index + 1 : -1, index - state.cols, index + state.cols].filter((i) => i >= 0 && i < state.cells.length)
}

export function reachableCells(state, unit = selectedUnit(state)) {
	return unit ? neighbors(state, unit.cell).filter((index) => state.cells[index].cost <= unit.movement && !unitAt(state, index)) : []
}

export function attackCells(state, unit = selectedUnit(state)) {
	if (!unit) return []
	const type = unitTypes[unit.type]
	return rules.attackCells(unit.cell, state.cols, state.rows, type.range, type.exclusion)
}

export function canAttack(state, attacker, defender) {
	return !!(attacker && defender && attacker.health > 0 && defender.health > 0 && state.units.includes(attacker) && state.units.includes(defender) && attacker.player !== defender.player && rules.canTarget(attacker.type, defender.type) && attackCells(state, attacker).includes(defender.cell))
}

export function canCapture(state) {
	const unit = selectedUnit(state)
	const cell = unit && state.cells[unit.cell]
	return !!(!locked(state) && unit && unit.capture > 0 && cell.building && cell.owner !== state.player)
}

export function purchaseStatus(state, type) {
	const cell = state.cells[state.factoryIndex]
	const cost = unitTypes[type]?.cost
	const missing = Math.max(0, (cost ?? Infinity) - state.money[state.player])
	const occupied = !!cell && !!unitAt(state, cell.index)
	return { missing, occupied, available: !locked(state) && !!cell && cell.building === 'factory' && cell.owner === state.player && !occupied && missing === 0 }
}

export function applyDamage(state, attacker, defender) {
	const a = unitTypes[attacker.type],
		d = unitTypes[defender.type]
	const amount = rules.damage(a.attack, attacker.health, d.defense, state.cells[defender.cell].defense, attacker.type, defender.type)
	defender.health = Math.max(0, Math.round(defender.health - amount))
}
