<script lang="ts">
	type Option = { value: string; label: string }

	let { label, ariaLabel = label, value, options, standalone = false, onchange }: { label: string; ariaLabel?: string; value: string; options: Option[]; standalone?: boolean; onchange: (value: string) => void } = $props()
</script>

<label class:standalone>
	<span>{label}</span>
	<select aria-label={ariaLabel} {value} onchange={(event) => onchange(event.currentTarget.value)}>
		{#each options as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</label>

<style>
	label {
		display: inline-flex;
		align-items: center;
		min-height: 46px;
		flex: 0 0 auto;
		gap: 8px;
		font: 700 16px / 1.5 var(--font-display);
		color: var(--color-text);
	}

	span {
		white-space: nowrap;
	}

	select {
		display: block;
		align-self: center;
	}

	.standalone {
		margin-bottom: 18px;
	}
</style>
