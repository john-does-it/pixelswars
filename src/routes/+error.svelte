<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { translate } from '#lib/i18n.svelte.js'
	import { m as messages } from '#lib/paraglide/messages.js'

	const description = $derived(page.status === 404 ? translate(messages.page_not_found) : (page.error?.message ?? translate(messages.page_load_failed)))
</script>

<svelte:head>
	<title>{page.status} · {description} · Pixel’s War</title>
</svelte:head>

<main class="error-page">
	<h1 class="pixel-heading">{page.status}</h1>
	<p>{description}</p>
	<a href={resolve('/')}>{translate(messages.back_to_home)}</a>
</main>

<style>
	.error-page {
		margin-inline: auto;
		max-width: 48rem;
		padding: clamp(2rem, 4vw, 4rem) 1rem;
		text-align: center;
		overflow-wrap: anywhere;
	}

	h1 {
		margin: 0;
	}

	p {
		margin: 0.75rem 0 1.5rem;
	}
</style>
