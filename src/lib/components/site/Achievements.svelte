<script lang="ts">
	import { playerProfile } from '#lib/profile.svelte.js'
	import { achievementProgress } from '#lib/achievements.js'
	import { asset } from '#lib/game/asset-path.js'
	import { m } from '#lib/paraglide/messages.js'
	import { translate } from '#lib/i18n.svelte.js'
	const achievements = $derived(achievementProgress(playerProfile.data))
</script>

<div class="achievements">
	{#each achievements as achievement (achievement.id)}
		{@const lockedSprite = !achievement.unlocked && (achievement.id === 'onliner' || achievement.id === 'same-boat')}
		<article class:locked={!achievement.unlocked}>
			<img class:locked-sprite={lockedSprite} src={asset(`/assets/medals/medal-${achievement.id}${lockedSprite ? '-locked' : ''}.webp`)} alt="" width="60" height="116" loading="lazy" />
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
		opacity: 0.65;
	}
	.locked img:not(.locked-sprite) {
		filter: grayscale(1);
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
