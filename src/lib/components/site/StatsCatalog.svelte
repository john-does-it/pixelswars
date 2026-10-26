<script lang="ts">
	import { unitSpritePath } from '$lib/game/unit-sprites'
	import { unitTypes, terrainTypes } from '$lib/game/catalog'
	import Sprite from '$lib/components/Sprite.svelte'
	import TerrainIcon from '$lib/components/TerrainIcon.svelte'
	import StatCard from './StatCard.svelte'
	import { m as messages } from '$lib/paraglide/messages'
	import { buildingName, translate, terrainName, unitName } from '$lib/i18n.svelte'
	import type { BuildingId, StatItem, TerrainDefinition, TerrainId, UnitDefinition, UnitTypeId } from '$lib/game/types'
	const unitDescriptions = {
		'artillery-ship': messages.unit_artillery_ship_description,
		'attack-ship': messages.unit_attack_ship_description,
		'transport-ship': messages.unit_transport_ship_description,
		infantry: messages.unit_infantry_description,
		'infantry-rocket': messages.unit_infantry_rocket_description,
		'infantry-sniper': messages.unit_infantry_sniper_description,
		jeep: messages.unit_jeep_description,
		transport: messages.unit_transport_description,
		artillery: messages.unit_artillery_description,
		tank: messages.unit_tank_description,
		'anti-air': messages.unit_anti_air_description,
		helicopter: messages.unit_helicopter_description,
		'transport-helicopter': messages.unit_transport_helicopter_description,
		plane: messages.unit_plane_description
	}
	const terrainDescriptions = { road: messages.terrain_road_description, grass: messages.terrain_grass_description, forest: messages.terrain_forest_description, moutain: messages.terrain_moutain_description, water: messages.terrain_water_description, building: messages.terrain_building_description, blocker: messages.terrain_blocker_description }
	const unitGroups: { name: (...parameters: any[]) => string; description: (...parameters: any[]) => string; ids: UnitTypeId[] }[] = [
		{ name: messages.infantry_group, description: messages.infantry_group_description, ids: ['infantry', 'infantry-rocket', 'infantry-sniper'] },
		{ name: messages.vehicles_group, description: messages.vehicles_group_description, ids: ['jeep', 'transport', 'artillery', 'tank', 'anti-air'] },
		{ name: messages.aircraft_group, description: messages.aircraft_group_description, ids: ['helicopter', 'transport-helicopter', 'plane'] },
		{ name: messages.naval_group, description: messages.naval_group_description, ids: ['attack-ship', 'artillery-ship', 'transport-ship'] }
	]
	const terrainGroups: { name: (...parameters: any[]) => string; ids: Exclude<TerrainId, 'void'>[] }[] = [
		{ name: messages.ground_group, ids: ['road', 'grass', 'forest', 'moutain', 'blocker'] },
		{ name: messages.waterways_group, ids: ['water'] }
	]
	const unitStats = (unit: UnitDefinition): StatItem[] => [
		{ icon: 'icon-movement', label: translate(messages.stat_movement), value: unit.movement },
		{ icon: 'icon-attack-damage', label: translate(messages.stat_attack), value: unit.attack },
		{ icon: 'icon-defense', label: translate(messages.stat_defense), value: unit.defense },
		{ icon: 'icon-attack-capacity', label: translate(messages.stat_attacks), value: unit.attacks },
		{ icon: 'icon-attack-range', label: translate(messages.stat_range), value: unit.attack ? `${unit.exclusion + 1}–${unit.range}` : '—' }
	]
	const terrainStats = (terrain: TerrainDefinition, rangeBonus = 0): StatItem[] => [{ icon: 'icon-movement', label: translate(messages.stat_movement), value: terrain === terrainTypes.blocker ? '∞' : terrain.cost }, { icon: 'icon-defense', label: translate(messages.stat_defense), value: terrain.defense }, ...(rangeBonus ? [{ icon: 'icon-attack-range', label: translate(messages.stat_range_bonus), value: `+${rangeBonus}` }] : [])]

	const buildings: { id: BuildingId; description: (...parameters: any[]) => string }[] = [
		{ id: 'city', description: messages.building_city_description },
		{ id: 'big-city', description: messages.building_big_city_description },
		{ id: 'hospital', description: messages.building_hospital_description },
		{ id: 'factory', description: messages.building_factory_description },
		{ id: 'airport', description: messages.building_airport_description },
		{ id: 'naval-base', description: messages.building_naval_base_description }
	]
</script>

<h2 id="stats-title">{translate(messages.site_stats)}</h2>
<h3 id="terrain">{translate(messages.terrain)}</h3>
<div class="catalog">
	{#each terrainGroups.flatMap((group) => group.ids) as id}
		<StatCard title={terrainName(id)} stats={terrainStats(terrainTypes[id], id === 'moutain' ? 1 : 0)} description={translate(terrainDescriptions[id])}>
			{#snippet sprite()}<TerrainIcon terrain={id} size={120} />{/snippet}
		</StatCard>
	{/each}
</div>
<h3>{translate(messages.buildings)}</h3>
<div class="catalog">
	{#each buildings as building}
		<StatCard title={buildingName(building.id)} stats={terrainStats(terrainTypes.building)} description={translate(building.description)}>
			{#snippet sprite()}<TerrainIcon terrain={building.id} size={120} />{/snippet}
		</StatCard>
	{/each}
</div>
<h3 id="army">{translate(messages.your_army)}</h3>
<div class="catalog">
	{#each unitGroups.flatMap((group) => group.ids) as id}
		<StatCard unit title={unitName(id)} stats={unitStats(unitTypes[id])} description={translate(unitDescriptions[id])}>
			{#snippet sprite()}<Sprite src={unitSpritePath(id, 2)} alt={unitName(id)} size="xl" lazy />{/snippet}
		</StatCard>
	{/each}
</div>

<style>
	h2 {
		margin: 0 0 var(--site-gap-medium);
	}
	h3 {
		margin: var(--site-gap-medium) 0 var(--site-gap-small);
	}
	.catalog {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 320px));
		gap: 40px;
		justify-content: center;
	}
	@media (max-width: 640px) {
		.catalog {
			gap: 24px;
		}
	}
</style>
