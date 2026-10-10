import { unitTypes } from './catalog.ts'
import { locked, movementCost, neighbors, selectedUnit, unitAt } from './model.ts'
import type { GameState, Unit } from './types.ts'
import { pathsFrom } from './movement.ts'
import { faceCell } from './facing.ts'

export const isInfantry = (unit: Unit): boolean => unit.type === 'infantry' || unit.type === 'infantry-rocket' || unit.type === 'infantry-sniper'

function hasRoomFor(state: GameState, transport: Unit, passenger: Unit): boolean {
	return state.units.includes(transport) && state.units.includes(passenger) && transport.health > 0 && passenger.health > 0 && transport.player === state.player && passenger.player === transport.player && isInfantry(passenger) && (transport.cargo?.length ?? 0) < (unitTypes[transport.type].capacity ?? 0)
}

export function canEmbark(state: GameState, transport: Unit, passenger: Unit, continuingPath = false): boolean {
	return !state.fighting && state.winner === null && (!state.moving || continuingPath) && hasRoomFor(state, transport, passenger) && neighbors(state, transport.cell).includes(passenger.cell) && passenger.movement >= movementCost(passenger, state.cells[transport.cell])
}

export function boardingPaths(state: GameState, passenger: Unit): Map<number, { cost: number; path: number[] }> {
	const destinations = new Map<number, { cost: number; path: number[] }>()
	if (locked(state) || !isInfantry(passenger) || passenger.movement <= 0) return destinations
	const paths = pathsFrom(state, passenger, passenger.movement)
	for (const transport of state.units.filter((candidate) => hasRoomFor(state, candidate, passenger))) {
		for (const neighbor of neighbors(state, transport.cell)) {
			const approach = paths.get(neighbor)
			if (!approach) continue
			const cost = approach.cost + movementCost(passenger, state.cells[transport.cell])
			if (cost <= passenger.movement && cost < (destinations.get(transport.cell)?.cost ?? Infinity)) destinations.set(transport.cell, { cost, path: [...approach.path, transport.cell] })
		}
	}
	return destinations
}

export const selectedPassenger = (state: GameState): Unit | undefined => selectedUnit(state)?.cargo?.find((passenger) => passenger.id === state.deployingPassengerId)

export function selectPassenger(state: GameState, passengerId: number): void {
	const transport = selectedUnit(state)
	if (locked(state) || !transport || transport.player !== state.player || !transport.cargo?.some((passenger) => passenger.id === passengerId)) return
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
	passenger.movement -= movementCost(passenger, state.cells[transport.cell])
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
