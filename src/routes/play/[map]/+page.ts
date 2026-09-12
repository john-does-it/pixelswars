import { error } from '@sveltejs/kit'
import board1 from '$lib/data/board-1.json'
import board2 from '$lib/data/board-2.json'
import type { EntryGenerator, PageLoad } from './$types'
import type { GameMap } from '$lib/game/types.js'

export const entries: EntryGenerator = () => {
	return [{ map: '1' }, { map: '2' }]
}
export const load: PageLoad = ({ params }) => {
	const maps: Record<string, GameMap> = { 1: board1 as GameMap, 2: board2 as GameMap }
	const map = maps[params.map]
	if (!map) error(404, 'Unknown map')
	return { map }
}
