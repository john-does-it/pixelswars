import { browser } from '$app/environment'
import { asset } from '$lib/game/asset-path'

let preloadPromise: Promise<void> | undefined
const retainedImages: HTMLImageElement[] = []

function loadImage(path: string): Promise<void> {
	return new Promise((resolve) => {
		const image = new Image()
		retainedImages.push(image)
		image.onload = () => resolve()
		image.onerror = () => resolve()
		image.src = path
	})
}

async function loadAllVisualAssets(): Promise<void> {
	// Revalidate the list after deployments so retired sprite URLs are not reused.
	const response = await fetch(asset('/assets/preload-manifest.json'), { cache: 'no-cache' })
	if (!response.ok) return
	const paths = (await response.json()) as string[]
	await Promise.all([...new Set(paths.map(asset))].map(loadImage))
}

export function preloadGameAssets(): Promise<void> {
	if (!browser) return Promise.resolve()
	preloadPromise ??= loadAllVisualAssets().catch(() => {})
	return preloadPromise
}
