import { buildingIncome, createUnit, unitTypes } from './catalog.ts'
import { canCapture, movementCost, neighbors } from './model.ts'
import { pathsFrom } from './movement.ts'
import { canEmbark, deploymentCells, isInfantry } from './transport.ts'
import { damage, enemyPositions, exposure, threatens } from './ai-threats.ts'
import type { AiDifficulty, GameState, Unit } from './types.ts'

type TransportDecision = { kind: 'embark'; unitId: number; passengerId: number } | { kind: 'deploy'; unitId: number; passengerId: number; destination: number } | { kind: 'move'; unitId: number; path: number[] }
type TransportPlan = { decision: TransportDecision; score: number }

function threatsForDifficulty(state: GameState, difficulty: AiDifficulty): Map<number, number[]> {
	if (difficulty === 'easy') return new Map()
	if (difficulty === 'medium') return new Map(state.units.filter((unit) => unit.player !== state.player).map((unit) => [unit.id, [unit.cell]]))
	return enemyPositions(state)
}

export function transportedValue(unit: Unit): number {
	return unitTypes[unit.type].cost + (unit.cargo ?? []).reduce((value, passenger) => value + unitTypes[passenger.type].cost, 0)
}

function arrivalTurns(state: GameState, unit: Unit, path: number[], remaining: number): number {
	let turns = 0
	for (const cell of path) {
		const cost = movementCost(unit, state.cells[cell])
		if (cost > unitTypes[unit.type].movement) return Infinity
		if (remaining < cost) {
			turns++
			remaining = unitTypes[unit.type].movement
		}
		remaining -= cost
	}
	return turns
}

// Compare a few meaningful stops, rather than search every combination of vehicle,
// passenger and tile. Paths include terrain costs, water and occupied cells.
function stops(state: GameState, transport: Unit, moved: Set<number>, difficulty: AiDifficulty, positions: Map<number, number[]>): Map<number, number[]> {
	const candidates = new Map([[transport.cell, [] as number[]]])
	if (moved.has(transport.id) || transport.movement <= 0) return candidates
	const routes = pathsFrom(state, transport)
	const targets = state.cells.filter((cell) => (cell.building && (cell.owner !== state.player || [...positions.values()].some((reachable) => reachable.includes(cell.index)))) || (difficulty !== 'easy' && state.units.some((unit) => unit.player !== state.player && unit.cell === cell.index)))
	targets.sort((left, right) => Math.min(...neighbors(state, left.index).map((index) => routes.get(index)?.cost ?? Infinity)) - Math.min(...neighbors(state, right.index).map((index) => routes.get(index)?.cost ?? Infinity)))
	for (const target of targets.slice(0, difficulty === 'easy' ? 1 : 6)) {
		const approaches = neighbors(state, target.index)
			.map((index) => routes.get(index))
			.filter((route) => route !== undefined)
			.sort((left, right) => left.cost - right.cost)
		const path = approaches[0]?.path.filter((index) => routes.get(index)!.cost <= transport.movement)
		if (path?.length) candidates.set(path.at(-1)!, path)
	}
	return candidates
}

function passengerValue(state: GameState, passenger: Unit, positions: Map<number, number[]>, difficulty: AiDifficulty): number {
	const paths = pathsFrom(state, passenger)
	let objective = 0
	for (const cell of state.cells) {
		if (!cell.building) continue
		const route = paths.get(cell.index)
		if (!route) continue
		const enemyNear = state.units.some((enemy) => enemy.player !== passenger.player && (positions.get(enemy.id) ?? []).includes(cell.index))
		if (cell.owner === passenger.player && !enemyNear) continue
		const turns = Math.max(passenger.capture > 0 ? 0 : 1, arrivalTurns(state, passenger, route.path, passenger.movement))
		const value = difficulty === 'easy' ? 300 : buildingIncome(cell.building) * 3 || (cell.building === 'factory' ? 400 : 180)
		objective = Math.max(objective, (value / (1 + turns)) * (cell.owner === passenger.player ? 0.6 : 1))
	}
	// A freshly unloaded soldier can still move and fire. Prefer a useful firing
	// position, especially when reinforcing a threatened friendly building.
	let combat = 0
	if (difficulty !== 'easy' && passenger.attacks > 0) {
		for (const [cell, route] of paths) {
			if (route.cost > passenger.movement) continue
			const projected = { ...passenger, cell }
			for (const enemy of state.units.filter((unit) => unit.player !== passenger.player)) {
				if (!threatens(state, projected, enemy)) continue
				const dealt = Math.min(enemy.health, damage(state, projected, enemy) * passenger.attacks)
				combat = Math.max(combat, (dealt / unitTypes[enemy.type].maxHealth) * transportedValue(enemy))
			}
		}
	}
	const risk = exposure(state, passenger, positions)
	const caution = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.7 : 1
	return objective + combat - Math.min(1, risk / passenger.health) * unitTypes[passenger.type].cost * caution
}

function deliveryPlan(state: GameState, transport: Unit, passenger: Unit, moved: Set<number>, positions: Map<number, number[]>, difficulty: AiDifficulty): TransportPlan | null {
	if ((moved.has(transport.id) || transport.movement <= 0) && shouldStayAboard(state, transport, passenger, positions, difficulty)) return null
	let best: TransportPlan | null = null
	for (const [cell, path] of stops(state, transport, moved, difficulty, positions)) {
		const projectedTransport = { ...transport, cell }
		const projected = { ...state, units: state.units.map((unit) => (unit.id === transport.id ? projectedTransport : unit)) }
		const vehicleRisk = exposure(projected, projectedTransport, positions)
		const caution = difficulty === 'easy' ? 0.3 : difficulty === 'medium' ? 0.7 : 1
		// Remaining passengers share the vehicle's fate. A lethal exposure is a
		// particularly bad place to deliver a full jeep.
		const cargoAtRisk = transportedValue(transport) - unitTypes[passenger.type].cost
		const loss = Math.min(1, vehicleRisk / transport.health) * cargoAtRisk * caution
		for (const destination of deploymentCells(projected, projectedTransport, passenger)) {
			const deployed = { ...passenger, cell: destination }
			const after = { ...projected, units: [...projected.units, deployed] }
			const score = passengerValue(after, deployed, positions, difficulty) - loss - path.length * 0.1
			if (!best || score > best.score) best = { score, decision: path.length ? { kind: 'move', unitId: transport.id, path } : { kind: 'deploy', unitId: transport.id, passengerId: passenger.id, destination } }
		}
	}
	return best
}

function shouldStayAboard(state: GameState, transport: Unit, passenger: Unit, positions: Map<number, number[]>, difficulty: AiDifficulty): boolean {
	if (exposure(state, transport, positions) > transport.health * 0.25) return false
	const destinations = deploymentCells(state, transport, passenger)
	if (!destinations.length) return true
	const walkingValue = Math.max(
		...destinations.map((cell) => {
			const deployed = { ...passenger, cell }
			return passengerValue({ ...state, units: [...state.units, deployed] }, deployed, positions, difficulty)
		})
	)
	const routes = pathsFrom(state, transport)
	let ridingValue = 0
	for (const objective of state.cells.filter((cell) => cell.building && cell.owner !== state.player)) {
		const approach = neighbors(state, objective.index)
			.map((index) => routes.get(index))
			.filter((route) => route !== undefined)
			.sort((left, right) => left.cost - right.cost)[0]
		if (!approach) continue
		// Resume driving next turn; an unused capture is available on arrival.
		const turns = Math.max(passenger.capture > 0 ? 1 : 2, 1 + arrivalTurns(state, transport, approach.path, unitTypes[transport.type].movement))
		const value = difficulty === 'easy' ? 300 : buildingIncome(objective.building) * 3 || (objective.building === 'factory' ? 400 : 180)
		ridingValue = Math.max(ridingValue, value / (1 + turns))
	}
	return ridingValue > walkingValue + 5
}

export function planTransport(state: GameState, moved: Set<number>, difficulty: AiDifficulty, withinBudget: () => boolean = () => true): TransportPlan | null {
	const transports = state.units.filter((unit) => unit.player === state.player && unitTypes[unit.type].capacity)
	if (!transports.length) return null
	const positions = threatsForDifficulty(state, difficulty)
	let best: TransportPlan | null = null
	for (const transport of transports) {
		if (best && !withinBudget()) break
		for (const passenger of transport.cargo ?? []) {
			if (best && !withinBudget()) break
			const plan = deliveryPlan(state, transport, passenger, moved, positions, difficulty)
			if (plan && (!best || plan.score > best.score)) best = plan
		}
		if (moved.has(transport.id) || transport.movement <= 0) continue
		for (const passenger of state.units) {
			if (best && !withinBudget()) break
			if (!canEmbark(state, transport, passenger) || canCapture({ ...state, selectedId: passenger.id })) continue
			const loaded = { ...passenger, movement: passenger.movement - movementCost(passenger, state.cells[transport.cell]) }
			const loadedTransport = { ...transport, cargo: [...(transport.cargo ?? []), loaded] }
			const projected = { ...state, units: state.units.filter((unit) => unit.id !== passenger.id).map((unit) => (unit.id === transport.id ? loadedTransport : unit)) }
			const plan = deliveryPlan(projected, loadedTransport, loaded, moved, positions, difficulty)
			const walking = passengerValue(state, passenger, positions, difficulty)
			// Do not interrupt a capture or board merely to step out again. Riding
			// must improve the passenger's prospects over continuing on foot.
			if (plan?.decision.kind === 'move' && plan.score > walking + Math.max(5, walking * 0.05) && (!best || plan.score > best.score)) best = { score: plan.score, decision: { kind: 'embark', unitId: transport.id, passengerId: passenger.id } }
		}
	}
	return best
}

export function transportPurchaseScore(state: GameState, buildingIndex: number, difficulty: AiDifficulty = 'expert'): number {
	const allies = state.units.filter((unit) => unit.player === state.player)
	if (allies.some((unit) => unitTypes[unit.type].capacity)) return 0
	const passengers = allies.filter((unit) => isInfantry(unit) && neighbors(state, buildingIndex).includes(unit.cell) && !canCapture({ ...state, selectedId: unit.id }))
	if (!passengers.length) return 0
	const transport = createUnit(state.cells[buildingIndex].building === 'airport' ? 'transport-helicopter' : 'transport', state.player, buildingIndex, state.nextId)
	const projected = { ...state, units: [...state.units, transport] }
	const positions = threatsForDifficulty(projected, difficulty)
	// Buy a combat unit first when the production site can be struck next turn.
	if (exposure(projected, transport, positions) > transport.health * 0.25) return 0
	const objectiveSavings = new Map<number, number>()
	for (const passenger of passengers.slice(0, 3)) {
		const walking = pathsFrom(state, passenger)
		const driving = pathsFrom(projected, transport)
		for (const objective of state.cells.filter((cell) => cell.building && cell.owner !== state.player)) {
			const footRoute = walking.get(objective.index)
			const driveRoute = neighbors(state, objective.index)
				.map((index) => driving.get(index))
				.filter((route) => route !== undefined)
				.sort((left, right) => left.cost - right.cost)[0]
			if (!driveRoute) continue
			// Newly bought vehicles can move immediately; boarding preserves capture.
			const walkingTurns = footRoute ? arrivalTurns(state, passenger, footRoute.path, passenger.movement) : 8
			const ridingTurns = Math.max(passenger.capture > 0 ? 0 : 1, arrivalTurns(projected, transport, driveRoute.path, unitTypes[transport.type].movement))
			const savedTurns = walkingTurns - ridingTurns
			const value = buildingIncome(objective.building) || (objective.building === 'factory' ? 150 : 50)
			objectiveSavings.set(objective.index, Math.max(objectiveSavings.get(objective.index) ?? 0, savedTurns * value))
		}
	}
	const benefit = [...objectiveSavings.values()]
		.sort((left, right) => right - left)
		.slice(0, passengers.length)
		.reduce((total, saving) => total + saving, 0)
	// The saved income must repay a meaningful share of the transport investment.
	return Math.max(0, benefit - unitTypes[transport.type].cost * 0.5) / 2
}
