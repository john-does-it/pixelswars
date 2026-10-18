import { readFileSync, writeFileSync } from 'node:fs'
import { describeMap } from '../src/lib/game/map-details.ts'

const files = JSON.parse(readFileSync(new URL('../src/lib/data/map-files.json', import.meta.url), 'utf8'))
const details = Object.fromEntries(Object.entries(files).map(([id, file]) => [id, describeMap(JSON.parse(readFileSync(new URL(`../src/lib/data/${file}`, import.meta.url), 'utf8')))]))
writeFileSync(new URL('../src/lib/data/map-details.json', import.meta.url), JSON.stringify(details, null, '\t') + '\n')
