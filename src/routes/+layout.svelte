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
	})
</script>

<svelte:head>
	<link rel="icon" href={asset('/assets/icons/icon-health.png')} type="image/png" />
	<meta name="description" content={translate(messages.meta_description)} />
</svelte:head>

{@render children()}
