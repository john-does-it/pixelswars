import { test, expect } from '@playwright/test'
import { readMapFixture } from '../map-fixtures'
import { initialState } from '../../src/lib/game/model.ts'
import { createSavedMatch, parseSavedMatch, savedMatchKey } from '../../src/lib/game/saved-match.ts'

test('naval artillery is illustrated on home and can be placed for both teams in the editor', async ({ page }) => {
	await page.goto('/')
	const portrait = page.getByRole('img', { name: 'Artillery ship', exact: true })
	await portrait.scrollIntoViewIfNeeded()
	await expect(portrait).toBeVisible()
	await expect.poll(() => portrait.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(200)
	await page.goto('/map-editor/')
	await page.locator('#mirror-mode').selectOption('off')
	await expect.poll(() => page.evaluate(() => localStorage.getItem('pixelswar-map-editor-draft-v1'))).not.toBeNull()
	await page.locator('[data-brush="terrain_water"]').click()
	for (const index of [0, 1]) await page.locator(`#board [data-cell="${index}"]`).press('Enter')
	for (const player of [1, 2]) {
		await page.locator('#team').selectOption(String(player))
		await page.locator('[data-brush="artillery-ship"]').click()
		const tile = page.locator(`#board [data-cell="${player - 1}"]`)
		await tile.press('Enter')
		await expect(tile.locator('img')).toHaveAttribute('src', new RegExp(`artillery-ship-${player === 1 ? 'blue' : 'red'}-no-damage\\.svg$`))
		await expect.poll(() => tile.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(200)
	}
	await page.reload()
	await expect(page.locator('#board img')).toHaveCount(2)
})

test('all naval artillery damage stages render in a resumed game and recruit from a naval base', async ({ page }, testInfo) => {
	const map = readMapFixture(1)
	map.units = []
	for (let index = 0; index < 10; index++) {
		map.cells[index].classes = ['-water']
		map.units.push({ type: 'artillery-ship', player: index < 5 ? 1 : 2, cell: index })
	}
	Object.assign(map.cells[10], { classes: ['-building', '-naval-base', '-ongrass'], owner: 2 })
	const state = initialState(map)
	for (const [index, unit] of state.units.entries()) unit.health = 160 - (index % 5) * 32
	state.player = 2
	state.round = 2
	state.money[2] = 2400
	const save = createSavedMatch(map, state, 'easy', 'browser-test')
	parseSavedMatch(JSON.stringify(save))
	await page.goto('/')
	await page.evaluate(([key, raw]) => localStorage.setItem(key, raw), [savedMatchKey, JSON.stringify(save)])
	await page.goto('/play/1/?ai=easy')
	await expect(page.locator('.turn-sweep')).toHaveCount(0)
	for (let index = 0; index < 10; index++) {
		const stage = index % 5
		const file = `artillery-ship/${index < 5 ? 'blue' : 'red'}/artillery-ship-${index < 5 ? 'blue' : 'red'}-${stage ? `damage-${stage}` : 'no-damage'}.svg`
		await expect(page.locator(`[data-unit="${index}"] .unit-sprite`)).toHaveCSS('background-image', new RegExp(file))
		const loaded = await page.evaluate(async (file) => {
			const img = new Image()
			img.src = `/assets/units/${file}`
			await img.decode()
			return img.naturalWidth
		}, file)
		expect(loaded).toBe(200)
	}
	await page.locator('.board').screenshot({ path: testInfo.outputPath('artillery-variants-on-board.png') })
	await page.locator('[data-cell="10"]').click()
	const recruit = page.getByRole('dialog').getByRole('button', { name: /Artillery ship/ })
	await expect(recruit).toBeVisible()
	await recruit.click()
	await expect(page.locator('[data-cell="10"] .-artillery-ship')).toBeVisible()
	await page.locator('[data-cell="6"]').click()
	await page.locator('[data-cell="3"]').click()
	await expect(page.locator('.combat-effects .muzzle')).toBeVisible()
	await expect(page.locator('[data-cell="3"] .unit-container')).not.toHaveAttribute('data-health', '64')
})
