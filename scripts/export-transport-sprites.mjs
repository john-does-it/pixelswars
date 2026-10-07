import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'

// Keep the supplied SVG layout while rendering its native pixel image without smoothing.
const browser = await chromium.launch()
try {
	const page = await browser.newPage({ viewport: { width: 200, height: 200 }, deviceScaleFactor: 1 })
	for (const player of [1, 2]) {
		const source = new URL(`../assets/units/transport-${player}.svg`, import.meta.url)
		const original = readFileSync(source, 'utf8')
		const embeddedImage = original.match(/(?:xlink:)?href="(data:image\/png;base64,[^"]+)"/)?.[1]
		const transform = original.match(/translate\(([^ ]+) ([^)]+)\) scale\(([^)]+)\)/)
		if (!embeddedImage || !transform) throw new Error(`Unsupported transport SVG layout: ${source}`)
		const bitmap = await page.evaluate(
			async ({ embeddedImage, offsetX, offsetY, scale }) => {
				const image = new Image()
				image.src = embeddedImage
				await image.decode()
				const canvas = document.createElement('canvas')
				canvas.width = canvas.height = 200
				const context = canvas.getContext('2d')
				context.imageSmoothingEnabled = false
				context.drawImage(image, Math.round(offsetX * 200), Math.round(offsetY * 200), image.width * scale * 200, image.height * scale * 200)
				return canvas.toDataURL('image/png').split(',')[1]
			},
			{ embeddedImage, offsetX: Number(transform[1]), offsetY: Number(transform[2]), scale: Number(transform[3]) }
		)
		writeFileSync(new URL(`../assets/units/transport-${player}.png.base64`, import.meta.url), bitmap + '\n')
	}
} finally {
	await browser.close()
}
