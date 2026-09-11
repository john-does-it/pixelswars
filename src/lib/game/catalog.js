// Add unit types here; factories and the stat panel use the same definitions.
export const unitTypes = {
	infantry: { name: 'Infantry', attack: 40, range: 1, exclusion: 0, attacks: 2, defense: 10, movement: 5, maxHealth: 100, cost: 200, captures: true, delay: 500, selectSound: 'infantry', fightSound: 'gun-battle' },
	jeep: { name: 'Jeep', attack: 50, range: 1, exclusion: 0, attacks: 2, defense: 20, movement: 8, maxHealth: 125, cost: 600, captures: false, delay: 500, selectSound: 'jeep-engine', fightSound: 'gun-battle' },
	tank: { name: 'Tank', attack: 70, range: 1, exclusion: 0, attacks: 2, defense: 40, movement: 5, maxHealth: 180, cost: 1200, captures: false, delay: 500, selectSound: 'tank-engine', fightSound: 'tank-shot' },
	artillery: { name: 'Artillery', attack: 60, range: 3, exclusion: 1, attacks: 1, defense: 25, movement: 3, maxHealth: 120, cost: 1200, captures: false, delay: 2000, selectSound: 'artillery-touret', fightSound: 'missile-launch' }
}

export const terrainTypes = {
	grass: { name: 'Grass', cost: 2, defense: 0 },
	moutain: { name: 'Mountain', cost: 5, defense: 50 },
	water: { name: 'Water', cost: 10, defense: 0 },
	building: { name: 'Building', cost: 2, defense: 40 },
	road: { name: 'Road', cost: 1, defense: 0 },
	forest: { name: 'Forest', cost: 3, defense: 30 }
}

export function createUnit(type, player, cell, id) {
	const definition = unitTypes[type]
	if (!definition) throw new Error(`Unknown unit type: ${type}`)
	return { id, type, player, cell, health: definition.maxHealth, movement: definition.movement, attacks: definition.attacks, capture: definition.captures ? 1 : 0 }
}
