import layout from './dev-map.json' with { type: 'json' }
import type { GameMap } from './types.ts'

export function createDevMap(): GameMap {
	return { ...structuredClone(layout as GameMap), id: 'dev' }
}
