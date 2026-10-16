<script lang="ts">
	import { onMount } from 'svelte'
	import LanguageSelect from './LanguageSelect.svelte'
	import { asset } from '$lib/game/asset-path'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'

	let navbar: HTMLElement
	let inner: HTMLDivElement
	let brand: HTMLAnchorElement
	let measurement: HTMLDivElement
	let menuButton: HTMLButtonElement
	let compact = $state(true)
	let expanded = $state(false)
	const links = $derived([
		{ id: 'maps', label: translate(messages.home_maps) },
		{ id: 'editor-title', label: translate(messages.home_editor) },
		{ id: 'how-to-play', label: translate(messages.how_to_play) },
		{ id: 'army', label: translate(messages.your_army) },
		{ id: 'terrain', label: translate(messages.terrain) }
	])

	onMount(() => {
		const observer = new ResizeObserver(() => {
			const style = getComputedStyle(inner)
			const available = inner.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
			compact = brand.offsetWidth + measurement.offsetWidth + 24 > available
			if (!compact) {
				expanded = false
				if (document.activeElement === menuButton) brand.focus({ preventScroll: true })
			}
		})
		for (const element of [inner, brand, measurement]) observer.observe(element)
		return () => observer.disconnect()
	})
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && expanded) {
			expanded = false
			menuButton.focus()
		}
	}}
	onpointerdown={(event) => {
		if (expanded && event.target instanceof Node && !navbar.contains(event.target)) expanded = false
	}}
/>

<nav class="home-navbar" aria-label={translate(messages.home_navigation)} bind:this={navbar}>
	<div class="navbar-inner" class:compact bind:this={inner}>
		<a class="brand" href="#home" bind:this={brand} onclick={() => (expanded = false)}>
			<img src={asset('/assets/units/infantry-1-damage-2-fit.png')} alt="" draggable="false" />
			<h1>Pixel’s War</h1>
			<img class="red-unit" src={asset('/assets/units/infantry-2-damage-2-fit.png')} alt="" draggable="false" />
		</a>
		<div class="measurement-frame" aria-hidden="true" inert>
			<div class="links-measure" bind:this={measurement}>
				{#each links as link}<span>{link.label}</span>{/each}
				<LanguageSelect compact hideLabel />
			</div>
		</div>

		<div id="home-navigation-links" class="nav-links" class:compact hidden={compact && !expanded}>
			{#each links as link}<a href={'#' + link.id} onclick={() => (expanded = false)}>{link.label}</a>{/each}
		</div>
		<div class="language-control"><LanguageSelect compact hideLabel symbolOnly={compact} /></div>
		<button class="menu-toggle pixel-icon-button" hidden={!compact} bind:this={menuButton} aria-label={translate(messages.home_menu)} aria-expanded={expanded} aria-controls="home-navigation-links" onclick={() => (expanded = !expanded)}>
			<span class="burger" class:expanded aria-hidden="true"><span></span><span></span><span></span></span>
		</button>
	</div>
</nav>

<style>
	.home-navbar {
		position: fixed;
		inset: 0 0 auto;
		height: var(--home-nav-height);
		z-index: 20;
		background: rgb(17 26 20 / 95%);
		backdrop-filter: blur(6px);
		border-bottom: 1px solid var(--color-border);
	}
	.navbar-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		max-width: 1320px;
		height: 100%;
		padding: 0 20px;
		margin-inline: auto;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		flex: none;
		font: 700 28px / 1 var(--font-display);
		color: var(--color-accent);
		white-space: nowrap;
		text-decoration: none;
	}
	.brand h1 {
		font: inherit;
		margin: 0;
	}
	.red-unit {
		transform: scaleX(-1);
	}
	.brand img {
		width: 32px;
		height: 40px;
		object-fit: contain;
		image-rendering: pixelated;
	}
	.measurement-frame {
		position: absolute;
		width: 0;
		height: 0;
		overflow: hidden;
		visibility: hidden;
		pointer-events: none;
	}
	.links-measure,
	.nav-links {
		display: flex;
		align-items: center;
		gap: 24px;
		width: max-content;
		flex: none;
		font-weight: bold;
		white-space: nowrap;
	}
	.nav-links {
		margin-left: auto;
	}
	.language-control {
		flex: none;
	}
	.navbar-inner.compact {
		gap: 8px;
	}
	.compact .language-control {
		margin-left: auto;
	}
	@media (max-width: 400px) {
		.navbar-inner {
			padding-inline: 12px;
		}
		.brand {
			font-size: 20px;
			gap: 4px;
		}
		.brand img {
			width: 24px;
			height: 32px;
		}
	}
	.nav-links a {
		display: flex;
		align-items: center;
		min-height: 44px;
		text-decoration: none;
		&:hover {
			color: var(--color-accent);
		}
	}
	.menu-toggle {
		flex: none;
		color: var(--color-accent);
	}
	.menu-toggle[hidden],
	.nav-links[hidden] {
		display: none;
	}
	.burger {
		display: grid;
		gap: 5px;
		width: 24px;
	}
	.burger span {
		height: 3px;
		background: currentColor;
	}
	.burger.expanded span:first-child {
		transform: translateY(8px) rotate(45deg);
	}
	.burger.expanded span:nth-child(2) {
		visibility: hidden;
	}
	.burger.expanded span:last-child {
		transform: translateY(-8px) rotate(-45deg);
	}
	.nav-links.compact {
		position: absolute;
		top: 100%;
		left: 0;
		width: 100%;
		max-height: calc(100dvh - var(--home-nav-height));
		overflow-y: auto;
		flex-direction: column;
		align-items: stretch;
		gap: 0;
		padding: 8px 20px 16px;
		background: var(--color-background);
		border-bottom: 1px solid var(--color-border);
		white-space: normal;
	}
</style>
