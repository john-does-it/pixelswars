<script lang="ts">
	import { resolve } from '$app/paths'
	import Modal from './Modal.svelte'
	import { tick } from 'svelte'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	let showCredits = $state(false)
	let creditsButton: HTMLButtonElement
	async function closeCredits() {
		showCredits = false
		await tick()
		creditsButton.focus({ preventScroll: true })
	}
</script>

<footer id="credits" class="site-footer">
	<button bind:this={creditsButton} onclick={() => (showCredits = true)} aria-haspopup="dialog">{translate(messages.credits)}</button>
	<a href="https://github.com/john-does-it/pixelswars/issues" target="_blank" rel="noopener noreferrer">{translate(messages.footer_feedback)}</a>
	<a href={resolve('/terms/', {})}>{translate(messages.footer_terms)}</a>
</footer>

{#if showCredits}
	<Modal title={translate(messages.credits)} onclose={closeCredits} alwaysShowScrollbar={false}>
		<div class="credits-list">
			<p>{translate(messages.programming)}: <a href="https://johndoesit.be/" target="_blank" rel="noopener noreferrer">John Does it</a></p>
			<p>{translate(messages.graphics)}: <a href="https://kenney.nl/assets/tiny-battle" target="_blank" rel="noopener noreferrer">Kenney</a>, <a href="https://bdragon1727.itch.io/" target="_blank" rel="noopener noreferrer">bdragon1727</a></p>
			<p>{translate(messages.sounds)}: <a href="https://pixabay.com/fr/sound-effects" target="_blank" rel="noopener noreferrer">Pixabay</a></p>
			<p>{translate(messages.music)}: <a href="https://arcofdream.bandcamp.com/album/monolith-official-soundtrack" target="_blank" rel="noopener noreferrer">Monolith</a></p>
			<p>Gauthier Miessen</p>
		</div>
	</Modal>
{/if}

<style>
	.site-footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 24px;
		width: 100%;
		max-width: 1320px;
		margin: 32px auto 0;
		padding: 0 20px 32px;
		font-size: var(--font-size-ui);
		scroll-margin-top: calc(var(--site-nav-height) + 40px);
	}
	.site-footer > a,
	.site-footer > button {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
	}
	.site-footer > button,
	.site-footer > button:hover {
		padding: 0;
		border: 0;
		border-radius: 0;
		background: none;
		box-shadow: none;
		font: inherit;
		color: inherit;
		text-decoration: underline;
		cursor: pointer;
		filter: none;
	}
	.site-footer > button::before,
	.site-footer > button::after {
		display: none;
	}
	.credits-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.credits-list p {
		margin: 0;
	}
	a {
		text-decoration: underline;
	}
</style>
