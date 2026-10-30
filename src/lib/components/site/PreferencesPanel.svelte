<script lang="ts">
	import { preferences, updatePreferences, type Preferences } from '$lib/preferences.svelte'
	import UiIcon from '$lib/components/UiIcon.svelte'
	import SettingSelect from '$lib/components/SettingSelect.svelte'
	import LanguageSelect from '$lib/components/LanguageSelect.svelte'
	import { m } from '$lib/paraglide/messages'
	import { translate } from '$lib/i18n.svelte'
	import type { KeyboardLayout } from '$lib/game/types'
	let { onmusic, onkeyboard }: { onmusic?: (value: boolean) => void; onkeyboard?: (value: KeyboardLayout) => void } = $props()
	const volumeId = $props.id()
	const toggles = [
		{ key: 'animations', label: m.animations },
		{ key: 'buildingLights', label: m.building_lights },
		{ key: 'unitFacing', label: m.unit_facing },
		{ key: 'confirmEndTurn', label: m.confirm_end_turn }
	] as const
	function toggle(key: keyof Preferences, value: boolean) {
		updatePreferences({ [key]: value })
		if (key === 'music') onmusic?.(value)
	}
</script>

<div class="preferences-panel settings-controls">
	<div class="audio-controls" role="group" aria-label={translate(m.sound)}>
		<div class="volume-control">
			<button class="pixel-icon-button" aria-label={translate(preferences.volume > 0 ? m.sound_on : m.sound_off)} aria-pressed={preferences.volume > 0} onclick={() => updatePreferences({ volume: preferences.volume > 0 ? 0 : 100, sound: preferences.volume === 0 })}><UiIcon name={preferences.volume > 0 ? 'icon-play-sound' : 'icon-mute-sound'} /></button>
			<label for={volumeId}>{translate(m.sound)}</label>
			<input id={volumeId} type="range" min="0" max="100" step="5" value={preferences.volume} aria-label={translate(m.sound)} aria-valuetext={preferences.volume + '%'} oninput={(e) => updatePreferences({ volume: e.currentTarget.valueAsNumber, sound: e.currentTarget.valueAsNumber > 0 })} />
			<output aria-hidden="true">{preferences.volume}%</output>
		</div>
		<div class="audio-toggles">
			<button class="audio-toggle pixel-icon-control" disabled={preferences.volume === 0} aria-label={translate(preferences.music ? m.music_on : m.music_off)} aria-pressed={preferences.music} onclick={() => toggle('music', !preferences.music)}><span>{translate(m.music)}</span><UiIcon name={preferences.music ? 'icon-play-sound' : 'icon-mute-sound'} /></button>
			<button class="audio-toggle pixel-icon-control" disabled={preferences.volume === 0} aria-pressed={preferences.unitSelectionSounds} onclick={() => toggle('unitSelectionSounds', !preferences.unitSelectionSounds)}><span>{translate(m.unit_selection_sound)}</span><UiIcon name={preferences.unitSelectionSounds ? 'icon-play-sound' : 'icon-mute-sound'} /></button>
		</div>
	</div>
	<LanguageSelect compact />
	{#each toggles as setting}
		<SettingSelect
			label={translate(setting.label)}
			value={preferences[setting.key] ? 'on' : 'off'}
			disabled={setting.key === 'buildingLights' && !preferences.animations}
			options={[
				{ value: 'on', label: translate(m.setting_on) },
				{ value: 'off', label: translate(m.setting_off) }
			]}
			onchange={(value) => toggle(setting.key, value === 'on')}
		/>
	{/each}
	<SettingSelect
		label={translate(m.keyboard)}
		ariaLabel={translate(m.keyboard_movement_layout)}
		value={preferences.keyboardLayout}
		options={[
			{ value: 'azerty', label: 'AZERTY · ZQSD' },
			{ value: 'qwerty', label: 'QWERTY · WASD' }
		]}
		onchange={(value) => {
			updatePreferences({ keyboardLayout: value as KeyboardLayout })
			onkeyboard?.(value as KeyboardLayout)
		}}
	/>
</div>

<style>
	.audio-controls {
		grid-column: 1/-1;
		min-width: 0;
		display: grid;
		gap: 16px;
	}
	.volume-control {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		min-width: 0;
	}
	.volume-control input {
		flex: 1;
		width: 0;
		min-width: 24px;
		min-height: 44px;
		margin: 0;
	}
	.volume-control output {
		min-width: 4ch;
		text-align: right;
		font-weight: 700;
	}
	.audio-toggles {
		display: grid;
		grid-template-columns: 1fr;
		gap: 16px;
	}
	.audio-toggle {
		display: flex;
		justify-content: space-between;
		padding: 0;
		align-items: center;
		min-height: 44px;
		gap: 8px;
		border: 0;
		background: transparent;
		color: var(--site-plum);
		min-width: 0;
		text-align: left;
		line-height: 1.4;
	}
	.audio-toggle:hover:not(:disabled) {
		background: transparent;
		filter: none;
	}
	.audio-toggle span {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	@media (max-width: 520px) {
		.audio-toggles {
			grid-template-columns: 1fr;
			gap: 12px;
		}
	}

	.preferences-panel {
		display: grid;
		grid-template-columns: 1fr;
		gap: 24px;
	}
	.preferences-panel :global(label) {
		min-width: 0;
		flex-direction: column;
		align-items: stretch;
	}
	.preferences-panel :global(label > span) {
		white-space: normal;
	}
	.preferences-panel :global(select) {
		width: 100%;
		max-width: 100%;
		align-self: stretch;
	}
	label {
		display: block;
		font-size: 16px;
		font-weight: 700;
	}
	input {
		width: 100%;
		accent-color: var(--site-red, #e84537);
	}
	@media (max-width: 520px) {
		.preferences-panel {
			grid-template-columns: 1fr;
		}
	}
</style>
