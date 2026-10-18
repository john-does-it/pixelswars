// Import this module dynamically inside a `dev` branch only. Draft JSON must
// never enter the public map registry or the production dependency graph.
import { readMap } from '../map-editor/model.ts'
import mapFiles from '../data/map-files.json'
import type { GameMap } from './types.ts'

const sources = import.meta.glob<string>('../data/drafts/*.json', { eager: true, query: '?raw', import: 'default' })

export function loadDraftMaps(): GameMap[] {
	const ids = new Set(Object.keys(mapFiles))
	return Object.entries(sources)
		.map(([file, raw]) => {
			const map = readMap(raw)
			if (ids.has(map.id)) throw new Error(`Duplicate map ID ${map.id}: ${file}`)
			ids.add(map.id)
			return map
		})
		.sort((a, b) => Number(a.id) - Number(b.id))
}
