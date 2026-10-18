import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './tests/dev',
	fullyParallel: true,
	use: { baseURL: 'http://127.0.0.1:5176', trace: 'retain-on-failure' },
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		command: 'node node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 5176 --strictPort',
		url: 'http://127.0.0.1:5176',
		reuseExistingServer: !process.env.CI
	}
})
