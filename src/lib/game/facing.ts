import type { Unit } from './types.ts'

// Only horizontal travel changes facing; vertical travel keeps the last direction.
export function faceCell(unit: Unit, destination: number, cols: number, origin = unit.cell): void {
	const horizontal = (destination % cols) - (origin % cols)
	if (horizontal !== 0) unit.facing = horizontal < 0 ? 'left' : 'right'
}

// Run once for starting armies, before their sprites are first displayed.
export function faceOpponents(units: Unit[], cols: number): void {
	for (const unit of units) {
		let nearest: Unit | undefined
		let nearestDistance = Infinity
		for (const enemy of units) {
			if (enemy.player === unit.player || enemy.cell % cols === unit.cell % cols) continue
			const distance = Math.abs((enemy.cell % cols) - (unit.cell % cols)) + Math.abs(Math.floor(enemy.cell / cols) - Math.floor(unit.cell / cols))
			if (distance < nearestDistance) {
				nearest = enemy
				nearestDistance = distance
			}
		}
		if (nearest) faceCell(unit, nearest.cell, cols)
	}
}
