// Browser-only resource owner, created on mount and disposed on navigation.
import { asset } from '$app/paths'

import type { AudioController, Player } from './types.ts'

const infantrySelectionSounds = ['infantry', 'infantry-2', 'infantry-3', 'infantry-4', 'infantry-5', 'infantry-6', 'infantry-7', 'infantry-8', 'infantry-9', 'infantry-10']

export function createAudio(): AudioController {
	const tracks = new Map<string, HTMLAudioElement>()
	const getTrack = (name: string): HTMLAudioElement => {
		const existing = tracks.get(name)
		if (existing) return existing
		const filename = name === 'bomb' ? 'bombing' : name
		const track = new Audio(asset(`/assets/mp3/${filename}.mp3`))
		tracks.set(name, track)
		return track
	}
	const playTrack = (audio: HTMLAudioElement, volume: number): void => {
		audio.volume = volume
		audio.currentTime = 0
		void audio.play().catch(() => {}) // Autoplay restrictions must not interrupt a turn.
	}
	return {
		sound(name: string) {
			if (name === 'infantry') name = infantrySelectionSounds[Math.floor(Math.random() * infantrySelectionSounds.length)]!
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
		}
	}
}
