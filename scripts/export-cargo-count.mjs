import { readFileSync, writeFileSync } from 'node:fs'

// Keep the original 16px bitmap and its bottom-right placement, without resampling.
for (let count = 0; count <= 3; count++) {
	const source = readFileSync(new URL(`../docs/artwork/cargo-count/${count}.svg`, import.meta.url), 'utf8')
	const bitmap = source.match(/data:image\/png;base64,([^"]+)/)?.[1]
	if (!bitmap) throw new Error(`Missing cargo-count bitmap: ${count}`)
	writeFileSync(new URL(`../assets/icons/cargo-count-${count}.png.base64`, import.meta.url), bitmap + '\n')
}
