<script lang="ts">
	import { asset } from '$app/paths'
	import { selectedUnit } from '$lib/game/model.js'
	import { unitTypes } from '$lib/game/catalog.js'
	import { deploymentCells, selectedPassenger } from '$lib/game/transport.js'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import { translate, unitName } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import type { GameController } from '$lib/game/types.js'
	let { game, disabled = false }: { game: GameController; disabled?: boolean } = $props()
	const transport = $derived(selectedUnit(game.state))
	const passenger = $derived(selectedPassenger(game.state))
</script>

{#if transport && unitTypes[transport.type].capacity}
	<section class="cargo-tray" aria-label={translate(messages.transport_title)}>
		{#each transport.cargo ?? [] as unit (unit.id)}
			{@const label = `${unitName(unit.type)}, ${unit.health} / ${unitTypes[unit.type].maxHealth} ${translate(messages.stat_health)}`}
			<button {disabled} data-passenger={unit.id} aria-label={label} title={label} aria-pressed={passenger?.id === unit.id} onclick={() => game.selectPassenger(unit.id)}>
				<img src={asset(unitSprite(unit, true))} alt="" />
			</button>
		{/each}
		<p class="sr-only" role="status">{translate(passenger ? (deploymentCells(game.state, transport, passenger).length ? messages.transport_choose_tile : messages.transport_blocked) : transport.cargo?.length ? messages.transport_choose_passenger : messages.transport_board_hint)}</p>
	</section>
{/if}

<style>
	.cargo-tray {
		display: flex;
		gap: 8px;
		height: 48px;
	}
	button {
		--button-background: transparent;
		display: grid;
		place-items: center;
		flex: 0 0 48px;
		width: 48px;
		height: 48px;
		padding: 4px;
		border: 0;
		border-radius: 0;
		background: transparent;
	}
	button:hover:not(:disabled) {
		background: transparent;
		filter: brightness(1.15);
	}
	button[aria-pressed='true'] img {
		filter: drop-shadow(1px 0 0 var(--color-accent)) drop-shadow(-1px 0 0 var(--color-accent)) drop-shadow(0 1px 0 var(--color-accent)) drop-shadow(0 -1px 0 var(--color-accent));
	}
	img {
		width: 38px;
		height: 38px;
		object-fit: contain;
		image-rendering: pixelated;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
