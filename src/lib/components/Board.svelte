<script lang="ts">
	import Cell from './Cell.svelte'
	import { selectedUnit, reachableCells, attackCells, canAttack } from '$lib/game/model.js'
	import type { GameController } from '$lib/game/types.js'

	let { game, name }: { game: GameController; name: string } = $props()
	let boardElement = $state<HTMLElement>()
	let hadSelection = false
	const gameState = $derived(game.state)
	const selected = $derived(selectedUnit(gameState))
	const reachable = $derived(reachableCells(gameState))
	const attackRange = $derived(attackCells(gameState))
	const units = $derived(new Map(gameState.units.map((unit) => [unit.cell, unit])))

	$effect(() => {
		const index = selected?.cell
		if (boardElement?.contains(document.activeElement)) {
			if (index !== undefined) boardElement.querySelector<HTMLElement>('[data-cell="' + index + '"]')?.focus({ preventScroll: true })
			else if (hadSelection) boardElement.focus({ preventScroll: true })
		}
		hadSelection = index !== undefined
	})
</script>

<div bind:this={boardElement} class="board" tabindex="-1" role="group" aria-label={name} style:--cols={gameState.cols} style:--rows={gameState.rows}>
	{#each gameState.cells as cell (cell.index)}
		{@const unit = units.get(cell.index)}
		<Cell {cell} {unit} selected={!!unit && selected?.id === unit.id} reachable={reachable.includes(cell.index)} attackable={attackRange.includes(cell.index)} target={(selected?.attacks ?? 0) > 0 && canAttack(gameState, selected, unit)} explosion={gameState.explosion === cell.index} income={gameState.incomeCells.includes(cell.index)} captured={gameState.capturedCells.includes(cell.index)} secured={gameState.securedCells.includes(cell.index)} onclick={() => game.clickCell(cell.index)} onpreview={() => (gameState.hoveredIndex = cell.index)} />
	{/each}
</div>

<style>
	.board {
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		width: min(100%, calc((100svh - 240px) * var(--cols) / var(--rows)));
		min-width: 240px;
		margin: 0 auto;
		box-shadow: 0 12px 40px #0007;

		&:focus {
			outline: none;
		}

		@media (max-width: 700px) {
			width: 100%;
		}
	}
</style>
