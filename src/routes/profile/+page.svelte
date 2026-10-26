<script lang="ts">
import ProfileContent from '$lib/components/site/ProfileContent.svelte'
import { m } from '$lib/paraglide/messages'
import { translate } from '$lib/i18n.svelte'
</script>
<svelte:head><title>{translate(m.profile_title)} · Pixel’s War</title></svelte:head>
<main class="site-page"><ProfileContent /></main>