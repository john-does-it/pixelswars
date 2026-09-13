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
		height: 46px;
		min-height: 46px;
		flex: 0 0 auto;
		padding-left: 10px;
		color: #dce6eb;
		background: #19242c;
		border: 1px solid #78909f;
		border-radius: 5px;
		overflow: hidden;

		&:has(select:focus-visible) {
			outline: 3px solid #ffe985;
			outline-offset: 3px;
		}
	}

	span {
		font-size: 13px;
		font-weight: bold;
		white-space: nowrap;
	}

	select {
		display: block;
		height: 44px;
		min-height: 44px;
		align-self: center;
		margin-left: 8px;
		font: inherit;
		font-size: 13px;
		line-height: normal;
		color: inherit;
		background: #2b3d49;
		border: 0;
		border-left: 1px solid #78909f;
		border-radius: 0;
		padding: 0 9px;
		cursor: pointer;

		&:focus-visible {
			outline: none;
		}
	}

	.standalone {
		margin-bottom: 18px;
	}
</style>
