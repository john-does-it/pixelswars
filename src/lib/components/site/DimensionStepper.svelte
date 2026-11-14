<script lang="ts">
	let { label, value, min = 2, max = 32, step = 1, onchange }: { label: string; value: number; min?: number; max?: number; step?: number; onchange: (value: number) => void } = $props()
</script>

<div class="dimension-stepper">
	<span class="label">{label}</span>
	<div class="stepper" role="group" aria-label={label + ': ' + value}>
		<button type="button" aria-label={label + ' −'} disabled={value <= min} onclick={() => onchange(value - step)}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10h18v4H3z" /></svg>
		</button>
		<button type="button" aria-label={label + ' +'} disabled={value >= max} onclick={() => onchange(value + step)}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" /></svg>
		</button>
	</div>
</div>

<style>
	.dimension-stepper {
		display: grid;
		gap: 8px;
		justify-items: start;
	}
	.label {
		font: 700 16px var(--font-body);
		color: var(--site-plum);
	}
	.stepper {
		display: flex;
		border: 4px solid var(--site-plum);
		background: var(--site-yellow);
	}
	button {
		min-width: 0;
		min-height: 0;
		display: grid;
		place-items: center;
		border: 0;
		box-shadow: none;
		width: 36px;
		height: 32px;
		padding: 0;
		background: none;
		color: var(--site-paper);
	}
	svg {
		display: block;
		width: 24px;
		height: 24px;
		fill: currentColor;
		stroke: var(--site-plum);
		stroke-width: var(--site-card-outline);
		paint-order: stroke fill;
	}
	button:first-child {
		background: var(--site-cream);
	}
	button::before,
	button::after {
		display: none;
	}
	button:disabled {
		opacity: 0.4;
	}

	button:hover:not(:disabled) {
		background: transparent;
		filter: none;
	}
	button:first-child:hover:not(:disabled) {
		background: var(--site-cream);
	}
	@media (pointer: coarse) {
		button {
			width: 44px;
			height: 40px;
		}
	}
</style>
