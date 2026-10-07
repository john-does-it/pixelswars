import { test, expect } from '@playwright/test'

test('production exposes neither the development map nor its homepage link', async ({ page, request }) => {
	await page.goto('/')
	await expect(page.locator('a[href="/play/dev/"]')).toHaveCount(0)
	expect((await request.get('/play/dev/')).status()).toBe(404)
})
