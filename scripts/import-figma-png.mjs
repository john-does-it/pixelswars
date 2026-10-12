import { chromium } from '@playwright/test'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

// Figma exports are archived separately from the runtime subset. Original PNGs
// remain authoring inputs for the damage/terrain generators.
const root = resolve(import.meta.dirname, '..')
const catalog = JSON.parse(readFileSync(resolve(root, 'docs/artwork/figma/asset-catalog.json'), 'utf8'))
const aliases = {}
const mappings = []
const read = (file) => readFileSync(resolve(root, file), 'utf8').trim()
const save = (file, data) => {
	mkdirSync(dirname(resolve(root, file)), { recursive: true })
	writeFileSync(resolve(root, file), data + '\n')
}
const include = (entry, legacy) => {
	const source = `docs/artwork/figma/png-2x/${entry.exportFile}.base64`
	if (!existsSync(resolve(root, source))) return
	const target = `assets/figma/${entry.exportFile}`
	save(target + '.base64', read(source))
	aliases[`/assets/${legacy}`] = '/' + target
	mappings.push({ nodeId: entry.id, legacy, exported: entry.exportFile })
}

for (const entry of catalog.assets) {
	// Keep the original SVG button icons.
	if (entry.name.startsWith('icons/stats/') && existsSync(resolve(root, `assets/icons/${entry.originalName}.png.base64`))) include(entry, `icons/${entry.originalName}.png`)
	if (entry.name.startsWith('icons/cargo/')) include(entry, `icons/cargo-count-${entry.originalName}.png`)
	if (entry.name.startsWith('cells/buildings/') && entry.originalName.startsWith('cell-')) {
		const name = entry.originalName.replaceAll('half-captured', 'halfcaptured')
		const legacy = `cells/${name}.png`
		// An incorrectly named oil-field duplicate is retained in the archive only.
		if (!aliases[`/assets/${legacy}`] && existsSync(resolve(root, `assets/${legacy}.base64`))) include(entry, legacy)
	}
	if (entry.name.startsWith('cells/terrain/') && existsSync(resolve(root, `assets/cells/${entry.originalName}.png.base64`))) include(entry, `cells/${entry.originalName}.png`)
}
const manual = {
	'674:338': 'cells/cell-grass-variant.png',
	'695:2': 'cells/cell-grass-variant-2.png',
	'674:348': 'cells/cell-grass-variant-3.png',
	'2933:21': 'cells/cell-blocker.png',
	'674:126': 'icons/icon-crosshair.png'
}
for (const [id, legacy] of Object.entries(manual)) {
	const entry = catalog.assets.find((a) => a.id === id)
	if (entry && existsSync(resolve(root, `assets/${legacy}.base64`))) include(entry, legacy)
}
// The second grass variant is also the default grass tile.
include(
	catalog.assets.find((entry) => entry.id === '695:2'),
	'cells/cell-grass.png'
)
const water = readFileSync(resolve(root, 'assets/cells/WATER_TILE_MAPPING.md'), 'utf8')
for (const match of water.matchAll(/`tile_(\d+)\.svg`\s*\|\s*`([^`]+\.png)`/g)) {
	const entry = catalog.assets.find((a) => a.name === `cells/water/tile-${match[1]}`)
	if (entry && !aliases[`/assets/cells/${match[2]}`]) include(entry, `cells/${match[2]}`)
}

const browser = await chromium.launch()
try {
	const page = await browser.newPage()
	for (const entry of catalog.assets.filter((a) => /^units\/[^/]+-player-[12]$/.test(a.name))) {
		const originalType = entry.originalName.replace(/-[12]$/, '')
		const type = { 'helico-transportation': 'transport-helicopter', helico: 'helicopter', transportation: 'transport' }[originalType] ?? originalType
		const player = entry.originalName.at(-1)
		const stem = `${type}-${player}`
		if (!existsSync(resolve(root, `assets/units/${stem}.png.base64`))) continue
		const old = read(`assets/units/${stem}.png.base64`)
		const exported = read(`docs/artwork/figma/png-2x/${entry.exportFile}.base64`)
		const stages = [1, 2, 3, 4].map((stage) => read(`assets/units/${stem}-damage-${stage}.png.base64`))
		const results = await page.evaluate(
			async ({ old, exported, stages }) => {
				const load = async (data) => {
					const img = new Image()
					img.src = 'data:image/png;base64,' + data
					await img.decode()
					return img
				}
				const canvas = (w, h) => {
					const c = document.createElement('canvas')
					c.width = w
					c.height = h
					return c
				}
				const pixels = (img) => {
					const c = canvas(img.width, img.height)
					c.getContext('2d').drawImage(img, 0, 0)
					return c.getContext('2d').getImageData(0, 0, c.width, c.height)
				}
				const bounds = (p) => {
					let l = p.width,
						t = p.height,
						r = 0,
						b = 0
					for (let y = 0; y < p.height; y++)
						for (let x = 0; x < p.width; x++)
							if (p.data[(y * p.width + x) * 4 + 3] >= 16) {
								l = Math.min(l, x)
								t = Math.min(t, y)
								r = Math.max(r, x + 1)
								b = Math.max(b, y + 1)
							}
					return [l, t, r - l, b - t]
				}
				const original = await load(old),
					source = await load(exported)
				const op = pixels(original),
					sp = pixels(source),
					ob = bounds(op),
					sb = bounds(sp)
				const base = canvas(original.width * 2, original.height * 2),
					ctx = base.getContext('2d')
				ctx.imageSmoothingEnabled = false
				ctx.drawImage(source, ...sb, ...ob.map((v) => v * 2))
				const output = []
				for (let stage = 0; stage < 5; stage++) {
					const c = canvas(base.width, base.height),
						g = c.getContext('2d')
					g.drawImage(base, 0, 0)
					if (stage) {
						const dp = pixels(await load(stages[stage - 1]))
						for (let y = 0; y < op.height; y++)
							for (let x = 0; x < op.width; x++) {
								const i = (y * op.width + x) * 4
								if (dp.data[i + 3] && [0, 1, 2].some((k) => dp.data[i + k] !== op.data[i + k])) {
									g.fillStyle = `rgba(${dp.data[i]},${dp.data[i + 1]},${dp.data[i + 2]},${dp.data[i + 3] / 255})`
									g.fillRect(x * 2, y * 2, 2, 2)
								}
							}
						g.globalCompositeOperation = 'destination-in'
						g.drawImage(base, 0, 0)
					}
					const fit = canvas(ob[2] * 2, ob[3] * 2)
					fit.getContext('2d').drawImage(c, ob[0] * 2, ob[1] * 2, ob[2] * 2, ob[3] * 2, 0, 0, fit.width, fit.height)
					output.push([c.toDataURL().split(',')[1], fit.toDataURL().split(',')[1]])
				}
				return output
			},
			{ old, exported, stages }
		)
		for (let stage = 0; stage < 5; stage++)
			for (const fit of [false, true]) {
				const suffix = `${stage ? `-damage-${stage}` : ''}${fit ? '-fit' : ''}`
				const target = `/assets/figma/${entry.name}${suffix}@2x.png`
				save(target.slice(1) + '.base64', results[stage][fit ? 1 : 0])
				aliases[`/assets/units/${stem}${suffix}.png`] = target
			}
		mappings.push({ nodeId: entry.id, legacy: `units/${stem}.png`, exported: entry.exportFile, derived: 'Placement normalized to existing unit canvas; damage marks and cropped variants regenerated at 2x.' })
	}
} finally {
	await browser.close()
}
save('src/lib/game/figma-assets.json', JSON.stringify(aliases, null, 2))
save('docs/artwork/figma/runtime-mapping.json', JSON.stringify(mappings, null, 2))
console.log(`Imported ${mappings.length} Figma assets; ${Object.keys(aliases).length} runtime URLs.`)
