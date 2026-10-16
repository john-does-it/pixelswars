import { unitTypes } from './catalog.ts'
import { locked, movementCost, neighbors, selectedUnit, unitAt } from './model.ts'
import type { GameState, Unit } from './types.ts'
import { pathsFrom } from './movement.ts'
import { faceCell } from './facing.ts'

export const isInfantry = (unit: Unit): boolean => unit.type === 'infantry' || unit.type === 'infantry-rocket' || unit.type === 'infantry-sniper'

export function canCarry(transport: Unit, passenger: Unit): boolean {
	if (transport.id === passenger.id || !unitTypes[transport.type]?.capacity || !unitTypes[passenger.type] || passenger.cargo?.length) return false
	if (passenger.cargo !== undefined && (!unitTypes[passenger.type].capacity || !Array.isArray(passenger.cargo))) return false
	return transport.type === 'transport-ship' ? (unitTypes[passenger.type].domain ?? 'ground') === 'ground' : isInfantry(passenger)
}

export function boardingCost(state: GameState, transport: Unit, passenger: Unit): number {
	// Boarding from shore costs an action point, not movement into impassable water.
	return transport.type === 'transport-ship' ? 1 : movementCost(passenger, state.cells[transport.cell])
}

function hasRoomFor(state: GameState, transport: Unit, passenger: Unit): boolean {
	return state.units.includes(transport) && state.units.includes(passenger) && transport.health > 0 && passenger.health > 0 && transport.player === state.player && passenger.player === transport.player && canCarry(transport, passenger) && (transport.cargo?.length ?? 0) < (unitTypes[transport.type].capacity ?? 0)
}

export function canEmbark(state: GameState, transport: Unit, passenger: Unit, continuingPath = false): boolean {
	return !state.fighting && state.winner === null && (!state.moving || continuingPath) && hasRoomFor(state, transport, passenger) && neighbors(state, transport.cell).includes(passenger.cell) && passenger.movement >= boardingCost(state, transport, passenger)
}

export function boardingPaths(state: GameState, passenger: Unit): Map<number, { cost: number; path: number[] }> {
	const destinations = new Map<number, { cost: number; path: number[] }>()
	if (locked(state) || passenger.movement <= 0) return destinations
	const paths = pathsFrom(state, passenger, passenger.movement)
	for (const transport of state.units.filter((candidate) => hasRoomFor(state, candidate, passenger))) {
		for (const neighbor of neighbors(state, transport.cell)) {
			const approach = paths.get(neighbor)
			if (!approach) continue
			const cost = approach.cost + boardingCost(state, transport, passenger)
			if (cost <= passenger.movement && cost < (destinations.get(transport.cell)?.cost ?? Infinity)) destinations.set(transport.cell, { cost, path: [...approach.path, transport.cell] })
		}
	}
	return destinations
}

export const selectedPassenger = (state: GameState): Unit | undefined => selectedUnit(state)?.cargo?.find((passenger) => passenger.id === state.deployingPassengerId)

export function selectPassenger(state: GameState, passengerId: number): void {
	const transport = selectedUnit(state)
	const passenger = transport?.cargo?.find((unit) => unit.id === passengerId)
	if (locked(state) || !transport || transport.player !== state.player || !passenger) return
	if (state.deployingPassengerId !== passengerId && !deploymentCells(state, transport, passenger).length) return
	state.deployingPassengerId = state.deployingPassengerId === passengerId ? null : passengerId
	state.inspectedEnemyId = null
}

export function deploymentCells(state: GameState, transport: Unit, passenger: Unit): number[] {
	if (locked(state) || !state.units.includes(transport) || transport.player !== state.player || transport.health <= 0 || !transport.cargo?.includes(passenger) || passenger.health <= 0) return []
	return neighbors(state, transport.cell).filter((index) => !unitAt(state, index) && Number.isFinite(movementCost(passenger, state.cells[index])))
}

export function embark(state: GameState, passengerId: number, transportId = state.selectedId, continuingPath = false): boolean {
	const transport = state.units.find((unit) => unit.id === transportId)
	const passenger = state.units.find((unit) => unit.id === passengerId)
	if (!transport || !passenger || !canEmbark(state, transport, passenger, continuingPath)) return false
	passenger.movement -= boardingCost(state, transport, passenger)
	faceCell(passenger, transport.cell, state.cols)
	transport.cargo = [...(transport.cargo ?? []), passenger]
	state.units = state.units.filter((unit) => unit.id !== passenger.id)
	state.selectedId = transport.id
	state.deployingPassengerId = null
	// Loading commits both positions; cancel cannot duplicate or retrieve cargo.
	state.origin = { cell: transport.cell, movement: transport.movement }
	state.inspectedEnemyId = null
	state.previewIndex = transport.cell
	return true
}

export function deploy(state: GameState, passengerId: number, destination: number): boolean {
	const transport = selectedUnit(state)
	const passenger = transport?.cargo?.find((unit) => unit.id === passengerId)
	if (!transport || !passenger || !deploymentCells(state, transport, passenger).includes(destination)) return false
	transport.cargo = transport.cargo!.filter((unit) => unit.id !== passengerId)
	faceCell(passenger, destination, state.cols, transport.cell)
	passenger.cell = destination
	state.units.push(passenger)
	state.deployingPassengerId = null
	state.origin = { cell: transport.cell, movement: transport.movement }
	state.inspectedEnemyId = null
	return true
}
