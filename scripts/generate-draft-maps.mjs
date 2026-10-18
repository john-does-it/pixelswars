import { mkdir, writeFile, access } from 'node:fs/promises'
import mapFiles from '../src/lib/data/map-files.json' with { type: 'json' }
import { newMap, paintCell, mapJson } from '../src/lib/map-editor/model.ts'

// Initial layouts only. Never overwrite a map that has been hand-tuned.
const output = new URL('../src/lib/data/drafts/', import.meta.url)
await mkdir(output, { recursive: true })
const maps = []
function design(id, name, cols, rows, layout) {
	const map = newMap(cols, rows)
	map.id = String(id)
	map.name = name
	const terrain = (x, y, kind, owner = 0) => {
		const classes = kind === 'road' ? ['-road', '-h'] : kind === 'bridge' ? ['-road', '-bridge', '-v'] : ['forest', 'moutain'].includes(kind) ? [`-${kind}`, '-ongrass'] : ['city', 'hospital', 'factory', 'airport', 'naval-base'].includes(kind) ? ['-building', `-${kind}`, '-ongrass'] : [`-${kind}`]
		paintCell(map, y * cols + x, { kind: 'terrain', classes, owner })
	}
	const pair = (x, y, kind, owner = 0) => {
		terrain(x, y, kind, owner)
		terrain(cols - 1 - x, rows - 1 - y, kind, owner ? 3 - owner : 0)
	}
	const army = (units) => {
		for (const [type, x, y] of units) {
			paintCell(map, y * cols + x, { kind: 'unit', type, player: 1 })
			paintCell(map, (rows - 1 - y) * cols + cols - 1 - x, { kind: 'unit', type, player: 2 })
		}
	}
	layout({ terrain, pair, army })
	maps.push(map)
}

design(28, 'Le carré des voisins', 8, 8, ({ pair, army }) => {
	for (let y = 1; y <= 6; y++) pair(1, y, 'road')
	for (let x = 1; x <= 6; x++) pair(x, 2, 'road')
	pair(1, 0, 'factory', 1)
	pair(6, 1, 'hospital')
	pair(2, 3, 'city')
	pair(5, 3, 'city')
	pair(3, 3, 'forest')
	army([
		['infantry', 2, 1],
		['infantry', 4, 1],
		['jeep', 1, 2]
	])
})
design(29, 'Deux ponts, pas un de plus', 8, 10, ({ pair, army }) => {
	for (let x = 0; x < 8; x++) pair(x, 4, 'water')
	for (let y = 0; y < 10; y++) pair(1, y, y === 4 || y === 5 ? 'bridge' : 'road')
	for (let x = 0; x < 8; x++) pair(x, 2, 'road')
	pair(0, 1, 'factory', 1)
	pair(7, 1, 'hospital')
	pair(3, 2, 'city')
	pair(4, 3, 'city')
	pair(3, 0, 'forest')
	army([
		['infantry', 2, 1],
		['infantry', 5, 1],
		['jeep', 1, 0],
		['tank', 6, 0]
	])
})
design(30, 'Le petit détour', 7, 11, ({ terrain, pair, army }) => {
	for (let y = 0; y <= 5; y++) pair(1, y, 'road')
	for (let x = 1; x <= 5; x++) terrain(x, 5, 'road')
	pair(0, 1, 'factory', 1)
	pair(5, 2, 'hospital')
	pair(2, 3, 'city')
	pair(4, 4, 'city')
	for (const [x, y] of [
		[3, 3],
		[3, 4],
		[3, 6],
		[4, 7]
	])
		terrain(x, y, 'forest')
	terrain(0, 4, 'moutain')
	terrain(6, 7, 'moutain')
	army([
		['infantry', 1, 1],
		['infantry', 3, 1],
		['jeep', 2, 2]
	])
})
design(31, 'Bac à sable', 9, 13, ({ terrain, pair, army }) => {
	for (let y = 3; y <= 9; y++) for (let x = 2; x <= 6; x++) terrain(x, y, 'water')
	for (let y = 0; y < 13; y++) pair(0, y, 'road')
	for (let x = 0; x < 9; x++) pair(x, 1, 'road')
	terrain(4, 6, 'city')
	pair(3, 6, 'grass')
	pair(4, 5, 'grass')
	pair(4, 2, 'naval-base', 1)
	pair(1, 1, 'factory', 1)
	pair(7, 1, 'hospital')
	pair(1, 4, 'city')
	pair(7, 5, 'forest')
	army([
		['infantry', 3, 1],
		['infantry', 5, 1],
		['transport-ship', 3, 3],
		['attack-ship', 5, 3]
	])
})
design(32, 'Couloir aérien', 10, 15, ({ terrain, pair, army }) => {
	for (let y = 0; y < 15; y++) pair(2, y, 'road')
	for (let x = 0; x < 10; x++) {
		pair(x, 3, 'road')
		terrain(x, 7, 'road')
	}
	for (let y = 4; y <= 6; y++) {
		pair(4, y, 'moutain')
		pair(5, y, 'forest')
	}
	pair(1, 0, 'airport', 1)
	pair(8, 0, 'factory', 1)
	pair(5, 2, 'hospital')
	pair(2, 5, 'city')
	pair(7, 6, 'city')
	army([
		['infantry', 2, 1],
		['infantry', 3, 1],
		['infantry', 6, 1],
		['helicopter', 1, 2],
		['anti-air', 8, 1]
	])
})
design(33, 'La grande traversée', 14, 18, ({ pair, army }) => {
	for (let y = 0; y < 18; y++) {
		pair(2, y, 'road')
		pair(6, y, 'road')
	}
	for (let x = 0; x < 14; x++) {
		pair(x, 4, 'road')
		pair(x, 8, 'road')
	}
	for (const [x, y] of [
		[4, 5],
		[4, 6],
		[9, 6],
		[10, 7],
		[8, 3]
	])
		pair(x, y, 'forest')
	pair(4, 7, 'moutain')
	pair(1, 1, 'factory', 1)
	pair(12, 2, 'factory')
	pair(7, 3, 'hospital')
	for (const [x, y] of [
		[3, 3],
		[10, 4],
		[2, 7],
		[7, 7]
	])
		pair(x, y, 'city')
	army([
		['infantry', 3, 1],
		['infantry', 5, 1],
		['infantry', 8, 1],
		['tank', 2, 2],
		['jeep', 11, 2],
		['artillery', 7, 0]
	])
})
design(34, 'Port à port', 16, 16, ({ terrain, pair, army }) => {
	for (let y = 3; y <= 12; y++) for (let x = 5; x <= 10; x++) terrain(x, y, 'water')
	for (let y = 0; y < 16; y++) pair(3, y, 'road')
	for (let x = 0; x < 16; x++) {
		pair(x, 2, 'road')
		if (x < 5 || x > 10) pair(x, 6, 'road')
	}
	// The channel keeps open ends; the two land corridors work without a ship.
	pair(7, 7, 'city')
	pair(8, 7, 'grass')
	pair(6, 2, 'naval-base', 1)
	pair(2, 1, 'factory', 1)
	pair(13, 3, 'hospital')
	pair(3, 5, 'city')
	pair(12, 6, 'city')
	pair(1, 7, 'forest')
	army([
		['infantry', 3, 1],
		['infantry', 4, 1],
		['infantry', 11, 1],
		['tank', 12, 2],
		['transport-ship', 6, 3],
		['attack-ship', 9, 3]
	])
})
design(35, 'En pente douce', 7, 9, ({ terrain, pair, army }) => {
	for (let y = 0; y < 9; y++) terrain(3, y, 'road')
	for (let y = 2; y <= 6; y++) terrain(0, y, 'road')
	for (let x = 0; x <= 3; x++) pair(x, 2, 'road')
	pair(1, 0, 'factory', 1)
	pair(5, 1, 'hospital')
	pair(2, 3, 'city')
	pair(5, 3, 'city')
	for (const [x, y] of [
		[1, 3],
		[1, 4],
		[5, 5],
		[4, 4]
	])
		terrain(x, y, 'forest')
	terrain(6, 4, 'moutain')
	army([
		['infantry', 2, 1],
		['infantry', 4, 1],
		['jeep', 3, 1]
	])
})

for (const map of maps) {
	if (mapFiles[map.id] || ['32', '33', '34'].includes(map.id)) continue
	const file = new URL(`${map.id}.json`, output)
	try {
		await access(file)
		console.log(`Keep existing draft ${map.id}`)
	} catch {
		await writeFile(file, mapJson(map), { flag: 'wx' })
		console.log(`Created draft ${map.id}: ${map.name}`)
	}
}
