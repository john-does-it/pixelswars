import { unitTypes } from './catalog.js'
import { selectedUnit, unitAt, canAttack, applyDamage, locked } from './model.js'
import * as actions from './actions.js'

// A controller belongs to one mounted game. No DOM, global state or audio objects.
export function createController(state, { sound = () => {}, delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
	let disposed = false
	const play = (name) => {
		if (!disposed) sound(name)
	}
	async function fight(defender) {
		const attacker = selectedUnit(state)
		if (disposed || locked(state) || !canAttack(state, attacker, defender) || attacker.attacks <= 0) return
		state.origin = { cell: attacker.cell, movement: attacker.movement }
		state.fighting = true
		try {
			play(unitTypes[attacker.type].fightSound)
			applyDamage(state, attacker, defender)
			attacker.attacks--
			await delay(unitTypes[attacker.type].delay)
			if (disposed) return
			if (defender.health > 0 && canAttack(state, defender, attacker)) {
				play(unitTypes[defender.type].fightSound)
				applyDamage(state, defender, attacker)
				await delay(unitTypes[defender.type].delay)
				if (disposed) return
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
				await delay(500)
				if (!disposed) state.explosion = null
			}
		} finally {
			if (!disposed) state.fighting = false
		}
	}
	return {
		state,
		dispose() {
			disposed = true
		},
		fight,
		select(id) {
			if (locked(state)) return
			actions.select(state, id)
			const unit = selectedUnit(state)
			if (unit?.id === id) play(unitTypes[unit.type].selectSound)
		},
		clickCell(index) {
			if (disposed || locked(state)) return
			const unit = unitAt(state, index)
			if (unit) {
				if (unit.player === state.player) {
					if (state.selectedId === unit.id) actions.openProduction(state, index)
					else this.select(unit.id)
				} else void fight(unit)
			} else if (selectedUnit(state) && actions.move(state, index)) play('woosh-movement')
			else actions.openProduction(state, index)
			state.hoveredIndex = index
		},
		move(index) {
			if (actions.move(state, index)) play('woosh-movement')
		},
		cancel() {
			actions.cancelMove(state)
		},
		openProduction(index) {
			actions.openProduction(state, index)
		},
		confirm() {
			actions.deselect(state)
		},
		capture() {
			if (actions.capture(state)) play(state.cells[selectedUnit(state).cell].capturePoints === 20 ? 'trumpet-fanfare' : 'jump-capture')
		},
		buy(type) {
			if (actions.buy(state, type)) play(type === 'infantry' ? 'military-march' : 'mechanic-building')
		},
		endTurn() {
			if (actions.endTurn(state)) play('next-round')
		},
		keydown(event) {
			if (locked(state) || state.productionIndex !== null || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(event.target?.tagName) && event.target?.dataset?.cell === undefined)) return
			const unit = selectedUnit(state)
			if (!unit) return
			const offsets = { ArrowLeft: -1, q: -1, ArrowRight: 1, d: 1, ArrowUp: -state.cols, z: -state.cols, ArrowDown: state.cols, s: state.cols }
			if (event.key in offsets) {
				event.preventDefault()
				this.move(unit.cell + offsets[event.key])
			} else if (event.key === 'Escape') {
				event.preventDefault()
				this.cancel()
			} else if (event.key === 'Enter') {
				event.preventDefault()
				this.confirm()
			} else if (event.key === ' ') {
				event.preventDefault()
				this.capture()
			}
		}
	}
}
