<script lang="ts">
	import { onMount, tick, untrack, type Snippet } from 'svelte'
	import Minimap from './Minimap.svelte'
	import ZoomControls from './ZoomControls.svelte'
	import type { MapCamera } from '$lib/game/map-camera.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'

	let { state: gameState, name, children, camera = $bindable(), reservedBottom = 0, mapStatus }: { state: GameState; name: string; children: Snippet; camera?: MapCamera; reservedBottom?: number; mapStatus?: Snippet } = $props()
	let viewport = $state<HTMLDivElement>()
	let surface = $state<HTMLDivElement>()
	let tileSize = $state(48)
	let fitSize = $state(48)
	let fitting = true
	let initialized = false
	let dragging = $state(false)
	let visible = $state({ left: 0, top: 0, width: 1, height: 1 })
	let edges = $state({ left: 0, right: 0, up: 0, down: 0 })
	const minimumSize = $derived(Math.min(32, fitSize))
	const maximumSize = 112
	const padding = 16
	const directions = ['left', 'right', 'up', 'down'] as const
	const directionLabels = { left: messages.scroll_left, right: messages.scroll_right, up: messages.scroll_up, down: messages.scroll_down }
	const pointers = new Map<number, { x: number; y: number }>()
	let lastPoint = { x: 0, y: 0 }
	let originPoint = { x: 0, y: 0 }
	let pinchDistance = 0
	let pinchSize = 48
	let suppressClick = false

	function updateVisibleMapArea() {
		if (!viewport || !surface) return
		const bounds = surface.getBoundingClientRect()
		const frame = viewport.getBoundingClientRect()
		visible = {
			left: Math.max(0, (frame.left - bounds.left) / bounds.width),
			top: Math.max(0, (frame.top - bounds.top) / bounds.height),
			width: Math.min(1, viewport.clientWidth / bounds.width),
			height: Math.min(1, viewport.clientHeight / bounds.height)
		}
		edges = { left: viewport.scrollLeft, right: viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft, up: viewport.scrollTop, down: viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop }
	}

	async function setTileSize(requestedTileSize: number, anchor?: { x: number; y: number }, fitWholeMap = false) {
		if (!viewport || !surface) return
		const frame = viewport.getBoundingClientRect()
		const bounds = surface.getBoundingClientRect()
		const point = anchor ?? { x: frame.left + viewport.clientWidth / 2, y: frame.top + viewport.clientHeight / 2 }
		const column = (point.x - bounds.left) / tileSize
		const row = (point.y - bounds.top) / tileSize
		fitting = fitWholeMap
		tileSize = Math.max(minimumSize, Math.min(maximumSize, requestedTileSize))
		await tick()
		const updated = surface.getBoundingClientRect()
		viewport.scrollBy({ left: updated.left + column * tileSize - point.x, top: updated.top + row * tileSize - point.y, behavior: 'instant' })
		updateVisibleMapArea()
	}

	function updateViewportSize() {
		if (!viewport) return
		fitSize = Math.max(0.5, Math.min((viewport.clientWidth - padding * 2) / gameState.cols, (viewport.clientHeight - padding * 2) / gameState.rows, maximumSize))
		if (!initialized) {
			initialized = true
			tileSize = fitSize
		} else if (fitting) tileSize = fitSize
		void tick().then(updateVisibleMapArea)
	}

	onMount(() => {
		const observer = new ResizeObserver(updateViewportSize)
		if (viewport) observer.observe(viewport)
		updateViewportSize()
		return () => observer.disconnect()
	})

	function centerMapAt(horizontalRatio: number, verticalRatio: number) {
		if (!viewport || !surface) return
		viewport.scrollTo({ left: surface.offsetLeft + horizontalRatio * surface.offsetWidth - viewport.clientWidth / 2, top: surface.offsetTop + verticalRatio * surface.offsetHeight - viewport.clientHeight / 2, behavior: 'instant' })
	}

	function scrollTowardEdge(direction: (typeof directions)[number]) {
		if (!viewport) return
		const horizontal = direction === 'left' || direction === 'right'
		const distance = Math.max(tileSize, (horizontal ? viewport.clientWidth : viewport.clientHeight) - tileSize)
		viewport.scrollBy({ left: horizontal ? distance * (direction === 'left' ? -1 : 1) : 0, top: horizontal ? 0 : distance * (direction === 'up' ? -1 : 1), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
	}

	function startMapGesture(event: PointerEvent) {
		if (event.button !== 0) return
		if (!(event.target instanceof Element) || !event.target.closest('.board')) return
		pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
		if (pointers.size === 1) {
			originPoint = lastPoint = { x: event.clientX, y: event.clientY }
			suppressClick = false
		} else if (pointers.size === 2) {
			const [first, second] = [...pointers.values()]
			pinchDistance = Math.hypot(second.x - first.x, second.y - first.y)
			pinchSize = tileSize
			dragging = suppressClick = true
			for (const pointer of pointers.keys()) viewport?.setPointerCapture(pointer)
		}
	}

	function updateMapGesture(event: PointerEvent) {
		if (!pointers.has(event.pointerId) || !viewport) return
		const point = { x: event.clientX, y: event.clientY }
		pointers.set(event.pointerId, point)
		if (pointers.size === 2) {
			const [first, second] = [...pointers.values()]
			const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
			if (pinchDistance > 0) void setTileSize((pinchSize * Math.hypot(second.x - first.x, second.y - first.y)) / pinchDistance, center)
		} else {
			if (!dragging && Math.hypot(point.x - originPoint.x, point.y - originPoint.y) < 6) return
			dragging = suppressClick = true
			viewport.setPointerCapture(event.pointerId)
			viewport.scrollBy({ left: lastPoint.x - point.x, top: lastPoint.y - point.y, behavior: 'instant' })
		}
		lastPoint = point
		event.preventDefault()
	}

	function endMapGesture(event: PointerEvent) {
		pointers.delete(event.pointerId)
		if (viewport?.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId)
		if (pointers.size === 0) dragging = false
		else originPoint = lastPoint = [...pointers.values()][0]
	}

	function revealCell(cellIndex: number, centerOnCell = false, companionCellIndex?: number) {
		if (!viewport || !surface || dragging) return
		const target = surface.querySelector<HTMLElement>(`[data-cell="${cellIndex}"]`)
		if (!target) return
		const bounds = target.getBoundingClientRect()
		const frame = viewport.getBoundingClientRect()
		let { left, right, top, bottom } = bounds
		const companion = companionCellIndex === undefined ? null : surface.querySelector<HTMLElement>(`[data-cell="${companionCellIndex}"]`)?.getBoundingClientRect()
		if (companion && Math.max(right, companion.right) - Math.min(left, companion.left) < viewport.clientWidth - 32 && Math.max(bottom, companion.bottom) - Math.min(top, companion.top) < viewport.clientHeight - 32) {
			left = Math.min(left, companion.left)
			right = Math.max(right, companion.right)
			top = Math.min(top, companion.top)
			bottom = Math.max(bottom, companion.bottom)
		}
		viewport.scrollBy({
			left: centerOnCell ? (left + right) / 2 - frame.left - viewport.clientWidth / 2 : left < frame.left ? left - frame.left - 8 : Math.max(0, right - frame.left - viewport.clientWidth + 8),
			top: centerOnCell ? (top + bottom) / 2 - frame.top - viewport.clientHeight / 2 : top < frame.top ? top - frame.top - 8 : Math.max(0, bottom - frame.top - viewport.clientHeight + 8),
			behavior: gameState.fighting || !centerOnCell || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
		})
	}

	$effect(() => {
		camera = {
			percentage: Math.round((tileSize / 48) * 100),
			canZoomIn: tileSize < maximumSize,
			canZoomOut: tileSize > minimumSize + 0.1,
			zoomIn: () => {
				void setTileSize(tileSize * 1.25)
			},
			zoomOut: () => {
				void setTileSize(tileSize / 1.25)
			},
			fit: () => {
				void setTileSize(fitSize, undefined, true)
			}
		}
	})
	const selected = $derived(gameState.units.find((unit) => unit.id === gameState.selectedId))
	const opponentTurn = $derived(gameState.aiThinking || !!(gameState.network && gameState.network.player !== gameState.player))
	$effect(() => {
		// Selection can grow the fixed action panel after the first camera update.
		reservedBottom
		let cancelled = false
		untrack(() => {
			void tick().then(() => {
				if (cancelled || !selected || opponentTurn || !matchMedia('(max-width: 900px)').matches) return
				viewport?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' })
				revealCell(selected.cell)
			})
		})
		return () => {
			cancelled = true
		}
	})
	$effect(() => {
		const target = gameState.combatTargetIndex
		const selectedCell = selected?.cell
		const opponent = opponentTurn
		// Only follow a new action, never a manual pan, resize or zoom.
		untrack(() => {
			if (target !== null) revealCell(target, opponent, selectedCell)
			else if (selectedCell !== undefined && (opponent || surface?.contains(document.activeElement))) revealCell(selectedCell, opponent)
		})
	})
</script>

<div class="camera">
	<div class="map-toolbar">
		<div class="toolbar-details">
			{@render mapStatus?.()}
			<div class="mobile-zoom"><ZoomControls {camera} /></div>
		</div>
		<Minimap state={gameState} visibleLeft={visible.left} visibleTop={visible.top} visibleWidth={visible.width} visibleHeight={visible.height} onseek={centerMapAt} />
	</div>
	<div class="board-frame">
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (Scrollable region with keyboard zoom and pointer pan, its cells remain native buttons.) -->
		<div
			class="board-viewport"
			class:dragging
			bind:this={viewport}
			role="region"
			aria-label={name}
			tabindex="0"
			onscroll={updateVisibleMapArea}
			onpointerdown={startMapGesture}
			onpointermove={updateMapGesture}
			onpointerup={endMapGesture}
			onpointercancel={endMapGesture}
			onlostpointercapture={(event) => {
				// Touch starts with implicit capture on the cell. Transferring it to
				// the viewport releases that cell, but the drag is still in progress.
				if (event.target === viewport) endMapGesture(event)
			}}
			onclickcapture={(event) => {
				if (suppressClick && event.detail !== 0) {
					event.preventDefault()
					event.stopPropagation()
				}
			}}
			onwheel={(event) => {
				if (!(event.target instanceof Element) || !event.target.closest('.board')) return
				event.preventDefault()
				const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 200 : 1)
				void setTileSize(tileSize * Math.exp(-Math.max(-100, Math.min(100, delta)) * 0.005), { x: event.clientX, y: event.clientY })
			}}
			onkeydown={(event) => {
				if (event.key === '+' || event.key === '-' || event.key === '0') {
					event.preventDefault()
					event.stopPropagation()
					void setTileSize(event.key === '0' ? fitSize : tileSize * (event.key === '+' ? 1.25 : 0.8), undefined, event.key === '0')
				}
			}}
		>
			<div class="map-space" style:width={`${gameState.cols * tileSize + padding * 2}px`} style:height={`${gameState.rows * tileSize + padding * 2}px`}>
				<div class="map-surface" bind:this={surface} style:width={`${gameState.cols * tileSize}px`} style:height={`${gameState.rows * tileSize}px`}>{@render children()}</div>
			</div>
		</div>
		{#if !opponentTurn}
			{#each directions as direction}
				<div class="scroll-edge {direction}" style:opacity={Math.min(1, edges[direction] / 48)}>
					<button aria-label={translate(directionLabels[direction])} disabled={edges[direction] <= 1} tabindex={edges[direction] <= 1 ? -1 : 0} onclick={() => scrollTowardEdge(direction)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.camera {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 0;
		min-width: 0;
		gap: 8px;
	}
	.map-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		min-height: 0;
		flex: none;
		@media (max-width: 900px) {
			align-items: flex-end;
		}
	}
	.toolbar-details {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.mobile-zoom {
		display: none;
		@media (max-width: 900px) {
			display: block;
		}
	}

	.board-frame {
		border: 1px solid var(--color-accent);
		position: relative;
		flex: 1;
		min-height: 0;
		min-width: 0;
		background: color-mix(in srgb, var(--color-surface) 45%, var(--color-background));
	}
	.board-viewport {
		position: absolute;
		inset: 0;
		overflow: auto;
		touch-action: pan-y;
		scrollbar-width: none;
		@media (max-width: 900px) {
			scroll-margin-bottom: calc(var(--controls-height, 0px) + 8px);
		}
		&::-webkit-scrollbar {
			display: none;
		}
		&.dragging {
			cursor: grabbing;
			:global(*) {
				cursor: grabbing;
			}
		}
	}
	.map-space {
		position: relative;
		min-width: 100%;
		min-height: 100%;
		display: grid;
		place-items: center;
		padding: 16px;
	}
	.map-surface {
		touch-action: none;
		flex: none;
	}
	.scroll-edge {
		position: absolute;
		pointer-events: none;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: opacity 120ms ease;
		&.left,
		&.right {
			top: 44px;
			bottom: 44px;
			width: 44px;
		}
		&.left {
			left: 0;
		}
		&.right {
			right: 0;
		}
		&.up,
		&.down {
			left: 44px;
			right: 44px;
			height: 44px;
		}
		&.up {
			top: 0;
		}
		&.down {
			bottom: 0;
		}
		button {
			display: grid;
			place-items: center;
			pointer-events: auto;
			padding: 0;
			width: 32px;
			min-height: 48px;
			color: var(--color-accent);
			font-size: 24px;
			background: color-mix(in srgb, var(--color-surface) 87%, transparent);
			&:disabled {
				pointer-events: none;
			}
		}
		&.up button,
		&.down button {
			width: 52px;
			min-height: 32px;
			height: 32px;
		}
		svg {
			width: 20px;
			height: 20px;
			fill: none;
			stroke: currentColor;
			stroke-width: 3px;
			stroke-linecap: round;
			stroke-linejoin: round;
		}
		&.left svg {
			transform: rotate(180deg);
		}
		&.up svg {
			transform: rotate(-90deg);
		}
		&.down svg {
			transform: rotate(90deg);
		}
	}
</style>
