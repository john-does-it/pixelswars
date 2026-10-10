import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'

// Render the supplied SVGs and cumulative damage marks without smoothing pixels.
const directory = new URL('../assets/units/', import.meta.url)
const marks = ['<rect x="76" y="94" width="16" height="8" fill="#45313a"/>', '<rect x="116" y="78" width="8" height="16" fill="#3f2631"/>', '<rect x="92" y="118" width="16" height="8" fill="#3f2631"/>', '<rect x="68" y="118" width="16" height="8" fill="#45313a"/><rect x="124" y="102" width="8" height="8" fill="#e78146"/>']
const browser = await chromium.launch()
try {
	const page = await browser.newPage()
	const previews = []
	for (const player of [1, 2]) {
		const name = `transport-helicopter-${player}`
		const original = readFileSync(new URL(`${name}.svg`, directory), 'utf8')
		const pattern = original.match(/fill="url\(#([^)]+)\)"/)[1]
		for (let stage = 0; stage <= 4; stage++) {
			const filename = `${name}${stage ? `-damage-${stage}` : ''}`
			const vector = original.replace('<svg ', '<svg style="image-rendering:pixelated" shape-rendering="crispEdges" ').replace('</svg>', `<mask id="silhouette" style="mask-type:alpha"><rect width="200" height="200" fill="url(#${pattern})"/></mask><g mask="url(#silhouette)">${marks.slice(0, stage).join('')}</g></svg>`)
			if (stage) writeFileSync(new URL(`${filename}.svg`, directory), vector)
			const source = `data:image/svg+xml;base64,${Buffer.from(vector).toString('base64')}`
			const images = await page.evaluate(async (source) => {
				const image = new Image()
				image.src = source
				await image.decode()
				const canvas = document.createElement('canvas')
				canvas.width = canvas.height = 200
				const context = canvas.getContext('2d')
				context.imageSmoothingEnabled = false
				context.drawImage(image, 0, 0)
				const pixels = context.getImageData(0, 0, 200, 200).data
				let left = 200,
					top = 200,
					right = 0,
					bottom = 0
				for (let y = 0; y < 200; y++)
					for (let x = 0; x < 200; x++)
						if (pixels[(y * 200 + x) * 4 + 3]) {
							left = Math.min(left, x)
							top = Math.min(top, y)
							right = Math.max(right, x + 1)
							bottom = Math.max(bottom, y + 1)
						}
				const fit = document.createElement('canvas')
				fit.width = right - left
				fit.height = bottom - top
				fit.getContext('2d').drawImage(canvas, left, top, fit.width, fit.height, 0, 0, fit.width, fit.height)
				return { full: canvas.toDataURL(), fit: fit.toDataURL() }
			}, source)
			for (const [variant, data] of Object.entries(images)) writeFileSync(new URL(`${filename}${variant === 'fit' ? '-fit' : ''}.png.base64`, directory), data.split(',')[1] + '\n')
			previews.push(images.full)
		}
	}
	await page.setViewportSize({ width: 1000, height: 400 })
	await page.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(5,200px);background:#243226">${previews.map((src) => `<img width="200" height="200" src="${src}">`).join('')}</body>`)
	await page.locator('img').evaluateAll((images) => Promise.all(images.map((image) => image.decode())))
	await page.screenshot({ path: 'docs/air-transport-damage-variants.png' })
} finally {
	await browser.close()
}
