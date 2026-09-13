import { error } from '@sveltejs/kit'
import board1 from '$lib/data/board-1.json'
import board2 from '$lib/data/board-2.json'
import board3 from '$lib/data/board-3.json'
import board4 from '$lib/data/board-4.json'
import board5 from '$lib/data/board-5.json'
import board6 from '$lib/data/board-6.json'
import board7 from '$lib/data/board-7.json'
import board8 from '$lib/data/board-8.json'
import board9 from '$lib/data/board-9.json'
import board10 from '$lib/data/board-10.json'
import board11 from '$lib/data/board-11.json'
import board12 from '$lib/data/board-12.json'
import type { EntryGenerator, PageLoad } from './$types'
import type { GameMap } from '$lib/game/types.js'

export const entries: EntryGenerator = () => {
	return Array.from({ length: 12 }, (_, index) => ({ map: String(index + 1) }))
}
export const load: PageLoad = ({ params }) => {
	const maps: Record<string, GameMap> = {
		1: board1 as GameMap,
		2: board2 as GameMap,
		3: board3 as GameMap,
		4: board4 as GameMap,
		5: board5 as GameMap,
		6: board6 as GameMap,
		7: board7 as GameMap,
		8: board8 as GameMap,
		9: board9 as GameMap,
		10: board10 as GameMap,
		11: board11 as GameMap,
		12: board12 as GameMap
	}
	const map = maps[params.map]
	if (!map) error(404, 'Unknown map')
	return { map }
}
