import { movementSteps } from './model.ts'
import type { GameState, Unit } from './types.ts'

// Routes contain legal stopping points, with bridge crossings kept atomic.
export function pathsFrom(state: GameState, unit: Unit, budget = Infinity): Map<number, { cost: number; path: number[] }> {
	const paths = new Map([[unit.cell, { cost: 0, path: [] as number[] }]])
	const occupied = new Map(state.units.filter((other) => other.id !== unit.id && other.health > 0).map((other) => [other.cell, other]))
	const pending = new Set([unit.cell])
	while (pending.size) {
		const index = [...pending].reduce((best, candidate) => (paths.get(candidate)!.cost < paths.get(best)!.cost ? candidate : best))
		pending.delete(index)
		const current = paths.get(index)!
		for (const { index: neighbor, cost: stepCost } of movementSteps(state, unit, index, occupied)) {
			const cost = current.cost + stepCost
			if (cost > budget || cost >= (paths.get(neighbor)?.cost ?? Infinity)) continue
			paths.set(neighbor, { cost, path: [...current.path, neighbor] })
			pending.add(neighbor)
		}
	}
	return paths
}
