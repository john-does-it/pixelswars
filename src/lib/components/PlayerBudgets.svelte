<script lang="ts">
	import { playerName } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.js'
	let { state, aiMode = false }: { state: GameState; aiMode?: boolean } = $props()
</script>

<div class="budgets game-context-container">
	<span><span class="player-one">{playerName(1, aiMode)}</span> <b>{state.money[1]}$</b></span>
	<span><span class="player-two">{playerName(2, aiMode)}</span> <b>{state.money[2]}$</b></span>
</div>

<style>
	.budgets {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding-inline: var(--game-gutter);
		flex: none;
	}
	.budgets > span {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 8px var(--game-panel-inset);
		border-radius: 8px;
		background: rgb(0 0 0 / 15%);
		backdrop-filter: blur(6px);
	}
	.player-one {
		color: #8dcbff;
	}
	.player-two {
		color: #ffb3b1;
	}
	@media (max-width: 900px) {
		.budgets {
			gap: 8px;
		}
		.budgets > span {
			gap: 8px;
			padding-block: 4px;
		}
	}
</style>
