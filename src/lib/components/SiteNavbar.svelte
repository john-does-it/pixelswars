<script lang="ts">
	import { resolve } from '$app/paths'
	import { onMount, tick } from 'svelte'
	import { page } from '$app/state'
	import { afterNavigate } from '$app/navigation'
	import PlayerTransition from './PlayerTransition.svelte'
	import LanguageSelect from './LanguageSelect.svelte'
	import { asset } from '#lib/game/asset-path.js'
	import { m as messages } from '#lib/paraglide/messages.js'
	import { translate } from '#lib/i18n.svelte.js'

	const homeLink = (id: string) => (page.route.id === '/' ? '' : resolve('/')) + '#' + id

	afterNavigate(({ shallow, type }) => {
		if (shallow && type === 'goto') return

		expanded = false
	})

	let { height = $bindable(0) }: { height?: number } = $props()
	let navbar: HTMLElement
	let inner: HTMLDivElement
	let brand: HTMLAnchorElement
	let measurement: HTMLDivElement
	let menuButton: HTMLButtonElement
	let compact = $state(true)
	let expanded = $state(false)
	let toggleBounds = $state({ top: 0, left: 0, width: 44, height: 44 })

	function syncToggleBounds() {
		if (menuButton) {
			const { top, left, width, height } = menuButton.getBoundingClientRect()
			toggleBounds = { top, left, width, height }
		}
	}
	async function closeMenu() {
		expanded = false
		await tick()
		menuButton.focus({ preventScroll: true })
	}
	const links = $derived([
		{ id: 'editor-title', label: translate(messages.home_editor) },
		{ id: 'stats', label: translate(messages.site_stats) },
		{ id: 'success', label: translate(messages.site_achievements) },
		{ id: 'profile', label: translate(messages.profile_title) },
		{ id: 'support', label: translate(messages.support_title) }
	])

	onMount(() => {
		const observer = new ResizeObserver(() => {
			syncToggleBounds()
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
			void closeMenu()
		}
	}}
	onresize={syncToggleBounds}
/>

<nav class="site-navbar" aria-label={translate(messages.home_navigation)} bind:this={navbar} bind:offsetHeight={height}>
	<div class="navbar-inner" class:compact bind:this={inner}>
		<a class="brand" href={homeLink('home')} bind:this={brand} onclick={() => (expanded = false)}>
			<img class="brand-logo" src={asset('/assets/brand/pixels-war-logo.png')} alt="Pixel’s War" width="355" height="143" />

			<svelte:element this={page.route.id === '/' ? 'h1' : 'span'} class="sr-only">Pixel’s War</svelte:element>
		</a>
		<div class="measurement-frame" aria-hidden="true" inert>
			<div class="links-measure" bind:this={measurement}>
				{#each links as link}<span>{link.label}</span>{/each}
				<LanguageSelect site compact hideLabel />
			</div>
		</div>

		<div id="home-navigation-links" class="nav-links" class:compact hidden={compact}>
			{#each links as link}
				<a href={homeLink(link.id)} onclick={() => (expanded = false)}>{link.label}</a>
			{/each}
		</div>
		<div class="language-control"><LanguageSelect site compact hideLabel /></div>
		<button
			class="menu-toggle pixel-icon-button"
			class:covered={expanded}
			hidden={!compact}
			bind:this={menuButton}
			aria-label={translate(messages.home_menu)}
			aria-expanded={expanded}
			aria-controls="home-navigation-links"
			onclick={() => {
				syncToggleBounds()
				expanded = !expanded
			}}
		>
			<span class="burger" class:expanded aria-hidden="true"><span></span><span></span><span></span></span>
		</button>
	</div>
</nav>
{#if expanded && compact}
	<PlayerTransition player={2} persistent showUnit={false} translucent label={translate(messages.home_navigation)} onclose={closeMenu}>
		{#snippet controls()}
			<button class="menu-toggle menu-close pixel-icon-button" style:top={toggleBounds.top + 'px'} style:left={toggleBounds.left + 'px'} style:width={toggleBounds.width + 'px'} style:height={toggleBounds.height + 'px'} aria-label={translate(messages.close)} aria-expanded="true" onclick={closeMenu}>
				<span class="burger expanded" aria-hidden="true"><span></span><span></span><span></span></span>
			</button>
		{/snippet}
		<div class="fullscreen-links">
			{#each links as link}
				<a href={homeLink(link.id)} onclick={() => (expanded = false)}>{link.label}</a>
			{/each}
		</div>
	</PlayerTransition>
{/if}

<style>
	.menu-toggle.covered {
		visibility: hidden;
	}

	.menu-close {
		position: absolute;
		z-index: 2;
	}

	.fullscreen-links {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
		padding: 64px 8px;
	}

	.fullscreen-links a {
		text-decoration: none;
		font-size: clamp(20px, 4vw, 32px);
	}

	.site-navbar {
		position: fixed;
		inset: 0 0 auto;
		z-index: 20;
		background: color-mix(in srgb, var(--site-yellow) 94%, transparent);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		padding: 24px;
	}
	.navbar-inner {
		display: flex;
		align-items: center;
		gap: 24px;
		max-width: var(--site-width);
		margin: auto;
		position: relative;
	}
	.brand {
		display: block;
		flex: none;
		text-decoration: none;
	}
	.brand-logo {
		display: block;
		width: 180px;
		max-width: 180px;
		height: auto;
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
		font-size: 16px;
		font-weight: 700;
		white-space: nowrap;
		width: max-content;
		flex: none;
	}
	.nav-links {
		margin-left: auto;
	}
	.nav-links a {
		text-decoration: none;
		min-height: 44px;
		display: flex;
		align-items: center;
	}
	.nav-links a:hover {
		color: var(--site-red);
	}
	.language-control {
		flex: none;
	}
	.compact .language-control {
		margin-left: auto;
	}
	.menu-toggle {
		color: var(--site-plum);
		flex: none;
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
		max-height: 70dvh;
		overflow-y: auto;
		flex-direction: column;
		align-items: stretch;
		gap: 0;
		padding: 12px 20px;
		background: var(--site-yellow);
		border: 2px solid var(--site-plum);
		white-space: normal;
	}
	@media (max-width: 640px) {
		.brand-logo {
			width: 148px;
		}
		.navbar-inner {
			gap: 12px;
		}
	}
	@media (max-width: 360px) {
		.brand-logo {
			width: 112px;
		}
		.navbar-inner {
			gap: 8px;
		}
	}
</style>
