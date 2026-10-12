<script lang="ts">
	import { asset } from '$lib/game/asset-path'
	import { preferences } from '$lib/preferences.svelte.js'
	import { unitTypes } from '$lib/game/catalog.js'
	import { damageStage, unitSprite } from '$lib/game/unit-sprites.js'
	import { aircraftIdleTiming, infantryIdleWait } from '$lib/game/idle-animation.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { Unit as GameUnit } from '$lib/game/types.js'

	let { unit, target = false, showResources = false, animate = false }: { unit: GameUnit; target?: boolean; showResources?: boolean; animate?: boolean } = $props()
	const unitDefinition = $derived(unitTypes[unit.type])
	const airborne = $derived(unitDefinition.domain === 'air')
	const infantry = $derived(unit.type.startsWith('infantry'))
	const idleTiming = $derived(aircraftIdleTiming(unit.id))
	let lookWait = $state(12000)
	let alternateLook = $state(false)
	$effect(() => {
		if (animate && infantry) lookWait = infantryIdleWait()
	})
	function scheduleNextLook() {
		if (!animate || !infantry) return
		lookWait = infantryIdleWait()
		alternateLook = !alternateLook
	}
	const fuelLevel = $derived(Math.ceil(4 * Math.max(0, Math.min(1, unit.movement / unitDefinition.movement))))

	function synchronizeStatus(event: AnimationEvent & { currentTarget: HTMLElement }) {
		// All spent resources share a phase, including after moving a unit.
		for (const animation of event.currentTarget.getAnimations()) animation.startTime = 0
	}
</script>

<span class="unit-container -{unit.type} {unit.player === 1 ? '-one' : '-two'}" class:carries-units={!!unitDefinition.capacity} class:-inrange={target} data-unit={unit.id} data-health={unit.health} data-damage={damageStage(unit)}>
	<span
		class="unit-sprite"
		class:idle={animate && (airborne || infantry)}
		class:airborne
		class:alternate-look={alternateLook}
		aria-hidden="true"
		style:scale={preferences.unitFacing && unit.facing === 'left' ? '-1.25 1.25' : '1.25 1.25'}
		style:background-image={`url('${asset(unitSprite(unit))}')`}
		style:--idle-duration={`${idleTiming.duration}ms`}
		style:--idle-delay={`${idleTiming.delay}ms`}
		style:--look-wait={`${lookWait}ms`}
		onanimationstart={(event) => {
			if (airborne) synchronizeStatus(event)
		}}
		onanimationend={scheduleNextLook}
	></span>
	<span class="health" style:animation-duration="{Math.max(0.2, (unit.health / unitDefinition.maxHealth) * 2)}s"><img src={asset('/assets/icons/icon-health.png')} alt="" /></span>
	{#if showResources}
		{#if unitDefinition.attacks > 0}<span class="ammo" aria-hidden="true" data-remaining={unit.attacks}>
				{#each Array(unitDefinition.attacks) as _, index}
					<span class="ammo-round"><img class:spent={index < unitDefinition.attacks - unit.attacks} src={asset('/assets/icons/icon-attack-capacity.png')} alt="" /></span>
				{/each}
			</span>{/if}
		{#if unitDefinition.capacity}<span class="cargo-count"><img src={asset(`/assets/icons/cargo-count-${unit.cargo?.length ?? 0}.png`)} alt={translate(messages.transport_cargo, { count: unit.cargo?.length ?? 0, capacity: unitDefinition.capacity })} /></span>{/if}
		<span class="fuel" class:spent={unit.movement === 0} data-level={fuelLevel} data-remaining={unit.movement} style:--empty-fuel={`${88 - fuelLevel * 19}%`} aria-hidden="true">
			<img class="fuel-empty" src={asset('/assets/icons/icon-movement.png')} alt="" />
			<img class="fuel-fill" src={asset('/assets/icons/icon-movement.png')} alt="" />
		</span>
		{#if unitDefinition.captures}
			<span class="capture" class:spent={unit.capture === 0} aria-hidden="true"><img src={asset('/assets/icons/icon-capture-capacity.png')} alt="" /></span>
		{/if}
	{/if}
	{#if target}
		<img class="crosshair" src={asset('/assets/icons/icon-crosshair.png')} alt={translate(messages.attack_target)} />
	{/if}
</span>

<style>
	.cargo-count {
		bottom: var(--indicator-inset);
		right: var(--indicator-inset);
		aspect-ratio: 8 / 9;
		--icon-left: -100%;
		--icon-top: calc(-7 / 9 * 100%);
		--icon-width: 200%;
	}
	.carries-units .fuel {
		left: var(--indicator-inset);
		right: auto;
	}
	.unit-container {
		--indicator-size: 30%;
		--indicator-inset: 2%;
		position: absolute;
		z-index: 1;
		inset: 0;
		display: block;
		pointer-events: none;
	}
	.unit-sprite {
		position: absolute;
		inset: 0;
		background-size: 90%;
		background-position: center;
		background-repeat: no-repeat;
		transform-origin: center;
	}
	.unit-sprite.idle {
		animation: idle-look 2s steps(1, end) var(--look-wait);
	}
	.unit-sprite.idle.alternate-look {
		animation-name: idle-look-again;
	}
	.unit-sprite.idle.airborne {
		animation: idle-hover var(--idle-duration) steps(1, end) var(--idle-delay) infinite;
	}
	@keyframes idle-look {
		0%,
		99% {
			transform: scaleX(-1);
		}
		100% {
			transform: scaleX(1);
		}
	}
	@keyframes idle-look-again {
		0%,
		99% {
			transform: scaleX(-1);
		}
		100% {
			transform: scaleX(1);
		}
	}
	@keyframes idle-hover {
		0%,
		24%,
		76%,
		100% {
			transform: translateY(0);
		}
		25%,
		75% {
			transform: translateY(-3%);
		}
	}

	.health {
		aspect-ratio: 24 / 20;
		left: var(--indicator-inset);
		top: var(--indicator-inset);
		--icon-left: calc(-3 / 24 * 100%);
		--icon-top: -25%;
		--icon-width: 125%;
		animation: pulse 2s infinite;
	}
	/* Size the visible pixels consistently, without each sprite's transparent padding. */
	.health,
	.fuel,
	.capture,
	.cargo-count {
		position: absolute;
		width: var(--indicator-size);
		overflow: hidden;
		img {
			position: absolute;
			left: var(--icon-left);
			top: var(--icon-top);
			width: var(--icon-width);
			max-width: none;
			display: block;
			image-rendering: pixelated;
		}
	}

	.ammo {
		position: absolute;
		bottom: var(--indicator-inset);
		left: var(--indicator-inset);
		/* Two stacked rounds should occupy roughly the height of one status icon. */
		width: calc(var(--indicator-size) * 0.6);
		display: flex;
		flex-direction: column;
		.ammo-round {
			position: relative;
			aspect-ratio: 17 / 13;
			overflow: hidden;
		}
		img {
			/* Crop the transparent padding so the visible bullets touch. */
			position: absolute;
			left: calc(-4 / 17 * 100%);
			top: calc(-6 / 13 * 100%);
			display: block;
			width: calc(25 / 17 * 100%);
			max-width: none;
			image-rendering: pixelated;
		}
	}

	.fuel {
		bottom: var(--indicator-inset);
		right: var(--indicator-inset);
		aspect-ratio: 18 / 19;
		--icon-left: calc(-3 / 18 * 100%);
		--icon-top: calc(-3 / 19 * 100%);
		--icon-width: calc(25 / 18 * 100%);
		.fuel-empty {
			filter: grayscale(1) brightness(0.65);
		}
		.fuel-fill {
			/* Ignore the sprite's transparent padding when masking the fuel level. */
			clip-path: inset(var(--empty-fuel) 0 0);
		}
	}

	.capture {
		top: var(--indicator-inset);
		right: var(--indicator-inset);
		aspect-ratio: 13 / 15;
		--icon-left: calc(-6 / 13 * 100%);
		--icon-top: calc(-5 / 15 * 100%);
		--icon-width: calc(25 / 13 * 100%);
	}

	.spent {
		opacity: 0.5;
	}

	@media (prefers-reduced-motion: reduce) {
		.unit-sprite.idle,
		.unit-sprite.idle.alternate-look,
		.unit-sprite.idle.airborne {
			animation: none;
		}
	}

	.crosshair {
		position: absolute;
		width: 50%;
		top: 25%;
		left: 25%;
	}

	@keyframes pulse {
		50% {
			transform: scale(0.7);
		}
	}
</style>
