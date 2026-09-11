// Browser-only resource owner, created on mount and disposed on navigation.
export function createAudio(base) {
	const tracks = new Map()
	const get = (name) => {
		if (!tracks.has(name)) tracks.set(name, new Audio(`${base}/assets/mp3/${name === 'bomb' ? 'bombing' : name}.mp3`))
		return tracks.get(name)
	}
	const play = (audio, volume) => {
		audio.volume = volume
		audio.currentTime = 0
		void audio.play().catch(() => {}) // Autoplay restrictions must not interrupt a turn.
	}
	return {
		sound(name) {
			if (name === 'infantry') name = ['infantry', 'infantry-2', 'infantry-3'][Math.floor(Math.random() * 3)]
			play(get(name), 0.5)
		},
		music(enabled, player) {
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
