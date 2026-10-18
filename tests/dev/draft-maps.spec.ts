import { test, expect } from '@playwright/test'

test('published drafts leave the development gallery and old draft links return 404', async ({ page, request }) => {
	await page.goto('/')
	await expect(page.locator('[data-draft-map]')).toHaveCount(0)
	await expect(page.getByRole('link', { name: 'Test locally', exact: true })).toHaveCount(0)
	for (const id of [28, 30, 31, 35, 36]) {
		await expect(page.locator('a.map[href$="/play/' + id + '/"]')).toHaveCount(1)
		expect((await request.get('/play/draft-' + id + '/')).status()).toBe(404)
	}
	for (const id of [32, 33, 34]) {
		expect((await request.get('/play/' + id + '/')).status()).toBe(404)
		expect((await request.get('/map-editor/?draft=' + id)).status()).toBe(404)
	}
	await page.goto('/map-editor/')
	await expect(page.locator('#existing option[value="36"]')).toHaveCount(1)
})
