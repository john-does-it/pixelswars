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
import delusionsOfGrandeur from '$lib/data/delusions-of-grandeur.json'
import longIslandIcedTea from '$lib/data/long-island-iced-tea.json'
import mountainHike from '$lib/data/mountain-hike.json'
import geneva from '$lib/data/geneva.json'
import aLongDay from '$lib/data/a-long-day.json'
import ourPathsWillCross from '$lib/data/our-paths-will-cross.json'
import centralPark from '$lib/data/central-park.json'
import lakeView from '$lib/data/lake-view.json'
import brokenBridge from '$lib/data/broken-bridge.json'
import theIslands from '$lib/data/the-islands.json'
import troubledBridges from '$lib/data/troubled-bridges.json'
import neighborsSquare from '$lib/data/neighbors-square.json'
import twoBridges from '$lib/data/two-bridges.json'
import littleDetour from '$lib/data/little-detour.json'
import sandbox from '$lib/data/sandbox.json'
import gentleSlope from '$lib/data/gentle-slope.json'
import meanders from '$lib/data/meanders.json'
import mapFiles from '$lib/data/map-files.json'
import type { EntryGenerator, PageLoad } from './$types'
import type { GameMap } from '$lib/game/types.js'

export const entries: EntryGenerator = () => {
	return Object.keys(mapFiles).map((map) => ({ map }))
}
export const load: PageLoad = async ({ params }) => {
	if (dev && params.map.startsWith('draft-')) {
		const maps = (await import('$lib/game/draft-maps')).loadDraftMaps()
		const map = maps.find((candidate) => `draft-${candidate.id}` === params.map)
		if (!map) error(404, 'Unknown draft map')
		return { map, draft: true }
	}
	if (dev && params.map === 'dev') {
		const { createDevMap } = await import('$lib/game/dev-map.js')
		return { map: createDevMap(), draft: false }
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
		16: volcanicLands as GameMap,
		17: delusionsOfGrandeur as GameMap,
		18: longIslandIcedTea as GameMap,
		19: mountainHike as GameMap,
		20: geneva as GameMap,
		21: aLongDay as GameMap,
		22: ourPathsWillCross as GameMap,
		23: centralPark as GameMap,
		24: lakeView as GameMap,
		25: brokenBridge as GameMap,
		26: theIslands as GameMap,
		27: troubledBridges as GameMap,
		28: neighborsSquare as GameMap,
		29: twoBridges as GameMap,
		30: littleDetour as GameMap,
		31: sandbox as GameMap,
		35: gentleSlope as GameMap,
		36: meanders as GameMap
	}
	const map = maps[params.map]
	if (!map) error(404, 'Unknown map')
	return { map, draft: false }
}
