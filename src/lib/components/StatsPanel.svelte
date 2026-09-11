<script>
	import { base } from '$app/paths'
	import TerrainIcon from './TerrainIcon.svelte'
	import { unitAt } from '$lib/game/model.js'
	import { unitTypes } from '$lib/game/catalog.js'

	let { state } = $props()
	const cell = $derived(state.cells[state.hoveredIndex])
	const unit = $derived(cell && unitAt(state, cell.index))
	const type = $derived(unit && unitTypes[unit.type])
</script>

<aside aria-label="Cell statistics" class="panel">
	<div class="heading">
		<h2>{cell ? cell.building || cell.name : 'Field information'}</h2>
		{#if cell}
			<TerrainIcon {cell} />
		{/if}
	</div>
	{#if cell}
		<p>Movement cost: {cell.cost} · Terrain defense: {cell.defense}</p>
		{#if cell.building}
			<p>Owner: {cell.owner ? `Player ${cell.owner}` : 'Neutral'} · Capture: {cell.capturePoints}/20</p>
		{/if}
		{#if unit}
			<div class="heading unit-heading">
				<div class="unit-name">
					<h3>Player {unit.player}</h3>
					<span>{type.name}</span>
				</div>
				<img class="unit-icon" src="{base}/assets/units/{unit.type}-{unit.player}-fit.png" alt="" />
			</div>
			<dl>
				<dt>Health</dt>
				<dd data-testid="preview-health">{unit.health}/{type.maxHealth}</dd>
				<dt>Movement</dt>
				<dd>{unit.movement}/{type.movement}</dd>
				<dt>Attacks</dt>
				<dd>{unit.attacks}/{type.attacks}</dd>
				<dt>Attack / defense</dt>
				<dd>{type.attack} / {type.defense}</dd>
				<dt>Range</dt>
				<dd>{type.exclusion + 1}–{type.range}</dd>
			</dl>
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
			min-height: 360px;
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

	dl {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 8px;
	}

	dd {
		margin: 0;
	}

	p {
		color: #c0cbd0;
		line-height: 1.5;
	}
</style>
