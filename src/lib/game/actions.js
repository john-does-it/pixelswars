import { createUnit, unitTypes } from './catalog.js'
import { selectedUnit, locked, reachableCells, canCapture, purchaseStatus } from './model.js'

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
	state.factoryIndex = null
}

export function move(state, index) {
	if (locked(state)) return false
	const unit = selectedUnit(state)
	if (!unit || !reachableCells(state, unit).includes(index)) return false
	unit.movement -= state.cells[index].cost
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
	cell.capturePoints -= 10
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
	state.units.push(createUnit(type, state.player, state.factoryIndex, state.nextId++))
	state.money[state.player] -= unitTypes[type].cost
	state.factoryIndex = null
	deselect(state)
	return true
}

export function endTurn(state) {
	if (locked(state)) return false
	deselect(state)
	state.factoryIndex = null
	state.round++
	state.player = state.round % 2 ? 1 : 2
	state.capturedCells = []
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

export function openFactory(state, index) {
	if (locked(state)) return
	const cell = state.cells[index]
	if (cell?.building !== 'factory' || cell.owner !== state.player) return
	deselect(state)
	state.factoryIndex = state.factoryIndex === index ? null : index
}
