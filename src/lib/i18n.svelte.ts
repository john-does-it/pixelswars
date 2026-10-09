import { m as messages } from '$lib/paraglide/messages.js'
import { preferences } from '$lib/preferences.svelte.js'
import type { BuildingId, Player, TerrainId, UnitTypeId } from '$lib/game/types.js'

export function translate(message: (...parameters: any[]) => string, inputs: Record<string, unknown> = {}): string {
	return message(inputs, { locale: preferences.locale })
}

export function playerName(player: Player, aiMode = false): string {
	return aiMode ? translate(player === 1 ? messages.ai_player : messages.human_player) : translate(messages.player, { player })
}

export function unitName(id: UnitTypeId): string {
	return translate({ infantry: messages.unit_infantry, 'infantry-rocket': messages.unit_infantry_rocket, 'infantry-sniper': messages.unit_infantry_sniper, jeep: messages.unit_jeep, transport: messages.unit_transport, artillery: messages.unit_artillery, tank: messages.unit_tank, 'anti-air': messages.unit_anti_air, helicopter: messages.unit_helicopter, plane: messages.unit_plane }[id])
}

export function terrainName(id: TerrainId): string {
	return translate({ road: messages.terrain_road, grass: messages.terrain_grass, forest: messages.terrain_forest, moutain: messages.terrain_moutain, water: messages.terrain_water, building: messages.terrain_building }[id])
}

export function buildingName(id: BuildingId): string {
	return translate({ city: messages.building_city, 'oil-field': messages.building_oil_field, hospital: messages.building_hospital, factory: messages.building_factory, airport: messages.building_airport }[id])
}

export function mapName(id: string): string {
	if (id === 'dev') return translate(messages.dev_map_title)
	const names: Record<string, (...parameters: any[]) => string> = { 1: messages.map_1, 2: messages.map_2, 3: messages.map_3, 4: messages.map_4, 5: messages.map_5, 6: messages.map_6, 7: messages.map_7, 8: messages.map_8, 9: messages.map_9, 10: messages.map_10, 11: messages.map_11, 12: messages.map_12, 13: messages.map_13, 14: messages.map_14, 15: messages.map_15, 16: messages.map_16, 17: messages.map_17, 18: messages.map_18 }
	return names[id] ? translate(names[id]) : id
}
