import { browser } from '$app/environment'
import { asset } from '$lib/game/asset-path'

let preloadPromise: Promise<void> | undefined
const retainedImages = new Map<string, HTMLImageElement>()

async function loadImage(path: string): Promise<void> {
	if (retainedImages.has(path)) return
	for (let attempt = 0; attempt < 2; attempt++) {
		const image = new Image()
		try {
			await new Promise<void>((resolve, reject) => {
				image.onload = () => resolve()
				image.onerror = () => reject(new Error(`Could not preload sprite: ${path}`))
				image.src = path
			})
			// A completed download is not necessarily ready to paint when a CSS
			// background changes during combat or capture.
			await image.decode()
			retainedImages.set(path, image)
			return
		} catch (error) {
			if (attempt === 1) throw error
		} finally {
			image.onload = null
			image.onerror = null
		}
	}
}

async function loadAllVisualAssets(): Promise<void> {
	const response = await fetch(asset('/assets/preload-manifest.json'), { cache: 'no-cache' })
	if (!response.ok) throw new Error(`Could not load sprite manifest: ${response.status}`)
	const paths = (await response.json()) as string[]
	// Gallery artwork is loaded on demand, independently of gameplay sprites.
	const results = await Promise.allSettled([...new Set(paths.filter((path) => !path.startsWith('/assets/illustrations/')).map(asset))].map(loadImage))
	const failures = results.filter((result) => result.status === 'rejected')
	if (failures.length) throw new AggregateError(failures.map((result) => result.reason), 'Some game sprites could not be prepared')
}

export function preloadGameAssets(): Promise<void> {
	if (!browser) return Promise.resolve()
	preloadPromise ??= loadAllVisualAssets().catch((error) => {
		// Keep the game usable offline, but report failures and retry missing
		// assets on the next match instead of caching an unsuccessful preload.
		console.warn('Game sprite preloading incomplete', error)
		preloadPromise = undefined
	})
	return preloadPromise
}
