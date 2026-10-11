import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

// Preserve the supplied light geometry and gradients, while leaving the game's
// crisp terrain/ownership sprites underneath untouched by the SVG's bitmap export.
const source = new URL('../docs/artwork/building-lights/', import.meta.url)
const destination = new URL('../assets/cells/building-lights/', import.meta.url)
mkdirSync(destination, { recursive: true })
const generated = new Map()
for (const name of readdirSync(source).filter((name) => name.endsWith('.svg'))) {
	const building = name.match(/^cell-(city|factory|hospital|airport|oil)-/)?.[1]
	if (!building) throw new Error(`Unknown building: ${name}`)
	// This export is a duplicate red oil-field sprite, not a separate state.
	if (name.endsWith('-by-2-1.svg')) continue
	const owner = name.match(/-by-([12])\.svg$/)?.[1] ?? '0'
	const partial = /half-?captured/.test(name)
	const svg = readFileSync(new URL(name, source), 'utf8')
	const lights = [...svg.matchAll(/<rect\b[^>]*fill="(?:url\(#paint[^" ]*\)|#F7EB66)"[^>]*\/>/g)].map(([rect]) => rect)
	const gradients = [...svg.matchAll(/<radialGradient\b[\s\S]*?<\/radialGradient>/g)].map(([gradient]) => gradient)
	if (!lights.length) throw new Error(`Missing lights: ${name}`)
	const output = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 125 125" fill="none" shape-rendering="crispEdges">\n${lights.join('\n')}\n<defs>\n${gradients.join('\n')}\n</defs>\n</svg>\n`
	const key = `${building === 'oil' ? 'oil-field' : building}-${owner}${partial ? '-partial' : ''}`
	if (generated.has(key)) throw new Error(`Duplicate state: ${key}`)
	generated.set(key, output)
}
// No red partial oil-field export was supplied. Its lights share the same
// geometry as the other oil-field states; ownership still comes from the base.
generated.set('oil-field-2-partial', generated.get('oil-field-0-partial'))
for (const building of ['city', 'factory', 'hospital', 'airport', 'oil-field']) {
	for (const owner of [0, 1, 2]) {
		for (const suffix of ['', '-partial']) {
			const name = `${building}-${owner}${suffix}`
			const svg = generated.get(name)
			if (!svg) throw new Error(`Missing building state: ${name}`)
			writeFileSync(new URL(`${name}.svg`, destination), svg)
		}
	}
}
