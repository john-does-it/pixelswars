<script lang="ts">
	import { asset } from '$lib/game/asset-path'
	import { preferences } from '$lib/preferences.svelte.js'
	import { unitTypes } from '$lib/game/catalog.js'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import { unitName, buildingName, terrainName, translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import type { Cell, Unit } from '$lib/game/types.js'
	import TerrainIcon from './TerrainIcon.svelte'

	let { cell, unit, disabled = false, oninspect }: { cell?: Cell; unit?: Unit; disabled?: boolean; oninspect: () => void } = $props()
	const name = $derived(unit ? unitName(unit.type) : cell ? (cell.building ? buildingName(cell.building) : terrainName(cell.terrain)) : '')
</script>

{#if cell}
	<button class="selected-unit-strip pixel-icon-control" {disabled} aria-label={translate(messages.preview_expand)} title={`${name} · ${translate(messages.preview_expand)} (I)`} aria-keyshortcuts="I" aria-haspopup="dialog" onclick={oninspect}>
		<span class="tile-thumbnail" aria-hidden="true">
			<TerrainIcon {cell} size="fill" />
			{#if unit}<img class="sprite" style:scale={preferences.unitFacing && unit.facing === 'left' ? '-1 1' : '1 1'} src={asset(unitSprite(unit))} alt="" />{/if}
		</span>
		{#if unit}
			{@const definition = unitTypes[unit.type]}
			<span class="details">
				<span class="preview-name">{name}</span>
				<span class="stats">
					<span title={translate(messages.stat_health)}><img src={asset('/assets/icons/icon-health.png')} alt={translate(messages.stat_health)} /><span>{unit.health}<span class="stat-maximum">/{definition.maxHealth}</span></span></span>
					<span title={translate(messages.stat_movement)}><img src={asset('/assets/icons/icon-movement.png')} alt={translate(messages.stat_movement)} /><span>{unit.movement}<span class="stat-maximum">/{definition.movement}</span></span></span>
					<span title={translate(messages.stat_attacks)}><img src={asset('/assets/icons/icon-attack-capacity.png')} alt={translate(messages.stat_attacks)} /><span>{unit.attacks}<span class="stat-maximum">/{definition.attacks}</span></span></span>
				</span>
			</span>
		{:else}
			<span class="details">
				<span class="preview-name">{name}</span>
				<span class="stats">
					<span title={translate(messages.movement_cost)}><img src={asset('/assets/icons/icon-movement.png')} alt={translate(messages.movement_cost)} /><span>{cell.terrain === 'blocker' ? '∞' : cell.cost}</span></span>
					<span title={translate(messages.terrain_defense)}><img src={asset('/assets/icons/icon-defense.png')} alt={translate(messages.terrain_defense)} /><span>{cell.defense}</span></span>
				</span>
			</span>
		{/if}
	</button>
{/if}

<style>
	.selected-unit-strip {
		width: 324px;
		max-width: 100%;
		height: 75px;
		flex: none;
		display: flex;
		align-items: flex-start;
		justify-content: flex-start;
		gap: 6px;
		padding: 0;
		text-align: left;
	}
	img {
		object-fit: contain;
		image-rendering: pixelated;
		flex: none;
	}
	.tile-thumbnail {
		position: relative;
		width: 75px;
		height: 75px;
		flex: none;
	}
	.sprite {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.details {
		min-width: 0;
		flex: 1;
	}
	.stats {
		display: flex;
		flex-direction: column;
		gap: 0;
		font: 400 var(--font-size-ui) / 1.5 var(--font-body);
		font-variant-numeric: tabular-nums;
	}
	.preview-name {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--color-text);
		font: 600 var(--font-size-ui) / 1.2 var(--font-body);
	}
	.preview-name + .stats {
		line-height: 1.15;
	}
	.stats > span {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		white-space: nowrap;
	}
	.stats img {
		width: 1em;
		height: 1em;
	}
	@container unit-footer (max-width: 324px) {
		.stat-maximum {
			display: none;
		}
	}
	@media (max-width: 900px) {
		.selected-unit-strip,
		.tile-thumbnail {
			width: 44px;
			height: 44px;
		}
		.details {
			display: none;
		}
	}
</style>
