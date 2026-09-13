<script lang="ts">
	import { onMount } from 'svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import Cell from './Cell.svelte'
	import Minimap from './Minimap.svelte'
	import { selectedUnit, reachableCells, attackCells, canAttack } from '$lib/game/model.js'
	import type { GameController } from '$lib/game/types.js'

	let { game, name }: { game: GameController; name: string } = $props()
	let boardElement = $state<HTMLElement>()
	let viewport = $state<HTMLDivElement>()
	let scrollbarHeight = $state(0)
	let visibleArea = $state({ left: 0, width: 1 })
	let edges = $state({ left: 0, right: 0 })
	const scrollable = $derived(Object.values(edges).some((distance) => distance > 0))

	function updateEdges() {
		if (!viewport) return
		const { scrollLeft, scrollWidth, clientWidth } = viewport
		scrollbarHeight = viewport.offsetHeight - viewport.clientHeight
		visibleArea = { left: scrollLeft / scrollWidth, width: Math.min(1, clientWidth / scrollWidth) }
		const distance = (value: number) => (value > 1 ? value : 0)
		edges = { left: distance(scrollLeft), right: distance(scrollWidth - clientWidth - scrollLeft) }
	}

	function scrollHorizontally(direction: 'left' | 'right') {
		if (!viewport) return
		const distance = Math.max(48, viewport.clientWidth - 48)
		viewport.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
	}
	function seekOnMinimap(fraction: number) {
		if (viewport) viewport.scrollTo({ left: fraction * viewport.scrollWidth - viewport.clientWidth / 2, behavior: 'instant' })
	}
	onMount(() => {
		const observer = new ResizeObserver(updateEdges)
		if (viewport) observer.observe(viewport)
		if (boardElement) observer.observe(boardElement)
		updateEdges()
		return () => observer.disconnect()
	})
	const scrollDirections = ['left', 'right'] as const
	let hadSelection = false
	const gameState = $derived(game.state)
	const selected = $derived(selectedUnit(gameState))
	const reachable = $derived(reachableCells(gameState))
	const attackRange = $derived(attackCells(gameState))
	const units = $derived(new Map(gameState.units.map((unit) => [unit.cell, unit])))

	$effect(() => {
		const index = selected?.cell
		if (boardElement?.contains(document.activeElement)) {
			if (index !== undefined) {
				const cell = boardElement.querySelector<HTMLElement>('[data-cell="' + index + '"]')
				cell?.focus({ preventScroll: true })
				if (cell && viewport) {
					const cellBounds = cell.getBoundingClientRect()
					const viewportBounds = viewport.getBoundingClientRect()
					const right = viewportBounds.left + viewport.clientWidth
					viewport.scrollBy({ left: cellBounds.left < viewportBounds.left ? cellBounds.left - viewportBounds.left : Math.max(0, cellBounds.right - right) })
				}
			} else if (hadSelection) boardElement.focus({ preventScroll: true })
		}
		hadSelection = index !== undefined
	})
</script>

<div class="board-layout">
	<div class="board-frame" style:--scrollbar-height={`${scrollbarHeight}px`}>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable regions need keyboard focus for native arrow-key scrolling.) -->
		<div class="board-viewport" bind:this={viewport} onscroll={updateEdges} tabindex={scrollable ? 0 : undefined} role="region" aria-label={name}>
			<div bind:this={boardElement} class="board" tabindex="-1" role="group" aria-label={name} style:--cols={gameState.cols} style:--rows={gameState.rows}>
				{#each gameState.cells as cell (cell.index)}
					{@const unit = units.get(cell.index)}
					<Cell {cell} {unit} selected={!!unit && selected?.id === unit.id} reachable={reachable.includes(cell.index)} attackable={attackRange.includes(cell.index)} target={(selected?.attacks ?? 0) > 0 && canAttack(gameState, selected, unit)} explosion={gameState.explosion === cell.index} income={gameState.incomeCells.includes(cell.index)} captured={gameState.capturedCells.includes(cell.index)} secured={gameState.securedCells.includes(cell.index)} onclick={() => game.clickCell(cell.index)} onpreview={() => (gameState.hoveredIndex = cell.index)} />
				{/each}
			</div>
		</div>
		{#each scrollDirections as direction}
			<div class="scroll-edge {direction}" style:opacity={Math.min(1, edges[direction] / 48)}>
				<button type="button" aria-label={translate(direction === 'left' ? messages.scroll_left : messages.scroll_right)} disabled={edges[direction] === 0} tabindex={edges[direction] === 0 ? -1 : 0} onclick={() => scrollHorizontally(direction)}>
					<span aria-hidden="true">{direction === 'left' ? '‹' : '›'}</span>
				</button>
			</div>
		{/each}
	</div>
	{#if scrollable}
		<p class="scroll-hint">{translate(messages.map_scroll_hint)}</p>
	{/if}

	{#if scrollable}
		<div class="board-navigation">
			<Minimap state={gameState} visibleLeft={visibleArea.left} visibleWidth={visibleArea.width} onseek={seekOnMinimap} />
		</div>
	{/if}
</div>

<style>
	.board-layout {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.board-navigation {
		@media (max-width: 900px) {
			order: -1;
			margin-bottom: 16px;
		}
	}

	.board-frame {
		position: relative;
		min-width: 0;
	}

	.board-viewport {
		width: 100%;
		overflow-x: auto;
		overscroll-behavior-x: contain;

		@media (max-width: 900px) {
			scrollbar-width: none;
			&::-webkit-scrollbar {
				display: none;
			}
		}
	}

	.scroll-hint {
		margin: 8px 0 0;
		font-size: 12px;
		line-height: 1.5;
		color: #c7dce8;
		text-align: center;
	}

	.scroll-edge {
		position: absolute;
		z-index: 4;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffe985;
		text-shadow: 0 1px 3px #000;
		font-size: 28px;
		transition: opacity 120ms ease;

		&.left,
		&.right {
			top: 0;
			bottom: var(--scrollbar-height);
			width: 44px;
		}

		&.left {
			left: 0;
			background: linear-gradient(to right, #0d1216bb, transparent);
		}
		&.right {
			right: 0px;
			background: linear-gradient(to left, #0d1216bb, transparent);
		}

		button {
			pointer-events: auto;
			padding: 0;
			width: 28px;
			min-height: 44px;
			color: #ffe985;
			background: #19242cdd;
			border-color: #91a6b4;
			font-size: 28px;
		}
		button:disabled {
			pointer-events: none;
		}

		@media (prefers-reduced-motion: reduce) {
			transition: none;
		}
	}

	.board {
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		width: min(100%, calc((100svh - 240px) * var(--cols) / var(--rows)));
		min-width: 240px;
		min-height: fit-content;
		margin: 0 auto;
		box-shadow: 0 12px 40px #0007;

		&:focus {
			outline: none;
		}

		@media (max-width: 900px) {
			width: max(100%, calc(var(--cols) * 48px));
			min-width: calc(var(--cols) * 48px);
		}
	}
</style>
