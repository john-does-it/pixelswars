import { unitTypes } from './catalog.ts'
import { selectedUnit, unitAt, canAttack, canRetaliate, applyDamage, locked, movementSteps } from './model.ts'
import * as actions from './actions.ts'
import * as transportActions from './transport.ts'
import { pathsFrom } from './movement.ts'
import { movementStepDuration } from './timing.ts'
import { faceCell } from './facing.ts'
import { createUnitNavigation } from './available-actions.ts'
import type { ControllerOptions, GameController, GameState, Unit, UnitTypeId } from './types.ts'

// A controller belongs to one mounted game. No DOM, global state or audio objects.
export function createController(state: GameState, { sound = () => {}, onSound = () => {}, onChange = () => {}, delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)) }: ControllerOptions = {}): GameController {
	const nextAvailableUnit = createUnitNavigation(state)
	let disposed = false
	const play = (name: string): void => {
		if (disposed) return
		onSound(name)
		if (state.sound) sound(name)
	}
	const playImpact = (unit: Unit): void => {
		const sound = unitTypes[unit.type].impactSound
		if (sound) play(sound)
	}
	async function followPath(unit: Unit, path: number[]): Promise<void> {
		state.moving = true
		try {
			for (const [step, index] of path.entries()) {
				if (disposed || selectedUnit(state)?.id !== unit.id || (state.network && state.network.phase !== 'playing')) break
				const transport = unitAt(state, index)
				if (transport && step === path.length - 1) {
					transportActions.embark(state, unit.id, transport.id, true)
					break
				}
				const crossing = movementSteps(state, unit).find((step) => step.index === index && step.cost <= unit.movement)
				if (!crossing) break
				faceCell(unit, index, state.cols)
				for (let cell = unit.cell + crossing.direction; cell !== index; cell += crossing.direction) {
					state.bridgeTransit = { unitId: unit.id, cell }
					onChange()
					await delay(movementStepDuration)
					if (disposed || (state.network && state.network.phase !== 'playing')) return
				}
				state.bridgeTransit = null
				if (!actions.move(state, index, true)) break
				if (step === 0) play('woosh-movement')
				onChange()
				if (step < path.length - 1) await delay(movementStepDuration)
			}
		} finally {
			state.bridgeTransit = null
			state.moving = false
			if (!disposed) onChange()
		}
	}
	async function fight(defender: Unit): Promise<void> {
		const attacker = selectedUnit(state)
		if (!attacker || disposed || locked(state) || !canAttack(state, attacker, defender) || attacker.attacks <= 0) return
		faceCell(attacker, defender.cell, state.cols)
		faceCell(defender, attacker.cell, state.cols)
		state.origin = { cell: attacker.cell, movement: attacker.movement }
		state.fighting = true
		state.inspectedEnemyId = null
		state.combatTargetIndex = defender.cell
		state.combatSourceIndex = attacker.cell
		try {
			play(unitTypes[attacker.type].fightSound)
			applyDamage(state, attacker, defender)
			attacker.attacks--
			onChange()
			await delay(unitTypes[attacker.type].delay)
			if (disposed) return
			playImpact(attacker)
			if (canRetaliate(state, defender, attacker)) {
				state.combatTargetIndex = attacker.cell
				state.combatSourceIndex = defender.cell
				play(unitTypes[defender.type].fightSound)
				applyDamage(state, defender, attacker)
				defender.attacks--
				onChange()
				await delay(unitTypes[defender.type].delay)
				if (disposed) return
				playImpact(defender)
			}
			const dead = state.units.find((unit) => unit.health <= 0)
			if (dead) {
				state.explosion = dead.cell
				play('bomb')
			}
			state.units = state.units.filter((unit) => unit.health > 0)
			if (!state.units.some((unit) => unit.id === state.selectedId)) {
				state.selectedId = null
				state.origin = null
			}
			for (const player of [1, 2]) {
				if (!state.units.some((unit) => unit.player === player)) state.winner = player === 1 ? 2 : 1
			}
			if (dead) {
				onChange()
				await delay(500)
				if (!disposed) state.explosion = null
			}
		} finally {
			if (!disposed) {
				state.fighting = false
				state.combatTargetIndex = null
				state.combatSourceIndex = null
				onChange()
			}
		}
	}
	return {
		state,
		selectPassenger(passengerId) {
			if (!disposed) transportActions.selectPassenger(state, passengerId)
		},
		embark(passengerId) {
			if (!disposed && transportActions.embark(state, passengerId)) onChange()
		},
		deploy(passengerId, destination) {
			if (!disposed && transportActions.deploy(state, passengerId, destination)) onChange()
		},
		closeProduction() {
			state.productionIndex = null
		},
		dispose() {
			disposed = true
			state.bridgeTransit = null
			state.moving = false
			state.combatTargetIndex = null
			state.combatSourceIndex = null
			state.explosion = null
		},
		fight,
		select(id: number) {
			if (locked(state)) return
			actions.select(state, id)
			const unit = selectedUnit(state)
			if (unit?.id === id) play(unitTypes[unit.type].selectSound)
		},
		clickCell(index: number) {
			if (disposed || locked(state)) return
			const passenger = transportActions.selectedPassenger(state)
			if (passenger) {
				const unit = unitAt(state, index)
				if (unit && unit.player === state.player && unit.id !== state.selectedId) {
					this.select(unit.id)
					return
				}
				this.deploy(passenger.id, index)
				return
			}
			const unit = unitAt(state, index)
			if (unit) {
				if (unit.player === state.player) {
					const selected = selectedUnit(state)
					const boardingPath = selected ? transportActions.boardingPaths(state, selected).get(index)?.path : undefined
					if (selected && boardingPath) {
						void followPath(selected, boardingPath)
						return
					}
					state.inspectedEnemyId = null
					if (state.selectedId === unit.id) actions.openProduction(state, index)
					else this.select(unit.id)
				} else {
					const attacker = selectedUnit(state)
					if (attacker && attacker.attacks > 0 && canAttack(state, attacker, unit)) void fight(unit)
					else state.inspectedEnemyId = state.inspectedEnemyId === unit.id ? null : unit.id
				}
			} else if (state.inspectedEnemyId !== null) state.inspectedEnemyId = null
			else {
				const selected = selectedUnit(state)
				const path = selected ? pathsFrom(state, selected, selected.movement).get(index)?.path : undefined
				if (selected && path?.length) void followPath(selected, path)
				else actions.openProduction(state, index)
			}
			state.previewIndex = index
		},
		move(index: number) {
			if (disposed || locked(state)) return
			const passenger = transportActions.selectedPassenger(state)
			if (passenger) {
				this.deploy(passenger.id, index)
				return
			}
			const selected = selectedUnit(state)
			const transport = unitAt(state, index)
			if (selected && transport && transportActions.embark(state, selected.id, transport.id)) {
				onChange()
				return
			}
			const step = selected && movementSteps(state, selected).find((step) => step.index === index && step.cost <= selected.movement)
			if (selected && step && selected.cell + step.direction !== index) return followPath(selected, [index])
			if (actions.move(state, index)) {
				state.previewIndex = index
				play('woosh-movement')
			}
		},
		cancel() {
			if (state.deployingPassengerId !== null) {
				state.deployingPassengerId = null
				return
			}
			actions.cancelMove(state)
		},
		openProduction(index: number) {
			actions.openProduction(state, index)
		},
		confirm() {
			actions.deselect(state)
		},
		capture() {
			const unit = selectedUnit(state)
			if (unit && actions.capture(state)) play(state.cells[unit.cell].capturePoints === 20 ? 'trumpet-fanfare' : 'jump-capture')
		},
		buy(type: UnitTypeId) {
			if (actions.buy(state, type)) play(type === 'infantry' ? 'military-march' : 'mechanic-building')
		},
		endTurn() {
			if (actions.endTurn(state)) play('next-round')
		},
		keydown(event: KeyboardEvent) {
			const target = event.target instanceof Element ? event.target : null
			if (disposed || locked(state) || event.defaultPrevented || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || target?.closest('dialog')) return
			if (target?.closest('input, textarea, select') || (target instanceof HTMLElement && target.isContentEditable)) return
			if (event.key === 'Tab') {
				if (!target?.closest('.board') || event.repeat || state.productionIndex !== null || state.aiThinking || (state.network && (state.network.pending || state.network.phase !== 'playing' || state.network.player !== state.player))) return
				const next = nextAvailableUnit(event.shiftKey)
				if (!next) return
				event.preventDefault()
				this.select(next.id)
				return
			}
			if (event.key === 'Escape') {
				if (state.productionIndex !== null) return
				if (state.inspectedEnemyId !== null) {
					event.preventDefault()
					state.inspectedEnemyId = null
					return
				}
				if (selectedUnit(state)) {
					event.preventDefault()
					this.cancel()
				}
				return
			}
			if (state.productionIndex !== null) return
			const unit = selectedUnit(state)
			if (!unit) return
			const letterOffsets: Record<string, number> = state.keyboardLayout === 'qwerty' ? { a: -1, d: 1, w: -state.cols, s: state.cols } : { q: -1, d: 1, z: -state.cols, s: state.cols }
			const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -state.cols, ArrowDown: state.cols, ...letterOffsets }
			const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
			const offset = offsets[key]
			if (offset !== undefined) {
				event.preventDefault()
				this.move(movementSteps(state, unit).find((step) => step.direction === offset)?.index ?? unit.cell + offset)
				return
			}
			// Closing settings and using zoom leave a button focused. Movement keys
			// still control the unit; Enter and Space must retain native activation.
			if (target?.closest('button:not([data-cell]), a, summary, [role="button"]')) return
			if (event.key === 'Enter') {
				event.preventDefault()
				this.confirm()
			} else if (event.key === ' ') {
				event.preventDefault()
				this.capture()
			}
		}
	}
}
