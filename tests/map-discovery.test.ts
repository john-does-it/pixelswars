import assert from 'node:assert/strict'
import test from 'node:test'
import { carouselOrder } from '../src/lib/game/map-discovery.ts'

const portrait = { id: 'portrait', cols: 8, rows: 14, playable: true }
const landscape = { id: 'landscape', cols: 14, rows: 8, playable: true }
const dense = { id: 'dense', cols: 16, rows: 28, playable: true }
const draft = { ...portrait, id: 'draft', playable: false }
const maps = [dense, draft, landscape, portrait]
const ranks = new Map(maps.map((map, index) => [map.id, index / maps.length]))

test('the opener favors readable tiles and the available aspect ratio; every other map keeps its drawn order', () => {
	assert.deepEqual(carouselOrder(maps, ranks, 320, 560), [portrait, dense, draft, landscape])
	assert.deepEqual(carouselOrder(maps, ranks, 560, 320), [landscape, dense, draft, portrait])
	assert.deepEqual(carouselOrder([draft], ranks, 320, 560), [draft])
	assert.deepEqual(carouselOrder([], ranks, 320, 560), [])
})

test('changing the draw varies the whole carousel, including which maps can open it', () => {
	const mini = { ...portrait, id: 'mini', cols: 7, rows: 7 }
	const catalog = [...maps, mini]
	const nextVisit = new Map([mini, landscape, dense, portrait, draft].map((map, i) => [map.id, i / 5]))
	assert.deepEqual(carouselOrder(catalog, nextVisit, 280, 490), [mini, landscape, dense, portrait, draft])
	assert.deepEqual(carouselOrder(catalog, ranks, 320, 560), [portrait, dense, draft, landscape, mini])
})
