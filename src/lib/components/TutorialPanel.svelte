<script lang="ts">
	import TutorialInstruction from './TutorialInstruction.svelte'
	import Modal from './Modal.svelte'
	import { tick } from 'svelte'
	import { resolve } from '$app/paths'
	import { m as messages } from '$lib/paraglide/messages.js'
	import { translate } from '$lib/i18n.svelte.js'
	import type { GameState } from '$lib/game/types.ts'
	import { tutorialMessage, type TutorialScenario, type TutorialProgress } from '$lib/game/tutorial.ts'
	let { state: gameState, scenario, progress, onrestart }: { state: GameState; scenario: TutorialScenario; progress: TutorialProgress; onrestart: () => void } = $props()
	let showCommands = $state(false)
	let commandButton = $state<HTMLButtonElement>()
	async function closeCommands() {
		showCommands = false
		await tick()
		commandButton?.focus({ preventScroll: true })
	}
	const step = $derived(scenario.steps[progress.step])
</script>

<section class="tutorial-guide" data-lesson={scenario.id} data-step={step.id} data-completed={progress.completed} aria-label={translate(messages.tutorial_title)}>
	<div class="guide-inner game-context-container">
		<div class="guide-heading">
			<strong>{translate(messages[step.section])}</strong>
			<a href={resolve('/', {})}>{translate(messages.tutorial_exit)}</a>
		</div>
		<div id="tutorial-instruction" role="status" aria-live="polite" aria-atomic="true">
			{#if progress.enemy}<p>{translate(messages[progress.enemy])}</p>
			{:else if progress.failed}<p>{translate(messages.tutorial_failed)}</p>
			{:else if progress.completed}<p>{translate(messages.mission_complete)}</p>
			{:else}
				{#if tutorialMessage(gameState, scenario, progress) !== step.message}<p class="coach"><TutorialInstruction text={translate(messages[tutorialMessage(gameState, scenario, progress)])} /></p>{/if}
				<p><strong>{translate(messages.mission_objective, { current: progress.step + 1, total: 3 })}.</strong> {translate(messages[step.message])}</p>
			{/if}
		</div>
		<div class="guide-actions">
			<button bind:this={commandButton} aria-haspopup="dialog" onclick={() => (showCommands = true)}>{translate(messages.mission_commands)}</button>
			<button onclick={onrestart}>{translate(messages.tutorial_retry)}</button>
			{#if progress.completed}<a class="button primary" href={resolve('/', {}) + '#maps'}>{translate(messages.tutorial_play)}</a>{/if}
		</div>
	</div>
</section>

{#if showCommands}
	<Modal title={translate(messages.mission_commands)} alwaysShowScrollbar={false} onclose={closeCommands}>
		<p>{translate(messages[scenario.summary])}</p>
		{#each [messages.mission_tip_move, messages.mission_tip_undo, messages.mission_tip_capture, messages.mission_tip_combat, messages.mission_tip_heal, messages.mission_tip_produce, messages.mission_tip_board, messages.mission_tip_unload] as message}
			<p><TutorialInstruction text={translate(message)} /></p>
		{/each}
	</Modal>
{/if}

<style>
	.tutorial-guide {
		flex: none;
		height: 176px;
		overflow: hidden;
		background: var(--color-surface);
		border-block: 1px solid var(--color-border);
	}
	.guide-inner {
		padding: 10px var(--game-panel-inset);
		font-size: 14px;
		height: 100%;
		display: grid;
		grid-template-rows: auto minmax(0, 1fr) auto;
	}
	.guide-heading,
	.guide-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}
	.guide-heading strong {
		color: var(--color-accent);
	}
	p {
		margin: 8px 0;
		line-height: 1.5;
	}
	#tutorial-instruction {
		overflow-y: auto;
	}
	.coach {
		color: var(--color-text-muted);
	}
	.guide-actions {
		justify-content: flex-end;
		margin-top: 8px;
	}
	button,
	.button {
		font-size: 13px;
		padding: 6px 10px;
	}
</style>
