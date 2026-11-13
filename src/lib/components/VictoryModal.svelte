<script lang="ts">
	import { resolve } from '$app/paths'
	import PlayerTransition from './PlayerTransition.svelte'
	import { m as messages } from '#lib/paraglide/messages.js'
	import { translate } from '#lib/i18n.svelte.js'
	import type { recordVictory } from '#lib/profile.svelte.ts'
	import { asset } from '#lib/game/asset-path.js'
	import type { Player } from '#lib/game/types.js'

	let { winner, onrestart, rewards, storageError = false, aiMode = false, rematchRequested = false, opponentRematchRequested = false }: { rewards?: ReturnType<typeof recordVictory>; storageError?: boolean; winner: Player; onrestart: () => void; aiMode?: boolean; rematchRequested?: boolean; opponentRematchRequested?: boolean } = $props()
	const title = $derived(aiMode ? translate(winner === 1 ? messages.ai_victory_message : messages.human_victory_message) : translate(messages.victory_message, { player: winner }))
</script>

<PlayerTransition player={winner} persistent label={title} showUnit={!rewards?.achievement}>
	<h2 class="pixel-heading">{title}</h2>
	{#if rewards?.achievement}
		<figure>
			<img src={asset(`/assets/medals/medal-${rewards.achievement}.png`)} alt="" width="60" height="116" />
			<figcaption>{translate(rewards.achievement === 'onliner' ? messages.achievement_onliner : messages.achievement_same_boat)}</figcaption>
		</figure>
	{/if}
	{#if (rewards?.medal || rewards?.achievement) && storageError}
		<p role="alert">{translate(messages.profile_storage_error)}</p>
	{/if}
	<div class="victory-actions">
		<button class="primary" disabled={rematchRequested} onclick={onrestart}>{translate(rematchRequested ? messages.online_rematch_waiting : opponentRematchRequested ? messages.online_rematch_accept : messages.play_again)}</button>
		<a class="button primary" href={resolve('/')}>{translate(messages.choose_another_map)}</a>
	</div>
</PlayerTransition>

<style>
	h2 {
		margin: 0 0 16px;
		font-size: inherit;
	}

	figure {
		margin: 16px auto;
		font-size: 20px;
	}
	figure img {
		object-fit: contain;
		image-rendering: pixelated;
	}

	.victory-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--action-gap);
		margin-top: 32px;
		text-shadow: none;

		button,
		a {
			min-height: 44px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
		}
	}
</style>
