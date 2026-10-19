import { readFileSync, writeFileSync } from 'node:fs'

// The approved blue SVG is the source of truth. Keep its geometry, gun and wake intact.
const directory = new URL('../assets/units/', import.meta.url)
const source = readFileSync(new URL('artillery-ship-player-1.svg', directory), 'utf8')
const redPalette = { '#0079bf': '#aa2c23', '#009ed8': '#e84537', '#00c4e9': '#ff7571' }
const impacts = ['<path fill="#63505a" d="M102 68h8v4h-8z"/><path fill="#8b9bb4" d="M102 68h4v2h-4z"/>', '<path fill="#3f2631" d="M118 78h8v8h-8zM62 110h8v4h-8z"/><path fill="#63505a" d="M110 82h8v4h-8z"/>', '<path fill="#3f2631" d="M102 126h12v4h-12z"/><path fill="#63505a" d="M110 130h8v4h-8z"/>', '<path fill="#3f2631" d="M102 66h8v8h-8zM62 126h12v8H62z"/><path fill="#63505a" d="M110 70h8v4h-8z"/><path fill="#e78146" d="M110 70h4v2h-4z"/>']
const aliasesFile = new URL('../src/lib/game/asset-aliases.json', import.meta.url)
const aliases = JSON.parse(readFileSync(aliasesFile, 'utf8'))
for (const player of [1, 2]) {
	const base = player === 1 ? source : source.replace(/#0079bf|#009ed8|#00c4e9/g, (color) => redPalette[color]).replace('équipe bleue', 'équipe rouge')
	for (let stage = 0; stage <= impacts.length; stage++) {
		const suffix = stage ? `-damage-${stage}` : ''
		const name = `artillery-ship-player-${player}${suffix}.svg`
		const svg = stage ? base.replace('</svg>', `<g aria-label="Damage stage ${stage}">${impacts.slice(0, stage).join('')}</g>\n</svg>`) : base
		if (player !== 1 || stage !== 0) writeFileSync(new URL(name, directory), svg)
		for (const fit of ['', '-fit']) aliases[`/assets/units/artillery-ship-${player}${suffix}${fit}.png`] = `/assets/units/${name}`
	}
}
writeFileSync(aliasesFile, JSON.stringify(aliases, null, '\t') + '\n')
console.log('Generated red artillery ship and four cumulative damage stages for each team.')
