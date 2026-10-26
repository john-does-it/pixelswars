<script lang="ts">
	import { onMount } from 'svelte'
	import { dev } from '$app/environment'
	import { page } from '$app/state'
	import SiteNavbar from '$lib/components/SiteNavbar.svelte'
	import SiteFooter from '$lib/components/SiteFooter.svelte'
	import { asset } from '$lib/game/asset-path'
	import '$lib/app.css'
	import '$lib/styles/site-tokens.css'
	import { initializeProfile, syncProfile } from '$lib/profile.svelte.ts'
	import { initializePreferences } from '$lib/preferences.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { Snippet } from 'svelte'

	const boardPage = $derived(page.route.id?.startsWith('/play/') || page.route.id === '/tutorial' || page.route.id?.startsWith('/tutorial/'))
	let { children }: { children: Snippet } = $props()

	onMount(() => {
		initializePreferences()
		initializeProfile()
		// Native selects can match :focus-visible even after a pointer click.
		const pointerInput = () => (document.documentElement.dataset.inputMethod = 'pointer')
		const keyboardInput = (event: KeyboardEvent) => {
			if (!event.altKey && !event.ctrlKey && !event.metaKey) delete document.documentElement.dataset.inputMethod
		}
		document.addEventListener('pointerdown', pointerInput, true)
		document.addEventListener('keydown', keyboardInput, true)
		return () => {
			document.removeEventListener('pointerdown', pointerInput, true)
			document.removeEventListener('keydown', keyboardInput, true)
			delete document.documentElement.dataset.inputMethod
		}
	})
</script>

<svelte:window onstorage={syncProfile} />

<svelte:head>
	{#if !dev}
		<script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
	{/if}
	<link rel="icon" href={`${asset('/favicon.svg')}?v=infantry-damage-2`} type="image/svg+xml" />
	<meta name="description" content={translate(messages.meta_description)} />
</svelte:head>

{#if boardPage}
	<div class="play-shell">{@render children()}</div>
{:else}
	<div class="site-shell">
		<SiteNavbar />
		<div class="site-content">{@render children()}</div>
		<SiteFooter />
	</div>
{/if}

<style>
	.site-shell {
		--site-nav-height: 0px;
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}
	.site-content {
		flex: 1;
		min-width: 0;
	}
</style>
