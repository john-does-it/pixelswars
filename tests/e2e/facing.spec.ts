import { test, expect } from '@playwright/test'

test('starting armies face each other when sprites finish loading and respect the facing setting', async ({ page }) => {
	let releaseAssets!: () => void
	const assetsGate = new Promise<void>((resolve) => (releaseAssets = resolve))
	await page.route('**/assets/preload-manifest.json', async (route) => {
		await assetsGate
		await route.continue()
	})
	try {
		await page.goto('/play/23/', { waitUntil: 'domcontentloaded' })
		await expect(page.locator('.game-shell[aria-busy="true"]')).toBeVisible()
		await expect(page.locator('.board .unit-sprite')).toHaveCount(0)
	} finally {
		releaseAssets()
	}
	const blue = page.locator('.board .unit-container.-one .unit-sprite')
	const red = page.locator('.board .unit-container.-two .unit-sprite')
	await expect(blue).toHaveCount(22)
	await expect(red).toHaveCount(22)
	for (const sprite of await blue.all()) await expect(sprite).toHaveCSS('scale', '1.25')
	for (const sprite of await red.all()) await expect(sprite).toHaveCSS('scale', '-1.25 1.25')
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	await page.getByRole('combobox', { name: 'Unit facing', exact: true }).selectOption('off')
	for (const sprite of await red.all()) await expect(sprite).toHaveCSS('scale', '1.25')
	await page.getByRole('combobox', { name: 'Unit facing', exact: true }).selectOption('on')
	for (const sprite of await red.all()) await expect(sprite).toHaveCSS('scale', '-1.25 1.25')
})
