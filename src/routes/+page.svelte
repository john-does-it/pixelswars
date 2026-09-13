<script lang="ts">
	import { asset, resolve } from '$app/paths'
	import { unitTypes, terrainTypes } from '$lib/game/catalog.js'
	import TerrainIcon from '$lib/components/TerrainIcon.svelte'
	import StatList from '$lib/components/StatList.svelte'
	import type { BuildingId, StatItem, TerrainDefinition, TerrainId, UnitDefinition, UnitTypeId } from '$lib/game/types.js'

	const unitDescriptions: Record<UnitTypeId, string> = {
		infantry: 'Captures and secures buildings.',
		'infantry-rocket': 'Captures buildings. Strong against vehicles.',
		jeep: 'Fast vehicle. Strong against infantry.',
		artillery: 'Long-range support. Strong against tanks.',
		tank: 'Armored unit for direct combat.',
		'anti-air': 'Air defense. Cannot attack ground units.',
		helicopter: 'Fast aircraft. Strong against infantry.',
		plane: 'Powerful aircraft. Strong against helicopters.'
	}
	const terrainDescriptions: Record<TerrainId, string> = {
		road: 'The quickest route, with nowhere to hide.',
		grass: 'Good old grass. Cheap, open and dependable.',
		forest: 'A slow stroll with solid cover.',
		moutain: 'A costly climb with excellent cover.',
		water: 'Ships sail it; aircraft simply fly over.',
		building: 'A useful place worth fighting for.'
	}
	const unitGroups: { name: string; description: string; ids: UnitTypeId[] }[] = [
		{ name: 'Infantry', description: 'The only unit type that can capture and secure buildings.', ids: ['infantry', 'infantry-rocket'] },
		{ name: 'Vehicles', description: 'Specialized and durable ground units.', ids: ['jeep', 'artillery', 'tank', 'anti-air'] },
		{ name: 'Aircraft', description: 'The only unit type unaffected by terrain movement costs.', ids: ['helicopter', 'plane'] }
	]
	const terrainGroups: { name: string; ids: TerrainId[] }[] = [
		{ name: 'Ground', ids: ['road', 'grass', 'forest', 'moutain'] },
		{ name: 'Waterways', ids: ['water'] }
	]
	const unitStats = (unit: UnitDefinition): StatItem[] => [
		{ icon: 'icon-money', label: 'Cost', value: `${unit.cost}$` },
		{ icon: 'icon-health', label: 'Health', value: unit.maxHealth },
		{ icon: 'icon-movement', label: 'Movement', value: unit.movement },
		{ icon: 'icon-attack-capacity', label: 'Attacks', value: unit.attacks },
		{ icon: 'icon-attack-damage', label: 'Attack', value: unit.attack },
		{ icon: 'icon-defense', label: 'Defense', value: unit.defense },
		{ icon: 'icon-attack-range', label: 'Range', value: `${unit.exclusion + 1}–${unit.range}` }
	]
	const terrainStats = (terrain: TerrainDefinition): StatItem[] => [
		{ icon: 'icon-movement', label: 'Movement', value: terrain.cost },
		{ icon: 'icon-defense', label: 'Defense', value: terrain.defense }
	]

	const buildings: { id: BuildingId; name: string; description: string }[] = [
		{ id: 'city', name: 'City', description: 'Makes 200$ each turn. War is expensive.' },
		{ id: 'hospital', name: 'Hospital', description: 'Heals 25 health. Better than the wilderness.' },
		{ id: 'factory', name: 'Factory', description: 'Builds ground units. It may smell terrible.' },
		{ id: 'airport', name: 'Airport', description: 'Builds aircraft. Please mind the propellers.' }
	]
	const maps = [
		{ id: 1, title: 'The Squared Map', size: '8 × 8', text: 'Capture key buildings, grow your income and build a balanced army.' },
		{ id: 2, title: 'The Rectangular Map', size: '12 × 8', text: 'Cross a wider battlefield where every move and every unit matters.' },
		{ id: 3, title: 'The Crossroads', size: '10 × 10', text: 'Control two fast routes and contest the objectives across a square arena.' },
		{ id: 4, title: 'The Long Front', size: '14 × 7', text: 'Advance along a broad front and seize the production point at its center.' },
		{ id: 5, title: 'The Split Valley', size: '12 × 9', text: 'Cross uneven passes and control a winding road through the valley.' },
		{ id: 6, title: 'The Gauntlet', size: '9 × 11', text: 'Push through a narrow corridor and contest its two airports.' },
		{ id: 7, title: 'The Wide Divide', size: '16 × 7', text: 'Manage a wide front where distant objectives reward careful planning.' },
		{ id: 8, title: 'The Broken Crown', size: '10 × 13', text: 'Climb through broken defenses and fight around a central crossroads.' },
		{ id: 9, title: 'The Tidal Gates', size: '12 × 10', text: 'Advance between two flooded basins through three narrow land passages.' }
	]
</script>

<svelte:head>
	<title>Pixel’s War · Local strategy</title>
</svelte:head>
<main>
	<header>
		<p class="eyebrow">LOCAL MULTIPLAYER · TURN-BASED STRATEGY</p>
		<div class="title">
			<img src={asset('/assets/units/infantry-1-damage-2-fit.png')} alt="" />
			<h1>Pixel’s War</h1>
			<img src={asset('/assets/units/infantry-2-damage-2-fit.png')} alt="" />
		</div>
		<p>Lead your army to victory. Capture cities, build your forces and outsmart a friend on the same device.</p>
	</header>
	<section aria-labelledby="maps">
		<h2 id="maps">Choose your battlefield</h2>
		<div class="maps">
			{#each maps as map}
				<a class="panel map" href={`${resolve('/play/[map]', { map: String(map.id) })}/`}>
					<span>{map.size}</span>
					<h3>{map.title}</h3>
					<p>{map.text}</p>
					<strong>Start game →</strong>
				</a>
			{/each}
		</div>
	</section>
	<section class="panel">
		<h2>How to play</h2>
		<p>Two players share one device. Move your units, attack enemies and capture buildings.</p>
		<p>Use the arrows or your selected ZQSD/WASD layout to move, Enter to confirm, Escape to cancel and Space to capture. The on-screen controls work with mouse and touch.</p>
		<p>Infantry captures buildings. Cities provide income, hospitals heal, and production buildings create units. Destroy all opposing units to win.</p>
	</section>
	<section>
		<h2>Your army</h2>
		{#each unitGroups as group}
			<div class="catalog-group">
				<h3>{group.name}</h3>
				<p class="group-description">{group.description}</p>
				<div class="catalog">
					{#each group.ids as id}
						{@const unit = unitTypes[id]}
						<article class="panel">
							<img src={asset(`/assets/units/${id}-1.png`)} alt={unit.name} />
							<h4>{unit.name}</h4>
							<StatList items={unitStats(unit)} />
							<p class="description">{unitDescriptions[id]}</p>
						</article>
					{/each}
				</div>
			</div>
		{/each}
	</section>
	<section>
		<h2>Terrain</h2>
		{#each terrainGroups as group}
			<div class="catalog-group">
				<h3>{group.name}</h3>
				<div class="catalog">
					{#each group.ids as id}
						{@const terrain = terrainTypes[id]}
						<article class="panel">
							<TerrainIcon terrain={id} size={70} />
							<h4>{terrain.name}</h4>
							<StatList items={terrainStats(terrain)} />
							<p class="description">{terrainDescriptions[id]}</p>
						</article>
					{/each}
				</div>
			</div>
		{/each}
		<div class="catalog-group">
			<h3>Buildings</h3>
			<div class="catalog">
				{#each buildings as building}
					<article class="panel">
						<TerrainIcon terrain={building.id} size={70} />
						<h4>{building.name}</h4>
						<StatList items={terrainStats(terrainTypes.building)} />
						<p class="description">{building.description}</p>
					</article>
				{/each}
			</div>
		</div>
	</section>
	<footer>
		<p>Programming: <a href="https://johndoesit.be">John Does it</a> · Graphics: <a href="https://www.kenney.nl">Kenney</a> · Sounds: <a href="https://pixabay.com/fr/sound-effects">Pixabay</a> · Music: <a href="https://arcofdream.bandcamp.com/album/monolith-official-soundtrack">Monolith</a> · QA: Gauthier Miessen</p>
		<p>Feedback or contributions: <a href="mailto:hello@johndoesit.be">hello@johndoesit.be</a></p>
	</footer>
</main>

<style>
	main {
		max-width: 1180px;
		padding: 32px 20px;
		margin: auto;
	}

	header {
		padding: 32px 0;
		max-width: 730px;
	}

	h1 {
		font-size: clamp(26px, 6vw, 76px);
		margin: 0;
		color: #ffe985;
	}

	.title {
		display: flex;
		align-items: center;
		gap: clamp(8px, 2vw, 20px);
		margin: 18px 0;

		img {
			width: clamp(32px, 8vw, 80px);
			height: clamp(40px, 10vw, 100px);
			object-fit: contain;
			image-rendering: pixelated;
			flex: none;

			&:last-child {
				transform: scaleX(-1);
			}
		}
	}

	.eyebrow {
		font-size: 12px;
		letter-spacing: 0.12em;
		color: #c7dce8;
	}

	p {
		line-height: 1.7;
		color: #e1e9ed;
	}

	section {
		margin: 28px 0;
	}

	.maps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 18px;
	}

	.map {
		padding: 28px;
		text-decoration: none;
		transition: border-color 0.2s;

		&:hover {
			border-color: #ffe985;
		}
	}

	.map span,
	.map strong {
		color: #ffe985;
	}

	.map p {
		width: 21ch;
		min-height: 6.8em;
	}

	.catalog {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 270px), 1fr));
		gap: 18px;
	}

	.catalog-group {
		margin-top: 24px;

		h3 {
			margin-bottom: 6px;
			color: #c7dce8;
		}
	}

	.group-description {
		max-width: 720px;
		margin: 0 0 14px;
		font-size: 14px;
	}

	article {
		align-self: start;

		h4 {
			font-size: 18px;
			margin: 16px 0 0;
		}
	}

	article img {
		width: 70px;
		height: 70px;
		object-fit: contain;
		image-rendering: pixelated;
	}

	article p {
		font-size: 13px;
	}

	.description {
		padding-top: 14px;
		border-top: 1px solid #78909f;
		margin-top: 14px;
	}

	footer {
		font-size: 12px;
		margin-top: 40px;

		a {
			text-decoration: underline;
		}
	}
</style>
