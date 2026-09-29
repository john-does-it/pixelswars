import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Images have text sources; generated binaries retain their original public URLs.
function syncDirectory(source: string, destination: string): void {
	mkdirSync(destination, { recursive: true })
	for (const entry of readdirSync(source, { withFileTypes: true })) {
		const input = join(source, entry.name)
		const output = join(destination, entry.name.replace(/\.base64$/, ''))
		if (entry.isDirectory()) syncDirectory(input, output)
		else if (entry.name.endsWith('.base64')) {
			// Support both source formats without changing the public asset URL.
			if (!existsSync(input.replace(/\.base64$/, ''))) writeFileSync(output, Buffer.from(readFileSync(input, 'utf8').replace(/\s/g, ''), 'base64'))
		} else copyFileSync(input, output)
	}
}

// Remove stale generated files so retired source assets do not remain in builds or preloads.
function pruneGeneratedAssets(source: string, destination: string): void {
	for (const entry of readdirSync(destination, { withFileTypes: true })) {
		const output = join(destination, entry.name)
		const input = join(source, entry.name)
		if (entry.isDirectory()) pruneGeneratedAssets(input, output)
		else if (!existsSync(input) && !existsSync(`${input}.base64`)) unlinkSync(output)
	}
}

function visualAssets(directory: string, prefix = '/assets'): string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const input = join(directory, entry.name)
		const url = `${prefix}/${entry.name}`
		if (entry.isDirectory()) return visualAssets(input, url)
		return /\.(?:gif|png|svg|webp)$/i.test(entry.name) ? [url] : []
	})
}

const staticAssets = fileURLToPath(new URL('../static/assets/', import.meta.url))
syncDirectory(fileURLToPath(new URL('../assets/', import.meta.url)), staticAssets)
pruneGeneratedAssets(fileURLToPath(new URL('../assets/', import.meta.url)), staticAssets)
writeFileSync(join(staticAssets, 'preload-manifest.json'), JSON.stringify(visualAssets(staticAssets).sort()))
writeFileSync(new URL('../static/favicon.png', import.meta.url), Buffer.from(readFileSync(new URL('../favicon.png.base64', import.meta.url), 'utf8').replace(/\s/g, ''), 'base64'))
