<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte'
	import { initialState, unitAt, selectedUnit } from '$lib/game/model'
	import { createController } from '$lib/game/controller'
	import { asset } from '$lib/game/asset-path'
	import { createAudio } from '$lib/game/audio'
	import { preferences } from '$lib/preferences.svelte'
	import SelectedUnitStrip from '$lib/components/SelectedUnitStrip.svelte'
	import Modal from '$lib/components/Modal.svelte'
	import StatsPanel from '$lib/components/StatsPanel.svelte'
	import Board from '$lib/components/Board.svelte'
	import type { AudioController, GameMap } from '$lib/game/types'
	import UiIcon from '$lib/components/UiIcon.svelte'
	import TutorialInstruction from '$lib/components/TutorialInstruction.svelte'
	import TextSelector from './TextSelector.svelte'
	import { m } from '$lib/paraglide/messages'
	import { translate } from '$lib/i18n.svelte'
	const topics = [
		{ title: m.move, text: m.site_lesson_movement, tip: m.site_try_moving },
		{ title: m.buildings, text: m.site_lesson_buildings, tip: m.site_building_tip },
		{ title: m.capture, text: m.site_lesson_capture, tip: m.site_capture_tip },
		{ title: m.stat_attack, text: m.site_lesson_combat, tip: m.site_combat_tip },
		{ title: m.transport_title, text: m.site_lesson_transport, tip: m.site_transport_tip }
	]
	let topic = $state(0)
	let audio = $state<AudioController>()
	let showPreview = $state(false)
	function example(index: number): GameMap {
		const map: GameMap = { id: 'tutorial-preview', name: 'Tutorial', cols: 8, rows: 8, cells: Array.from({ length: 64 }, (_, i) => ({ classes: i >= 56 ? ['-road', '-h'] : i === 40 || i === 42 ? ['-forest', '-ongrass'] : i === 48 ? ['-moutain', '-ongrass'] : i === 54 ? ['-grass', '-variant'] : ['-grass'], owner: 0, capturePoints: 20 })), units: [{ type: 'infantry', player: 2, cell: 57 }] }
		if (index === 1 || index === 2) map.cells[50] = { classes: ['-building', '-city', '-ongrass'], owner: index === 1 ? 2 : 0, capturePoints: index === 2 ? 10 : 20 }
		if (index === 3) map.units.push({ type: 'infantry', player: 1, cell: 59 })
		if (index === 4) map.units.push({ type: 'transport', player: 2, cell: 59 })
		return map
	}
	function lessonState(index: number) {
		const state = initialState(example(index))
		state.player = 2
		state.sound = preferences.volume > 0
		state.previewIndex = 57
		if (index === 1) state.units[0].health = 60
		return state
	}
	let gameState = $state(lessonState(0))
	function createLessonController() {
		return createController(gameState, { delay: () => Promise.resolve(), sound: (name) => audio?.sound(name) })
	}
	let controller = $state(untrack(createLessonController))
	const previewCell = $derived(gameState.previewIndex === null ? undefined : gameState.cells[gameState.previewIndex])
	const previewUnit = $derived(previewCell && unitAt(gameState, previewCell.index))
	function selectTopic(index: number) {
		controller.dispose()
		showPreview = false
		topic = index
		gameState = lessonState(index)
		controller = createLessonController()
	}
	function keyboard(event: KeyboardEvent) {
		if (event.key.toLowerCase() === 'i' && !event.ctrlKey && !event.metaKey && !event.altKey) {
			event.preventDefault()
			showPreview = true
			return
		}
		gameState.keyboardLayout = preferences.keyboardLayout
		controller.keydown(event)
	}
	function confirm() {
		if (topic === 2 && selectedUnit(gameState) && gameState.cells[selectedUnit(gameState)!.cell].building) controller.capture()
		else controller.confirm()
	}
	onMount(() => {
		audio = createAudio()
		return () => audio?.dispose()
	})
	$effect(() => {
		audio?.setVolume(preferences.volume)
		audio?.setUnitSelectionEnabled(preferences.unitSelectionSounds)
		gameState.sound = preferences.volume > 0
	})
	onDestroy(() => controller.dispose())
</script>

<h2>{translate(m.how_to_play)}</h2>
<h3>{translate(m.site_tutorials)}</h3>
<div class="tutorial-preview">
	<div class="board-column">
		<Board game={controller} name={translate(m.site_tutorials)} cellSize={40} onkeydown={keyboard} />
		<div class="tutorial-controls">
			<div class="tutorial-inspection"><SelectedUnitStrip cell={previewCell} unit={previewUnit} oninspect={() => (showPreview = true)} /></div>
			<div class="board-actions">
				<button class="pixel-icon-button" aria-label={translate(m.map_editor_undo)} onclick={() => controller.cancel()}><UiIcon name="previous-action" size={40} /></button>
				<button class="pixel-icon-button" aria-label={translate(topic === 2 ? m.capture : m.confirm)} onclick={confirm}><UiIcon name={topic === 2 ? 'icon-capture' : 'validate-action'} size={40} /></button>
			</div>
		</div>
	</div>
	<div class="lesson">
		<p><TutorialInstruction text={translate(topics[topic].text)} /></p>
		<div class="tip">
			<p><TutorialInstruction text={translate(topics[topic].tip)} /></p>
			{#if topic === 0}<div class="keyboard-guide" aria-hidden="true"><img src={asset('/assets/interface/tutorial-arrow-keys.png')} alt="" /><img src={asset('/assets/interface/tutorial-azerty-keys.png')} alt="" /></div>{/if}
		</div>
		<div class="lesson-actions"><button class="site-action" disabled={topic === 0} onclick={() => selectTopic(topic - 1)}>{translate(m.site_previous)}</button><button class="primary site-action" disabled={topic === topics.length - 1} onclick={() => selectTopic(topic + 1)}>{translate(m.site_next)}</button></div>
	</div>
	<div class="topic-menu" role="group" aria-label={translate(m.site_tutorials)}>
		{#each topics as item, i}<TextSelector active={i === topic} marker onclick={() => selectTopic(i)}>{translate(item.title)}</TextSelector>{/each}
	</div>
</div>

{#if showPreview}<Modal title={translate(m.cell_statistics)} alwaysShowScrollbar={false} onclose={() => (showPreview = false)}><StatsPanel state={gameState} /></Modal>{/if}

<style>
	h2 {
		margin: 0 0 36px;
	}
	h3 {
		margin: 0 0 var(--site-gap-large);
		font-size: 36px;
	}
	.tutorial-preview {
		display: grid;
		grid-template-columns: 346px minmax(0, 640px) minmax(149px, 1fr);
		gap: var(--site-gap-large);
		align-items: start;
	}
	.board-column {
		min-width: 0;
	}
	.tutorial-controls {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 12px;
		margin-top: 24px;
	}
	.tutorial-inspection {
		min-width: 0;
		container: unit-footer / inline-size;
	}
	.board-actions,
	.lesson-actions {
		display: flex;
		justify-content: flex-end;
		gap: 40px;
		margin-top: 12px;
	}
	.board-actions {
		gap: 6px;
		margin-top: 0;
	}
	.board-actions button {
		width: 40px;
		height: 40px;
		min-width: 40px;
		min-height: 40px;
	}
	.lesson {
		font-size: 16px;
		line-height: var(--site-body-leading);
	}
	p {
		margin: 0;
	}
	.tip {
		background: var(--site-paper);
		margin-top: 40px;
		padding: 40px;
		display: grid;
		gap: 40px;
	}
	.tip p:last-child {
		margin-bottom: 0;
	}
	.keyboard-guide {
		display: flex;
		gap: 40px;
	}
	.keyboard-guide img {
		width: 136px;
		height: auto;
		image-rendering: pixelated;
	}
	.topic-menu {
		display: flex;
		flex-direction: column;
		align-items: start;
		gap: 24px;
	}
	.topic-menu :global(.text-selector) {
		--selector-active-outline: var(--site-selector-outline);
		font-size: 24px;
		text-align: left;
		white-space: normal;
	}
	@media (max-width: 1100px) {
		.tutorial-preview {
			grid-template-columns: 346px minmax(0, 1fr);
			gap: 20px;
		}
		.topic-menu {
			grid-column: 1/-1;
			grid-row: 1;
			flex-direction: row;
			flex-wrap: wrap;
			gap: 12px;
		}
		.keyboard-guide {
			gap: 12px;
		}
		.keyboard-guide img {
			width: 68px;
		}
	}
	@media (max-width: 640px) {
		h3 {
			font-size: 28px;
		}
		.tutorial-preview {
			grid-template-columns: 1fr;
		}
		.board-column {
			width: min(100%, 346px);
			margin: auto;
		}
		.tip {
			padding: 24px;
			margin-top: 24px;
			gap: 24px;
		}
		.topic-menu {
			gap: 8px 16px;
		}
		.topic-menu :global(.text-selector) {
			font-size: 20px;
		}
		.lesson-actions {
			gap: 24px;
		}
		.board-actions button {
			min-width: 44px;
			min-height: 44px;
		}
	}
</style>
