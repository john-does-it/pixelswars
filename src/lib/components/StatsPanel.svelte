<script lang="ts">
	import { asset } from '$app/paths'
	import TerrainIcon from './TerrainIcon.svelte'
	import StatList from './StatList.svelte'
	import { unitAt, effectiveRange } from '$lib/game/model.js'
	import { unitTypes } from '$lib/game/catalog.js'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { buildingName, translate, terrainName, unitName } from '$lib/i18n.svelte.js'
	import type { GameState, StatItem, Unit } from '$lib/game/types.js'

	let { state }: { state: GameState } = $props()
	const cell = $derived(state.hoveredIndex === null ? undefined : state.cells[state.hoveredIndex])
	const unit = $derived(cell && unitAt(state, cell.index))
	const terrainStats = $derived<StatItem[]>(
		cell
			? [
					{ icon: 'icon-movement', label: translate(messages.movement_cost), value: cell.terrain === 'water' ? `${cell.cost} (${translate(messages.ships_only)})` : cell.cost },
					{ icon: 'icon-defense', label: translate(messages.terrain_defense), value: cell.defense }
				]
			: []
	)
	const unitStats = $derived<StatItem[]>(unit ? statsFor(unit) : [])

	function statsFor(currentUnit: Unit): StatItem[] {
		const definition = unitTypes[currentUnit.type]
		const range = effectiveRange(state, currentUnit)
		return [
			{ icon: 'icon-health', label: translate(messages.stat_health), value: `${currentUnit.health}/${definition.maxHealth}`, testId: 'preview-health' },
			{ icon: 'icon-movement', label: translate(messages.stat_movement), value: `${currentUnit.movement}/${definition.movement}` },
			{ icon: 'icon-attack-capacity', label: translate(messages.stat_attacks), value: `${currentUnit.attacks}/${definition.attacks}` },
			{ icon: 'icon-attack-damage', label: translate(messages.stat_attack), value: definition.attack },
			{ icon: 'icon-defense', label: translate(messages.stat_defense), value: definition.defense },
			{ icon: 'icon-attack-range', label: translate(messages.stat_range), value: `${range.minimum}–${range.maximum}`, testId: 'preview-range' }
		]
	}
</script>

<aside aria-label={translate(messages.cell_statistics)} class="panel">
	<div class="heading">
		<h2>{cell ? (cell.building ? buildingName(cell.building) : terrainName(cell.terrain)) : translate(messages.field_information)}</h2>
		{#if cell}
			<TerrainIcon {cell} />
		{/if}
	</div>
	{#if cell}
		<StatList items={terrainStats} />
		{#if cell.building}
			<p class="building-status">
				<span>{translate(messages.owner, { owner: cell.owner ? translate(messages.player, { player: cell.owner }) : translate(messages.neutral) })}</span>
				<span>{translate(messages.capture_points, { points: cell.capturePoints })}</span>
			</p>
		{/if}
		{#if unit}
			<div class="heading unit-heading">
				<div class="unit-name">
					<h3>{translate(messages.player, { player: unit.player })}</h3>
					<span>{unitName(unit.type)}</span>
				</div>
				<img class="unit-icon" src={asset(unitSprite(unit, true))} alt="" />
			</div>
			<StatList items={unitStats} />
			{#if effectiveRange(state, unit).bonus}
				<p>{translate(messages.mountain_range_bonus)}</p>
			{/if}
		{/if}
	{:else}
		<p>{translate(messages.inspect_hint)}</p>
	{/if}
</aside>

<style>
	aside {
		font-size: 14px;
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

	.building-status {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
</style>
