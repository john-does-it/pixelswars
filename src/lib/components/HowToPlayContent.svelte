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
		<li>{translate(messages.terrain_void_description)}</li>
	</ul>
</section>

<section>
	<svelte:element this={headingLevel === 3 ? 'h3' : 'h4'} class="section-title">{translate(messages.touch_and_mouse)}</svelte:element>
	<ul>
		<li>{translate(messages.touch_step_1)}</li>
		<li>{translate(messages.touch_step_2)}</li>
		<li>{translate(messages.movement_range_hint)}</li>
		<li>{translate(messages.touch_step_3)}</li>
		<li>{translate(messages.inspect_enemy_hint)}</li>
	</ul>
</section>

<section>
	<svelte:element this={headingLevel === 3 ? 'h3' : 'h4'} class="section-title">{translate(messages.transport_title)}</svelte:element>
	<p>{translate(messages.transport_rules)}</p>
	<p>{translate(messages.transport_shortcut_hint)}</p>
	<p>{translate(messages.naval_rules)}</p>
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
		<div>
			<dt>{translate(messages.cell_statistics)}</dt>
			<dd>I</dd>
		</div>
		<div>
			<dt>{translate(messages.transport_passengers)}</dt>
			<dd>T</dd>
		</div>
		<div>
			<dt>{translate(messages.next_active_unit)}</dt>
			<dd>Tab</dd>
		</div>
		<div>
			<dt>{translate(messages.previous_active_unit)}</dt>
			<dd>{translate(messages.key_shift_tab)}</dd>
		</div>
		<div>
			<dt>{translate(messages.end_round)}</dt>
			<dd>{translate(messages.key_end)}</dd>
		</div>
	</dl>
	<p>{translate(messages.board_shortcuts_hint)}</p>
</section>

<style>
	section + section {
		margin-top: 20px;
		padding-top: 18px;
		border-top: 1px solid var(--color-border);
	}

	.section-title,
	p,
	ul,
	dl {
		margin: 0;
	}

	.section-title {
		margin-bottom: 10px;
		-webkit-text-stroke: 0;
		font-family: var(--font-body);
		color: var(--color-text);
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
