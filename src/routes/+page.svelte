<script>
	import { base } from '$app/paths'
	import { unitTypes, terrainTypes } from '$lib/game/catalog.js'
	import TerrainIcon from '$lib/components/TerrainIcon.svelte'
</script>

<svelte:head>
	<title>Pixel’s War · Local strategy</title>
</svelte:head>
<main>
	<header>
		<p class="eyebrow">LOCAL MULTIPLAYER · TURN-BASED STRATEGY</p>
		<h1>Pixel’s War</h1>
		<p>Lead your army to victory. Capture cities, build your forces and outsmart a friend on the same device.</p>
	</header>
	<section aria-labelledby="maps">
		<h2 id="maps">Choose your battlefield</h2>
		<div class="maps">
			{#each [{ id: 1, title: 'The Squared Map', size: '8 × 8', text: 'Cities, factories and hospitals. Build an army and control the economy.' }, { id: 2, title: 'The Rectangular Map', size: '12 × 8', text: 'A wider battlefield. Make every unit count.' }] as map}
				<a class="panel map" href="{base}/play/{map.id}/">
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
		<p>Two players share one device. Select a unit, move to adjacent blue cells and attack enemies marked with a crosshair. Terrain costs movement and provides defense.</p>
		<p>Use the arrows or ZQSD to move, Enter to confirm, Escape to cancel and Space to capture. The on-screen controls work with mouse and touch.</p>
		<p>Infantry captures a building in two actions. Owned cities provide 200$ at the start of your turn; hospitals restore up to 25 health. Factories produce units if you have enough money and the cell is free.</p>
		<p>Artillery fires at range 2–3, excluding all adjacent cells. Surviving enemies retaliate if their own range permits it. Destroy all opposing units to win.</p>
	</section>
	<section>
		<h2>Your army</h2>
		<div class="catalog">
			{#each Object.entries(unitTypes) as [id, unit]}
				<article class="panel">
					<img src="{base}/assets/units/{id}-1.png" alt={unit.name} />
					<h3>{unit.name}</h3>
					<p>{unit.cost}$ · {unit.maxHealth} health</p>
					<p>Attack {unit.attack} · Defense {unit.defense}<br />Movement {unit.movement} · Range {unit.exclusion + 1}–{unit.range}</p>
				</article>
			{/each}
		</div>
	</section>
	<section>
		<h2>Terrain</h2>
		<div class="catalog">
			{#each Object.entries(terrainTypes) as [id, terrain]}
				<article class="panel">
					<TerrainIcon terrain={id} size={70} />
					<h3>{terrain.name}</h3>
					<p>Movement cost {terrain.cost}<br />Defense bonus {terrain.defense}</p>
				</article>
			{/each}
		</div>
	</section>
	<footer>
		<p>Programming: <a href="https://johndoesit.be">John Does it</a> · Graphics: <a href="https://www.kenney.nl">Kenney</a> · Sounds: <a href="https://pixabay.com/fr/sound-effects">Pixabay</a> · Music: <a href="https://arcofdream.bandcamp.com/album/monolith-official-soundtrack">Monolith</a> · QA: Gauthier Miessen</p>
		<p>Feedback or contributions: <a href="mailto:hello@johndoesit.be">hello@johndoesit.be</a></p>
	</footer>
</main>

<style>
	main {
		max-width: 1050px;
		padding: 32px 20px;
		margin: auto;
	}

	header {
		padding: 32px 0;
		max-width: 730px;
	}

	h1 {
		font-size: clamp(38px, 8vw, 76px);
		margin: 18px 0;
		color: #ffe985;
	}

	.eyebrow {
		font-size: 12px;
		letter-spacing: 0.12em;
		color: #95b3c7;
	}

	p {
		line-height: 1.7;
		color: #becbd3;
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

	.catalog {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 14px;
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

	footer {
		font-size: 12px;
		margin-top: 40px;

		a {
			text-decoration: underline;
		}
	}
</style>
