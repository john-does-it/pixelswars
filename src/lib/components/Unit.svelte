<script>
	import { base } from '$app/paths'
	import { unitTypes } from '$lib/game/catalog.js'
	import { damageStage, unitSprite } from '$lib/game/unit-sprites.js'

	let { unit, selected = false, target = false } = $props()
	const type = $derived(unitTypes[unit.type])
</script>

<span class="unit-container -{unit.type} {unit.player === 1 ? '-one' : '-two'}" class:-selected={selected} class:-inrange={target} data-unit={unit.id} data-health={unit.health} data-damage={damageStage(unit)} style:background-image="url('{base}{unitSprite(unit)}')">
	<img class="health" src="{base}/assets/icons/icon-health.png" alt="" style:animation-duration="{Math.max(0.2, (unit.health / type.maxHealth) * 2)}s" />
	<span class="health-value">{unit.health}</span>
	<span class="statuses">
		{#if unit.attacks === 0}
			<img src="{base}/assets/icons/icon-attack-capacity.png" alt="No attacks left" />
		{/if}
		{#if unit.movement === 0}
			<img src="{base}/assets/icons/icon-movement.png" alt="No movement left" />
		{/if}
		{#if type.captures && unit.capture === 0}
			<img src="{base}/assets/icons/icon-capture-capacity.png" alt="Capture used" />
		{/if}
	</span>
	{#if target}
		<img class="crosshair" src="{base}/assets/icons/icon-crosshair.png" alt="Attack target" />
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
		width: 20%;
		height: 20%;
		left: 3%;
		top: 3%;
		animation: pulse 2s infinite;
	}

	.health-value {
		position: absolute;
		bottom: 1px;
		right: 2px;
		font: bold clamp(8px, 1vw, 12px) monospace;
		color: white;
		text-shadow:
			1px 1px 2px black,
			-1px -1px 2px black;
	}

	.statuses {
		position: absolute;
		bottom: 2px;
		left: 2px;
		display: flex;
		width: 60%;

		img {
			width: 30%;
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
