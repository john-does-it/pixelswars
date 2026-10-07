<script lang="ts">
	import { asset } from '$app/paths'
	import TerrainIcon from './TerrainIcon.svelte'
	import StatList from './StatList.svelte'
	import { unitAt, effectiveRange } from '$lib/game/model.js'
	import { buildingIncome, unitTypes } from '$lib/game/catalog.js'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { buildingName, playerName, translate, terrainName, unitName } from '$lib/i18n.svelte.js'
	import type { Cell, GameState, StatItem, Unit } from '$lib/game/types.js'

	let { state, aiMode = false }: { state: GameState; aiMode?: boolean } = $props()
	const cell = $derived(state.previewIndex === null ? undefined : state.cells[state.previewIndex])
	const unit = $derived(cell && unitAt(state, cell.index))

	function terrainStats(previewCell: Cell): StatItem[] {
		return [{ icon: 'icon-movement', label: translate(messages.movement_cost), value: previewCell.terrain === 'water' ? `${previewCell.cost} (${translate(messages.ships_only)})` : previewCell.cost }, { icon: 'icon-defense', label: translate(messages.terrain_defense), value: previewCell.defense }, ...(buildingIncome(previewCell.building) ? [{ icon: 'icon-money', label: translate(messages.stat_income), value: `${buildingIncome(previewCell.building)}$` }] : [])]
	}
	function statsFor(currentUnit: Unit): StatItem[] {
		const definition = unitTypes[currentUnit.type]
		const range = effectiveRange(state, currentUnit)
		return [
			{ icon: 'icon-health', label: translate(messages.stat_health), value: `${currentUnit.health}/${definition.maxHealth}`, testId: 'preview-health' },
			{ icon: 'icon-movement', label: translate(messages.stat_movement), value: `${currentUnit.movement}/${definition.movement}` },
			{ icon: 'icon-attack-capacity', label: translate(messages.stat_attacks), value: `${currentUnit.attacks}/${definition.attacks}` },
			{ icon: 'icon-attack-damage', label: translate(messages.stat_attack), value: definition.attack },
			{ icon: 'icon-defense', label: translate(messages.stat_defense), value: definition.defense },
			{ icon: 'icon-attack-range', label: translate(messages.stat_range), value: definition.attack ? `${range.minimum}–${range.maximum}` : '—', testId: 'preview-range' }
		]
	}
</script>

{#snippet terrainContent(previewCell: Cell | undefined)}
	<div class="heading">
		<h2>{previewCell ? (previewCell.building ? buildingName(previewCell.building) : terrainName(previewCell.terrain)) : translate(messages.field_information)}</h2>
		{#if previewCell}<TerrainIcon cell={previewCell} />{/if}
	</div>
	{#if previewCell}
		<StatList items={terrainStats(previewCell)} />
		{#if previewCell.building}
			<p class="building-status">
				<span>{translate(messages.owner, { owner: previewCell.owner ? playerName(previewCell.owner, aiMode) : translate(messages.neutral) })}</span>
				<span>{translate(messages.capture_points, { points: previewCell.capturePoints })}</span>
			</p>
		{/if}
	{:else}<p>{translate(messages.inspect_hint)}</p>{/if}
{/snippet}

{#snippet unitContent(previewUnit: Unit)}
	<div class="heading unit-heading">
		<div class="unit-name">
			<h3>{playerName(previewUnit.player, aiMode)}</h3>
			<span>{unitName(previewUnit.type)}</span>
		</div>
		<img class="unit-icon" src={asset(unitSprite(previewUnit, true))} alt="" />
	</div>
	<StatList items={statsFor(previewUnit)} />
	{#if effectiveRange(state, previewUnit).bonus}<p>{translate(messages.mountain_range_bonus)}</p>{/if}
{/snippet}

<aside aria-label={translate(messages.cell_statistics)}>
	{#if unit}<section class="unit-details">{@render unitContent(unit)}</section>{/if}
	<section class="terrain-details">{@render terrainContent(cell)}</section>
</aside>

<style>
	aside {
		font-size: 12px;
		line-height: 1.4;
		--stat-gap: 4px 10px;
		--stat-margin: 8px 0;
		--stat-icon-size: 14px;
	}
	section + section {
		border-top: 1px solid var(--color-border);
		margin-top: 10px;
		padding-top: 10px;
	}
	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}
	.unit-name {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.unit-icon {
		width: 32px;
		height: 32px;
		object-fit: contain;
		image-rendering: pixelated;
		flex: none;
	}
	h2,
	h3 {
		font-size: 14px;
		line-height: 1.4;
		margin: 0;
	}
	h3 {
		color: var(--color-accent);
	}
	p {
		margin: 8px 0 0;
	}
	.building-status {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
</style>
