import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

function filesIn(directory) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		// Incoming artwork is staging material, not generated runtime content.
		if (entry.isDirectory() && entry.name === 'temp') return []
		const filename = join(directory, entry.name)
		return entry.isDirectory() ? filesIn(filename) : [filename]
	})
}

const sourceDirectory = fileURLToPath(new URL('../assets/', import.meta.url))
const destinationDirectory = fileURLToPath(new URL('../static/assets/', import.meta.url))
const generated = new Set()
mkdirSync(destinationDirectory, { recursive: true })
for (const source of filesIn(sourceDirectory)) {
	if (!/\.(png|svg|webp|gif|mp3)(\.base64)?$/i.test(source)) continue
	const destination = join(destinationDirectory, relative(sourceDirectory, source).replace(/\.base64$/, ''))
	mkdirSync(dirname(destination), { recursive: true })
	if (source.endsWith('.base64')) {
		if (existsSync(source.slice(0, -7))) throw new Error(`Duplicate asset source: ${source}`)
		writeFileSync(destination, Buffer.from(readFileSync(source, 'utf8'), 'base64'))
	} else copyFileSync(source, destination)
	generated.add(destination)
}
// Keep the public tree in sync, including removal of retired artwork and docs.
for (const filename of filesIn(destinationDirectory)) if (!generated.has(filename)) unlinkSync(filename)
const visualAssets = [...generated].filter((filename) => /\.(png|svg|webp|gif)$/i.test(filename)).map((filename) => `/assets/${relative(destinationDirectory, filename).replaceAll('\\', '/')}`)
// CSS cache-version suffixes are part of the browser cache key. Preload the
// exact URL used by every terrain/capture state, including currently hidden ones.
const gameStyles = readFileSync(new URL('../src/lib/app.css', import.meta.url), 'utf8')
for (const match of gameStyles.matchAll(/url\(['"]?(\/assets\/[^'"\s)]+)['"]?\)/g)) {
	const path = match[1]
	if (!visualAssets.includes(path.split('?')[0])) throw new Error(`Missing CSS sprite: ${path}`)
	visualAssets.push(path)
}
writeFileSync(join(destinationDirectory, 'preload-manifest.json'), JSON.stringify([...new Set(visualAssets)].sort()))

// Reuse the canonical infantry sprite for the favicon.
const favicon = readFileSync(new URL('../assets/units/infantry/red/infantry-red-damage-2.png.base64', import.meta.url), 'utf8').trim()
writeFileSync(new URL('../static/favicon.png', import.meta.url), Buffer.from(favicon, 'base64'))
writeFileSync(new URL('../static/favicon.svg', import.meta.url), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><image width="128" height="128" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated" href="data:image/png;base64,${favicon}"/></svg>`)
