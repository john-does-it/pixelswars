<script lang="ts">
	import { asset } from '$lib/game/asset-path'
	import Unit from './Unit.svelte'
	import { buildingIncome, unitTypes } from '$lib/game/catalog.js'
	import DamageIndicator from './DamageIndicator.svelte'
	import CellFeedback from './CellFeedback.svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { buildingName, matchPlayerName, translate, terrainName, unitName } from '$lib/i18n.svelte.js'
	import type { Cell, Unit as GameUnit } from '$lib/game/types.js'

	type Props = {
		tutorialTarget?: boolean
		guidedBlocked?: boolean
		networkPlayer?: 1 | 2
		cell: Cell
		aiMode?: boolean
		unit?: GameUnit
		hideUnit?: boolean
		selected?: boolean
		showResources?: boolean
		animate?: boolean
		buildingLights?: boolean
		boardingTarget?: boolean
		deploymentTarget?: boolean
		reachable: boolean
		enemyReachable?: boolean
		attackable: boolean
		target?: boolean
		underFire?: boolean
		inspected?: boolean
		income: boolean
		recoveredHealth?: number
		captured: boolean
		secured: boolean
		onclick: () => void
		onpreview?: () => void
	}
	let { networkPlayer, guidedBlocked = false, tutorialTarget = false, cell, unit, hideUnit = false, aiMode = false, selected = false, showResources = false, animate = false, buildingLights = true, boardingTarget = false, deploymentTarget = false, reachable, enemyReachable = false, attackable, target = false, underFire = false, inspected = false, income, recoveredHealth = 0, captured, secured, onclick, onpreview }: Props = $props()
	const classes = $derived(cell.classes.filter((className) => !className.startsWith('-capturedby') && className !== '-halfcaptured').join(' '))
	const buildingLightSprite = $derived(cell.building === 'big-city' ? `/assets/cells/buildings/cell-big-city-on-grass-light-on${cell.capturePoints < 20 ? '-half-captured' : cell.owner ? '-captured' : ''}${cell.owner ? `-by-${cell.owner}` : ''}@2x.png` : `/assets/cells/building-lights/${cell.building === 'naval-base' ? 'naval-base-0' : `${cell.building}-${cell.owner || 0}${cell.capturePoints < 20 ? '-partial' : ''}`}.svg`)
	const resources = $derived(unit ? [...(unitTypes[unit.type].attacks > 0 ? [translate(messages.attacks_remaining, { remaining: unit.attacks, total: unitTypes[unit.type].attacks })] : []), ...(showResources ? [translate(messages.movement_remaining, { remaining: unit.movement, total: unitTypes[unit.type].movement }), ...(unitTypes[unit.type].captures ? [translate(unit.capture > 0 ? messages.capture_available : messages.capture_used)] : [])] : [])].join(', ') : '')
	const label = $derived(
		translate(messages.cell_label, {
			cell: cell.index + 1,
			terrain: cell.building ? buildingName(cell.building) : terrainName(cell.terrain),
			owner: cell.owner ? `, ${matchPlayerName(cell.owner, aiMode, networkPlayer)}` : '',
			unit: unit ? `, ${matchPlayerName(unit.player, aiMode, networkPlayer)} ${unitName(unit.type)}, ${unit.health} ${translate(messages.stat_health).toLocaleLowerCase()}${resources ? `, ${resources}` : ''}` : ''
		})
	)
</script>

<button
	type="button"
	class="cell-container pixel-corners {classes}"
	class:-capturedby1={cell.owner === 1}
	class:-capturedby2={cell.owner === 2}
	class:-halfcaptured={cell.capturePoints < 20}
	class:boarding-target={boardingTarget}
	class:deployment-target={deploymentTarget}
	class:reachable
	class:attackable
	class:inspected
	class:under-fire={underFire}
	style:--pixel-corner-color={(selected || inspected || tutorialTarget) && unit ? (unit.player === 1 ? '#8dcbff' : '#ffb3b1') : tutorialTarget ? '#8dcbff' : undefined}
	aria-label={boardingTarget ? `${label}, ${translate(messages.transport_load)}` : deploymentTarget ? `${label}, ${translate(messages.transport_deploy)}` : reachable ? `${label}, ${translate(enemyReachable ? messages.enemy_reachable : messages.reachable_this_turn)}` : label}
	aria-pressed={selected || inspected}
	aria-disabled={guidedBlocked || undefined}
	data-cell={cell.index}
	aria-describedby={tutorialTarget ? 'tutorial-instruction' : undefined}
	{onclick}
	onfocus={onpreview}
	onpointermove={(event) => {
		// Modal/camera changes can trigger pointerenter beneath a stationary cursor.
		// Only actual pointer movement should replace the keyboard preview.
		if (event.pointerType !== 'touch' && event.buttons === 0) onpreview?.()
	}}
>
	{#if tutorialTarget}<span class="tutorial-target" class:shimmer={animate} aria-hidden="true"></span>{/if}
	{#if cell.terrain === 'water' && animate && !cell.classes.includes('-under-bridge')}<span class="water-shimmer" aria-hidden="true" style:animation-delay={`${-(cell.index % 7) * 0.3}s`}></span>{/if}
	{#if cell.building && animate && buildingLights}
		<span
			class="building-lights"
			aria-hidden="true"
			style:background-image={`url('${asset(buildingLightSprite)}')`}
			onanimationstart={(event) => {
				// Share the document timeline, including after actions or settings remount lights.
				for (const animation of event.currentTarget.getAnimations()) animation.startTime = 0
			}}
		></span>
	{/if}
	{#if reachable || deploymentTarget}
		<span class="movement-marker" aria-hidden="true"></span>
	{/if}
	{#if unit && !hideUnit}
		<Unit {unit} {target} {showResources} {animate} />
	{/if}
	{#if boardingTarget}
		<span class="transport-marker" aria-hidden="true">
			<img class="boarding-symbol" src={asset('/assets/icons/plus-zoom.svg')} alt="" />
		</span>
	{/if}
	<DamageIndicator {unit} />
	{#if secured}
		<CellFeedback text={translate(messages.secured)} />
	{:else if captured}
		<CellFeedback text={translate(messages.captured)} />
	{:else if income}
		<CellFeedback text={`+${buildingIncome(cell.building)}$`} />
	{/if}
	{#if recoveredHealth > 0}
		<CellFeedback text={translate(messages.health_recovered, { health: recoveredHealth })} tone="healing" announce />
	{/if}
</button>

<style>
	.tutorial-target {
		position: absolute;
		inset: var(--pixel-corner-inset, 0);
		background: var(--pixel-corner-frame);
		z-index: 9;
		pointer-events: none;
	}
	.tutorial-target.shimmer {
		animation: tutorial-shimmer 1.4s ease-in-out infinite;
	}
	@keyframes tutorial-shimmer {
		0%,
		100% {
			filter: brightness(0.8);
		}
		50% {
			filter: brightness(1.5);
		}
	}
	.transport-marker {
		position: absolute;
		inset: 0;
		z-index: 4;
		display: grid;
		container-type: inline-size;
		place-items: start end;
		pointer-events: none;
	}
	.boarding-symbol {
		margin: 3%;
		width: min(22px, 30cqi);
		height: auto;
		image-rendering: pixelated;
	}
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
		.tutorial-target.shimmer {
			animation: none;
		}
		.water-shimmer,
		.building-lights {
			display: none;
		}
	}
	.building-lights {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background-size: 100% 100%;
		image-rendering: pixelated;
		animation: building-lights 8s steps(1, end) infinite;
	}
	@keyframes building-lights {
		0%,
		100% {
			opacity: 0;
		}
		55% {
			opacity: 1;
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
	}

	.movement-marker {
		position: absolute;
		z-index: 1;
		top: 50%;
		left: 50%;
		width: clamp(5px, 12%, 9px);
		aspect-ratio: 1;
		box-sizing: content-box;
		border: 3px solid #3f2631;
		transform: translate(-50%, -50%);
		background: var(--movement-marker-color);
		pointer-events: none;
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
