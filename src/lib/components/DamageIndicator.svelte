<script lang="ts">
	import { onDestroy } from 'svelte'
	import CellFeedback from './CellFeedback.svelte'
	import { cellFeedbackDuration } from '$lib/game/timing.js'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { Unit } from '$lib/game/types.js'

	let { unit }: { unit?: Unit } = $props()
	let previous: { id: number; health: number } | undefined
	let hit = $state<{ amount: number; sequence: number }>()
	let sequence = 0
	let timeout: ReturnType<typeof setTimeout> | undefined

	$effect(() => {
		const current = unit ? { id: unit.id, health: unit.health } : undefined
		if (current && previous?.id === current.id && current.health < previous.health) {
			hit = { amount: previous.health - current.health, sequence: ++sequence }
			clearTimeout(timeout)
			timeout = setTimeout(() => (hit = undefined), cellFeedbackDuration)
		}
		previous = current
	})
	onDestroy(() => clearTimeout(timeout))
</script>

{#if hit}
	{#key hit.sequence}
		<CellFeedback text={`−${hit.amount}`} tone="damage" class="damage-indicator" label={translate(messages.damage_received, { amount: hit.amount })} announce />
	{/key}
{/if}
