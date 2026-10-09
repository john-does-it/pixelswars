import { test, expect, type Page } from '@playwright/test'

async function endRound(page: Page) {
	await page.getByRole('button', { name: 'End round', exact: true }).click()
	await expect(page.locator('dialog.turn-transition')).toBeVisible()
	await expect(page.locator('dialog.turn-transition')).toHaveCount(0)
}

test('buy a transport, embark infantry and deploy through accessible controls', async ({ page }, testInfo) => {
	test.setTimeout(90000)
	await page.goto('/play/1/')
	const cell = (index: number) => page.locator(`.board [data-cell="${index}"]`)
	await cell(1).click()
	await cell(8).click()
	await expect(cell(8).locator('[data-unit="1"]')).toBeVisible()
	await page.getByRole('button', { name: 'Capture', exact: true }).click()
	await cell(2).click()
	await cell(10).click()
	await page.getByRole('button', { name: 'Capture', exact: true }).click()
	await endRound(page)
	await endRound(page)
	for (const index of [8, 10]) {
		await cell(index).click()
		await page.getByRole('button', { name: 'Capture', exact: true }).click()
	}
	for (let turn = 0; turn < 6; turn++) await endRound(page)
	await cell(8).click()
	await cell(9).click()
	await page.getByRole('button', { name: 'Confirm move', exact: true }).click()
	await cell(8).click()
	await page.getByRole('button', { name: 'Buy Transport jeep', exact: true }).click()
	await cell(8).click()
	await expect(cell(8).locator('.ammo')).toHaveCount(0)
	await expect(page.locator('.attackable')).toHaveCount(0)
	await cell(9).click()
	await expect(cell(8)).toHaveClass(/boarding-target/)
	await cell(8).click()
	const tray = page.getByRole('region', { name: 'Troop transport', exact: true })
	await expect(tray.locator('[data-passenger]')).toHaveCount(1)
	await expect(cell(9).locator('[data-unit]')).toHaveCount(0)
	const passenger = tray.locator('[data-passenger="1"]')
	await passenger.click()
	await expect(passenger).toHaveAttribute('aria-pressed', 'true')
	await expect(cell(0)).not.toHaveClass(/deployment-target/)
	await expect(cell(9)).toHaveClass(/deployment-target/)
	await page.screenshot({ path: testInfo.outputPath('transport-loaded.png') })
	await page.keyboard.press('Escape')
	await expect(passenger).toHaveAttribute('aria-pressed', 'false')
	await expect(page.locator('.deployment-target')).toHaveCount(0)
	await passenger.click()
	await cell(9).click()
	await expect(tray.locator('[data-passenger]')).toHaveCount(0)
	await expect(cell(9).locator('[data-unit="1"]')).toBeVisible()
	await expect(cell(9).locator('.fuel')).toHaveAttribute('data-remaining', '1')
	await expect(cell(9).locator('.ammo')).toHaveAttribute('data-remaining', '2')
	await expect(cell(9).locator('.capture')).not.toHaveClass(/spent/)
	await expect(cell(8).locator('.fuel')).toHaveAttribute('data-remaining', '8')
})

test('map editor offers both team transport sprites and exports transport units', async ({ page }) => {
	await page.goto('/map-editor/')
	await page.getByRole('button', { name: 'Transport jeep', exact: true }).click()
	await page.locator('#board [data-cell="0"]').click()
	const image = page.locator('#board [data-cell="0"] img')
	await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(200)
	await expect(image).toHaveAttribute('src', /transport-1\.png$/)
	await page.getByRole('combobox', { name: 'Team', exact: true }).selectOption('2')
	await page.locator('#board [data-cell="1"]').click()
	await expect(page.locator('#board [data-cell="1"] img')).toHaveAttribute('src', /transport-2\.png$/)
	const download = page.waitForEvent('download')
	await page.getByRole('button', { name: '↓ Export JSON', exact: true }).click()
	const stream = await (await download).createReadStream()
	let json = ''
	for await (const chunk of stream!) json += chunk
	expect(JSON.parse(json).units).toEqual([
		{ type: 'transport', player: 1, cell: 0 },
		{ type: 'transport', player: 2, cell: 1 }
	])
})
