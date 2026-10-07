import { error } from '@sveltejs/kit'
import { dev } from '$app/environment'
import neighborTrouble from '$lib/data/neighbor-trouble.json'
import aLittleStroll from '$lib/data/a-little-stroll.json'
import afterYou from '$lib/data/after-you.json'
import meetInTheMiddle from '$lib/data/meet-in-the-middle.json'
import theScenicRoute from '$lib/data/the-scenic-route.json'
import roomPlease from '$lib/data/room-please.json'
import areWeThereYet from '$lib/data/are-we-there-yet.json'
import rightOfWay from '$lib/data/right-of-way.json'
import keepYourFeetDry from '$lib/data/keep-your-feet-dry.json'
import watchThePuddles from '$lib/data/watch-the-puddles.json'
import niceViewUpHere from '$lib/data/nice-view-up-here.json'
import theOtherBank from '$lib/data/the-other-bank.json'
import notTheShoes from '$lib/data/not-the-shoes.json'
import whichWayAcross from '$lib/data/which-way-across.json'
import waterTown from '$lib/data/water-town.json'
import volcanicLands from '$lib/data/volcanic-lands.json'
import type { EntryGenerator, PageLoad } from './$types'
import type { GameMap } from '$lib/game/types.js'

export const entries: EntryGenerator = () => {
	return Array.from({ length: 16 }, (_, index) => ({ map: String(index + 1) }))
}
export const load: PageLoad = async ({ params }) => {
	if (dev && params.map === 'dev') {
		const { createDevMap } = await import('$lib/game/dev-map.js')
		return { map: createDevMap() }
	}
	const maps: Record<string, GameMap> = {
		1: neighborTrouble as GameMap,
		2: aLittleStroll as GameMap,
		3: afterYou as GameMap,
		4: meetInTheMiddle as GameMap,
		5: theScenicRoute as GameMap,
		6: roomPlease as GameMap,
		7: areWeThereYet as GameMap,
		8: rightOfWay as GameMap,
		9: keepYourFeetDry as GameMap,
		10: watchThePuddles as GameMap,
		11: niceViewUpHere as GameMap,
		12: theOtherBank as GameMap,
		13: notTheShoes as GameMap,
		14: whichWayAcross as GameMap,
		15: waterTown as GameMap,
		16: volcanicLands as GameMap
	}
	const map = maps[params.map]
	if (!map) error(404, 'Unknown map')
	return { map }
}
