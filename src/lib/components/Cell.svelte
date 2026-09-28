<script lang="ts">
	import { asset } from '$app/paths'
	import Unit from './Unit.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { buildingName, playerName, translate, terrainName, unitName } from '$lib/i18n.svelte.js'
	import type { Cell, Unit as GameUnit } from '$lib/game/types.js'

	type Props = {
		cell: Cell
		aiMode?: boolean
		unit?: GameUnit
		selected?: boolean
		reachable: boolean
		attackable: boolean
		target?: boolean
		underFire?: boolean
		inspected?: boolean
		explosion: boolean
		income: boolean
		recoveredHealth?: number
		captured: boolean
		secured: boolean
		onclick: () => void
		onpreview: () => void
	}
	let { cell, unit, aiMode = false, selected = false, reachable, attackable, target = false, underFire = false, inspected = false, explosion, income, recoveredHealth = 0, captured, secured, onclick, onpreview }: Props = $props()
	const classes = $derived(cell.classes.filter((className) => !className.startsWith('-capturedby') && className !== '-halfcaptured').join(' '))
	const label = $derived(
		translate(messages.cell_label, {
			cell: cell.index + 1,
			terrain: cell.building ? buildingName(cell.building) : terrainName(cell.terrain),
			owner: cell.owner ? `, ${playerName(cell.owner, aiMode)}` : '',
			unit: unit ? `, ${playerName(unit.player, aiMode)} ${unitName(unit.type)}, ${unit.health} ${translate(messages.stat_health).toLocaleLowerCase()}` : ''
		})
	)

	function previewOnHover() {
		if (matchMedia('(hover: hover)').matches) onpreview()
	}
</script>

<button type="button" class="cell-container {classes}" class:-capturedby1={cell.owner === 1} class:-capturedby2={cell.owner === 2} class:-halfcaptured={cell.capturePoints < 20} class:reachable class:attackable class:inspected class:under-fire={underFire} aria-label={reachable ? `${label}, ${translate(messages.move)}` : label} aria-pressed={selected || inspected} data-cell={cell.index} {onclick} onpointerenter={previewOnHover} onfocus={onpreview}>
	{#if reachable}
		<span class="movement-marker" aria-hidden="true"></span>
	{/if}
	{#if unit}
		<Unit {unit} {target} />
	{/if}
	{#if explosion}
		<img class="explosion" src={asset('/assets/gifs/explosion.gif')} alt={translate(messages.explosion)} />
	{/if}
	{#if secured}
		<span class="income">{translate(messages.secured)}</span>
	{:else if captured}
		<span class="income">{translate(messages.captured)}</span>
	{:else if income}
		<span class="income">+200$</span>
	{/if}
	{#if recoveredHealth > 0}
		<span class="income healing" role="status">{translate(messages.health_recovered, { health: recoveredHealth })}</span>
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
		background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--range-fill) 40%, transparent) 0 6px, color-mix(in srgb, var(--range-fill) 13%, transparent) 6px 12px);
	}

	.movement-marker {
		position: absolute;
		top: 50%;
		left: 50%;
		width: clamp(10px, 20%, 18px);
		aspect-ratio: 1;
		transform: translate(-50%, -50%) rotate(45deg);
		border: 2px solid var(--range-color);
		background: var(--color-surface);
		box-shadow: 0 0 0 1px var(--color-background);
		pointer-events: none;

		&::after {
			content: '';
			position: absolute;
			inset: 30%;
			background: #ffffff;
		}
	}

	.explosion {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 3;
	}

	.under-fire::after {
		content: '';
		position: absolute;
		inset: 2px;
		border: 3px solid #ffdf78;
		box-shadow:
			0 0 0 2px #521c24,
			inset 0 0 0 2px #521c24;
		z-index: 3;
		pointer-events: none;
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

	.healing {
		color: #b7f59b;
		white-space: nowrap;
		font-size: clamp(10px, 1.2vw, 14px);
	}
</style>
