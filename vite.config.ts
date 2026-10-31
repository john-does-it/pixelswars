import adapter from '@sveltejs/adapter-static'
import { sveltekit } from '@sveltejs/kit/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import paraglideConfig from './paraglide.config.js'

export default defineConfig({
	plugins: [
		paraglideVitePlugin(paraglideConfig),
		sveltekit({
			compilerOptions: { runes: true },
			adapter: adapter(),
			paths: { base: (process.env.BASE_PATH || '') as '' | `/${string}` },
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'connect-src': ['self', 'wss://0.peerjs.com', 'https://*.metered.live', 'https://queue.simpleanalyticscdn.com'],
					'script-src': ['self', 'https://scripts.simpleanalyticscdn.com'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', 'https://queue.simpleanalyticscdn.com'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self']
				}
			}
		})
	]
})
