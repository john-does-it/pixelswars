// Browser-only resource owner, created on mount and disposed on navigation.
import type { AudioController, Player } from './types.ts'

export function createAudio(base: string): AudioController {
	const tracks = new Map<string, HTMLAudioElement>()
	const get = (name: string): HTMLAudioElement => {
		const existing = tracks.get(name)
		if (existing) return existing
		const track = new Audio(`${base}/assets/mp3/${name === 'bomb' ? 'bombing' : name}.mp3`)
		tracks.set(name, track)
		return track
	}
	const play = (audio: HTMLAudioElement, volume: number): void => {
		audio.volume = volume
		audio.currentTime = 0
		void audio.play().catch(() => {}) // Autoplay restrictions must not interrupt a turn.
	}
	return {
		sound(name: string) {
			if (name === 'infantry') name = ['infantry', 'infantry-2', 'infantry-3'][Math.floor(Math.random() * 3)]!
			play(get(name), 0.5)
		},
		music(enabled: boolean, player: Player) {
			for (const name of ['player-one-music', 'player-two-music']) tracks.get(name)?.pause()
			if (enabled) {
				const track = get(player === 1 ? 'player-one-music' : 'player-two-music')
				track.loop = true
				play(track, 0.125)
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
