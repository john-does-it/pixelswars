import { createUnit, isUnitTypeId, unitTypes, productionBuildings } from './catalog.ts'
import { movementCost, selectedUnit, locked, reachableCells, canCapture, purchaseStatus } from './model.ts'
import type { GameState } from './types.ts'

export function deselect(state: GameState): void {
	if (locked(state)) return
	state.selectedId = null
	state.origin = null
}

export function select(state: GameState, id: number): void {
	if (locked(state)) return
	const unit = state.units.find((unit) => unit.id === id)
	if (!unit || unit.player !== state.player || unit.health <= 0) return
	if (state.selectedId !== id) state.origin = { cell: unit.cell, movement: unit.movement }
	state.selectedId = id
	state.productionIndex = null
}

export function move(state: GameState, index: number): boolean {
	if (locked(state)) return false
	const unit = selectedUnit(state)
	if (!unit || !reachableCells(state, unit).includes(index)) return false
	unit.movement -= movementCost(unit, state.cells[index])
	unit.cell = index
	return true
}

export function cancelMove(state: GameState): void {
	if (locked(state)) return
	const unit = selectedUnit(state)
	if (unit && state.origin) {
		unit.cell = state.origin.cell
		unit.movement = state.origin.movement
	}
	deselect(state)
}

export function capture(state: GameState): boolean {
	if (!canCapture(state)) return false
	const unit = selectedUnit(state)
	if (!unit) return false
	const cell = state.cells[unit.cell]
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

export function buy(state: GameState, type: string): boolean {
	if (!isUnitTypeId(type) || !purchaseStatus(state, type).available) return false
	state.units.push(createUnit(type, state.player, state.productionIndex!, state.nextId++))
	state.money[state.player] -= unitTypes[type].cost
	state.productionIndex = null
	deselect(state)
	return true
}

export function endTurn(state: GameState): boolean {
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
		const definition = unitTypes[unit.type]
		const cell = state.cells[unit.cell]
		unit.movement = definition.movement
		unit.attacks = definition.attacks
		unit.capture = definition.captures ? 1 : 0
		if (cell.building === 'hospital' && cell.owner === state.player && unit.player === state.player) {
			unit.health = Math.min(definition.maxHealth, unit.health + 25)
		}
	}
	return true
}

export function openProduction(state: GameState, index: number): void {
	if (locked(state)) return
	const cell = state.cells[index]
	if (!cell?.building || !(cell.building in productionBuildings) || cell.owner !== state.player) return
	deselect(state)
	state.productionIndex = state.productionIndex === index ? null : index
}
