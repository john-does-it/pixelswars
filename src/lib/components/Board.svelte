<script>
	import Cell from './Cell.svelte'
	import { selectedUnit, reachableCells, attackCells, canAttack } from '$lib/game/model.js'

	let { game, name } = $props()
	let boardElement = $state(null)
	let hadSelection = false
	const state = $derived(game.state)
	const selected = $derived(selectedUnit(state))
	const reachable = $derived(reachableCells(state))
	const attackRange = $derived(attackCells(state))
	const units = $derived(new Map(state.units.map((unit) => [unit.cell, unit])))

	$effect(() => {
		const index = selected?.cell
		if (boardElement?.contains(document.activeElement)) {
			if (index !== undefined) boardElement.querySelector('[data-cell="' + index + '"]').focus({ preventScroll: true })
			else if (hadSelection) boardElement.focus({ preventScroll: true })
		}
		hadSelection = index !== undefined
	})
</script>

<div bind:this={boardElement} class="board" tabindex="-1" role="group" aria-label={name} style:--cols={state.cols} style:--rows={state.rows}>
	{#each state.cells as cell (cell.index)}
		{@const unit = units.get(cell.index)}
		<Cell {cell} {unit} selected={unit && selected?.id === unit.id} reachable={reachable.includes(cell.index)} attackable={attackRange.includes(cell.index)} target={selected?.attacks > 0 && canAttack(state, selected, unit)} explosion={state.explosion === cell.index} income={state.incomeCells.includes(cell.index)} captured={state.capturedCells.includes(cell.index)} secured={state.securedCells.includes(cell.index)} onclick={() => game.clickCell(cell.index)} onpreview={() => (state.hoveredIndex = cell.index)} />
	{/each}
</div>

<style>
	.board {
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		width: min(100%, calc((100svh - 240px) * var(--cols) / var(--rows)));
		min-width: 240px;
		margin: auto;
		box-shadow: 0 12px 40px #0007;

		&:focus {
			outline: none;
		}

		@media (max-width: 700px) {
			width: 100%;
		}
	}
</style>
