<script lang="ts">
	import { resolve } from '$app/paths'
	import LanguageSelect from '$lib/components/LanguageSelect.svelte'
	import { translate } from '$lib/i18n.svelte.js'
	import { m as messages } from '$lib/paraglide/messages.js'
</script>

<svelte:head><title>{translate(messages.legal_title)} · Pixel’s War</title></svelte:head>

<main>
	<header>
		<a href={resolve('/', {})}>← Pixel’s War</a>
		<LanguageSelect />
	</header>
	<h1>{translate(messages.legal_title)}</h1>
	<p>{translate(messages.legal_updated)}</p>
	<p>{translate(messages.legal_intro)}</p>
	<section>
		<h2>{translate(messages.legal_use_title)}</h2>
		<p>{translate(messages.legal_use)}</p>
	</section>
	<section>
		<h2>{translate(messages.legal_cookie_title)}</h2>
		<p>{translate(messages.legal_cookie)}</p>
		<p>{translate(messages.legal_cookie_manage)}</p>
	</section>
	<section>
		<h2>{translate(messages.legal_online_title)}</h2>
		<p>{translate(messages.legal_online)}</p>
		<p>{translate(messages.legal_shared)}</p>
		<p>{translate(messages.legal_limits)}</p>
	</section>
	<section>
		<h2>{translate(messages.legal_hosting_title)}</h2>
		<p>{translate(messages.legal_hosting)}</p>
		<ul>
			<li><a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">{translate(messages.legal_github)}</a></li>
			<li><a href="https://peerjs.com/server/cloud">{translate(messages.legal_peerjs)}</a></li>
			<li><a href="https://policies.google.com/privacy">{translate(messages.legal_google)}</a></li>
		</ul>
	</section>
	<section>
		<h2>{translate(messages.legal_contact_title)}</h2>
		<p>{translate(messages.legal_contact)}</p>
		<a href="mailto:hello@johndoesit.be">hello@johndoesit.be</a>
	</section>
</main>

<style>
	main {
		width: min(800px, calc(100% - 2em));
		margin: 24px auto 48px;
		line-height: 1.8;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}
	h1 {
		font-size: clamp(22px, 4vw, 30px);
		line-height: 1.4;
		color: #ffe985;
	}
	h2 {
		font-size: 20px;
		line-height: 1.5;
		color: #ffe985;
	}
	section {
		margin-top: 32px;
		border-top: 1px solid #78909f;
		padding-top: 8px;
	}
	a {
		overflow-wrap: anywhere;
	}
	li {
		margin: 8px 0;
	}
</style>
