import { test, expect } from '@playwright/test'

test('Japanese persists across the catalog, help, game, editor and legal page', async ({ page }, testInfo) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	const fitsViewport = async () => {
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	}
	await page.goto('/')
	await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('ja')
	await expect(page.locator('html')).toHaveAttribute('lang', 'ja')
	// Wait for the real bundled face, rather than accepting a system-font fallback.
	expect(
		await page.evaluate(async () => {
			const faces = await document.fonts.load('16px "DotGothic16"', '日本語・戦場・歩兵')
			return faces.length > 0 && faces.every((face) => face.status === 'loaded')
		})
	).toBe(true)
	await expect(page.getByRole('heading', { name: '戦場を選択', exact: true })).toBeVisible()
	await expect(page.getByRole('heading', { name: '輸送ヘリコプター', exact: true })).toHaveCount(1)
	await expect(page.getByRole('heading', { name: '障害物', exact: true })).toHaveCount(1)
	await fitsViewport()
	await page.getByRole('button', { name: '詳しく見る', exact: true }).click()
	await expect(page.getByRole('dialog', { name: '遊び方', exact: true })).toBeVisible()
	await page.getByRole('button', { name: '閉じる', exact: true }).click()
	await page.reload()
	await expect(page.getByRole('combobox', { name: '言語', exact: true })).toHaveValue('ja')
	await page.screenshot({ path: testInfo.outputPath('japanese-home.png') })

	await page.goto('/play/1/')
	await expect(page.getByRole('button', { name: 'ターン終了', exact: true })).toBeVisible()
	await page.getByRole('button', { name: '設定とヘルプ', exact: true }).click()
	const options = page.getByRole('dialog', { name: '設定とヘルプ', exact: true })
	await expect(options.getByRole('combobox', { name: '言語', exact: true })).toHaveValue('ja')
	await expect(options.getByText('部隊の向きを変える', { exact: true })).toBeVisible()
	await fitsViewport()
	await page.screenshot({ path: testInfo.outputPath('japanese-settings.png') })
	await options.getByRole('button', { name: '閉じる', exact: true }).click()
	await page.locator('.board [data-cell]').first().click()
	await page.keyboard.press('i')
	await expect(page.getByRole('dialog', { name: 'マスの詳細', exact: true })).toBeVisible()
	await fitsViewport()

	await page.goto('/map-editor/')
	await expect(page.locator('#language')).toHaveValue('ja')
	await expect(page.getByRole('heading', { name: 'マップエディター', exact: true })).toBeVisible()
	await expect(page.getByRole('button', { name: '歩兵', exact: true })).toBeVisible()
	await fitsViewport()
	await page.screenshot({ path: testInfo.outputPath('japanese-editor.png') })

	await page.goto('/terms/')
	await expect(page.getByRole('heading', { name: '利用条件・プライバシー・Cookie', exact: true })).toBeVisible()
	await fitsViewport()
	expect(errors).toEqual([])
})
