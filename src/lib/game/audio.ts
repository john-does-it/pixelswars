// Browser-only resource owner, created on mount and disposed on navigation.
import { asset } from '$lib/game/asset-path'
import { unitTypes } from './catalog.ts'

import type { AudioController, Player } from './types.ts'

const infantrySelectionSounds = ['infantry-voice-1', 'infantry-voice-2', 'infantry-voice-3', 'infantry-voice-4', 'infantry-voice-5', 'infantry-voice-6']

const selectionSounds = new Set(['infantry', ...infantrySelectionSounds, ...Object.values(unitTypes).map((unit) => unit.selectSound)])

export function createAudio(): AudioController {
	const tracks = new Map<string, HTMLAudioElement>()
	let masterVolume = 1
	let unitSelectionEnabled = true
	const trackVolumes = new Map<HTMLAudioElement, number>()
	const getTrack = (name: string): HTMLAudioElement => {
		const existing = tracks.get(name)
		if (existing) return existing
		const filename = name === 'bomb' ? 'bombing' : name
		const track = new Audio(asset(`/assets/mp3/${filename}.mp3`))
		tracks.set(name, track)
		return track
	}
	const playTrack = (audio: HTMLAudioElement, volume: number): void => {
		trackVolumes.set(audio, volume)
		audio.volume = volume * masterVolume
		audio.currentTime = 0
		void audio.play().catch(() => {}) // Autoplay restrictions must not interrupt a turn.
	}
	return {
		setVolume(volume: number) {
			masterVolume = Number.isFinite(volume) ? Math.max(0, Math.min(100, volume)) / 100 : 1
			for (const [track, volume] of trackVolumes) track.volume = volume * masterVolume
		},
		setUnitSelectionEnabled(enabled: boolean) {
			unitSelectionEnabled = enabled
			if (!enabled) for (const [name, track] of tracks) if (selectionSounds.has(name)) track.pause()
		},
		sound(name: string) {
			if (!unitSelectionEnabled && selectionSounds.has(name)) return
			if (name === 'infantry' || name === infantrySelectionSounds[0]) name = infantrySelectionSounds[Math.floor(Math.random() * infantrySelectionSounds.length)]!
			playTrack(getTrack(name), 0.5)
		},
		music(enabled: boolean, player: Player) {
			for (const name of ['player-one-music', 'player-two-music']) tracks.get(name)?.pause()
			if (enabled) {
				const track = getTrack(player === 1 ? 'player-one-music' : 'player-two-music')
				track.loop = true
				playTrack(track, 0.125)
			}
		},
		dispose() {
			for (const track of tracks.values()) {
				track.pause()
				track.removeAttribute('src')
				track.load()
			}
			tracks.clear()
			trackVolumes.clear()
		}
	}
}
