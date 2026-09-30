<script lang="ts">
	import { asset } from '$app/paths'
	import Unit from './Unit.svelte'
	import { unitTypes } from '$lib/game/catalog.js'
	import DamageIndicator from './DamageIndicator.svelte'
	import CellFeedback from './CellFeedback.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { buildingName, playerName, translate, terrainName, unitName } from '$lib/i18n.svelte.js'
	import type { Cell, Unit as GameUnit } from '$lib/game/types.js'

	type Props = {
		cell: Cell
		aiMode?: boolean
		unit?: GameUnit
		selected?: boolean
		showResources?: boolean
		animate?: boolean
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
	}
	let { cell, unit, aiMode = false, selected = false, showResources = false, animate = false, reachable, attackable, target = false, underFire = false, inspected = false, explosion, income, recoveredHealth = 0, captured, secured, onclick }: Props = $props()
	const classes = $derived(cell.classes.filter((className) => !className.startsWith('-capturedby') && className !== '-halfcaptured').join(' '))
	const resources = $derived(unit && showResources ? [translate(messages.attacks_remaining, { remaining: unit.attacks, total: unitTypes[unit.type].attacks }), translate(messages.movement_remaining, { remaining: unit.movement, total: unitTypes[unit.type].movement }), ...(unitTypes[unit.type].captures ? [translate(unit.capture > 0 ? messages.capture_available : messages.capture_used)] : [])].join(', ') : '')
	const label = $derived(
		translate(messages.cell_label, {
			cell: cell.index + 1,
			terrain: cell.building ? buildingName(cell.building) : terrainName(cell.terrain),
			owner: cell.owner ? `, ${playerName(cell.owner, aiMode)}` : '',
			unit: unit ? `, ${playerName(unit.player, aiMode)} ${unitName(unit.type)}, ${unit.health} ${translate(messages.stat_health).toLocaleLowerCase()}${resources ? `, ${resources}` : ''}` : ''
		})
	)
</script>

<button type="button" class="cell-container {classes}" class:-capturedby1={cell.owner === 1} class:-capturedby2={cell.owner === 2} class:-halfcaptured={cell.capturePoints < 20} class:reachable class:attackable class:inspected class:under-fire={underFire} aria-label={reachable ? `${label}, ${translate(messages.reachable_this_turn)}` : label} aria-pressed={selected || inspected} data-cell={cell.index} {onclick}>
	{#if cell.terrain === 'water' && animate}<span class="water-shimmer" aria-hidden="true" style:animation-delay={`${-(cell.index % 7) * 0.3}s`}></span>{/if}
	{#if reachable}
		<span class="movement-marker" aria-hidden="true"></span>
	{/if}
	{#if unit}
		<Unit {unit} {target} {showResources} {animate} />
	{/if}
	<DamageIndicator {unit} />
	{#if explosion}
		<img class="explosion" src={asset('/assets/gifs/explosion.gif')} alt={translate(messages.explosion)} />
	{/if}
	{#if secured}
		<CellFeedback text={translate(messages.secured)} />
	{:else if captured}
		<CellFeedback text={translate(messages.captured)} />
	{:else if income}
		<CellFeedback text="+200$" />
	{/if}
	{#if recoveredHealth > 0}
		<CellFeedback text={translate(messages.health_recovered, { health: recoveredHealth })} tone="healing" announce />
	{/if}
</button>

<style>
	.water-shimmer {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: #64d5f5;
		mask-image: var(--water-shimmer-mask);
		mask-size: 100% 100%;
		animation: water-shimmer 2s steps(1, end) infinite;
	}
	@keyframes water-shimmer {
		0%,
		100% {
			opacity: 0;
		}
		25%,
		75% {
			opacity: 0.15;
		}
		50% {
			opacity: 0.35;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.water-shimmer {
			display: none;
		}
	}
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
		z-index: 1;
		top: 50%;
		left: 50%;
		width: clamp(5px, 12%, 9px);
		aspect-ratio: 1;
		border-radius: 50%;
		transform: translate(-50%, -50%);
		background: var(--range-color);
		box-shadow: 0 0 0 1px var(--color-background);
		pointer-events: none;
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
</style>
