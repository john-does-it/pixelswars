import { readFileSync } from 'node:fs'
import type { GameMap } from '../src/lib/game/types.ts'

const mapFiles: Record<string, string> = JSON.parse(readFileSync(new URL('../src/lib/data/map-files.json', import.meta.url), 'utf8'))

export function readMapFixture(id: number | string): GameMap {
	if (!mapFiles[id]) throw new Error(`Unknown map ${id}`)
	return JSON.parse(readFileSync(new URL(`../src/lib/data/${mapFiles[id]}`, import.meta.url), 'utf8'))
}
