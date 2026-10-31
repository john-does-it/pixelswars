<script lang="ts">
	import { asset } from '#lib/game/asset-path.js'
	import SiteSection from '#lib/components/site/SiteSection.svelte'
	import MapGallery from '#lib/components/site/MapGallery.svelte'
	import SavedMatchCard from '#lib/components/SavedMatchCard.svelte'
	import StatsCatalog from '#lib/components/site/StatsCatalog.svelte'
	import Achievements from '#lib/components/site/Achievements.svelte'
	import ProfileContent from '#lib/components/site/ProfileContent.svelte'
	import SupportContent from '#lib/components/site/SupportContent.svelte'
	import MapEditor from '#lib/components/MapEditor.svelte'
	import RoadDivider from '#lib/components/site/RoadDivider.svelte'
	import { unitTypes, terrainTypes } from '#lib/game/catalog.js'
	import { isMapInCatalog } from '#lib/game/map-catalog.js'
	import mapPreviews from '#lib/data/map-previews.json'
	import { m } from '#lib/paraglide/messages.js'
	import { translate } from '#lib/i18n.svelte.js'
	const counts = { units: Object.keys(unitTypes).length, maps: Object.keys(mapPreviews).filter(isMapInCatalog).length, terrains: Object.keys(terrainTypes).filter((id) => id !== 'building').length }
</script>

<svelte:head><title>{translate(m.page_title)}</title></svelte:head>
<main id="home">
	<SiteSection id="battlefields" tone="yellow-light" wide>
		<SavedMatchCard />
		<MapGallery />
	</SiteSection>
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
		</div>
	</SiteSection>
	<RoadDivider />
	<SiteSection id="editor-title" tone="sky" width="1220px"
		><h2>{translate(m.editor_title)}</h2>
		<p class="subtitle">{translate(m.editor_description)}</p>
		<MapEditor embedded /></SiteSection
	>
	<SiteSection id="stats" tone="silver" width="1480px"><StatsCatalog /></SiteSection>
	<SiteSection id="success" tone="yellow">
		<h2>{translate(m.site_achievements)}</h2>
		<p class="subtitle">{translate(m.site_achievement_intro)}</p>
		<Achievements />
	</SiteSection>
	<SiteSection id="profile" width="1280px">
		<ProfileContent />
	</SiteSection>
	<SiteSection id="support" tone="silver" width="1280px">
		<SupportContent />
	</SiteSection>
</main>

<style>
	main {
		scroll-margin-top: var(--site-nav-height);
	}
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
	:global(#success) .subtitle {
		margin-bottom: var(--site-gap-medium);
	}
	@media (width < 1076px) {
		.counters {
			flex-direction: column;
			align-items: center;
		}
	}
	@media (max-width: 640px) {
		:global(#battlefields) {
			padding-block: 48px 64px;
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
