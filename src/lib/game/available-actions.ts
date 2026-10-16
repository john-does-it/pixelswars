import { canAttack, canCapture, locked, reachableCells } from './model.ts'
import { canEmbark, deploymentCells } from './transport.ts'
import type { GameState, Unit } from './types.ts'

// Check only immediate legal actions, without searching routes or changing selection.
export function hasAvailableAction(state: GameState): boolean {
	return state.units.some((unit) => unitHasAvailableAction(state, unit))
}

function unitHasAvailableAction(state: GameState, unit: Unit): boolean {
	if (locked(state) || unit.player !== state.player || unit.health <= 0) return false
	if (reachableCells(state, unit).length || canCapture(state, unit)) return true
	if (unit.attacks > 0 && state.units.some((enemy) => canAttack(state, unit, enemy))) return true
	if (unit.movement > 0 && state.units.some((transport) => canEmbark(state, transport, unit))) return true
	return unit.cargo?.some((passenger) => deploymentCells(state, unit, passenger).length > 0) ?? false
}

// Keep navigation history local to the controller, outside saved/network game state.
export function createUnitNavigation(state: GameState) {
	let history: number[] = []
	let position = -1
	let expectedSelection = state.selectedId
	let round = state.round
	let player = state.player

	return (backwards = false): Unit | undefined => {
		const current = state.units.find((unit) => unit.id === state.selectedId)
		if (!history.length || state.selectedId !== expectedSelection || state.round !== round || state.player !== player) {
			history = current ? [current.id] : []
			position = history.length - 1
			round = state.round
			player = state.player
		}
		const available = state.units.filter((unit) => unitHasAvailableAction(state, unit))
		const remember = (unit: Unit) => {
			expectedSelection = unit.id
			return unit
		}
		// Shift+Tab retraces the actual selection order, skipping units that can no longer act.
		for (let index = position + (backwards ? -1 : 1); index >= 0 && index < history.length; index += backwards ? -1 : 1) {
			const unit = available.find((candidate) => candidate.id === history[index])
			if (unit) {
				position = index
				return remember(unit)
			}
		}
		if (backwards) {
			for (let index = history.length - 1; index > position; index--) {
				const unit = available.find((candidate) => candidate.id === history[index])
				if (unit) {
					position = index
					return remember(unit)
				}
			}
		}
		let candidates = available.filter((unit) => !history.includes(unit.id))
		if (!candidates.length) {
			// Start another pass only after every available unit has been visited.
			history = current ? [current.id] : []
			candidates = available.filter((unit) => unit.id !== current?.id)
		}
		const origin = current?.cell ?? state.previewIndex ?? 0
		const distance = (unit: Unit) => Math.abs((unit.cell % state.cols) - (origin % state.cols)) + Math.abs(Math.floor(unit.cell / state.cols) - Math.floor(origin / state.cols))
		candidates.sort((a, b) => distance(a) - distance(b) || a.cell - b.cell || a.id - b.id)
		const next = candidates[0] ?? available.find((unit) => unit.id === current?.id)
		if (!next) return undefined
		if (history.at(-1) !== next.id) history.push(next.id)
		position = history.length - 1
		return remember(next)
	}
}
