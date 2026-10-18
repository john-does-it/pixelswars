<script lang="ts">
	import type { MapDetails } from '$lib/game/map-details'
	import { translate } from '$lib/i18n.svelte'
	import { m as messages } from '$lib/paraglide/messages'
	let { details }: { details: MapDetails } = $props()
	const badges = $derived([
		{ active: details.symmetrical, label: messages.map_symmetrical, help: messages.map_symmetrical_help },
		{ active: details.mobileFriendly, label: messages.map_mobile, help: messages.map_mobile_help }
	])
</script>

<div class="map-characteristics">
	<ul class="badges" aria-label={translate(messages.map_characteristics)}>
		{#each badges as badge}
			<li class:active={badge.active} title={translate(badge.help)} aria-label={`${translate(badge.label)}: ${translate(badge.active ? messages.map_yes : messages.map_no)}`}>
				{translate(badge.label)}<span class="sr-only">: {translate(badge.active ? messages.map_yes : messages.map_no)}</span>
			</li>
		{/each}
	</ul>
</div>

<style>
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
	.badges {
		list-style: none;
		padding: 0;
		margin: 0 0 12px;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.badges li {
		font-size: 11px;
		padding: 3px 6px;
		border: 1px dashed var(--color-border);
		border-radius: 3px;
		color: var(--color-muted);
		opacity: 0.5;
	}
	.badges li.active {
		opacity: 1;
		color: var(--color-accent);
		border-style: solid;
		border-color: var(--color-accent);
	}
</style>
