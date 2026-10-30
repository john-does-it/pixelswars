<script lang="ts">
	import SupportContent from '$lib/components/site/SupportContent.svelte'
	import { m } from '$lib/paraglide/messages'
	import { translate } from '$lib/i18n.svelte'
</script>

<svelte:head>
	<title>{translate(m.support_title)} · Pixel’s War</title>
</svelte:head>

<main class="site-page">
	<SupportContent />
</main>
