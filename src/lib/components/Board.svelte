<script lang="ts">
	import { onMount, untrack } from 'svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import Cell from './Cell.svelte'
	import Minimap from './Minimap.svelte'
	import { selectedUnit, inspectedEnemy, reachableCells, attackCells, canAttack } from '$lib/game/model.js'
	import type { GameController } from '$lib/game/types.js'

	let { game, name, aiMode = false }: { game: GameController; name: string; aiMode?: boolean } = $props()
	let boardElement = $state<HTMLElement>()
	let viewport = $state<HTMLDivElement>()
	let scrollbarHeight = $state(0)
	let mobileView = $state(false)
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
		const media = matchMedia('(max-width: 900px)')
		const updateMobile = () => (mobileView = media.matches)
		updateMobile()
		media.addEventListener('change', updateMobile)
		const observer = new ResizeObserver(updateEdges)
		if (viewport) observer.observe(viewport)
		if (boardElement) observer.observe(boardElement)
		updateEdges()
		return () => {
			observer.disconnect()
			media.removeEventListener('change', updateMobile)
		}
	})
	const scrollDirections = ['left', 'right'] as const
	let hadSelection = false
	const gameState = $derived(game.state)
	const selected = $derived(selectedUnit(gameState))
	const inspected = $derived(inspectedEnemy(gameState))
	const rangeUnit = $derived(inspected ?? selected)
	const reachable = $derived(reachableCells(gameState))
	const attackRange = $derived(new Set(rangeUnit ? attackCells(gameState, rangeUnit) : []))
	const rangeOutline = $derived.by(() => {
		const segments: string[] = []
		// Do not recreate a selection border around the unit itself.
		const covered = (index: number) => attackRange.has(index) || index === rangeUnit?.cell
		for (const index of attackRange) {
			const column = index % gameState.cols
			const row = Math.floor(index / gameState.cols)
			if (row === 0 || !covered(index - gameState.cols)) segments.push(`M${column},${row}h1`)
			if (column === gameState.cols - 1 || !covered(index + 1)) segments.push(`M${column + 1},${row}v1`)
			if (row === gameState.rows - 1 || !covered(index + gameState.cols)) segments.push(`M${column},${row + 1}h1`)
			if (column === 0 || !covered(index - 1)) segments.push(`M${column},${row}v1`)
		}
		return segments.join(' ')
	})
	const units = $derived(new Map(gameState.units.map((unit) => [unit.cell, unit])))
	const opponentTurn = $derived(gameState.aiThinking || !!(gameState.network && gameState.network.player !== gameState.player))

	$effect(() => {
		const followOpponent = opponentTurn && mobileView && scrollable
		const target = gameState.combatTargetIndex ?? (followOpponent ? selected?.cell : null)
		if (target === null || target === undefined || !boardElement || !viewport) return
		const cell = boardElement.querySelector<HTMLElement>('[data-cell="' + target + '"]')
		if (!cell) return
		const cellBounds = cell.getBoundingClientRect()
		const viewportBounds = viewport.getBoundingClientRect()
		if (followOpponent) {
			const center = cellBounds.left - viewportBounds.left + viewport.scrollLeft + cellBounds.width / 2
			viewport.scrollTo({ left: center - viewport.clientWidth / 2, behavior: gameState.fighting || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
			return
		}
		// Show the impact even if the enemy fires from the other side of a wide map.
		const offset = cellBounds.left < viewportBounds.left ? cellBounds.left - viewportBounds.left : Math.max(0, cellBounds.right - viewportBounds.left - viewport.clientWidth)
		if (offset) viewport.scrollBy({ left: offset, behavior: 'instant' })
	})

	$effect(() => {
		const index = selected?.cell
		if (!opponentTurn && boardElement?.contains(document.activeElement)) {
			if (index !== undefined) {
				const cell = boardElement.querySelector<HTMLElement>('[data-cell="' + index + '"]')
				cell?.focus({ preventScroll: true })
				// Combat changes must not refocus our unit and replace the inspected tile.
				if (cell && viewport && untrack(() => gameState.combatTargetIndex) === null) {
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

{#snippet navigation()}
	{#if scrollable}
		<div class="board-navigation">
			<Minimap state={gameState} visibleLeft={visibleArea.left} visibleWidth={visibleArea.width} onseek={seekOnMinimap} />
		</div>
	{/if}
{/snippet}

<div class="board-layout" class:range-red={rangeUnit?.player === 2}>
	{@render navigation()}
	<div class="board-frame" style:--scrollbar-height={`${scrollbarHeight}px`}>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex (Scrollable regions need keyboard focus for native arrow-key scrolling.) -->
		<div class="board-viewport" bind:this={viewport} onscroll={updateEdges} tabindex={scrollable ? 0 : undefined} role="region" aria-label={name}>
			<div bind:this={boardElement} class="board" tabindex="-1" role="group" aria-label={name} style:--cols={gameState.cols} style:--rows={gameState.rows}>
				{#each gameState.cells as cell (cell.index)}
					{@const unit = units.get(cell.index)}
					<Cell {cell} {unit} {aiMode} selected={!!unit && selected?.id === unit.id} inspected={!!unit && inspected?.id === unit.id} reachable={!inspected && reachable.includes(cell.index)} attackable={attackRange.has(cell.index)} underFire={gameState.combatTargetIndex === cell.index} target={gameState.fighting ? gameState.combatTargetIndex === cell.index : !inspected && (selected?.attacks ?? 0) > 0 && canAttack(gameState, selected, unit)} explosion={gameState.explosion === cell.index} income={gameState.incomeCells.includes(cell.index)} recoveredHealth={gameState.healedCells[cell.index]} captured={gameState.capturedCells.includes(cell.index)} secured={gameState.securedCells.includes(cell.index)} onclick={() => game.clickCell(cell.index)} onpreview={() => (gameState.hoveredIndex = cell.index)} />
				{/each}
				{#if rangeOutline}
					<svg class="range-outline" aria-hidden="true" viewBox={`0 0 ${gameState.cols} ${gameState.rows}`} preserveAspectRatio="none"><path d={rangeOutline} /></svg>
				{/if}
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
	{@render navigation()}
</div>

<style>
	.board-layout {
		--range-color: #8dcbff;
		--range-fill: #174a70;
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 16px;

		&.range-red {
			--range-color: #ffb3b1;
			--range-fill: #792d3a;
		}
	}

	.board-navigation {
		display: none;
		@media (max-width: 900px) {
			display: block;
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

	.scroll-edge {
		position: absolute;
		z-index: 4;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-accent);
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
			background: linear-gradient(to right, color-mix(in srgb, var(--color-background) 74%, transparent), transparent);
		}
		&.right {
			right: 0px;
			background: linear-gradient(to left, color-mix(in srgb, var(--color-background) 74%, transparent), transparent);
		}

		button {
			pointer-events: auto;
			padding: 0;
			width: 28px;
			min-height: 44px;
			color: var(--color-accent);
			background: color-mix(in srgb, var(--color-surface) 87%, transparent);
			border-color: var(--color-border-strong);
			font-size: 28px;
		}
		button:disabled {
			pointer-events: none;
		}

		@media (prefers-reduced-motion: reduce) {
			transition: none;
		}
	}

	.range-outline {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		overflow: visible;
		pointer-events: none;

		path {
			fill: none;
			stroke: var(--range-color);
			stroke-width: 1px;
			vector-effect: non-scaling-stroke;
		}
	}

	.board {
		position: relative;
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
