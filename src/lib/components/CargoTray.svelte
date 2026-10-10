<script lang="ts">
	import { asset } from '$app/paths'
	import { selectedUnit } from '$lib/game/model.js'
	import { unitTypes } from '$lib/game/catalog.js'
	import { deploymentCells, selectedPassenger } from '$lib/game/transport.js'
	import { unitSprite } from '$lib/game/unit-sprites.js'
	import { translate, unitName } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import type { GameController } from '$lib/game/types.js'
	import Modal from './Modal.svelte'
	let { game, disabled = false }: { game: GameController; disabled?: boolean } = $props()
	const transport = $derived(selectedUnit(game.state))
	const passenger = $derived(selectedPassenger(game.state))
	let showPassengers = $state(false)
	$effect(() => {
		if (disabled || !transport?.cargo?.length) showPassengers = false
	})
</script>

{#if transport && unitTypes[transport.type].capacity}
	{@const label = translate(messages.transport_cargo, { count: transport.cargo?.length ?? 0, capacity: unitTypes[transport.type].capacity ?? 0 })}
	<section class="cargo-tray" aria-label={translate(messages.transport_title)}>
		<button class="cargo-toggle pixel-icon-button" disabled={disabled || !transport.cargo?.length} aria-label={label} title={label} aria-haspopup="dialog" onclick={() => (showPassengers = true)}>
			<span class="cargo-face" style:background-image={`url('${asset('/assets/icons/action-frame.svg')}')`}>{transport.cargo?.length ?? 0}/{unitTypes[transport.type].capacity}</span>
		</button>
		{#if showPassengers}
			<Modal title={label} alwaysShowScrollbar={false} onclose={() => (showPassengers = false)}>
				<p class="instruction">{translate(messages.transport_choose_passenger)}</p>
				<div class="passengers">
					{#each transport.cargo ?? [] as unit (unit.id)}
						{@const passengerLabel = `${unitName(unit.type)}, ${unit.health} / ${unitTypes[unit.type].maxHealth} ${translate(messages.stat_health)}`}
						<button
							class="passenger"
							{disabled}
							data-passenger={unit.id}
							aria-label={passengerLabel}
							aria-pressed={passenger?.id === unit.id}
							onclick={() => {
								game.selectPassenger(unit.id)
								showPassengers = false
							}}
						>
							<img src={asset(unitSprite(unit, true))} alt="" />
							<span class="passenger-name">{unitName(unit.type)}</span>
							<span class="health"><img src={asset('/assets/icons/icon-health.png')} alt={translate(messages.stat_health)} />{unit.health}/{unitTypes[unit.type].maxHealth}</span>
						</button>
					{/each}
				</div>
			</Modal>
		{/if}
		<p class="sr-only" role="status">{translate(passenger ? (deploymentCells(game.state, transport, passenger).length ? messages.transport_choose_tile : messages.transport_blocked) : transport.cargo?.length ? messages.transport_choose_passenger : messages.transport_board_hint)}</p>
	</section>
{/if}

<style>
	.cargo-tray {
		--modal-max-width: 400px;
		display: flex;
		align-items: center;
		flex: none;
		height: 48px;
	}
	.cargo-toggle {
		width: 48px;
		height: 48px;
		padding: 0;
	}
	.cargo-face {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		padding-bottom: 4px;
		background-size: contain;
		background-repeat: no-repeat;
		image-rendering: pixelated;
		color: #dfe0e8;
	}
	@media (max-width: 480px) {
		.cargo-toggle {
			width: 40px;
		}
	}
	@media (max-width: 360px) {
		.cargo-toggle {
			width: 36px;
		}
	}
	.instruction {
		margin: 0 0 12px;
		font-size: 14px;
	}
	.passengers {
		display: grid;
		gap: 8px;
	}
	.passenger {
		display: grid;
		grid-template-columns: 36px minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		text-align: left;
		padding: 4px;
	}
	.passenger-name {
		overflow-wrap: anywhere;
	}
	.health {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		white-space: nowrap;
		font-size: 12px;
		img {
			width: 12px;
			height: 12px;
		}
	}
	img {
		width: 36px;
		height: 36px;
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
