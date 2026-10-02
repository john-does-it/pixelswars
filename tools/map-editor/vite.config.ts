import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const gameBase = process.env.BASE_PATH || ''

export default defineConfig(({ command }) => ({
	root: fileURLToPath(new URL('.', import.meta.url)),
	base: command === 'build' ? `${gameBase}/map-editor/` : '/',
	publicDir: fileURLToPath(new URL('../../static', import.meta.url)),
	define: { 'import.meta.env.GAME_BASE': JSON.stringify(gameBase) },
	build: { outDir: fileURLToPath(new URL('../../static/map-editor', import.meta.url)), emptyOutDir: true, copyPublicDir: false },
	experimental: { renderBuiltUrl: (filename, { type }) => (type === 'public' ? `${gameBase}/${filename}` : undefined) },
	server: { host: '127.0.0.1', port: 5182, strictPort: true, fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] } }
}))
