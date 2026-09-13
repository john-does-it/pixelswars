import type { Player, ProductionBuildingId, TerrainDefinition, TerrainId, Unit, UnitDefinition, UnitTypeId } from './types.ts'

// Add unit types here; production buildings and stat panels use these definitions.
export const unitTypes: Record<UnitTypeId, UnitDefinition> = {
	'infantry-sniper': { name: 'Sniper', attack: 60, range: 3, exclusion: 1, attacks: 1, defense: 10, movement: 4, maxHealth: 100, cost: 500, captures: true, delay: 500, selectSound: 'infantry', fightSound: 'gun-battle' },
	'infantry-rocket': { name: 'Rocket', attack: 40, range: 1, exclusion: 0, attacks: 1, defense: 10, movement: 4, maxHealth: 100, cost: 400, captures: true, delay: 500, selectSound: 'infantry', fightSound: 'tank-shot' },
	plane: { name: 'Plane', domain: 'air', production: 'airport', attack: 70, range: 1, exclusion: 0, attacks: 1, defense: 20, movement: 10, maxHealth: 120, cost: 3000, captures: false, delay: 1000, selectSound: 'plane-engine', fightSound: 'missile-launch' },
	helicopter: { name: 'Helicopter', domain: 'air', production: 'airport', attack: 65, range: 1, exclusion: 0, attacks: 1, defense: 15, movement: 8, maxHealth: 110, cost: 1800, captures: false, delay: 750, selectSound: 'helico-engine', fightSound: 'gun-battle' },
	infantry: { name: 'Infantry', attack: 40, range: 1, exclusion: 0, attacks: 2, defense: 10, movement: 5, maxHealth: 100, cost: 200, captures: true, delay: 500, selectSound: 'infantry', fightSound: 'gun-battle' },
	jeep: { name: 'Jeep', attack: 50, range: 1, exclusion: 0, attacks: 2, defense: 20, movement: 8, maxHealth: 125, cost: 600, captures: false, delay: 500, selectSound: 'jeep-engine', fightSound: 'gun-battle' },
	tank: { name: 'Tank', attack: 70, range: 1, exclusion: 0, attacks: 2, defense: 40, movement: 5, maxHealth: 180, cost: 1200, captures: false, delay: 500, selectSound: 'tank-engine', fightSound: 'tank-shot' },
	artillery: { name: 'Artillery', attack: 60, range: 4, exclusion: 1, attacks: 1, defense: 30, movement: 4, maxHealth: 120, cost: 1400, captures: false, delay: 2000, selectSound: 'artillery-touret', fightSound: 'missile-launch' },
	'anti-air': { name: 'Anti-air', attack: 70, range: 2, exclusion: 0, attacks: 2, defense: 30, movement: 6, maxHealth: 120, cost: 1000, captures: false, delay: 750, selectSound: 'artillery-touret', fightSound: 'missile-launch' }
}

export const terrainTypes: Record<TerrainId, TerrainDefinition> = {
	grass: { name: 'Grass', cost: 2, defense: 0 },
	moutain: { name: 'Mountain', cost: 4, defense: 50 },
	water: { name: 'Water', cost: 2, defense: 0 },
	building: { name: 'Building', cost: 2, defense: 40 },
	road: { name: 'Road', cost: 1, defense: 0 },
	forest: { name: 'Forest', cost: 3, defense: 30 }
}

export function isUnitTypeId(value: string): value is UnitTypeId {
	return value in unitTypes
}

export function createUnit(type: UnitTypeId, player: Player, cell: number, id: number): Unit {
	const definition = unitTypes[type]
	if (!definition) throw new Error(`Unknown unit type: ${type}`)
	return { id, type, player, cell, health: definition.maxHealth, movement: definition.movement, attacks: definition.attacks, capture: definition.captures ? 1 : 0 }
}

export const productionBuildings: Record<ProductionBuildingId, { name: string }> = {
	factory: { name: 'Army base' },
	airport: { name: 'Airport' }
}
