import { test, expect } from '@playwright/test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

test('draft source data is absent from the deployed build', () => {
	const names = readdirSync('src/lib/data/drafts')
		.filter((file) => file.endsWith('.json'))
		.map((file) => JSON.parse(readFileSync(join('src/lib/data/drafts', file), 'utf8')).name as string)
	for (const file of readdirSync('build', { recursive: true, encoding: 'utf8' }).filter((file) => /\.(js|json|html)$/.test(file))) {
		const content = readFileSync(join('build', file), 'utf8')
		for (const name of names) expect(content, `${file} leaks ${name}`).not.toContain(name)
	}
})

test('production never exposes draft maps through the chooser, play routes or editor', async ({ page, request }) => {
	await page.goto('/')
	await expect(page.locator('[data-draft-map]')).toHaveCount(0)
	await expect(page.locator('a[href*="draft-"]')).toHaveCount(0)
	for (let id = 28; id <= 36; id++) {
		expect((await request.get(`/play/draft-${id}/`)).status()).toBe(404)
		expect((await request.get(`/play/${id}/`)).status()).toBe([32, 33, 34].includes(id) ? 404 : 200)
	}
	await page.goto('/map-editor/?draft=28')
	await expect(page.locator('.draft-notice')).toHaveCount(0)
	await expect(page.locator('#map-id')).not.toHaveValue('28')
	await expect(page.locator('#existing option[value="28"]')).toHaveCount(1)
})
