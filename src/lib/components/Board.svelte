<script lang="ts">
	import BattlefieldViewport from './BattlefieldViewport.svelte'
	import Cell from './Cell.svelte'
	import { pathsFrom } from '$lib/game/movement.js'
	import { selectedUnit, inspectedEnemy, attackCells, canAttack, locked } from '$lib/game/model.js'
	import type { GameController } from '$lib/game/types.js'
	import type { MapCamera } from '$lib/game/map-camera.js'
	import type { Snippet } from 'svelte'

	let { game, name, aiMode = false, camera = $bindable(), reservedBottom = 0, mapStatus }: { game: GameController; name: string; aiMode?: boolean; camera?: MapCamera; reservedBottom?: number; mapStatus?: Snippet } = $props()
	let boardElement = $state<HTMLElement>()
	let hadSelection = false
	const gameState = $derived(game.state)
	const selected = $derived(selectedUnit(gameState))
	const inspected = $derived(inspectedEnemy(gameState))
	const rangeUnit = $derived(inspected ?? selected)
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
	const movementRange = $derived(new Set(selected && !inspected && !opponentTurn && !locked(gameState) && selected.movement > 0 ? [...pathsFrom(gameState, selected, selected.movement).keys()].filter((index) => index !== selected.cell) : []))

	$effect(() => {
		const index = selected?.cell
		if (!opponentTurn && boardElement?.contains(document.activeElement)) {
			if (index !== undefined) {
				const cell = boardElement.querySelector<HTMLElement>('[data-cell="' + index + '"]')
				cell?.focus({ preventScroll: true })
			} else if (hadSelection) boardElement.focus({ preventScroll: true })
		}
		hadSelection = index !== undefined
	})
</script>

<div class="board-layout" class:range-red={rangeUnit?.player === 2}>
	<BattlefieldViewport state={gameState} {name} bind:camera {reservedBottom} {mapStatus}>
		<div bind:this={boardElement} class="board" tabindex="-1" role="group" aria-label={name} style:--cols={gameState.cols} style:--rows={gameState.rows}>
			{#each gameState.cells as cell (cell.index)}
				{@const unit = units.get(cell.index)}
				<Cell
					{cell}
					{unit}
					{aiMode}
					selected={!!unit && selected?.id === unit.id}
					inspected={!!unit && inspected?.id === unit.id}
					reachable={movementRange.has(cell.index)}
					attackable={attackRange.has(cell.index)}
					underFire={gameState.combatTargetIndex === cell.index}
					target={gameState.fighting ? gameState.combatTargetIndex === cell.index : !inspected && (selected?.attacks ?? 0) > 0 && canAttack(gameState, selected, unit)}
					explosion={gameState.explosion === cell.index}
					income={gameState.incomeCells.includes(cell.index)}
					recoveredHealth={gameState.healedCells[cell.index]}
					captured={gameState.capturedCells.includes(cell.index)}
					secured={gameState.securedCells.includes(cell.index)}
					onclick={() => {
						gameState.previewIndex = cell.index
						game.clickCell(cell.index)
					}}
				/>
			{/each}
			{#if rangeOutline}
				<svg class="range-outline" aria-hidden="true" viewBox={`0 0 ${gameState.cols} ${gameState.rows}`} preserveAspectRatio="none"><path d={rangeOutline} /></svg>
			{/if}
		</div>
	</BattlefieldViewport>
</div>

<style>
	.board-layout {
		--range-color: #8dcbff;
		--range-fill: #174a70;
		display: flex;
		flex: 1;
		min-width: 0;
		min-height: 0;
		&.range-red {
			--range-color: #ffb3b1;
			--range-fill: #792d3a;
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
		width: 100%;
		height: 100%;
		box-shadow: 0 12px 40px #0007;

		&:focus {
			outline: none;
		}
	}
</style>
