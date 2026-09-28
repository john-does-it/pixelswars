import { neighbors, movementCost } from './model.ts'
import type { GameState, Unit } from './types.ts'

// Weighted paths use exactly the same adjacent steps, occupancy and terrain costs as move().
export function pathsFrom(state: GameState, unit: Unit, budget = Infinity): Map<number, { cost: number; path: number[] }> {
	const paths = new Map([[unit.cell, { cost: 0, path: [] as number[] }]])
	const occupied = new Set(state.units.filter((other) => other.id !== unit.id && other.health > 0).map((other) => other.cell))
	const pending = new Set([unit.cell])
	while (pending.size) {
		const index = [...pending].reduce((best, candidate) => (paths.get(candidate)!.cost < paths.get(best)!.cost ? candidate : best))
		pending.delete(index)
		const current = paths.get(index)!
		for (const neighbor of neighbors(state, index)) {
			const cost = current.cost + movementCost(unit, state.cells[neighbor])
			if (occupied.has(neighbor) || !Number.isFinite(cost) || cost > budget || cost >= (paths.get(neighbor)?.cost ?? Infinity)) continue
			paths.set(neighbor, { cost, path: [...current.path, neighbor] })
			pending.add(neighbor)
		}
	}
	return paths
}
