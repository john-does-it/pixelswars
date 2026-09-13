<script lang="ts">
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { KeyboardLayout } from '$lib/game/types.js'
	let { keyboardLayout, headingLevel = 3 }: { keyboardLayout: KeyboardLayout; headingLevel?: 3 | 4 } = $props()
</script>

<section>
	<svelte:element this={headingLevel === 3 ? 'h3' : 'h4'} class="section-title">{translate(messages.goal)}</svelte:element>
	<p>{translate(messages.goal_text)}</p>
</section>

<section>
	<svelte:element this={headingLevel === 3 ? 'h3' : 'h4'} class="section-title">{translate(messages.playing_turn)}</svelte:element>
	<ul>
		<li>{translate(messages.turn_step_1)}</li>
		<li>{translate(messages.turn_step_2)}</li>
		<li>{translate(messages.turn_step_3)}</li>
	</ul>
</section>

<section>
	<svelte:element this={headingLevel === 3 ? 'h3' : 'h4'} class="section-title">{translate(messages.buildings_and_terrain)}</svelte:element>
	<ul>
		<li>{translate(messages.rules_building_1)}</li>
		<li>{translate(messages.rules_building_2)}</li>
		<li>{translate(messages.rules_building_3)}</li>
		<li>{translate(messages.rules_mountain)}</li>
	</ul>
</section>

<section>
	<svelte:element this={headingLevel === 3 ? 'h3' : 'h4'} class="section-title">{translate(messages.touch_and_mouse)}</svelte:element>
	<ul>
		<li>{translate(messages.touch_step_1)}</li>
		<li>{translate(messages.touch_step_2)}</li>
		<li>{translate(messages.touch_step_3)}</li>
	</ul>
</section>

<section>
	<svelte:element this={headingLevel === 3 ? 'h3' : 'h4'} class="section-title">{translate(messages.keyboard)}</svelte:element>
	<p class="keyboard-layout">{translate(messages.current_layout)} <strong>{keyboardLayout === 'azerty' ? 'AZERTY · ZQSD' : 'QWERTY · WASD'}</strong></p>
	<dl>
		<div>
			<dt>{translate(messages.move)}</dt>
			<dd>{translate(messages.arrow_keys_or, { keys: keyboardLayout === 'azerty' ? 'ZQSD' : 'WASD' })}</dd>
		</div>
		<div>
			<dt>{translate(messages.confirm)}</dt>
			<dd>{translate(messages.key_enter)}</dd>
		</div>
		<div>
			<dt>{translate(messages.cancel_close)}</dt>
			<dd>{translate(messages.key_escape)}</dd>
		</div>
		<div>
			<dt>{translate(messages.capture_secure)}</dt>
			<dd>{translate(messages.key_space)}</dd>
		</div>
	</dl>
</section>

<style>
	section + section {
		margin-top: 20px;
		padding-top: 18px;
		border-top: 1px solid #78909f;
	}

	.section-title,
	p,
	ul,
	dl {
		margin: 0;
	}

	.section-title {
		margin-bottom: 10px;
		color: #e5edf1;
		font-size: 16px;
	}

	p,
	li,
	dt,
	dd {
		line-height: 1.5;
	}

	ul {
		padding-left: 20px;
	}

	li + li {
		margin-top: 7px;
	}

	dl {
		display: grid;
		gap: 7px;
	}

	dt {
		font-weight: bold;
	}

	.keyboard-layout {
		margin-bottom: 14px;
	}

	dl div {
		display: grid;
		grid-template-columns: minmax(140px, 1fr) 1fr;
		gap: 16px;

		@media (max-width: 480px) {
			grid-template-columns: minmax(0, 1fr);
			gap: 4px;
		}
	}

	dd {
		margin: 0;
	}
</style>
