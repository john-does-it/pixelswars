<script lang="ts">
	import { playUrl } from '#lib/game/play-url.js'
	import { deleteLocalMap } from '#lib/map-editor/local-maps.svelte.js'
	import { hasStartingArmies } from '#lib/map-editor/model.ts'
	import type { GameMap } from '#lib/game/types.js'
	import Modal from './Modal.svelte'
	import { translate } from '#lib/i18n.svelte.js'
	import { m as messages } from '#lib/paraglide/messages.js'
	import type { AiDifficulty } from '#lib/game/types.js'

	let { map, localMap, onedit, onclose }: { map: string; localMap?: GameMap; onedit?: () => void; onclose: () => void } = $props()
	let chooseDifficulty = $state(false)
	let confirmDelete = $state(false)
	let deleteFailed = $state(false)
	function removeMap() {
		if (!localMap || !onedit) return
		try {
			deleteLocalMap(localMap.id)
		} catch {
			deleteFailed = true
			return
		}
		onclose()
	}
	const levels: AiDifficulty[] = ['easy', 'medium', 'hard', 'expert']
</script>

{#if confirmDelete && localMap}
	<Modal title={translate(messages.local_map_delete)} onclose={() => (confirmDelete = false)} --modal-max-width="480px">
		<p>{translate(messages.local_map_delete_prompt, { name: localMap.name })}</p>
		{#if deleteFailed}<p role="alert">{translate(messages.local_map_delete_failed)}</p>{/if}
		<div class="delete-actions"><button onclick={removeMap}>{translate(messages.local_map_delete)}</button></div>
	</Modal>
{:else}
	<Modal title={translate(messages.choose_mode)} {onclose} --modal-max-width="480px">
		<div class="choices">
			{#if localMap && !hasStartingArmies(localMap)}
				<p>{translate(messages.editor_armies_needed)}</p>
			{:else}
				<button class="primary" aria-expanded={chooseDifficulty} onclick={() => (chooseDifficulty = !chooseDifficulty)}>{translate(messages.play_ai)}</button>
				{#if chooseDifficulty}
					<section aria-labelledby="difficulty-title">
						<h3 class="pixel-heading" id="difficulty-title">{translate(messages.choose_difficulty)}</h3>
						{#each levels as level}
							<div class="level">
								<a class="button" href={playUrl(map, { ai: level })}>{translate(messages[`ai_${level}`])}</a>
								<ul>
									<li>{translate(messages[`ai_${level}_rule_1`])}</li>
									<li>{translate(messages[`ai_${level}_rule_2`])}</li>
									<li>{translate(messages[`ai_${level}_rule_3`])}</li>
								</ul>
							</div>
						{/each}
					</section>
				{/if}
				<a class="button primary" href={playUrl(map)}>{translate(messages.play_local)}</a>
				<a class="button primary" href={playUrl(map, { online: '1' })}>{translate(messages.play_online)}</a>
			{/if}
			{#if localMap && onedit}
				<button onclick={onedit}>{translate(messages.map_draft_edit)}</button>
				<button
					onclick={() => {
						deleteFailed = false
						confirmDelete = true
					}}>{translate(messages.local_map_delete)}</button
				>
			{/if}
		</div>
	</Modal>
{/if}

<style>
	.delete-actions {
		display: flex;
		justify-content: flex-end;
	}
	.choices {
		display: grid;
		gap: var(--action-gap);
	}

	.button {
		text-align: center;
		white-space: normal;
	}

	h3 {
		--site-heading-outline: var(--interface-heading-outline);
		font-size: 24px;
		margin: 0 0 12px;
	}

	.level {
		padding: 12px 0;
		border-top: 1px solid var(--color-border);
	}

	ul {
		font-size: var(--font-size-ui);
		line-height: 1.6;
	}

	ul {
		margin-bottom: 0;
		padding-left: 20px;
	}
</style>
