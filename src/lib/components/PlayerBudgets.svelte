<script lang="ts">
	import { matchPlayerName, translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { preferences } from '$lib/preferences.svelte.js'
	import { playerIncome } from '$lib/game/model.js'
	import type { GameState } from '$lib/game/types.js'
	let { state, aiMode = false }: { state: GameState; aiMode?: boolean } = $props()
	const amounts = $derived(new Intl.NumberFormat(preferences.locale))
	const players = [1, 2] as const
</script>

<div class="budgets">
	{#each players as player}
		<span>
			<span class="player-name" title={matchPlayerName(player, aiMode, state.network?.player)} class:player-one={player === 1} class:player-two={player === 2}>{matchPlayerName(player, aiMode, state.network?.player)}</span>
			<b>{amounts.format(state.money[player])} $</b>
			<span class="income" title={translate(messages.expected_income_hint)}>{translate(messages.income_per_turn, { income: amounts.format(playerIncome(state, player)) })}</span>
		</span>
	{/each}
</div>

<style>
	.budgets {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding-top: 10px;
		border-top: 1px solid rgb(255 255 255 / 10%);
		flex: none;
	}
	.budgets > span {
		display: grid;
		grid-template-columns: minmax(0, auto) auto;
		align-content: start;
		align-items: baseline;
		column-gap: 8px;
		min-width: 0;
		max-width: calc(50% - 6px);
	}
	.player-name {
		max-width: 90px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.player-one {
		color: #8dcbff;
	}
	.player-two {
		color: #ffb3b1;
	}
	b {
		white-space: nowrap;
	}
	.income {
		grid-column: 1 / -1;
		font-size: 0.85em;
		opacity: 0.8;
	}
	.budgets > span:last-child .income {
		text-align: right;
	}
	@media (max-width: 900px) {
		.budgets {
			gap: 8px;
			padding-top: 6px;
		}
	}
</style>
