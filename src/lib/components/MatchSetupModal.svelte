<script lang="ts">
	import { resolve } from '$app/paths'
	import Modal from './Modal.svelte'
	import { translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import type { AiDifficulty } from '$lib/game/types.js'

	let { map, onclose }: { map: number; onclose: () => void } = $props()
	let chooseDifficulty = $state(false)
	const levels: AiDifficulty[] = ['easy', 'medium', 'hard', 'expert']
	const mapUrl = $derived(`${resolve('/play/[map]', { map: String(map) })}/`)
</script>

<Modal title={translate(messages.choose_mode)} {onclose} --modal-max-width="480px">
	<div class="choices">
		<button class="primary" aria-expanded={chooseDifficulty} onclick={() => (chooseDifficulty = !chooseDifficulty)}>{translate(messages.play_ai)}</button>
		{#if chooseDifficulty}
			<section aria-labelledby="difficulty-title">
				<h3 id="difficulty-title">{translate(messages.choose_difficulty)}</h3>
				{#each levels as level}
					<div class="level">
						<a class="button" href={`${mapUrl}?ai=${level}`}>{translate(messages[`ai_${level}`])}</a>
						<ul>
							<li>{translate(messages[`ai_${level}_rule_1`])}</li>
							<li>{translate(messages[`ai_${level}_rule_2`])}</li>
							<li>{translate(messages[`ai_${level}_rule_3`])}</li>
						</ul>
					</div>
				{/each}
			</section>
		{/if}
		<a class="button primary" href={mapUrl}>{translate(messages.play_local)}</a>
		<a class="button primary" href={`${mapUrl}?online=1`}>{translate(messages.play_online)}</a>
	</div>
</Modal>

<style>
	.choices {
		display: grid;
		gap: 16px;
	}

	.button {
		text-align: center;
		white-space: normal;
	}

	h3 {
		font-size: 16px;
		color: var(--color-accent);
		margin: 0 0 12px;
	}

	.level {
		padding: 12px 0;
		border-top: 1px solid var(--color-border);
	}

	ul {
		font-size: 14px;
		line-height: 1.6;
	}

	ul {
		margin-bottom: 0;
		padding-left: 20px;
	}
</style>
