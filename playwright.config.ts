import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: true,
	use: { baseURL: 'http://127.0.0.1:4175', trace: 'retain-on-failure' },
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } },
		{ name: 'mobile', use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium', channel: process.env.PW_CHANNEL } }
	],
	webServer: {
		command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4175',
		url: 'http://127.0.0.1:4175',
		reuseExistingServer: !process.env.CI
	}
})
