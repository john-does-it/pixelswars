import { cpSync, mkdirSync } from 'node:fs'

// Keep the existing art/audio source in one tracked location. SvelteKit serves
// these generated copies; nothing from the repository root is exposed publicly.
mkdirSync(new URL('../static/', import.meta.url), { recursive: true })
cpSync(new URL('../assets/', import.meta.url), new URL('../static/assets/', import.meta.url), { recursive: true })
cpSync(new URL('../favicon.png', import.meta.url), new URL('../static/favicon.png', import.meta.url))
