<script lang="ts">
	import { asset } from '$app/paths'
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
			{#if unit}<img class="sprite" src={asset(unitSprite(unit))} alt="" />{/if}
		</span>
		{#if unit}
			{@const definition = unitTypes[unit.type]}
			<span class="details">
				<strong>{name}</strong>
				<span class="stats">
					<span title={translate(messages.stat_health)}><img src={asset('/assets/icons/icon-health.png')} alt={translate(messages.stat_health)} />{unit.health}/{definition.maxHealth}</span>
					<span title={translate(messages.stat_movement)}><img src={asset('/assets/icons/icon-movement.png')} alt={translate(messages.stat_movement)} />{unit.movement}/{definition.movement}</span>
					<span title={translate(messages.stat_attacks)}><img src={asset('/assets/icons/icon-attack-capacity.png')} alt={translate(messages.stat_attacks)} />{unit.attacks}/{definition.attacks}</span>
				</span>
			</span>
		{/if}
	</button>
{/if}

<style>
	.selected-unit-strip {
		width: 280px;
		max-width: 100%;
		height: 48px;
		flex: none;
		display: flex;
		align-items: center;
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
		width: 32px;
		height: 32px;
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
	strong {
		display: block;
		font: 700 16px / 1.4 var(--font-display);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.stats {
		display: flex;
		gap: 4px;
		font:
			11px / 1.5 ui-monospace,
			monospace;
		font-variant-numeric: tabular-nums;
	}
	.stats span {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		white-space: nowrap;
	}
	.stats img {
		width: 12px;
		height: 12px;
	}
</style>
