import type { GameMap } from './types.ts'

const variants = {
	open: ['nw', 'ne', 'nw-ne'],
	east: ['nw', 'nw-narrow'],
	west: ['ne', 'ne-narrow'],
	south: ['nw', 'ne', 'nw-ne'],
	southwest: ['ne', 'ne-narrow']
}
export const waterJunctionModifiers = ['-junction-nw-se', ...Object.entries(variants).flatMap(([bank, corners]) => corners.map((corner) => `-junction-${bank}-${corner}`))]
const modifiers = new Set(waterJunctionModifiers)
type TerrainMap = Pick<GameMap, 'cols' | 'rows' | 'cells'>

// North-facing cliffs extend into diagonally adjacent water. Only the artwork
// changes: shore pixels do not block ships or change the cell's terrain/cost.
export function waterJunctionClasses(map: TerrainMap, index: number): string[] {
	const classes = map.cells[index].classes.filter((name) => !modifiers.has(name))
	const column = index % map.cols
	const row = Math.floor(index / map.cols)
	if (!classes.includes('-water') || classes.includes('-under-bridge') || row === 0) return classes
	const at = (x: number, y: number) => (x >= 0 && x < map.cols && y >= 0 && y < map.rows ? map.cells[y * map.cols + x]?.classes : undefined)
	const isWater = (cell: string[] | undefined) => !!cell?.includes('-water') && !cell.includes('-under-bridge')
	const isLand = (cell: string[] | undefined) => !!cell && !cell.some((name) => ['-water', '-bridge', '-void'].includes(name))
	const north = at(column, row - 1)
	const east = at(column + 1, row)
	const south = at(column, row + 1)
	const west = at(column - 1, row)
	if (!isWater(north) || [east, south, west].some((cell) => cell?.some((name) => ['-bridge', '-under-bridge', '-void'].includes(name)))) return classes
	const northWestLand = isLand(at(column - 1, row - 1))
	const northEastLand = isLand(at(column + 1, row - 1))
	const corners = [isWater(west) && northWestLand ? 'nw' : '', isWater(east) && northEastLand ? 'ne' : ''].filter(Boolean).join('-')
	if (!corners) return classes
	// Preserve the user's approved first junction exactly as supplied.
	if (isLand(south) && isLand(east)) return [...classes, '-junction-nw-se']
	const bank = isLand(west) ? (isLand(south) ? 'southwest' : 'west') : isLand(east) ? 'east' : isLand(south) ? 'south' : 'open'
	// A river squeezed between two land cells has narrower banks than a lake.
	const narrow = northWestLand && northEastLand && ['east', 'west', 'southwest'].includes(bank)
	const modifier = `-junction-${bank}-${corners}${narrow ? '-narrow' : ''}`
	if (modifiers.has(modifier)) classes.push(modifier)
	return classes
}

export function reconnectWaterJunctions(map: TerrainMap): void {
	for (let index = 0; index < map.cells.length; index++) map.cells[index].classes = waterJunctionClasses(map, index)
}
