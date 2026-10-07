import { unitTypes } from './catalog.ts'
import type { GameMap, Player, UnitTypeId } from './types.ts'

export function createDevMap(): GameMap {
	// Infantry surrounds each transport so loading can be tested immediately.
	const firstUnits: UnitTypeId[] = ['infantry-sniper', 'transport', 'infantry-rocket', 'infantry']
	const types = [...firstUnits, ...(Object.keys(unitTypes) as UnitTypeId[]).filter((type) => !firstUnits.includes(type))]
	const positions = [0, 1, 2, 9, 3, 4, 5, 6, 7, 8]
	return {
		id: 'dev',
		name: 'Unit test field',
		cols: 8,
		rows: 8,
		cells: Array.from({ length: 64 }, () => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })),
		units: ([1, 2] as Player[]).flatMap((player) =>
			types.map((type, index) => {
				const cell = positions[index] ?? index
				return { type, player, cell: player === 1 ? cell : 63 - cell }
			})
		)
	}
}
