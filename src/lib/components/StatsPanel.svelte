<script lang="ts">
	import Sprite from './Sprite.svelte'
	import { asset } from '$lib/game/asset-path'
	import TerrainIcon from './TerrainIcon.svelte'
	import StatList from './StatList.svelte'
	import { unitAt, effectiveRange } from '$lib/game/model.js'
	import { buildingIncome, unitTypes } from '$lib/game/catalog.js'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { buildingName, matchPlayerName, translate, terrainName, unitName } from '$lib/i18n.svelte.js'
	import type { Cell, GameState, StatItem, Unit } from '$lib/game/types.js'

	let { state, aiMode = false }: { state: GameState; aiMode?: boolean } = $props()
	const cell = $derived(state.previewIndex === null ? undefined : state.cells[state.previewIndex])
	const unit = $derived(cell && unitAt(state, cell.index))

	function terrainStats(previewCell: Cell): StatItem[] {
		return [{ icon: 'icon-movement', label: translate(messages.movement_cost), value: previewCell.terrain === 'blocker' ? '∞' : previewCell.cost }, { icon: 'icon-defense', label: translate(messages.terrain_defense), value: previewCell.defense }, ...(buildingIncome(previewCell.building) ? [{ icon: 'icon-money', label: translate(messages.stat_income), value: `${buildingIncome(previewCell.building)}$` }] : [])]
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
		<h2 class="pixel-heading">{previewCell ? (previewCell.building ? buildingName(previewCell.building) : terrainName(previewCell.terrain)) : translate(messages.field_information)}</h2>
		{#if previewCell}<TerrainIcon cell={previewCell} size={64} />{/if}
	</div>
	{#if previewCell}
		{#if previewCell.terrain !== 'void'}<StatList items={terrainStats(previewCell)} />{/if}
		{#if previewCell.terrain === 'water'}
			<p class="stat-description">{translate(messages.terrain_water_description)}</p>
		{:else if previewCell.terrain === 'blocker'}
			<p class="stat-description">{translate(messages.terrain_blocker_description)}</p>
		{:else if previewCell.terrain === 'void'}
			<p class="stat-description">{translate(messages.terrain_void_description)}</p>
		{/if}
		{#if previewCell.building}
			<p class="building-status">
				<span>{translate(messages.owner, { owner: previewCell.owner ? matchPlayerName(previewCell.owner, aiMode, state.network?.player) : translate(messages.neutral) })}</span>
				<span>{translate(messages.capture_points, { points: previewCell.capturePoints })}</span>
			</p>
		{/if}
	{:else}<p>{translate(messages.inspect_hint)}</p>{/if}
{/snippet}

{#snippet unitContent(previewUnit: Unit)}
	<div class="heading unit-heading">
		<div class="unit-name">
			<h3 class="pixel-heading">{unitName(previewUnit.type)}</h3>
			<span class:player-one={previewUnit.player === 1} class:player-two={previewUnit.player === 2}>{matchPlayerName(previewUnit.player, aiMode, state.network?.player)}</span>
		</div>
		<Sprite src={unitSprite(previewUnit)} size="m" />
	</div>
	<StatList items={statsFor(previewUnit)} />
	{#if unitTypes[previewUnit.type].capacity}
		<div class="passenger-details">
			<h3>{translate(messages.transport_cargo, { count: previewUnit.cargo?.length ?? 0, capacity: unitTypes[previewUnit.type].capacity ?? 0 })}</h3>
			{#if previewUnit.cargo?.length}
				<ul class="passenger-list">
					{#each previewUnit.cargo as passenger (passenger.id)}
						<li>
							<Sprite src={unitSprite(passenger)} size="s" />
							<span>{unitName(passenger.type)}</span>
							<span class="passenger-health"><img src={asset('/assets/icons/icon-health.png')} alt={translate(messages.stat_health)} />{passenger.health}/{unitTypes[passenger.type].maxHealth}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
	{#if effectiveRange(state, previewUnit).bonus}<p class="stat-description">{translate(messages.mountain_range_bonus)}</p>{/if}
{/snippet}

<aside aria-label={translate(messages.cell_statistics)}>
	{#if unit}<section class="unit-details">{@render unitContent(unit)}</section>{/if}
	<section class="terrain-details">{@render terrainContent(cell)}</section>
</aside>

<style>
	aside {
		display: grid;
		gap: 16px;
		font-size: var(--font-size-ui);
		line-height: 1.4;
		--stat-gap: 8px 16px;
		--stat-label-gap: 12px;
		--stat-margin: 8px 0;
		--stat-icon-size: 32px;
		--stat-description-padding: 8px;
		--stat-description-margin-bottom: 0;
	}
	section {
		padding: 20px;
		border: 2px solid var(--site-plum);
		background: var(--site-paper);
	}
	.unit-details {
		background: var(--site-sky);
	}
	.player-one {
		color: var(--player-blue);
	}
	.player-two {
		color: var(--player-red);
	}
	.heading :global(.terrain-icon) {
		border-radius: 0;
	}
	@media (max-width: 480px) {
		section {
			padding: 16px 12px;
		}
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
		gap: 8px;
	}
	.passenger-details h3 {
		font-family: var(--font-body);
		color: var(--site-plum);
		-webkit-text-stroke: 0;
	}
	.passenger-details {
		margin-top: 12px;
	}
	.passenger-list {
		list-style: none;
		margin: 8px 0 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.passenger-list li {
		display: grid;
		grid-template-columns: 40px minmax(0, 1fr) auto;
		align-items: center;
		gap: 10px;
	}
	.passenger-health {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: bold;
		white-space: nowrap;
	}
	.passenger-health img {
		width: var(--stat-icon-size);
		height: var(--stat-icon-size);
		object-fit: contain;
		image-rendering: pixelated;
	}
	h2,
	h3 {
		font-size: var(--font-size-ui);
		line-height: 1.4;
		margin: 0;
	}
	.heading .pixel-heading {
		--site-heading-outline: var(--interface-heading-outline);
		font-size: 24px;
		line-height: 1.2;
	}
	p:not(.stat-description) {
		margin: 8px 0 0;
	}
	.building-status {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
</style>
