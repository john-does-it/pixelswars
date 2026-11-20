<script lang="ts">
	import { m as messages } from '#lib/paraglide/messages.js'
	import { translate } from '#lib/i18n.svelte.js'
	import type { GameState } from '#lib/game/types.js'
	import PlayerBudgets from './PlayerBudgets.svelte'

	let { state, aiMode = false }: { state: GameState; aiMode?: boolean } = $props()
</script>

<header class="match-summary">
	<div class="summary-content game-context-container">
		<div class="turn-details" aria-live="polite"><strong>{translate(messages.round, { round: state.round })}</strong></div>
		<PlayerBudgets {state} {aiMode} />
	</div>
</header>

<style>
	.match-summary {
		flex: none;
		width: 100%;
		background: var(--site-yellow-light);
	}
	.summary-content {
		padding: 16px var(--game-panel-inset);
		display: flex;
		flex-direction: column;
	}
	.turn-details strong {
		font-size: 16px;
		color: var(--site-plum);
	}
	@media (max-width: 900px) {
		.summary-content {
			padding-block: 8px;
		}
	}
	@media (max-width: 768px) {
		.turn-details strong {
			line-height: 1.15;
			text-box-trim: trim-both;
		}
	}
</style>
