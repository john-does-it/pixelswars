import { initialState } from './model.ts'
import type { BuildingId, GameMap, Player, UnitTypeId } from './types.ts'

export interface StartingForces {
	units: Partial<Record<UnitTypeId, number>>
	buildings: Partial<Record<BuildingId, number>>
}
export interface MapDetails {
	symmetrical: boolean
	mobileFriendly: boolean
	players: Record<Player, StartingForces>
}

// Estimate readability with the whole map fitted inside a portrait phone's
// usable board area, after allowing space for controls. This is a chooser hint,
// not a guarantee for every device. Tall maps still need readable tiles.
function isMobileFriendly(map: Pick<GameMap, 'cols' | 'rows'>): boolean {
	const boardWidth = 320
	const boardHeight = 480
	const minimumTileSize = 32
	return Math.min(boardWidth / map.cols, boardHeight / map.rows) >= minimumTileSize
}

// Compare gameplay, not decorative grass/water variants. Reflections and a
// half-turn count only when they also swap the armies and building ownership.
export function describeMap(map: GameMap): MapDetails {
	const { cells } = initialState(map)
	const players: MapDetails['players'] = { 1: { units: {}, buildings: {} }, 2: { units: {}, buildings: {} } }
	for (const unit of map.units) players[unit.player].units[unit.type] = (players[unit.player].units[unit.type] ?? 0) + 1
	for (const cell of cells) {
		if (cell.owner && cell.building) players[cell.owner].buildings[cell.building] = (players[cell.owner].buildings[cell.building] ?? 0) + 1
	}
	const occupants = new Map(map.units.map((unit) => [unit.cell, unit]))
	const transforms = [(index: number) => cells.length - 1 - index, (index: number) => Math.floor(index / map.cols) * map.cols + map.cols - 1 - (index % map.cols), (index: number) => (map.rows - 1 - Math.floor(index / map.cols)) * map.cols + (index % map.cols)]
	const symmetrical = transforms.some((transform) =>
		cells.every((cell, index) => {
			const other = cells[transform(index)]
			const unit = occupants.get(index)
			const opponent = occupants.get(transform(index))
			return cell.terrain === other.terrain && cell.building === other.building && cell.capturePoints === other.capturePoints && cell.owner === (other.owner ? 3 - other.owner : 0) && cell.classes.includes('-bridge') === other.classes.includes('-bridge') && (!cell.classes.includes('-bridge') || cell.classes.includes('-h') === other.classes.includes('-h')) && (unit ? !!opponent && unit.type === opponent.type && unit.player !== opponent.player : !opponent)
		})
	)
	return {
		symmetrical,
		mobileFriendly: isMobileFriendly(map),
		players
	}
}
