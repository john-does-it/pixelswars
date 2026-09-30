import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

// Extract only the pale blue ripple pixels. Shorelines, grass and units are untouched.
const source = new URL('../assets/cells/', import.meta.url)
const output = new URL('water-shimmer/', source)
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
try {
	const page = await browser.newPage()
	const names = (await readdir(source)).filter((name) => /^cell-water.*\.png$/.test(name))
	for (const name of names) {
		const imageSource = `data:image/png;base64,${(await readFile(new URL(name, source))).toString('base64')}`
		const mask = await page.evaluate(async (imageSource) => {
			const image = new Image()
			image.src = imageSource
			await image.decode()
			const canvas = document.createElement('canvas')
			canvas.width = image.width
			canvas.height = image.height
			const context = canvas.getContext('2d')
			context.drawImage(image, 0, 0)
			const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
			for (let offset = 0; offset < pixels.data.length; offset += 4) {
				const [red, green, blue, alpha] = pixels.data.slice(offset, offset + 4)
				const ripple = blue > 225 && green > 205 && red > 130 && red < 245 && blue - red > 15
				pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = 255
				pixels.data[offset + 3] = ripple ? alpha : 0
			}
			context.putImageData(pixels, 0, 0)
			return canvas.toDataURL('image/png').split(',')[1]
		}, imageSource)
		await writeFile(new URL(name, output), Buffer.from(mask, 'base64'))
	}
	console.log(`Generated ${names.length} water ripple masks`)
} finally {
	await browser.close()
}
