<script lang="ts">
	import { asset } from '$app/paths'
	import TerrainIcon from './TerrainIcon.svelte'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'

	let { state: gameState, visibleLeft, visibleWidth, onseek }: { state: GameState; visibleLeft: number; visibleWidth: number; onseek: (fraction: number) => void } = $props()
	const unitsByCell = $derived(new Map(gameState.units.map((unit) => [unit.cell, unit])))
	let dragging = $state(false)

	function seekAtPointer(event: PointerEvent) {
		const bounds = event.currentTarget instanceof HTMLElement ? event.currentTarget.getBoundingClientRect() : null
		if (bounds) onseek(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)))
	}

	function navigateWithKeyboard(event: KeyboardEvent) {
		const center = visibleLeft + visibleWidth / 2
		const positions: Record<string, number> = { ArrowLeft: center - 1 / gameState.cols, ArrowRight: center + 1 / gameState.cols, Home: 0, End: 1 }
		if (event.key in positions) {
			event.preventDefault()
			onseek(positions[event.key])
		}
	}
</script>

<section class="minimap">
	<div class="heading">
		<h2>{translate(messages.minimap)}</h2>
		<p>{translate(messages.minimap_hint)}</p>
	</div>
	<button
		class="overview"
		aria-label={translate(messages.minimap_navigation)}
		style:width={`min(220px, 100%, ${(150 * gameState.cols) / gameState.rows}px)`}
		onpointerdown={(event) => {
			if (event.button !== 0) return
			dragging = true
			event.currentTarget.setPointerCapture(event.pointerId)
			seekAtPointer(event)
		}}
		onpointermove={(event) => {
			if (dragging) seekAtPointer(event)
		}}
		onpointerup={() => (dragging = false)}
		onpointercancel={() => (dragging = false)}
		onlostpointercapture={() => (dragging = false)}
		onkeydown={navigateWithKeyboard}
		onclick={(event) => {
			if (event.detail === 0) onseek(0.5)
		}}
	>
		<span class="terrain-grid" style:grid-template-columns={`repeat(${gameState.cols}, minmax(0, 1fr))`} aria-hidden="true">
			{#each gameState.cells as cell (cell.index)}
				{@const unit = unitsByCell.get(cell.index)}
				<span class="mini-cell" class:selected={!!unit && unit.id === gameState.selectedId} data-minimap-cell={cell.index}>
					<TerrainIcon {cell} size="fill" />
					{#if unit}
						<img class="mini-unit" src={asset(unitSprite(unit))} alt="" data-minimap-unit={unit.id} />
					{/if}
				</span>
			{/each}
		</span>
		<svg viewBox={`0 0 ${gameState.cols * 10} ${gameState.rows * 10}`} aria-hidden="true">
			<rect class="visible-area" x={visibleLeft * gameState.cols * 10 + 0.75} y="0.75" width={Math.max(0, visibleWidth * gameState.cols * 10 - 1.5)} height={gameState.rows * 10 - 1.5} fill="#ffe98518" stroke="#ffe985" stroke-width="1.5" />
		</svg>
	</button>
	<div class="legend">
		<span class="player-one">● {translate(messages.player, { player: 1 })}</span>
		<span class="player-two">● {translate(messages.player, { player: 2 })}</span>
	</div>
</section>

<style>
	.minimap {
		display: none;
		@media (max-width: 900px) {
			display: grid;
			justify-items: center;
			gap: 10px;
			margin-top: 16px;
			padding: 14px;
			border: 1px solid #78909f;
			border-radius: 8px;
			background: #19242c;
		}
	}
	h2 {
		margin: 0;
		font-size: 16px;
		color: #ffe985;
		text-align: center;
	}
	p {
		margin: 6px 0 0;
		font-size: 12px;
		line-height: 1.5;
		color: #c7dce8;
		text-align: center;
	}
	.overview {
		position: relative;
		display: block;
		padding: 0;
		border: 1px solid #91a6b4;
		border-radius: 0;
		touch-action: none;
		cursor: crosshair;
	}
	svg {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.terrain-grid {
		display: grid;
		pointer-events: none;
	}
	.mini-cell {
		position: relative;
		aspect-ratio: 1;
		min-width: 0;
	}
	.mini-unit {
		position: absolute;
		inset: 5%;
		width: 90%;
		height: 90%;
		object-fit: contain;
		image-rendering: pixelated;
	}
	.selected::after {
		content: '';
		position: absolute;
		inset: 0;
		border: 1px solid #ffe985;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 14px;
		font-size: 12px;
	}
	.player-one {
		color: #8dcbff;
	}
	.player-two {
		color: #ffb3b1;
	}
</style>
