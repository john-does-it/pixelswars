import { createUnit, unitTypes, productionBuildings } from './catalog.js'
import { movementCost, selectedUnit, locked, reachableCells, canCapture, purchaseStatus } from './model.js'

export function deselect(state) {
	if (locked(state)) return
	state.selectedId = null
	state.origin = null
}

export function select(state, id) {
	if (locked(state)) return
	const unit = state.units.find((unit) => unit.id === id)
	if (!unit || unit.player !== state.player || unit.health <= 0) return
	if (state.selectedId !== id) state.origin = { cell: unit.cell, movement: unit.movement }
	state.selectedId = id
	state.productionIndex = null
}

export function move(state, index) {
	if (locked(state)) return false
	const unit = selectedUnit(state)
	if (!unit || !reachableCells(state, unit).includes(index)) return false
	unit.movement -= movementCost(unit, state.cells[index])
	unit.cell = index
	return true
}

export function cancelMove(state) {
	if (locked(state)) return
	const unit = selectedUnit(state)
	if (unit && state.origin) {
		unit.cell = state.origin.cell
		unit.movement = state.origin.movement
	}
	deselect(state)
}

export function capture(state) {
	if (!canCapture(state)) return false
	const unit = selectedUnit(state),
		cell = state.cells[unit.cell]
	if (cell.owner === state.player) {
		cell.capturePoints = 20
		state.securedCells.push(cell.index)
	} else cell.capturePoints -= 10
	if (cell.capturePoints <= 0) {
		state.capturedCells.push(cell.index)
		cell.owner = state.player
		cell.capturePoints = 20
	}
	unit.capture = 0
	// A capture commits the position; cancellation must not undo this action.
	state.origin = { cell: unit.cell, movement: unit.movement }
	return true
}

export function buy(state, type) {
	if (!purchaseStatus(state, type).available) return false
	state.units.push(createUnit(type, state.player, state.productionIndex, state.nextId++))
	state.money[state.player] -= unitTypes[type].cost
	state.productionIndex = null
	deselect(state)
	return true
}

export function endTurn(state) {
	if (locked(state)) return false
	deselect(state)
	state.productionIndex = null
	state.round++
	state.player = state.round % 2 ? 1 : 2
	state.capturedCells = []
	state.securedCells = []
	state.incomeCells = state.cells.filter((cell) => cell.building === 'city' && cell.owner === state.player).map((cell) => cell.index)
	state.money[state.player] += state.incomeCells.length * 200
	for (const unit of state.units) {
		const type = unitTypes[unit.type],
			cell = state.cells[unit.cell]
		unit.movement = type.movement
		unit.attacks = type.attacks
		unit.capture = type.captures ? 1 : 0
		if (cell.building === 'hospital' && cell.owner === state.player && unit.player === state.player) {
			unit.health = Math.min(type.maxHealth, unit.health + 25)
		}
	}
	return true
}

export function openProduction(state, index) {
	if (locked(state)) return
	const cell = state.cells[index]
	if (!productionBuildings[cell?.building] || cell.owner !== state.player) return
	deselect(state)
	state.productionIndex = state.productionIndex === index ? null : index
}
