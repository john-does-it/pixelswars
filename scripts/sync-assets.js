import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Images have text sources; generated binaries retain their original public URLs.
function syncDirectory(source, destination) {
	mkdirSync(destination, { recursive: true })
	for (const entry of readdirSync(source, { withFileTypes: true })) {
		const input = join(source, entry.name)
		const output = join(destination, entry.name.replace(/\.base64$/, ''))
		if (entry.isDirectory()) syncDirectory(input, output)
		else if (entry.name.endsWith('.base64')) {
			// Native PNG sources take precedence for the image-quality comparison.
			if (!existsSync(input.replace(/\.base64$/, ''))) writeFileSync(output, Buffer.from(readFileSync(input, 'utf8').replace(/\s/g, ''), 'base64'))
		} else copyFileSync(input, output)
	}
}

syncDirectory(fileURLToPath(new URL('../assets/', import.meta.url)), fileURLToPath(new URL('../static/assets/', import.meta.url)))
writeFileSync(new URL('../static/favicon.png', import.meta.url), Buffer.from(readFileSync(new URL('../favicon.png.base64', import.meta.url), 'utf8').replace(/\s/g, ''), 'base64'))
