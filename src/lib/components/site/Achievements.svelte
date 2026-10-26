<script lang="ts">
	import { playerProfile } from '$lib/profile.svelte'
	import { achievementProgress } from '$lib/achievements'
	import { asset } from '$lib/game/asset-path'
	import { m } from '$lib/paraglide/messages'
	import { translate } from '$lib/i18n.svelte'
	const achievements = $derived(achievementProgress(playerProfile.data))
</script>

<div class="achievements">
	{#each achievements as achievement (achievement.id)}
		<article class:locked={!achievement.unlocked}>
			<img src={asset(`/assets/medals/medal-${achievement.id}.png`)} alt="" width="60" height="116" loading="lazy" />
			<h3>{translate(m[`achievement_${achievement.id.replaceAll('-', '_')}` as keyof typeof m])}</h3>
			<p>{translate(m[`achievement_${achievement.id.replaceAll('-', '_')}_description` as keyof typeof m])}</p>
		</article>
	{/each}
</div>

<style>
	.achievements {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 48px;
		max-width: 1056px;
		margin: var(--site-gap-medium) auto 0;
	}
	article {
		text-align: center;
		min-height: 212px;
	}
	img {
		width: 60px;
		height: 116px;
		object-fit: contain;
		display: block;
		margin-inline: auto;
		image-rendering: pixelated;
	}
	.locked img {
		filter: grayscale(1);
		opacity: 0.65;
	}
	article h3 {
		font: 700 20px/1.3 var(--font-body);
		color: var(--site-plum);
		-webkit-text-stroke: 0;
		text-shadow: none;
		margin: 16px 0 12px;
	}
	p {
		font-size: 16px;
		margin: 0 auto;
		max-width: 320px;
	}
	@media (max-width: 640px) {
		article h3 {
			font-size: 16px;
		}
		.achievements {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 24px 16px;
		}
	}
</style>
