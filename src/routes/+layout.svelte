<script lang="ts">
	import { onMount } from 'svelte'
	import { asset } from '$app/paths'
	import '$lib/app.css'
	import { initializePreferences } from '$lib/preferences.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { Snippet } from 'svelte'

	let { children }: { children: Snippet } = $props()

	onMount(() => {
		initializePreferences()
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

<svelte:head>
	<link rel="icon" href={`${asset('/favicon.svg')}?v=infantry-damage-2`} type="image/svg+xml" />
	<meta name="description" content={translate(messages.meta_description)} />
</svelte:head>

{@render children()}
