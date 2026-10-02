import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: '.',
	testMatch: 'editor.spec.ts',
	use: { baseURL: 'http://127.0.0.1:5182', trace: 'retain-on-failure' },
	webServer: {
		command: 'npm run map:editor',
		cwd: fileURLToPath(new URL('../..', import.meta.url)),
		url: 'http://127.0.0.1:5182',
		reuseExistingServer: !process.env.CI
	}
})
