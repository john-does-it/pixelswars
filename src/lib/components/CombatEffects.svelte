<script lang="ts">
	import { asset } from '$app/paths'
	import { preferences } from '$lib/preferences.svelte.js'
	import { unitTypes } from '$lib/game/catalog.js'
	import muzzlePositions from '$lib/game/combat-effects.json'
	import type { GameState } from '$lib/game/types.js'

	let { state: gameState }: { state: GameState } = $props()
	const source = $derived(gameState.units.find((unit) => unit.cell === gameState.combatSourceIndex))
	const target = $derived(gameState.combatTargetIndex)
	const position = $derived(source ? muzzlePositions[source.type as keyof typeof muzzlePositions] : undefined)
	const infantry = $derived(source?.type.startsWith('infantry'))
	const burst = $derived(source && ['infantry', 'jeep', 'helicopter'].includes(source.type))
	// Artillery's impact sound plays at the end of its existing combat delay.
	const impactDelay = $derived(source && unitTypes[source.type].impactSound ? Math.max(0, unitTypes[source.type].delay - 280) : burst ? 240 : 120)
	let targetWasInfantry = false
	let smallExplosion = $state(false)
	$effect(() => {
		const victim = gameState.units.find((unit) => unit.cell === target)
		if (victim) targetWasInfantry = victim.type.startsWith('infantry')
		if (gameState.explosion !== null) smallExplosion = targetWasInfantry
	})
</script>

{#snippet sprite(name: string, x: number, y: number, scale: number, duration: number, delay = 0)}
	<span class="effect-sprite {name}" style:left={`${x * 100}%`} style:top={`${y * 100}%`} style:width={`${scale * 100}%`} style:height={`${scale * 100}%`} style:--duration={`${duration}ms`} style:--delay={`${delay}ms`}>
		<img src={asset(`/assets/effects/${name}.png`)} alt="" />
	</span>
{/snippet}

<div class="combat-effects" aria-hidden="true" style:--effect-width={`${100 / gameState.cols}%`} style:--effect-height={`${100 / gameState.rows}%`}>
	{#if gameState.fighting && source && position && target !== null && gameState.explosion === null}
		{#key `${source.id}:${target}`}
			<div class="effect-cell firing" style:scale={preferences.unitFacing && source.facing === 'left' ? '-1 1' : '1 1'} style:left={`${((source.cell % gameState.cols) * 100) / gameState.cols}%`} style:top={`${(Math.floor(source.cell / gameState.cols) * 100) / gameState.rows}%`}>
				<!-- Unit sprites occupy the central 90% of the game cell. -->
				{@render sprite('muzzle', 0.5 + (position[0] - 0.5) * 0.9, 0.5 + (position[1] - 1) * 0.9, infantry ? 0.36 : 0.468, 180)}
				{#if burst}<span class="second-shot">{@render sprite('muzzle', 0.5 + (position[0] - 0.5) * 0.9, 0.5 + (position[1] - 1) * 0.9, infantry ? 0.36 : 0.468, 180, 120)}</span>{/if}
			</div>
			<div class="effect-cell hit" style:left={`${((target % gameState.cols) * 100) / gameState.cols}%`} style:top={`${(Math.floor(target / gameState.cols) * 100) / gameState.rows}%`}>
				{@render sprite('impact', 0.5, 0.5, infantry ? 0.65 : 0.9, 280, impactDelay)}
			</div>
		{/key}
	{/if}
	{#if gameState.explosion !== null}
		{#key gameState.explosion}
			<div class="effect-cell destroyed" style:left={`${((gameState.explosion % gameState.cols) * 100) / gameState.cols}%`} style:top={`${(Math.floor(gameState.explosion / gameState.cols) * 100) / gameState.rows}%`}>
				{@render sprite('destruction', 0.5, 0.5, smallExplosion ? 0.9 : 1.25, 500)}
			</div>
		{/key}
	{/if}
</div>

<style>
	.combat-effects {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 3;
	}
	.effect-cell {
		position: absolute;
		width: var(--effect-width);
		height: var(--effect-height);
	}
	.effect-sprite {
		position: absolute;
		overflow: hidden;
		transform: translate(-50%, -50%);
		/* Delayed effects stay hidden until their actual start. */
		opacity: 0;
		animation: lifetime var(--duration) steps(1, end) var(--delay) forwards;
	}
	.effect-sprite img {
		display: block;
		width: 400%;
		max-width: none;
		height: 100%;
		image-rendering: pixelated;
		animation: frames var(--duration) steps(4, end) var(--delay) both;
	}
	@keyframes frames {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-100%);
		}
	}
	@keyframes lifetime {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.effect-sprite img {
			animation: none;
		}
		.second-shot {
			display: none;
		}
	}
</style>
