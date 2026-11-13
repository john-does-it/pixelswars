<script lang="ts">
	import BoardPreview from './BoardPreview.svelte'
	import { resolve } from '$app/paths'
	import { describeMap } from '#lib/game/map-details.js'
	import type { GameMap } from '#lib/game/types.js'
	import MapCharacteristics from './MapCharacteristics.svelte'
	import { translate } from '#lib/i18n.svelte.js'
	import { m as messages } from '#lib/paraglide/messages.js'
	let { maps }: { maps: GameMap[] } = $props()
</script>

{#if maps.length}
	<section aria-labelledby="draft-maps-title" class="draft-gallery">
		<h2 id="draft-maps-title">{translate(messages.map_drafts)}</h2>
		<p>{translate(messages.map_drafts_hint)}</p>
		<div class="draft-grid">
			{#each maps as map (map.id)}
				<article class="panel draft-card" data-draft-map={map.id}>
					<div class="preview"><BoardPreview {map} /></div>
					<span class="draft-badge">{translate(messages.map_draft)}</span>
					<MapCharacteristics details={describeMap(map)} />
					<h3 title={map.name}>{map.name}</h3>
					<p>{map.cols} × {map.rows}</p>
					<div class="actions">
						<a href={`${resolve('/')}?draft=${map.id}#editor-title`}>{translate(messages.map_draft_edit)}</a>
					</div>
				</article>
			{/each}
		</div>
	</section>
{/if}

<style>
	.draft-gallery {
		margin-top: 64px;
	}
	.draft-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
		gap: 16px;
	}
	.draft-card {
		min-width: 0;
		padding: 20px;
	}
	.preview {
		max-width: 240px;
		margin: 0 auto 16px;
	}
	.draft-badge {
		display: inline-block;
		color: var(--color-accent);
		border: 1px dashed currentColor;
		padding: 2px 6px;
		margin-bottom: 8px;
	}
	h3 {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
</style>
