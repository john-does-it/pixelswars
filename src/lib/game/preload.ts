import { browser } from '$app/environment'
import { asset } from '$app/paths'

let preloadPromise: Promise<void> | undefined
const retainedImages: HTMLImageElement[] = []

function loadImage(path: string): Promise<void> {
	return new Promise((resolve) => {
		const image = new Image()
		retainedImages.push(image)
		image.onload = () => resolve()
		image.onerror = () => resolve()
		image.src = asset(path)
	})
}

async function loadAllVisualAssets(): Promise<void> {
	const response = await fetch(asset('/assets/preload-manifest.json'), { cache: 'force-cache' })
	if (!response.ok) return
	const paths = (await response.json()) as string[]
	await Promise.all(paths.map(loadImage))
}

export function preloadGameAssets(): Promise<void> {
	if (!browser) return Promise.resolve()
	preloadPromise ??= loadAllVisualAssets().catch(() => {})
	return preloadPromise
}
