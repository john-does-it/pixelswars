import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

// Run against the dev server after changing maps or their sprites.
const baseUrl = process.env.PREVIEW_BASE_URL ?? 'http://127.0.0.1:5173'
const output = new URL('../assets/map-previews/', import.meta.url)
await mkdir(output, { recursive: true })
const browser = await chromium.launch()
const mapFiles = JSON.parse(await readFile(new URL('../src/lib/data/map-files.json', import.meta.url), 'utf8'))
const mapIds = process.argv.length > 2 ? process.argv.slice(2).map(Number) : Object.keys(mapFiles).map(Number)
if (mapIds.some((id) => !Number.isInteger(id) || !mapFiles[id])) throw new Error('Unknown map ID')
const metadata = JSON.parse(await readFile(new URL('../src/lib/data/map-previews.json', import.meta.url), 'utf8'))
try {
	const page = await browser.newPage()
	for (const id of mapIds) {
		const map = JSON.parse(await readFile(new URL(`../src/lib/data/${mapFiles[id]}`, import.meta.url), 'utf8'))
		await page.goto(`${baseUrl}/play/${id}/`)
		await page.locator('.board [data-cell]').first().waitFor()
		const png = await page.locator('.board').evaluate(async (board, { cols, rows }) => {
			const tileSize = 480 / rows
			const canvas = document.createElement('canvas')
			canvas.width = Math.round(cols * tileSize)
			canvas.height = 480
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
				const col = index % cols
				const row = Math.floor(index / cols)
				const left = Math.round(col * tileSize)
				const top = Math.round(row * tileSize)
				const width = Math.round((col + 1) * tileSize) - left
				const height = Math.round((row + 1) * tileSize) - top
				context.drawImage(await sprite(cell), left, top, width, height)
				const unit = cell.querySelector('[data-unit]')
				if (unit) {
					const inset = Math.round(tileSize / 16)
					context.drawImage(await sprite(unit.querySelector('.unit-sprite')), left + inset, top + inset, width - 2 * inset, height - 2 * inset)
				}
			}
			return canvas.toDataURL('image/png').split(',')[1]
		}, map)
		await writeFile(new URL(`map-${id}.png.base64`, output), `${png}\n`)
		metadata[id] = { cols: map.cols, rows: map.rows }
		console.log(`Map ${id}: ${map.cols} × ${map.rows}`)
	}
	execFileSync(process.env.PYTHON || 'python', [fileURLToPath(new URL('./encode-map-previews.py', import.meta.url)), ...mapIds.map(String)], { stdio: 'inherit' })
	await writeFile(new URL('../src/lib/data/map-previews.json', import.meta.url), `${JSON.stringify(metadata, null, '\t')}\n`)
} finally {
	await browser.close()
}
