import { error } from '@sveltejs/kit'
import board1 from '$lib/data/board-1.json'
import board2 from '$lib/data/board-2.json'
import board3 from '$lib/data/board-3.json'
import board4 from '$lib/data/board-4.json'
import board5 from '$lib/data/board-5.json'
import board6 from '$lib/data/board-6.json'
import board7 from '$lib/data/board-7.json'
import board8 from '$lib/data/board-8.json'
import type { EntryGenerator, PageLoad } from './$types'
import type { GameMap } from '$lib/game/types.js'

export const entries: EntryGenerator = () => {
	return [{ map: '1' }, { map: '2' }, { map: '3' }, { map: '4' }, { map: '5' }, { map: '6' }, { map: '7' }, { map: '8' }]
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
		8: board8 as GameMap
	}
	const map = maps[params.map]
	if (!map) error(404, 'Unknown map')
	return { map }
}
