<script>
	import { base } from '$app/paths'
	import Unit from './Unit.svelte'

	let { cell, unit, selected, reachable, attackable, target, explosion, income, captured, onclick, onpreview } = $props()
	const classes = $derived(cell.classes.filter((c) => !c.startsWith('-capturedby') && c !== '-halfcaptured').join(' '))
	const label = $derived(`Cell ${cell.index + 1}: ${cell.building || cell.name}${cell.owner ? ', player ' + cell.owner : ''}${unit ? ', player ' + unit.player + ' ' + unit.type + ', ' + unit.health + ' health' : ''}`)

	function previewOnHover() {
		if (matchMedia('(hover: hover)').matches) onpreview()
	}
</script>

<button type="button" class="cell-container {classes}" class:-capturedby1={cell.owner === 1} class:-capturedby2={cell.owner === 2} class:-halfcaptured={cell.capturePoints < 20} class:reachable class:attackable aria-label={label} aria-pressed={!!selected} data-cell={cell.index} {onclick} onpointerenter={previewOnHover} onfocus={onpreview}>
	{#if unit}
		<Unit {unit} {selected} {target} />
	{/if}
	{#if explosion}
		<img class="explosion" src="{base}/assets/gifs/explosion.gif" alt="Explosion" />
	{/if}
	{#if captured}
		<span class="income">Captured!</span>
	{:else if income}
		<span class="income">+200$</span>
	{/if}
</button>

<style>
	button {
		position: relative;
		display: block;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: 0;
		border-radius: 0;
		background-size: cover;
		cursor: pointer;
		image-rendering: pixelated;

		&::before {
			content: '';
			position: absolute;
			inset: 0;
			pointer-events: none;
		}

		&:focus-visible {
			z-index: 2;
			outline: 3px solid white;
			outline-offset: -3px;
		}
	}

	.attackable::before {
		background: #15151540;
	}

	.reachable::before {
		background: #008dff66;
		box-shadow: inset 0 0 0 1px #8ad4ff;
	}

	.explosion {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 3;
	}

	.income {
		position: absolute;
		z-index: 3;
		left: 0;
		right: 0;
		top: 0;
		color: white;
		text-shadow: 1px 1px black;
		pointer-events: none;
		animation: income 4s forwards;
	}

	@keyframes income {
		to {
			transform: translateY(-30px);
			opacity: 0;
		}
	}
</style>
