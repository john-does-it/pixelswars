import adapter from '@sveltejs/adapter-static'
import { sveltekit } from '@sveltejs/kit/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import paraglideConfig from './paraglide.config.js'

export default defineConfig(({ command, isPreview }) => {
	// Avoid hundreds of native module requests in dev while allowing builds and
	// type checks to regenerate their tree-shakable messages independently.
	const dev = command === 'serve' && !isPreview
	const devOutdir = './src/lib/paraglide-dev'
	return {
		resolve: { alias: dev ? { '#lib/paraglide/messages.js': fileURLToPath(new URL(devOutdir + '/messages.js', import.meta.url)) } : undefined },
		plugins: [
			paraglideVitePlugin(dev ? { ...paraglideConfig, outdir: devOutdir, outputStructure: 'locale-modules', emitTsDeclarations: false } : paraglideConfig),
			sveltekit({
				compilerOptions: { runes: true },
				adapter: adapter({ fallback: '404.html' }),
				inlineStyleThreshold: 3200,
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
	}
})
