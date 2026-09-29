import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

// Run against the dev server after changing maps or their sprites.
const baseUrl = process.env.PREVIEW_BASE_URL ?? 'http://127.0.0.1:5173'
const output = new URL('../assets/map-previews/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const mapIds = process.argv.length > 2 ? process.argv.slice(2).map(Number) : Array.from({ length: 14 }, (_, index) => index + 1)
if (mapIds.some((id) => !Number.isInteger(id) || id < 1 || id > 14)) throw new Error('Map IDs must be integers between 1 and 14')
const metadata = JSON.parse(await readFile(new URL('../src/lib/data/map-previews.json', import.meta.url), 'utf8'))
try {
	const page = await browser.newPage()
	for (const id of mapIds) {
		const map = JSON.parse(await readFile(new URL(`../src/lib/data/board-${id}.json`, import.meta.url), 'utf8'))
		await page.goto(`${baseUrl}/play/${id}/`)
		await page.locator('.board [data-cell]').first().waitFor()
		const png = await page.locator('.board').evaluate(async (board, { cols, rows }) => {
			const tileSize = 16
			const canvas = document.createElement('canvas')
			canvas.width = cols * tileSize
			canvas.height = rows * tileSize
			const context = canvas.getContext('2d')
			context.imageSmoothingEnabled = false
			const images = new Map()
			async function sprite(element) {
				const background = getComputedStyle(element).backgroundImage
				const url = background.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
				if (!url) throw new Error(`Missing sprite: ${element.className}`)
				if (!images.has(url)) {
					const image = new Image()
					image.src = url
					images.set(
						url,
						image.decode().then(() => image)
					)
				}
				return images.get(url)
			}
			for (const cell of board.querySelectorAll('[data-cell]')) {
				const index = Number(cell.getAttribute('data-cell'))
				const left = (index % cols) * tileSize
				const top = Math.floor(index / cols) * tileSize
				context.drawImage(await sprite(cell), left, top, tileSize, tileSize)
				const unit = cell.querySelector('[data-unit]')
				if (unit) context.drawImage(await sprite(unit), left + 1, top + 1, tileSize - 2, tileSize - 2)
			}
			return canvas.toDataURL('image/png').split(',')[1]
		}, map)
		await writeFile(new URL(`map-${id}.png.base64`, output), `${png}\n`)
		metadata[id] = { cols: map.cols, rows: map.rows, size: map.cols * map.rows <= 100 ? 'small' : map.cols * map.rows <= 160 ? 'medium' : 'large' }
		console.log(`Map ${id}: ${map.cols} × ${map.rows}`)
	}
	await writeFile(new URL('../src/lib/data/map-previews.json', import.meta.url), `${JSON.stringify(metadata, null, '\t')}\n`)
} finally {
	await browser.close()
}
