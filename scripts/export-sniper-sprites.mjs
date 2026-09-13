import { chromium } from '@playwright/test'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const outputDirectory = new URL('../assets/units/', import.meta.url)
mkdirSync(outputDirectory, { recursive: true })

// One block per scratch, using the sprite outline color and its native pixel grid.
const damageStages = [
	[
		{ left: 92, top: 64, width: 8, height: 8, color: 'outline' },
		{ left: 84, top: 88, width: 8, height: 8, color: 'wound' }
	],
	[
		{ left: 108, top: 101, width: 7, height: 7, color: 'outline' },
		{ left: 116, top: 125, width: 8, height: 7, color: 'wound' }
	],
	[
		{ left: 147, top: 112, width: 7, height: 7, color: 'outline' },
		{ left: 80, top: 140, width: 8, height: 8, color: 'wound' }
	],
	[
		{ left: 108, top: 141, width: 8, height: 8, color: 'outline' },
		{ left: 92, top: 88, width: 8, height: 8, color: 'darkWound' }
	]
]

const browser = await chromium.launch()
try {
	const page = await browser.newPage({ viewport: { width: 1000, height: 456 }, deviceScaleFactor: 1 })
	const previewImages = []
	for (const player of [1, 2]) {
		const original = readFileSync(new URL(`../assets/temp/infantry-sniper-${player}.svg`, import.meta.url), 'utf8')
		const colors = { outline: '#3f2631', wound: player === 2 ? '#76031c' : '#ba343c', darkWound: player === 2 ? '#380211' : '#8f1d31' }
		for (let stage = 0; stage <= damageStages.length; stage++) {
			const marks = damageStages
				.slice(0, stage)
				.flat()
				.map(({ left, top, width, height, color }) => `<rect x="${left}" y="${top + (player === 2 ? -1 : 0)}" width="${width}" height="${height}" fill="${colors[color]}"/>`)
				.join('\n')
			const vector = original.replace('<defs>', `${marks}\n<defs>`)
			const filename = `infantry-sniper-${player}${stage ? `-damage-${stage}` : ''}`
			writeFileSync(new URL(`${filename}.svg`, outputDirectory), vector)
			const source = `data:image/svg+xml;base64,${Buffer.from(vector).toString('base64')}`
			const exported = await page.evaluate(async (source) => {
				const image = new Image()
				image.src = source
				await image.decode()
				const canvas = document.createElement('canvas')
				canvas.width = canvas.height = 200
				const context = canvas.getContext('2d')
				context.drawImage(image, 0, 0)
				const pixels = context.getImageData(0, 0, 200, 200).data
				let left = 200,
					top = 200,
					right = 0,
					bottom = 0
				for (let row = 0; row < 200; row++) {
					for (let column = 0; column < 200; column++) {
						if (pixels[(row * 200 + column) * 4 + 3]) {
							left = Math.min(left, column)
							top = Math.min(top, row)
							right = Math.max(right, column + 1)
							bottom = Math.max(bottom, row + 1)
						}
					}
				}
				const cropped = document.createElement('canvas')
				cropped.width = right - left
				cropped.height = bottom - top
				cropped.getContext('2d').drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height)
				return { full: canvas.toDataURL('image/png'), fit: cropped.toDataURL('image/png') }
			}, source)
			for (const [variant, dataUrl] of Object.entries(exported)) {
				const encoded = dataUrl.split(',')[1]
				const basename = `${filename}${variant === 'fit' ? '-fit' : ''}.png`
				writeFileSync(new URL(basename, outputDirectory), Buffer.from(encoded, 'base64'))
				writeFileSync(new URL(`${basename}.base64`, outputDirectory), `${encoded}\n`)
			}
			previewImages.push(exported.full)
		}
	}
	const labels = ['Healthy', 'Light damage', 'Moderate damage', 'Heavy damage', 'Critical']
	await page.setContent(`<body style="margin:0;background:#19242c;color:white;font:14px monospace"><div style="display:grid;grid-template-columns:repeat(5,200px);text-align:center">${labels.map((label) => `<p>${label}</p>`).join('')}${previewImages.map((source) => `<img width="200" height="200" style="background:#85bd67;image-rendering:pixelated" src="${source}">`).join('')}</div></body>`)
	await page.locator('img').evaluateAll((images) => Promise.all(images.map((image) => image.decode())))
	await page.screenshot({ path: `${projectRoot}/docs/sniper-damage-variants.png` })
} finally {
	await browser.close()
}
