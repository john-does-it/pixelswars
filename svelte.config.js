import adapter from '@sveltejs/adapter-static'

export default {
	compilerOptions: { runes: true },
	kit: {
		adapter: adapter(),
		paths: { base: process.env.BASE_PATH || '' },
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
	}
}
