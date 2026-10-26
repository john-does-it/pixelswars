<script lang="ts">
	import { asset } from '$lib/game/asset-path'
	import SiteSection from '$lib/components/site/SiteSection.svelte'
	import MapGallery from '$lib/components/site/MapGallery.svelte'
	import StatsCatalog from '$lib/components/site/StatsCatalog.svelte'
	import Achievements from '$lib/components/site/Achievements.svelte'
	import ProfileContent from '$lib/components/site/ProfileContent.svelte'
	import SupportContent from '$lib/components/site/SupportContent.svelte'
	import TutorialPreview from '$lib/components/site/TutorialPreview.svelte'
	import MapEditor from '$lib/components/MapEditor.svelte'
	import Sprite from '$lib/components/Sprite.svelte'
	import { unitTypes, terrainTypes } from '$lib/game/catalog'
	import { isMapInCatalog } from '$lib/game/map-catalog'
	import mapPreviews from '$lib/data/map-previews.json'
	import { m } from '$lib/paraglide/messages'
	import { translate } from '$lib/i18n.svelte'
	const counts = { units: Object.keys(unitTypes).length, maps: Object.keys(mapPreviews).filter(isMapInCatalog).length, terrains: Object.keys(terrainTypes).filter((id) => !['void', 'building'].includes(id)).length }
</script>

<svelte:head><title>{translate(m.page_title)}</title></svelte:head>
<main id="home">
	<SiteSection id="battlefields" tone="yellow" wide><MapGallery /></SiteSection>
	<SiteSection id="key-numbers"
		><div class="key-numbers">
			<h2>{translate(m.site_turn_based)}</h2>
			<div class="counters">
				{#each [{ value: counts.units, label: m.site_unit_types }, { value: counts.maps, label: m.site_map_count }, { value: counts.terrains, label: m.site_terrain_types }] as counter}
					<div>
						<strong aria-label={String(counter.value)}
							>{#each String(counter.value) as digit}<img src={asset('/assets/icons/numbers/' + digit + '.png')} alt="" width="32" height="40" />{/each}</strong
						>
						<h3>{translate(counter.label)}</h3>
					</div>
				{/each}
			</div>
		</div></SiteSection
	>
	<div class="road-divider" style:background-image={`url("${asset('/assets/cells/cell-road-h.svg')}")`} aria-hidden="true"><Sprite src="/assets/units/jeep/red/jeep-red-no-damage.png" size="s" /></div>
	<SiteSection id="editor-title" tone="sky" width="1220px"
		><h2>{translate(m.editor_title)}</h2>
		<p class="subtitle">{translate(m.editor_description)}</p>
		<MapEditor embedded /></SiteSection
	>
	<SiteSection id="how-to-play" width="1357px"><TutorialPreview /></SiteSection>
	<SiteSection id="stats" tone="silver" width="1400px"><StatsCatalog /></SiteSection>
	<SiteSection id="success" tone="yellow"
		><h2>{translate(m.site_achievements)}</h2>
		<p class="subtitle">{translate(m.site_achievement_intro)}</p>
		<Achievements /></SiteSection
	>
	<SiteSection id="profile" width="1280px"><ProfileContent /></SiteSection>
	<SiteSection id="support" tone="silver" width="1280px"><SupportContent /></SiteSection>
</main>

<style>
	h2 {
		margin: 0 0 12px;
	}
	.subtitle {
		font-size: 16px;
		color: var(--site-muted);
		max-width: 58ch;
		margin: 0 0 var(--site-gap-large);
	}
	:global(#battlefields) {
		padding-block: 104px;
	}
	.key-numbers {
		text-align: center;
	}
	.counters {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--site-gap-medium);
		margin-top: var(--site-gap-large);
	}
	.counters strong {
		display: inline-flex;
		background: var(--site-plum);
		color: var(--site-paper);
		padding: 0;
	}
	.counters strong img {
		width: auto;
		height: 68px;
		image-rendering: pixelated;
	}
	.counters h3 {
		font-size: 36px;
		margin: 12px 0 0;
	}
	.road-divider {
		height: 40px;
		background-size: 40px 40px;
		position: relative;
		overflow: hidden;
	}
	.road-divider :global(img) {
		position: absolute;
		width: 40px;
		height: 40px;
		left: 8%;
		top: 0;
	}
	:global(#success) .subtitle {
		margin-bottom: var(--site-gap-medium);
	}
	@media (max-width: 640px) {
		:global(#battlefields) {
			padding-block: 48px 64px;
		}
		.counters {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 12px;
		}
		.counters strong img {
			height: 40px;
		}
		.counters h3 {
			font-size: clamp(16px, 4.6vw, 20px);
			text-wrap: balance;
		}
	}
</style>
