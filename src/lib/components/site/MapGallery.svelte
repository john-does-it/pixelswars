<script lang="ts">
	import { resolve } from '$app/paths'
	import { page } from '$app/state'
	import { goto } from '$app/navigation'
	import { onMount } from 'svelte'
	import { asset } from '#lib/game/asset-path.js'
	import { isMapInCatalog } from '#lib/game/map-catalog.js'
	import mapPreviews from '#lib/data/map-previews.json'
	import mapDetails from '#lib/data/map-details.json'
	import mapArtworks from '#lib/data/map-artworks.json'
	import { mapName, translate } from '#lib/i18n.svelte.js'
	import { m } from '#lib/paraglide/messages.js'
	import MatchSetupModal from '#lib/components/MatchSetupModal.svelte'
	import TextSelector from './TextSelector.svelte'
	import SelectionCorners from './SelectionCorners.svelte'
	const sizes = ['XS', 'S', 'M', 'L', 'XL']
	const maps = Object.entries(mapPreviews)
		.filter(([id]) => isMapInCatalog(id))
		.map(([id, preview]) => ({ id, ...preview }))
		.sort((a, b) => a.cols * a.rows - b.cols * b.rows || Number(a.id) - Number(b.id))
	function mapSize(cells: number) {
		return cells <= 80 ? 'XS' : cells <= 120 ? 'S' : cells <= 160 ? 'M' : cells <= 200 ? 'L' : 'XL'
	}
	let mounted = $state(false)
	const size = $derived(mounted && sizes.includes(page.url.searchParams.get('size') ?? '') ? page.url.searchParams.get('size')! : 'ALL')
	const filtered = $derived(maps.filter((map) => size === 'ALL' || mapSize(map.cols * map.rows) === size))
	let selectedMap = $state<number | null>(null)
	let highlighted = $state(maps[0]?.id)
	let gallery: HTMLDivElement
	function openHighlightedMap(event: KeyboardEvent) {
		if (event.key !== 'Enter' || event.repeat || event.defaultPrevented || selectedMap !== null || !highlighted) return
		if (event.target instanceof Element && event.target.closest('a, button, input, select, textarea, [contenteditable="true"], dialog')) return
		const bounds = gallery?.getBoundingClientRect()
		if (!bounds || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return
		event.preventDefault()
		selectedMap = Number(highlighted)
	}
	function selectSize(value: string) {
		const url = new URL(page.url.href)
		for (const key of ['size', 'symmetrical', 'mobile']) url.searchParams.delete(key)
		if (value !== 'ALL') url.searchParams.set('size', value)
		void goto(url, { replace: true, reset: false })
	}
	onMount(() => {
		mounted = true
	})
	$effect(() => {
		highlighted = filtered[0]?.id
	})
</script>

<svelte:window onkeydown={openHighlightedMap} />

<section aria-labelledby="maps">
	<div class="gallery-heading">
		<h2 id="maps">{translate(m.choose_battlefield)}</h2>
		<div class="size-options" role="group" aria-label={translate(m.map_filter_size)}>
			{#each [...sizes, 'ALL'] as value}<TextSelector active={size === value} onclick={() => selectSize(value)}>{value}</TextSelector>{/each}
		</div>
	</div>
	<div class="maps" role="group" aria-labelledby="maps" bind:this={gallery}>
		{#each filtered as map (map.id)}
			<a
				class="map"
				data-map-id={map.id}
				class:selected={highlighted === map.id}
				href={resolve('/play/[map]', { map: map.id })}
				aria-haspopup="dialog"
				onfocus={() => (highlighted = map.id)}
				onmouseenter={() => (highlighted = map.id)}
				draggable="false"
				onclick={(event) => {
					if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
					event.preventDefault()
					highlighted = map.id
					selectedMap = Number(map.id)
				}}
			>
				<div class="map-art">
					<img draggable="false" loading="lazy" decoding="async" class="illustration" src={asset('/assets/illustrations/' + (mapArtworks[map.id as keyof typeof mapArtworks] ?? mapDetails[map.id as keyof typeof mapDetails].illustration) + '.png')} alt="" width="280" height="320" />
					<h3>{mapName(map.id)}</h3>
					{#if highlighted === map.id}<SelectionCorners />{/if}
				</div>
				<div class="map-thumbnail"><img src={asset('/assets/map-previews/map-' + map.id + '.png')} alt="" width={map.cols * 16} height={map.rows * 16} /></div>
			</a>
		{:else}<p>{translate(m.map_filter_empty)}</p>{/each}
	</div>
</section>
{#if selectedMap !== null}<MatchSetupModal map={selectedMap} onclose={() => (selectedMap = null)} />{/if}

<style>
	section {
		max-width: 1875px;
		margin: auto;
	}
	.gallery-heading {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 24px;
		margin-bottom: 64px;
	}
	h2 {
		margin: 0;
	}
	.size-options {
		display: flex;
		gap: 24px;
		align-items: center;
	}
	.maps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
		gap: 32px;
	}
	.map {
		--selection-corner-size: 28px;
		--selection-corner-inset: -10px;
		padding: 1em;
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-decoration: none;
		min-width: 0;
	}
	.map.selected {
		z-index: 2;
	}
	.map-art {
		position: relative;
		width: min(280px, 100%);
		aspect-ratio: 7/8;
	}
	.illustration {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		image-rendering: pixelated;
		display: block;
		filter: brightness(0.7);
	}
	.selected .illustration {
		filter: none;
	}
	.map-art h3 {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		overflow-wrap: anywhere;
		text-align: center;
		margin: 0;
		font-size: 36px;
		--site-heading-outline: var(--site-card-outline);
		z-index: 1;
	}
	.map-thumbnail {
		width: 183px;
		max-width: 75%;
		height: 92px;
		margin-top: 24px;
		display: flex;
		justify-content: center;
	}
	.map-thumbnail img {
		width: 100%;
		height: 92px;
		max-height: 100%;
		min-height: 0;
		object-fit: contain;
		image-rendering: pixelated;
	}
	@media (max-width: 900px) {
		.gallery-heading {
			align-items: flex-start;
			flex-direction: column;
			gap: 24px;
		}
		.size-options {
			gap: 20px;
		}
	}
	@media (max-width: 640px) {
		.gallery-heading {
			margin-bottom: 32px;
		}
		.maps {
			gap: 24px;
		}
		.map-art h3 {
			font-size: 28px;
		}
		.size-options {
			gap: 16px;
		}
		.map-thumbnail {
			height: 76px;
			width: 151px;
			margin-top: 16px;
		}
	}
</style>
