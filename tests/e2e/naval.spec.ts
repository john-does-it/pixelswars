import { test, expect } from '@playwright/test'
import { turnTransitionDuration } from '../../src/lib/game/timing.ts'

test('editor places both naval units for both teams on water and preserves them in exported maps', async ({ page }) => {
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	await page.goto('/map-editor/')
	await expect.poll(() => page.evaluate(() => localStorage.getItem('pixelswar-map-editor-draft-v1'))).not.toBeNull()
	const cell = (index: number) => page.locator(`#board [data-cell="${index}"]`)
	await page.getByRole('button', { name: 'Attack ship', exact: true }).click()
	await cell(0).press('Enter')
	await expect(page.locator('#status')).toHaveText('Naval units must be placed on water or a naval base.')
	await expect(cell(0).locator('img')).toHaveCount(0)
	await page.locator('[data-brush="terrain_water"]').click()
	for (let index = 0; index < 4; index++) await cell(index).press('Enter')
	for (const player of [1, 2]) {
		await page.locator('#team').selectOption(String(player))
		for (const [offset, type] of ['attack-ship', 'transport-ship'].entries()) {
			await page.locator(`[data-brush="${type}"]`).click()
			const tile = cell((player - 1) * 2 + offset)
			await tile.press('Enter')
			const image = tile.locator('img')
			await expect(image).toHaveAttribute('src', new RegExp(`${type}-player-${player}@2x\\.png$`))
			await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)
		}
	}
	await page.reload()
	await expect(page.locator('#board img')).toHaveCount(4)
	await page.locator('#json-panel summary').click()
	await expect(page.locator('#json-output')).toHaveValue(/"units"/)
	const exported = JSON.parse(await page.locator('#json-output').inputValue())
	expect(exported.units).toEqual([
		{ type: 'attack-ship', player: 1, cell: 0 },
		{ type: 'transport-ship', player: 1, cell: 1 },
		{ type: 'attack-ship', player: 2, cell: 2 },
		{ type: 'transport-ship', player: 2, cell: 3 }
	])
	await page.locator('[data-brush="terrain_grass"]').click()
	await cell(0).press('Enter')
	await expect(cell(0).locator('img')).toHaveCount(0)
	await page.locator('#undo').click()
	await expect(cell(0).locator('img')).toHaveCount(1)
	await page.locator('[data-brush="building_naval_base"]').click()
	await cell(0).press('Enter')
	await expect(cell(0)).toHaveClass(/-naval-base/)
	await expect(cell(0).locator('img')).toHaveCount(1)
	await expect(cell(0)).toHaveCSS('background-image', /cell-naval-base-on-grass/)
	await page.reload()
	await expect(cell(0)).toHaveClass(/-naval-base/)
	await expect(cell(0).locator('img')).toHaveCount(1)
	await page.getByRole('button', { name: 'Bridge ↔', exact: true }).click()
	await cell(0).press('Enter')
	await expect(cell(0)).toHaveClass(/-bridge/)
	await expect(cell(0).locator('img')).toHaveCount(0)
	await page.reload()
	await expect(cell(0)).toHaveClass(/-bridge/)
	await expect(cell(0).locator('img')).toHaveCount(0)
	expect(errors).toEqual([])
})

test('a ship crosses a bridge at half opacity without stopping on its deck', async ({ page }, testInfo) => {
	await page.clock.install()
	await page.goto('/play/26/')
	await expect(page.locator('dialog.turn-transition')).toBeVisible()
	await page.clock.fastForward(turnTransitionDuration + 100)
	const cell = (index: number) => page.locator('[data-cell="' + index + '"]')
	const endRound = async () => {
		await page.getByRole('button', { name: 'End round', exact: true }).click()
		await expect(page.locator('dialog.turn-transition')).toBeVisible()
		await page.clock.fastForward(turnTransitionDuration + 100)
		await expect(page.locator('dialog.turn-transition')).toHaveCount(0)
	}
	let position = 91
	for (const target of [87, 115, 143, 203]) {
		await expect(page.locator('dialog.turn-transition')).toHaveCount(0)
		await cell(position).click()
		await cell(target).click()
		await expect(cell(target).locator('[data-unit="18"]')).toBeVisible()
		position = target
		if (target !== 203) {
			await endRound()
			await endRound()
		}
	}
	await endRound()
	await endRound()
	await cell(203).click()
	await expect(cell(171)).not.toHaveClass(/reachable/)
	await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000))
	await cell(171).click()
	await expect(cell(203).locator('[data-unit="18"]')).toBeVisible()
	await cell(140).click()
	await page.clock.runFor(140)
	await expect(page.locator('.bridge-transit')).toHaveAttribute('data-transit-cell', '171')
	await expect(page.locator('.bridge-transit')).toHaveCSS('opacity', '0.5')
	await expect(cell(171).locator('[data-unit="18"]')).toHaveCount(0)
	await page.screenshot({ path: testInfo.outputPath('ship-crossing-bridge.png') })
	await page.clock.runFor(140)
	await expect(cell(140).locator('[data-unit="18"]')).toBeVisible()
	await expect(page.locator('.bridge-transit')).toHaveCount(0)
	await expect(cell(140).locator('.unit-sprite')).toHaveCSS('opacity', '1')
	await page.getByRole('button', { name: 'Cancel move', exact: true }).click()
	await expect(cell(203).locator('[data-unit="18"]')).toBeVisible()
	await cell(203).click()
	await cell(202).click()
	await expect(cell(202).locator('[data-unit="18"]')).toBeVisible()
	await cell(202).press('ArrowUp')
	await expect(page.locator('.bridge-transit')).toHaveCSS('opacity', '0.5')
	await page.clock.runFor(140)
	await expect(cell(140).locator('[data-unit="18"]')).toBeVisible()
})
