<script lang="ts">
	import { base } from '$app/paths'
	import TerrainIcon from './TerrainIcon.svelte'
	import StatList from './StatList.svelte'
	import { unitAt } from '$lib/game/model.js'
	import { unitTypes } from '$lib/game/catalog.js'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import type { GameState, StatItem, Unit } from '$lib/game/types.js'

	let { state }: { state: GameState } = $props()
	const cell = $derived(state.hoveredIndex === null ? undefined : state.cells[state.hoveredIndex])
	const unit = $derived(cell && unitAt(state, cell.index))
	const type = $derived(unit && unitTypes[unit.type])
	const terrainStats = $derived<StatItem[]>(
		cell
			? [
					{ icon: 'icon-movement', label: 'Movement cost', value: cell.cost },
					{ icon: 'icon-defense', label: 'Terrain defense', value: cell.defense }
				]
			: []
	)
	const unitStats = $derived<StatItem[]>(unit ? statsFor(unit) : [])

	function statsFor(currentUnit: Unit): StatItem[] {
		const definition = unitTypes[currentUnit.type]
		return [
			{ icon: 'icon-health', label: 'Health', value: `${currentUnit.health}/${definition.maxHealth}`, testId: 'preview-health' },
			{ icon: 'icon-movement', label: 'Movement', value: `${currentUnit.movement}/${definition.movement}` },
			{ icon: 'icon-attack-capacity', label: 'Attacks', value: `${currentUnit.attacks}/${definition.attacks}` },
			{ icon: 'icon-attack-damage', label: 'Attack', value: definition.attack },
			{ icon: 'icon-defense', label: 'Defense', value: definition.defense },
			{ icon: 'icon-attack-range', label: 'Range', value: `${definition.exclusion + 1}–${definition.range}` }
		]
	}
</script>

<aside aria-label="Cell statistics" class="panel">
	<div class="heading">
		<h2>{cell ? cell.building || cell.name : 'Field information'}</h2>
		{#if cell}
			<TerrainIcon {cell} />
		{/if}
	</div>
	{#if cell}
		<StatList items={terrainStats} />
		{#if cell.building}
			<p>Owner: {cell.owner ? `Player ${cell.owner}` : 'Neutral'} · Capture: {cell.capturePoints}/20</p>
		{/if}
		{#if unit && type}
			<div class="heading unit-heading">
				<div class="unit-name">
					<h3>Player {unit.player}</h3>
					<span>{type.name}</span>
				</div>
				<img class="unit-icon" src="{base}{unitSprite(unit, true)}" alt="" />
			</div>
			<StatList items={unitStats} />
		{/if}
	{:else}
		<p>Point to a cell or select a unit to inspect its statistics.</p>
	{/if}
</aside>

<style>
	aside {
		font-size: 14px;
		min-height: 160px;

		@media (max-width: 900px) {
			min-height: 400px;
		}
	}

	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.unit-heading {
		margin-top: 16px;
	}

	.unit-icon {
		width: 40px;
		height: 40px;
		object-fit: contain;
		image-rendering: pixelated;
		flex: none;
	}

	h2 {
		text-transform: capitalize;
		font-size: 18px;
		margin: 0;
	}

	h3 {
		font-size: 16px;
		color: #ffe985;
		margin: 0;
	}

	.unit-name {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	p {
		color: #e1e9ed;
		line-height: 1.5;
	}
</style>
