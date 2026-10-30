<script lang="ts">
	import { unitSpritePath } from '$lib/game/unit-sprites'
	import { unitTypes, terrainTypes } from '$lib/game/catalog'
	import Sprite from '$lib/components/Sprite.svelte'
	import TerrainIcon from '$lib/components/TerrainIcon.svelte'
	import StatCard from './StatCard.svelte'
	import { m as messages } from '$lib/paraglide/messages'
	import { buildingName, translate, terrainName, unitName } from '$lib/i18n.svelte'
	import type { BuildingId, StatItem, TerrainDefinition, TerrainId, UnitDefinition, UnitTypeId } from '$lib/game/types'
	const unitGroups: { name: (...parameters: any[]) => string; ids: UnitTypeId[] }[] = [
		{ name: messages.infantry_group, ids: ['infantry', 'infantry-rocket', 'infantry-sniper'] },
		{ name: messages.vehicles_group, ids: ['jeep', 'transport', 'artillery', 'tank', 'anti-air'] },
		{ name: messages.aircraft_group, ids: ['helicopter', 'transport-helicopter', 'plane'] },
		{ name: messages.naval_group, ids: ['attack-ship', 'artillery-ship', 'transport-ship'] }
	]
	const terrainGroups: { name: (...parameters: any[]) => string; ids: TerrainId[] }[] = [
		{ name: messages.ground_group, ids: ['road', 'grass', 'forest', 'moutain', 'blocker'] },
		{ name: messages.waterways_group, ids: ['water'] }
	]
	const unitStats = (unit: UnitDefinition): StatItem[] => [
		{ icon: 'icon-money', label: translate(messages.stat_cost), value: unit.cost },
		{ icon: 'icon-health', label: translate(messages.stat_health), value: unit.maxHealth },
		{ icon: 'icon-movement', label: translate(messages.stat_movement), value: unit.movement },
		{ icon: 'icon-attack-damage', label: translate(messages.stat_attack), value: unit.attack },
		{ icon: 'icon-defense', label: translate(messages.stat_defense), value: unit.defense },
		{ icon: 'icon-attack-capacity', label: translate(messages.stat_attacks), value: unit.attacks },
		{ icon: 'icon-attack-range', label: translate(messages.stat_range), value: unit.attack ? `${unit.exclusion + 1}–${unit.range}` : '—' }
	]
	const terrainStats = (terrain: TerrainDefinition): StatItem[] => [{ icon: 'icon-movement', label: translate(messages.stat_movement), value: terrain === terrainTypes.blocker ? '∞' : terrain.cost }, { icon: 'icon-defense', label: translate(messages.stat_defense), value: terrain.defense }]

	const buildings: { id: BuildingId }[] = [
		{ id: 'city' },
		{ id: 'big-city' },
		{ id: 'hospital' },
		{ id: 'factory' },
		{ id: 'airport' },
		{ id: 'naval-base' }
	]
</script>

<h2 id="stats-title">{translate(messages.site_stats)}</h2>
<h3 id="terrain">{translate(messages.terrain)}</h3>
<div class="catalog">
	{#each terrainGroups.flatMap((group) => group.ids) as id}
		<StatCard title={terrainName(id)} stats={terrainStats(terrainTypes[id])}>
			{#snippet sprite()}<TerrainIcon terrain={id} size={42} />{/snippet}
		</StatCard>
	{/each}
</div>
<h3>{translate(messages.buildings)}</h3>
<div class="catalog">
	{#each buildings as building}
		<StatCard title={buildingName(building.id)} stats={terrainStats(terrainTypes.building)}>
			{#snippet sprite()}<TerrainIcon terrain={building.id} size={42} />{/snippet}
		</StatCard>
	{/each}
</div>
<h3 id="army">{translate(messages.your_army)}</h3>
<div class="catalog">
	{#each unitGroups.flatMap((group) => group.ids) as id}
		<StatCard title={unitName(id)} stats={unitStats(unitTypes[id])}>
			{#snippet sprite()}<Sprite src={unitSpritePath(id, 2)} alt={unitName(id)} size="m" lazy />{/snippet}
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
	@media (width < 740px) {
		.catalog {
			grid-template-columns: minmax(0, 1fr);
			gap: 24px;
		}
	}
</style>

