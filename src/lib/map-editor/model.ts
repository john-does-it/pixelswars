import { isUnitTypeId, unitTypes } from '../game/catalog.ts'
import { reconnectWaterJunctions, waterJunctionClasses, waterJunctionModifiers } from '../game/water-junctions.ts'
import type { GameMap, MapCell, Owner, Player, UnitTypeId } from '../game/types.ts'

export class MapEditorError extends Error {
	readonly key: string
	constructor(key: string) {
		super(key)
		this.key = key
	}
}

export const terrainBrushes = [
	{ name: 'terrain_void', classes: ['-void'] },
	{ name: 'terrain_grass', classes: ['-grass'] },
	{ name: 'map_editor_grass_flowers', classes: ['-grass', '-variant'] },
	{ name: 'map_editor_grass_varied', classes: ['-grass', '-variant3'] },
	{ name: 'terrain_forest', classes: ['-forest', '-ongrass'] },
	{ name: 'map_editor_forest_dense', classes: ['-forest', '-ongrass', '-variant'] },
	{ name: 'terrain_moutain', classes: ['-moutain', '-ongrass'] },
	{ name: 'terrain_blocker', classes: ['-blocker', '-ongrass'] },
	{ name: 'terrain_road', classes: ['-road', '-h'] },
	{ name: 'map_editor_bridge_horizontal', classes: ['-road', '-bridge', '-h'] },
	{ name: 'map_editor_bridge_vertical', classes: ['-road', '-bridge', '-v'] },
	{ name: 'terrain_water', classes: ['-water'] },
	{ name: 'building_city', classes: ['-building', '-city', '-ongrass'] },
	{ name: 'building_big_city', classes: ['-building', '-big-city', '-ongrass'] },
	{ name: 'building_factory', classes: ['-building', '-factory', '-ongrass'] },
	{ name: 'building_hospital', classes: ['-building', '-hospital', '-ongrass'] },
	{ name: 'building_airport', classes: ['-building', '-airport', '-ongrass'] },
	{ name: 'building_naval_base', classes: ['-building', '-naval-base', '-ongrass'] }
]

export type Brush = { kind: 'terrain'; classes: string[]; owner: Owner } | { kind: 'unit'; type: UnitTypeId; player: Player } | { kind: 'erase-unit' }
export type MirrorMode = 'off' | 'rotation'

export function validateMirrorDimensions(cols: number, rows: number, mode: MirrorMode): void {
	if (mode === 'rotation' && (cols % 2 !== 1 || rows % 2 !== 1)) throw new MapEditorError('map_editor_mirror_dimensions')
}

export function mirroredIndex(map: Pick<GameMap, 'cols' | 'rows'>, index: number, mode: MirrorMode): number {
	return mode === 'rotation' ? map.cols * map.rows - 1 - index : index
}

const oppositeOwner = (owner: Owner): Owner => (owner === 0 ? 0 : owner === 1 ? 2 : 1)

// Enabling symmetry copies the first half in reading order, retaining a neutral centre cell.
export function mirrorMap(map: GameMap, mode: MirrorMode): GameMap {
	validateMirrorDimensions(map.cols, map.rows, mode)
	const result = structuredClone(map)
	if (mode === 'off') return result
	result.units = []
	for (let index = 0; index < map.cells.length; index++) {
		const partner = mirroredIndex(map, index, mode)
		if (index > partner) continue
		if (index === partner) {
			result.cells[index].owner = 0
			result.cells[index].capturePoints = 20
			continue
		}
		result.cells[partner] = { ...map.cells[index], classes: [...map.cells[index].classes], owner: oppositeOwner(map.cells[index].owner) }
		const unit = map.units.find((unit) => unit.cell === index)
		if (unit) result.units.push({ ...unit }, { ...unit, cell: partner, player: unit.player === 1 ? 2 : 1 })
	}
	// Rebuild directional road and shore sprites from the mirrored terrain.
	for (let index = 0; index < result.cells.length; index++) reconnectCell(result, index)
	reconnectBridgeSupports(result)
	return result
}

export function paintMirroredCell(map: GameMap, index: number, brush: Brush, mode: MirrorMode): void {
	if (mode === 'off') return paintCell(map, index, brush)
	validateMirrorDimensions(map.cols, map.rows, mode)
	if (!Number.isInteger(index) || !map.cells[index]) return
	const partner = mirroredIndex(map, index, mode)
	if (brush.kind === 'unit') {
		if (partner === index) throw new MapEditorError('map_editor_mirror_centre_unit')
		// Validate both destinations before changing either one.
		validateUnitCell(map.cells[index], brush.type)
		validateUnitCell(map.cells[partner], brush.type)
	}
	if (partner === index) {
		paintCell(map, index, brush.kind === 'terrain' ? { ...brush, owner: 0 } : brush)
		return
	}
	paintCell(map, index, brush)
	paintCell(map, partner, brush.kind === 'unit' ? { ...brush, player: brush.player === 1 ? 2 : 1 } : brush.kind === 'terrain' ? { ...brush, owner: oppositeOwner(brush.owner) } : brush)
}

// The support sprite has a fixed downward perspective, not rotational symmetry.
// Only change the water artwork: never replace land or move a playable bridge.
export function reconnectBridgeSupports(map: GameMap): void {
	for (let index = 0; index < map.cells.length; index++) {
		const cell = map.cells[index]
		if (!cell.classes.includes('-water')) continue
		const above = map.cells[index - map.cols]?.classes
		if (above?.includes('-bridge') && above.includes('-h')) cell.classes = ['-water', '-under-bridge', '-h']
		else if (cell.classes.includes('-under-bridge')) {
			cell.classes = ['-water']
			reconnectCell(map, index)
		}
	}
	reconnectWaterJunctions(map)
}
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
	if (cell.classes.includes('-road') && !cell.classes.includes('-bridge')) {
		const openings = adjacent
			.map((neighbor, direction) => {
				if (neighbor === -1) return 'NESW'[direction]
				const classes = map.cells[neighbor].classes
				const connects = classes.includes('-road') && (!classes.includes('-bridge') || classes.includes(direction % 2 === 0 ? '-v' : '-h'))
				return connects ? 'NESW'[direction] : ''
			})
			.join('')
		cell.classes = ['-road', ...roadSprites[openings]]
	}
	if (cell.classes.includes('-water') && !cell.classes.includes('-under-bridge')) {
		// Horizontal shore names are reversed in the original game sprites.
		const shores = adjacent.flatMap((neighbor, direction) => (neighbor !== -1 && !map.cells[neighbor].classes.includes('-water') && !map.cells[neighbor].classes.includes('-bridge') && !map.cells[neighbor].classes.includes('-void') ? [['-top', '-left', '-bottom', '-right'][direction]] : []))
		// The existing art has no horizontal one-cell channel or enclosed puddle.
		// Keep open water for those shapes instead of displaying a broken corner.
		if (shores.length > 2 || (shores.includes('-top') && shores.includes('-bottom'))) {
			cell.classes = ['-water']
			return
		}
		cell.classes = ['-water', ...(shores.length ? ['-grass'] : []), ...shores]
		if (shores.length === 2 && !((shores.includes('-top') && shores.includes('-bottom')) || (shores.includes('-left') && shores.includes('-right')))) cell.classes.push('-corner')
		cell.classes = waterJunctionClasses(map, index)
	}
}

function validateUnitCell(cell: MapCell, type: UnitTypeId): void {
	if (cell.classes.includes('-void')) throw new MapEditorError('map_editor_error_void')
	if (cell.classes.includes('-blocker') && unitTypes[type].domain !== 'air') throw new MapEditorError('map_editor_error_blocker')
	if (unitTypes[type].domain === 'naval') {
		if (!cell.classes.includes('-water') && !cell.classes.includes('-naval-base')) throw new MapEditorError('map_editor_error_naval')
	} else if (cell.classes.includes('-water') && unitTypes[type].domain !== 'air') throw new MapEditorError('map_editor_error_ground')
}

export function paintCell(map: GameMap, index: number, brush: Brush): void {
	if (!Number.isInteger(index) || !map.cells[index]) return
	if (brush.kind === 'erase-unit') {
		map.units = map.units.filter((unit) => unit.cell !== index)
		return
	}
	if (brush.kind === 'unit') {
		validateUnitCell(map.cells[index], brush.type)
		map.units = map.units.filter((unit) => unit.cell !== index)
		map.units.push({ type: brush.type, player: brush.player, cell: index })
		return
	}
	map.cells[index] = { classes: [...brush.classes], owner: brush.classes.includes('-building') ? brush.owner : 0, capturePoints: 20 }
	map.units = map.units.filter((unit) => {
		if (unit.cell !== index) return true
		if (brush.classes.includes('-void')) return false
		if (unitTypes[unit.type].domain === 'air') return true
		if (unitTypes[unit.type].domain === 'naval') return brush.classes.includes('-water') || brush.classes.includes('-naval-base')
		return !brush.classes.includes('-water') && !brush.classes.includes('-blocker')
	})
	// Diagonal land also changes shore junctions. Do not wrap across row edges.
	const column = index % map.cols
	const row = Math.floor(index / map.cols)
	for (let y = Math.max(0, row - 1); y <= Math.min(map.rows - 1, row + 1); y++) {
		for (let x = Math.max(0, column - 1); x <= Math.min(map.cols - 1, column + 1); x++) reconnectCell(map, y * map.cols + x)
	}
	reconnectBridgeSupports(map)
}

export function readMap(text: string): GameMap {
	const input = JSON.parse(text) as GameMap
	if (!input || typeof input !== 'object') throw new MapEditorError('map_editor_error_json')
	newMap(input.cols, input.rows)
	if (typeof input.id !== 'string' || !/^\d+$/.test(input.id) || Number(input.id) < 1 || typeof input.name !== 'string' || !input.name.trim()) throw new MapEditorError('map_editor_error_identity')
	if (!Array.isArray(input.cells) || input.cells.length !== input.cols * input.rows) throw new MapEditorError('map_editor_error_cells')
	const baseClasses = ['-grass', '-forest', '-moutain', '-water', '-road', '-building', '-blocker', '-void']
	const modifiers = ['-ongrass', '-variant', '-variant2', '-variant3', '-city', '-big-city', '-factory', '-hospital', '-airport', '-naval-base', '-h', '-v', '-corner', '-junction', '-cross', '-top', '-bottom', '-left', '-right', '-nw', '-se', '-north', '-east', '-south', '-west', '-endtop', '-endbottom', '-endleft', '-endright', '-left-corners', '-right-corners', '-top-corners', '-bottom-corners', '-top-and-bottom-corners']
	const allowedClasses = new Set([...baseClasses, ...modifiers, '-bridge', '-under-bridge', ...waterJunctionModifiers])
	const cells = input.cells.map((cell) => {
		// Accept old exports, but always save the new building name.
		if (Array.isArray(cell?.classes)) cell = { ...cell, classes: cell.classes.map((name) => (name === '-oil-field' ? '-big-city' : name)) }
		if (!cell || !Array.isArray(cell.classes) || !cell.classes.some((name) => baseClasses.includes(name)) || cell.classes.some((name) => !allowedClasses.has(name)) || ![0, 1, 2].includes(cell.owner) || !Number.isInteger(cell.capturePoints) || cell.capturePoints < 0 || cell.capturePoints > 20) throw new MapEditorError('map_editor_error_cell')
		if (cell.classes.includes('-building') && !['-city', '-big-city', '-factory', '-hospital', '-airport', '-naval-base'].some((name) => cell.classes.includes(name))) throw new MapEditorError('map_editor_error_building')
		if (cell.classes.includes('-bridge') && (!cell.classes.includes('-road') || cell.classes.includes('-h') === cell.classes.includes('-v') || cell.classes.length !== 3)) throw new MapEditorError('map_editor_error_cell')
		if (cell.classes.includes('-under-bridge') && (!cell.classes.includes('-water') || !cell.classes.includes('-h') || cell.classes.length !== 3)) throw new MapEditorError('map_editor_error_cell')
		if (cell.classes.includes('-blocker') && (cell.classes.length !== 2 || !cell.classes.includes('-ongrass'))) throw new MapEditorError('map_editor_error_cell')
		if (cell.classes.includes('-void') && (cell.classes.length !== 1 || cell.owner !== 0)) throw new MapEditorError('map_editor_error_cell')
		return { classes: [...cell.classes], owner: cell.owner, capturePoints: cell.capturePoints }
	})
	if (!Array.isArray(input.units)) throw new MapEditorError('map_editor_error_units')
	const occupied = new Set<number>()
	const units = input.units.map((unit) => {
		if (!unit || !isUnitTypeId(unit.type) || ![1, 2].includes(unit.player) || !Number.isInteger(unit.cell) || unit.cell < 0 || unit.cell >= cells.length || occupied.has(unit.cell)) throw new MapEditorError('map_editor_error_unit')
		if (cells[unit.cell].classes.includes('-water') && (unitTypes[unit.type].domain ?? 'ground') === 'ground') throw new MapEditorError('map_editor_error_water')
		validateUnitCell(cells[unit.cell], unit.type)
		occupied.add(unit.cell)
		return { type: unit.type, player: unit.player, cell: unit.cell }
	})
	const map = { id: input.id, name: input.name.trim(), cols: input.cols, rows: input.rows, cells, units }
	reconnectWaterJunctions(map)
	return map
}

export function mapJson(map: GameMap): string {
	return JSON.stringify(readMap(JSON.stringify(map)), null, '\t') + '\n'
}

// Resize by coordinates so changing the row length never shifts painted cells or units.
export function resizeMap(map: GameMap, cols: number, rows: number, mode: MirrorMode = 'off'): GameMap {
	validateMirrorDimensions(cols, rows, mode)
	const result = newMap(cols, rows)
	result.id = map.id
	result.name = map.name
	for (let row = 0; row < Math.min(rows, map.rows); row++) {
		for (let col = 0; col < Math.min(cols, map.cols); col++) {
			result.cells[row * cols + col] = structuredClone(map.cells[row * map.cols + col])
		}
	}
	result.units = map.units.filter((unit) => unit.cell % map.cols < cols && Math.floor(unit.cell / map.cols) < rows).map((unit) => ({ ...unit, cell: Math.floor(unit.cell / map.cols) * cols + (unit.cell % map.cols) }))
	for (let index = 0; index < result.cells.length; index++) reconnectCell(result, index)
	reconnectBridgeSupports(result)
	return mode === 'off' ? result : mirrorMap(result, mode)
}
