import { error } from '@sveltejs/kit'
import board1 from '$lib/data/board-1.json'
import board2 from '$lib/data/board-2.json'

export function entries() {
	return [{ map: '1' }, { map: '2' }]
}
export function load({ params }) {
	const map = { 1: board1, 2: board2 }[params.map]
	if (!map) error(404, 'Unknown map')
	return { map }
}
