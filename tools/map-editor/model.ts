import { isUnitTypeId, unitTypes } from '../../src/lib/game/catalog.ts'
import type { GameMap, MapCell, Owner, Player, UnitTypeId } from '../../src/lib/game/types.ts'

export class MapEditorError extends Error {
	readonly key: string
	constructor(key: string) {
		super(key)
		this.key = key
	}
}

export const terrainBrushes = [
	{ name: 'terrain_grass', classes: ['-grass'] },
	{ name: 'map_editor_grass_flowers', classes: ['-grass', '-variant'] },
	{ name: 'map_editor_grass_light', classes: ['-grass', '-variant2'] },
	{ name: 'map_editor_grass_varied', classes: ['-grass', '-variant3'] },
	{ name: 'terrain_forest', classes: ['-forest', '-ongrass'] },
	{ name: 'map_editor_forest_dense', classes: ['-forest', '-ongrass', '-variant'] },
	{ name: 'terrain_moutain', classes: ['-moutain', '-ongrass'] },
	{ name: 'terrain_road', classes: ['-road', '-h'] },
	{ name: 'terrain_water', classes: ['-water'] },
	{ name: 'building_city', classes: ['-building', '-city', '-ongrass'] },
	{ name: 'building_oil_field', classes: ['-building', '-oil-field', '-ongrass'] },
	{ name: 'building_factory', classes: ['-building', '-factory', '-ongrass'] },
	{ name: 'building_hospital', classes: ['-building', '-hospital', '-ongrass'] },
	{ name: 'building_airport', classes: ['-building', '-airport', '-ongrass'] }
]

export type Brush = { kind: 'terrain'; classes: string[]; owner: Owner } | { kind: 'unit'; type: UnitTypeId; player: Player } | { kind: 'erase-unit' }
const grass = (): MapCell => ({ classes: ['-grass'], owner: 0, capturePoints: 20 })

export function newMap(cols: number, rows: number): GameMap {
	if (![cols, rows].every((size) => Number.isInteger(size) && size >= 2 && size <= 32)) throw new MapEditorError('map_editor_error_dimensions')
	return { id: '15', name: 'Nouvelle carte', cols, rows, cells: Array.from({ length: cols * rows }, grass), units: [] }
}

const roadSprites: Record<string, string[]> = {
	'': ['-h'],
	N: ['-endbottom'],
	E: ['-endleft'],
	S: ['-endtop'],
	W: ['-endright'],
	NS: ['-v'],
	EW: ['-h'],
	NE: ['-corner', '-top'],
	ES: ['-corner', '-se'],
	SW: ['-corner', '-bottom'],
	NW: ['-corner', '-nw'],
	NES: ['-junction', '-east'],
	ESW: ['-junction', '-south'],
	NSW: ['-junction', '-west'],
	NEW: ['-junction', '-north'],
	NESW: ['-cross']
}

function reconnectCell(map: GameMap, index: number): void {
	const cell = map.cells[index]
	const column = index % map.cols
	const row = Math.floor(index / map.cols)
	const adjacent = [row ? index - map.cols : -1, column < map.cols - 1 ? index + 1 : -1, row < map.rows - 1 ? index + map.cols : -1, column ? index - 1 : -1]
	if (cell.classes.includes('-road')) {
		const openings = adjacent.map((neighbor, direction) => (neighbor === -1 || map.cells[neighbor].classes.includes('-road') ? 'NESW'[direction] : '')).join('')
		cell.classes = ['-road', ...roadSprites[openings]]
	}
	if (cell.classes.includes('-water')) {
		// Horizontal shore names are reversed in the original game sprites.
		const shores = adjacent.flatMap((neighbor, direction) => (neighbor !== -1 && !map.cells[neighbor].classes.includes('-water') ? [['-top', '-left', '-bottom', '-right'][direction]] : []))
		// The existing art has no horizontal one-cell channel or enclosed puddle.
		// Keep open water for those shapes instead of displaying a broken corner.
		if (shores.length > 2 || (shores.includes('-top') && shores.includes('-bottom'))) {
			cell.classes = ['-water']
			return
		}
		cell.classes = ['-water', ...(shores.length ? ['-grass'] : []), ...shores]
		if (shores.length === 2 && !((shores.includes('-top') && shores.includes('-bottom')) || (shores.includes('-left') && shores.includes('-right')))) cell.classes.push('-corner')
	}
}

export function paintCell(map: GameMap, index: number, brush: Brush): void {
	if (!Number.isInteger(index) || !map.cells[index]) return
	if (brush.kind === 'erase-unit') {
		map.units = map.units.filter((unit) => unit.cell !== index)
		return
	}
	if (brush.kind === 'unit') {
		if (map.cells[index].classes.includes('-water') && unitTypes[brush.type].domain !== 'air') throw new MapEditorError('map_editor_error_ground')
		map.units = map.units.filter((unit) => unit.cell !== index)
		map.units.push({ type: brush.type, player: brush.player, cell: index })
		return
	}
	map.cells[index] = { classes: [...brush.classes], owner: brush.classes.includes('-building') ? brush.owner : 0, capturePoints: 20 }
	if (brush.classes.includes('-water')) map.units = map.units.filter((unit) => unit.cell !== index || unitTypes[unit.type].domain === 'air')
	// Only the painted cell and its neighbors can have changed their connections.
	for (const neighbor of [index, ...(index % map.cols ? [index - 1] : []), ...(index % map.cols < map.cols - 1 ? [index + 1] : []), index - map.cols, index + map.cols]) {
		if (map.cells[neighbor]) reconnectCell(map, neighbor)
	}
}

export function readMap(text: string): GameMap {
	const input = JSON.parse(text) as GameMap
	if (!input || typeof input !== 'object') throw new MapEditorError('map_editor_error_json')
	newMap(input.cols, input.rows)
	if (typeof input.id !== 'string' || !/^\d+$/.test(input.id) || Number(input.id) < 1 || typeof input.name !== 'string' || !input.name.trim()) throw new MapEditorError('map_editor_error_identity')
	if (!Array.isArray(input.cells) || input.cells.length !== input.cols * input.rows) throw new MapEditorError('map_editor_error_cells')
	const baseClasses = ['-grass', '-forest', '-moutain', '-water', '-road', '-building']
	const modifiers = ['-ongrass', '-variant', '-variant2', '-variant3', '-city', '-oil-field', '-factory', '-hospital', '-airport', '-h', '-v', '-corner', '-junction', '-cross', '-top', '-bottom', '-left', '-right', '-nw', '-se', '-north', '-east', '-south', '-west', '-endtop', '-endbottom', '-endleft', '-endright', '-left-corners', '-right-corners', '-top-corners', '-bottom-corners', '-top-and-bottom-corners']
	const allowedClasses = new Set([...baseClasses, ...modifiers])
	const cells = input.cells.map((cell) => {
		if (!cell || !Array.isArray(cell.classes) || !cell.classes.some((name) => baseClasses.includes(name)) || cell.classes.some((name) => !allowedClasses.has(name)) || ![0, 1, 2].includes(cell.owner) || !Number.isInteger(cell.capturePoints) || cell.capturePoints < 0 || cell.capturePoints > 20) throw new MapEditorError('map_editor_error_cell')
		if (cell.classes.includes('-building') && !['-city', '-oil-field', '-factory', '-hospital', '-airport'].some((name) => cell.classes.includes(name))) throw new MapEditorError('map_editor_error_building')
		return { classes: [...cell.classes], owner: cell.owner, capturePoints: cell.capturePoints }
	})
	if (!Array.isArray(input.units)) throw new MapEditorError('map_editor_error_units')
	const occupied = new Set<number>()
	const units = input.units.map((unit) => {
		if (!unit || !isUnitTypeId(unit.type) || ![1, 2].includes(unit.player) || !Number.isInteger(unit.cell) || unit.cell < 0 || unit.cell >= cells.length || occupied.has(unit.cell)) throw new MapEditorError('map_editor_error_unit')
		if (cells[unit.cell].classes.includes('-water') && unitTypes[unit.type].domain !== 'air') throw new MapEditorError('map_editor_error_water')
		occupied.add(unit.cell)
		return { type: unit.type, player: unit.player, cell: unit.cell }
	})
	return { id: input.id, name: input.name.trim(), cols: input.cols, rows: input.rows, cells, units }
}

export function mapJson(map: GameMap): string {
	return JSON.stringify(readMap(JSON.stringify(map)), null, '\t') + '\n'
}
