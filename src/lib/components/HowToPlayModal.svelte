<script lang="ts">
	import Modal from './Modal.svelte'
	import type { KeyboardLayout } from '$lib/game/types.js'

	let { keyboardLayout, onlayoutchange, onclose }: { keyboardLayout: KeyboardLayout; onlayoutchange: (layout: KeyboardLayout) => void; onclose: () => void } = $props()
</script>

<Modal title="How to play" {onclose}>
	<section>
		<h3>Goal</h3>
		<p>Destroy every opposing unit to win.</p>
	</section>

	<section>
		<h3>Playing a turn</h3>
		<ul>
			<li>Select one of your units, then move through the highlighted cells.</li>
			<li>Attack an enemy within range, or capture a building with infantry.</li>
			<li>Confirm the move when finished. End the round to pass to the other player.</li>
		</ul>
	</section>

	<section>
		<h3>Buildings and terrain</h3>
		<ul>
			<li>Capture a building twice to claim it. Its owner can secure interrupted captures.</li>
			<li>Cities provide 200$, hospitals restore 25 health, and factories or airports produce units.</li>
			<li>Terrain changes movement and defense. Aircraft always spend 1 movement per cell.</li>
		</ul>
	</section>

	<section>
		<h3>Touch and mouse</h3>
		<ul>
			<li>Tap or click one of your units to select it.</li>
			<li>Tap or click highlighted cells to move, or an indicated enemy to attack.</li>
			<li>Use the buttons below the board to confirm, cancel, capture, or end the round.</li>
		</ul>
	</section>

	<section>
		<h3>Keyboard</h3>
		<div class="keyboard-setting">
			<span>Movement layout</span>
			<div class="layout-options" aria-label="Keyboard movement layout">
				<button aria-pressed={keyboardLayout === 'azerty'} onclick={() => onlayoutchange('azerty')}>AZERTY · ZQSD</button>
				<button aria-pressed={keyboardLayout === 'qwerty'} onclick={() => onlayoutchange('qwerty')}>QWERTY · WASD</button>
			</div>
		</div>
		<dl>
			<div>
				<dt>Move</dt>
				<dd>Arrow keys or {keyboardLayout === 'azerty' ? 'ZQSD' : 'WASD'}</dd>
			</div>
			<div>
				<dt>Confirm</dt>
				<dd>Enter</dd>
			</div>
			<div>
				<dt>Cancel / close</dt>
				<dd>Escape</dd>
			</div>
			<div>
				<dt>Capture / secure</dt>
				<dd>Space</dd>
			</div>
		</dl>
	</section>
</Modal>

<style>
	section + section {
		margin-top: 20px;
		padding-top: 18px;
		border-top: 1px solid #78909f;
	}

	h3,
	p,
	ul,
	dl {
		margin: 0;
	}

	h3 {
		margin-bottom: 10px;
		color: #ffe985;
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

	.keyboard-setting {
		display: grid;
		gap: 8px;
		margin-bottom: 14px;
	}

	.keyboard-setting > span,
	dt {
		font-weight: bold;
	}

	.layout-options {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.layout-options button[aria-pressed='true'] {
		color: #202a32;
		background: #ffe985;
		border-color: #ffe985;
		font-weight: bold;
	}

	dl div {
		display: grid;
		grid-template-columns: minmax(140px, 1fr) 1fr;
		gap: 16px;
	}

	dd {
		margin: 0;
	}
</style>
