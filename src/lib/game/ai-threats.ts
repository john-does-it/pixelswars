import { pathsFrom } from './movement.ts'
import rules from './combat-rules.ts'
import { unitTypes } from './catalog.ts'
import { effectiveRange, applyDamage } from './model.ts'
import type { GameState, Unit } from './types.ts'

export function threatens(state: GameState, attacker: Unit, defender: Unit): boolean {
	const range = effectiveRange(state, attacker)
	const distance = Math.max(Math.abs((attacker.cell % state.cols) - (defender.cell % state.cols)), Math.abs(Math.floor(attacker.cell / state.cols) - Math.floor(defender.cell / state.cols)))
	return rules.canTarget(attacker.type, defender.type) && distance >= range.minimum && distance <= range.maximum
}

export function damage(state: GameState, attacker: Unit, defender: Unit): number {
	const after = { ...defender }
	applyDamage(state, attacker, after)
	return defender.health - after.health
}

// Threat envelopes include the opponent's next-turn movement, including mountain range bonuses.
export function enemyPositions(state: GameState): Map<number, number[]> {
	return new Map(state.units.filter((unit) => unit.player !== state.player).map((unit) => [unit.id, [...pathsFrom(state, unit, unitTypes[unit.type].movement).keys()]]))
}

export function exposure(state: GameState, unit: Unit, positions: Map<number, number[]>): number {
	let total = 0
	for (const enemy of state.units.filter((candidate) => candidate.player !== unit.player)) {
		if (positions.get(enemy.id)?.some((cell) => cell !== unit.cell && threatens(state, { ...enemy, cell }, unit))) {
			// A possible future approach is less certain than a shot already lined up.
			total += damage(state, enemy, unit) * unitTypes[enemy.type].attacks * (threatens(state, enemy, unit) ? 1 : 0.35)
		}
	}
	return total
}
