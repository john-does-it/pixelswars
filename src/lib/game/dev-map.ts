import { unitTypes } from './catalog.ts'
import type { GameMap, Player, UnitTypeId } from './types.ts'

export function createDevMap(): GameMap {
	// Infantry surrounds each transport so loading can be tested immediately.
	const firstUnits: UnitTypeId[] = ['infantry-sniper', 'transport', 'infantry-rocket', 'infantry']
	const types: UnitTypeId[] = [...firstUnits, ...(Object.keys(unitTypes).filter((type) => type !== 'transport-helicopter' && unitTypes[type as UnitTypeId].domain !== 'naval') as UnitTypeId[]).filter((type) => !firstUnits.includes(type)), 'transport-helicopter', 'attack-ship', 'transport-ship']
	const positions = [0, 1, 2, 17, 3, 4, 5, 6, 7, 8]
	return {
		id: 'dev',
		name: 'Unit test field',
		cols: 16,
		rows: 16,
		cells: Array.from({ length: 256 }, (_, index) => ({ classes: [83, 172].includes(index) ? ['-building', '-naval-base', '-ongrass'] : [35, 220].includes(index) ? ['-building', '-big-city', '-ongrass'] : index === 51 ? ['-blocker', '-ongrass'] : index >= 96 && index < 160 ? ['-water', ...(index < 112 ? ['-grass', '-top'] : index >= 144 ? ['-grass', '-bottom'] : [])] : ['-grass'], owner: [83, 35].includes(index) ? 1 : [172, 220].includes(index) ? 2 : 0, capturePoints: 20 })),
		units: ([1, 2] as Player[]).flatMap((player) =>
			types.map((type, index) => {
				const cell = type === 'attack-ship' ? 102 : type === 'transport-ship' ? 103 : type === 'tank' ? 87 : (positions[index] ?? index)
				return { type, player, cell: player === 1 ? cell : 255 - cell }
			})
		)
	}
}
