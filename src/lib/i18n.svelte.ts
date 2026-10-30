import { m as messages } from '$lib/paraglide/messages.js'
import { preferences } from '$lib/preferences.svelte.js'
import { playerProfile } from '$lib/profile.svelte.js'
import type { BuildingId, Player, TerrainId, UnitTypeId } from '$lib/game/types.js'

export function translate(message: (...parameters: any[]) => string, inputs: Record<string, unknown> = {}): string {
	return message(inputs, { locale: preferences.locale })
}

export function playerName(player: Player, aiMode = false): string {
	return aiMode ? translate(player === 1 ? messages.ai_player : messages.human_player) : translate(messages.player, { player })
}

// Local games associate this browser's profile with blue. Against the AI the human is red.
export function matchPlayerName(player: Player, aiMode = false, networkPlayer?: Player): string {
	const profilePlayer = networkPlayer ?? (aiMode ? 2 : 1)
	return player === profilePlayer && playerProfile.data.pseudonym ? playerProfile.data.pseudonym : playerName(player, aiMode)
}

export function unitName(id: UnitTypeId): string {
	return translate({ infantry: messages.unit_infantry, 'infantry-rocket': messages.unit_infantry_rocket, 'infantry-sniper': messages.unit_infantry_sniper, jeep: messages.unit_jeep, transport: messages.unit_transport, artillery: messages.unit_artillery, tank: messages.unit_tank, 'anti-air': messages.unit_anti_air, helicopter: messages.unit_helicopter, 'transport-helicopter': messages.unit_transport_helicopter, plane: messages.unit_plane, 'artillery-ship': messages.unit_artillery_ship, 'attack-ship': messages.unit_attack_ship, 'transport-ship': messages.unit_transport_ship }[id])
}

export function terrainName(id: TerrainId): string {
	return translate({ road: messages.terrain_road, grass: messages.terrain_grass, forest: messages.terrain_forest, moutain: messages.terrain_moutain, water: messages.terrain_water, building: messages.terrain_building, blocker: messages.terrain_blocker }[id])
}

export function buildingName(id: BuildingId): string {
	return translate({ city: messages.building_city, 'big-city': messages.building_big_city, hospital: messages.building_hospital, factory: messages.building_factory, airport: messages.building_airport, 'naval-base': messages.building_naval_base }[id])
}

export function mapName(id: string): string {
	if (id === 'dev') return translate(messages.dev_map_title)
	const names: Record<string, (...parameters: any[]) => string> = { 1: messages.map_1, 2: messages.map_2, 3: messages.map_3, 4: messages.map_4, 5: messages.map_5, 6: messages.map_6, 7: messages.map_7, 8: messages.map_8, 9: messages.map_9, 10: messages.map_10, 11: messages.map_11, 12: messages.map_12, 13: messages.map_13, 14: messages.map_14, 15: messages.map_15, 16: messages.map_16, 17: messages.map_17, 18: messages.map_18, 19: messages.map_19, 20: messages.map_20, 21: messages.map_21, 22: messages.map_22, 23: messages.map_23, 24: messages.map_24, 25: messages.map_25, 26: messages.map_26, 27: messages.map_27, 28: messages.map_28, 29: messages.map_29, 30: messages.map_30, 31: messages.map_31, 35: messages.map_35, 36: messages.map_36, 37: messages.map_37, 38: messages.map_38 }
	return names[id] ? translate(names[id]) : id
}
