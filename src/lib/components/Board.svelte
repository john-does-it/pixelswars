<script>
	import Cell from './Cell.svelte'
	import { selectedUnit, reachableCells, attackCells, canAttack } from '$lib/game/model.js'

	let { game, name } = $props()
	const state = $derived(game.state)
	const selected = $derived(selectedUnit(state))
	const reachable = $derived(reachableCells(state))
	const attackRange = $derived(attackCells(state))
	const units = $derived(new Map(state.units.map((unit) => [unit.cell, unit])))
</script>

<div class="board" role="group" aria-label={name} style:--cols={state.cols} style:--rows={state.rows}>
	{#each state.cells as cell (cell.index)}
		{@const unit = units.get(cell.index)}
		<Cell {cell} {unit} selected={unit && selected?.id === unit.id} reachable={reachable.includes(cell.index)} attackable={attackRange.includes(cell.index)} target={selected?.attacks > 0 && canAttack(state, selected, unit)} explosion={state.explosion === cell.index} income={state.incomeCells.includes(cell.index)} captured={state.capturedCells.includes(cell.index)} onclick={() => game.clickCell(cell.index)} onpreview={() => (state.hoveredIndex = cell.index)} />
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

		@media (max-width: 700px) {
			width: 100%;
		}
	}
</style>
