import type { Unit } from './types.ts'

// Only horizontal travel changes facing; vertical travel keeps the last direction.
export function faceCell(unit: Unit, destination: number, cols: number, origin = unit.cell): void {
	const horizontal = (destination % cols) - (origin % cols)
	if (horizontal !== 0) unit.facing = horizontal < 0 ? 'left' : 'right'
}
