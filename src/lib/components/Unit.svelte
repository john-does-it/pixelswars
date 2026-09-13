<script lang="ts">
	import { asset } from '$app/paths'
	import { unitTypes } from '$lib/game/catalog.js'
	import { damageStage, unitSprite } from '$lib/game/unit-sprites.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { Unit as GameUnit } from '$lib/game/types.js'

	let { unit, selected = false, target = false }: { unit: GameUnit; selected?: boolean; target?: boolean } = $props()
	const unitDefinition = $derived(unitTypes[unit.type])
</script>

<span class="unit-container -{unit.type} {unit.player === 1 ? '-one' : '-two'}" class:-selected={selected} class:-inrange={target} data-unit={unit.id} data-health={unit.health} data-damage={damageStage(unit)} style:background-image={`url('${asset(unitSprite(unit))}')`}>
	<img class="health" src={asset('/assets/icons/icon-health.png')} alt="" style:animation-duration="{Math.max(0.2, (unit.health / unitDefinition.maxHealth) * 2)}s" />
	<span class="statuses">
		{#if unit.attacks === 0}
			<img src={asset('/assets/icons/icon-attack-capacity.png')} alt={translate(messages.no_attacks_left)} />
		{/if}
		{#if unit.movement === 0}
			<img src={asset('/assets/icons/icon-movement.png')} alt={translate(messages.no_movement_left)} />
		{/if}
		{#if unitDefinition.captures && unit.capture === 0}
			<img src={asset('/assets/icons/icon-capture-capacity.png')} alt={translate(messages.capture_used)} />
		{/if}
	</span>
	{#if target}
		<img class="crosshair" src={asset('/assets/icons/icon-crosshair.png')} alt={translate(messages.attack_target)} />
	{/if}
</span>

<style>
	.unit-container {
		position: absolute;
		inset: 0;
		display: block;
		background-size: 90%;
		background-position: center;
		background-repeat: no-repeat;
		pointer-events: none;
	}

	.-selected {
		outline: 3px solid #ffe985;
		outline-offset: -3px;
	}

	.health {
		position: absolute;
		width: 23%;
		height: 23%;
		left: 3%;
		top: 3%;
		animation: pulse 2s infinite;
	}

	.statuses {
		position: absolute;
		bottom: 2px;
		left: 2px;
		display: flex;
		width: 66%;

		img {
			width: 34%;
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
