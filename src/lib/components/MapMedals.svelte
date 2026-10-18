<script lang="ts">
	import { difficulties, hasMedal } from '$lib/profile.ts'
	import { playerProfile } from '$lib/profile.svelte.ts'
	import { translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	let { map }: { map: string } = $props()
</script>

<div class="medals" aria-label={translate(messages.profile_medals)}>
	{#each difficulties as difficulty}
		{@const earned = hasMedal(playerProfile.data, map, difficulty)}
		<span class="medal" class:earned data-difficulty={difficulty} data-earned={earned} title={translate(earned ? messages.medal_earned : messages.medal_missing, { difficulty: translate(messages[`ai_${difficulty}`]) })}>
			<span>{translate(messages[`ai_${difficulty}`])}<span class="sr-only"> · {translate(earned ? messages.medal_complete : messages.medal_incomplete)}</span></span>
		</span>
	{/each}
</div>

<style>
	.medals {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		font-size: 11px;
	}
	.medal {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 5px;
		border: 1px dashed var(--color-border);
		color: var(--color-muted);
		border-radius: 4px;
	}
	.earned {
		border-style: solid;
		border-color: var(--color-accent);
		color: var(--color-text);
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
