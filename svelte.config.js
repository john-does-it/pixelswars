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
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['self']
			}
		}
	}
}
