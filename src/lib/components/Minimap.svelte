<script lang="ts">
	import { asset } from '$app/paths'
	import TerrainIcon from './TerrainIcon.svelte'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'

	let { state: gameState, visibleLeft, visibleTop, visibleWidth, visibleHeight, onseek }: { state: GameState; visibleLeft: number; visibleTop: number; visibleWidth: number; visibleHeight: number; onseek: (left: number, top: number) => void } = $props()
	const unitsByCell = $derived(new Map(gameState.units.map((unit) => [unit.cell, unit])))
	let dragging = $state(false)

	function seekAtPointer(event: PointerEvent) {
		const bounds = event.currentTarget instanceof HTMLElement ? event.currentTarget.getBoundingClientRect() : null
		if (bounds) onseek(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)))
	}

	function navigateWithKeyboard(event: KeyboardEvent) {
		const center = { left: visibleLeft + visibleWidth / 2, top: visibleTop + visibleHeight / 2 }
		const positions: Record<string, [number, number]> = { ArrowLeft: [center.left - 1 / gameState.cols, center.top], ArrowRight: [center.left + 1 / gameState.cols, center.top], ArrowUp: [center.left, center.top - 1 / gameState.rows], ArrowDown: [center.left, center.top + 1 / gameState.rows], Home: [0, 0], End: [1, 1] }
		if (event.key in positions) {
			event.preventDefault()
			event.stopPropagation()
			onseek(...positions[event.key])
		}
	}
</script>

<div class="minimap">
	<button
		class="overview"
		aria-label={translate(messages.minimap_navigation)}
		style:width={`min(110px, ${(72 * gameState.cols) / gameState.rows}px)`}
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
			if (event.detail === 0) onseek(0.5, 0.5)
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
			<rect class="visible-area" x={visibleLeft * gameState.cols * 10 + 0.75} y={visibleTop * gameState.rows * 10 + 0.75} width={Math.max(0, Math.min(visibleWidth, 1 - visibleLeft) * gameState.cols * 10 - 1.5)} height={Math.max(0, Math.min(visibleHeight, 1 - visibleTop) * gameState.rows * 10 - 1.5)} fill="#ffe98518" stroke="#ffe985" stroke-width="1.5" />
		</svg>
	</button>
</div>

<style>
	.minimap {
		display: grid;
		place-items: center;
		flex: none;
	}
	.overview {
		position: relative;
		display: block;
		padding: 0;
		min-height: 0;
		border: 1px solid var(--color-border-strong);
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
		border: 1px solid var(--color-accent);
	}
</style>
