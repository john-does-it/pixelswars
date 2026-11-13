import type { GameMap } from '../game/types.js'
import { isLocalMapId, readMap } from './model.ts'

const prefix = 'pixelswar-library-v1:'
export const library = $state<{ maps: GameMap[] }>({ maps: [] })

export const localMapKey = (id: string) => prefix + id
const storedIds = () =>
	Object.keys(localStorage)
		.filter((key) => key.startsWith(prefix))
		.map((key) => key.slice(prefix.length))

export function mapsForBackup(): GameMap[] {
	return storedIds().map((id) => {
		const map = readLocalMap(id)
		if (!map) throw new Error('Cannot read saved map')
		return map
	})
}

export function readLocalMap(id: string): GameMap | null {
	if (!isLocalMapId(id)) return null
	try {
		const raw = localStorage.getItem(localMapKey(id))
		if (!raw) return null
		const map = readMap(raw)
		return map.id === id ? map : null
	} catch {
		return null
	}
}

export function refreshLibrary(event?: StorageEvent) {
	if (event?.key && !event.key.startsWith(prefix)) return
	try {
		library.maps = storedIds()
			.map(readLocalMap)
			.filter((map): map is GameMap => map !== null)
	} catch {
		library.maps = []
	}
}

export function saveLocalMap(map: GameMap, name: string): GameMap {
	const id = isLocalMapId(map.id) && name === map.name ? map.id : 'local-' + crypto.randomUUID()
	const saved = readMap(JSON.stringify({ ...map, id, name }))
	localStorage.setItem(localMapKey(id), JSON.stringify(saved))
	library.maps = [...library.maps.filter((entry) => entry.id !== id), saved]
	return saved
}
