import { test, expect, type Page } from '@playwright/test'
import { readMapFixture } from '../map-fixtures'
import { initialState } from '../../src/lib/game/model.ts'
import { createUnit } from '../../src/lib/game/catalog.ts'
import { createSavedMatch, savedMatchKey } from '../../src/lib/game/saved-match.ts'

function fixture() {
	const map = readMapFixture(1)
	const state = initialState(map)
	state.round = 2
	state.player = 2
	state.units = [createUnit('infantry', 2, 9, 0), createUnit('infantry', 1, 10, 1), createUnit('transport', 2, 16, 2)]
	state.nextId = 4
	state.units[2].cargo = [createUnit('infantry', 2, 16, 3)]
	state.money = { 1: 100, 2: 600 }
	return createSavedMatch(map, state, 'easy', 'browser-test')
}
async function seed(page: Page, save = fixture()) {
	await page.goto('/')
	await page.evaluate(([key, raw]) => localStorage.setItem(key, raw), [savedMatchKey, JSON.stringify(save)])
	await page.goto('/play/1/?ai=easy')
	await expect(page.locator('.board')).toBeVisible()
	await expect(page.locator('.turn-sweep')).toHaveCount(0)
}
const stored = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), savedMatchKey)

test('victory clears the unfinished match while retaining the earned medal', async ({ page }) => {
	const save = fixture()
	save.snapshot.units[1].health = 1
	await seed(page, save)
	await page.locator('[data-cell="9"]').click()
	await page.locator('[data-cell="10"]').click()
	await expect(page.getByRole('button', { name: 'Play again', exact: true })).toBeVisible()
	await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), savedMatchKey)).toBeNull()
	await page.goto('/profile/')
	await expect(page.locator('[data-earned="true"]')).toHaveCount(1)
})

test('restarting an unfinished match requires confirmation', async ({ page }) => {
	await seed(page)
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	await page.getByRole('button', { name: 'Restart', exact: true }).click()
	const dialog = page.getByRole('dialog', { name: 'A battle awaits your return' })
	await expect(dialog).toBeVisible()
	expect((await stored(page)).id).toBe('browser-test')
	await dialog.getByRole('button', { name: 'Restart', exact: true }).click()
	await expect.poll(async () => (await stored(page)).id).not.toBe('browser-test')
	await expect(page.getByText('Round 1', { exact: true })).toBeVisible()
})

test('solo actions, undo, combat and cargo survive reload and resume from home', async ({ page }) => {
	await seed(page)
	await page.locator('[data-cell="9"]').click()
	await page.locator('[data-cell="17"]').click()
	await expect(page.locator('[data-cell="17"] [data-unit="0"]')).toBeVisible()
	await expect.poll(async () => (await stored(page)).snapshot.units[0].cell).toBe(17)
	await page.reload()
	await expect(page.locator('.turn-sweep')).toHaveCount(0)
	await expect(page.locator('[data-cell="17"] [data-unit="0"]')).toBeVisible()
	await page.getByRole('button', { name: 'Cancel move', exact: true }).click()
	await expect(page.locator('[data-cell="9"] [data-unit="0"]')).toBeVisible()
	await page.locator('[data-cell="9"]').click()
	await page.locator('[data-cell="10"]').click()
	await expect.poll(async () => (await stored(page)).snapshot.units[0].attacks).toBe(1)
	const after = await stored(page)
	expect(after.snapshot.units[1].attacks).toBe(1)
	await page.goto('/')
	await page.getByRole('link', { name: 'Resume match', exact: true }).click()
	await expect(page.locator('[data-unit="0"]')).toHaveAttribute('data-health', String(after.snapshot.units[0].health))
	await expect(page.locator('[data-unit="2"] .cargo-count img')).toHaveAttribute('src', /numbers\/1\.png$/)
	expect((await stored(page)).snapshot.money).toEqual(after.snapshot.money)
})

test('interrupting a combat restores the last complete action and AI interruption restarts its turn', async ({ page }) => {
	await seed(page)
	await page.clock.install()
	await page.clock.pauseAt(new Date())
	await page.locator('[data-cell="9"]').click()
	await page.locator('[data-cell="10"]').click()
	await expect(page.locator('[data-unit="1"]')).not.toHaveAttribute('data-health', '100')
	expect((await stored(page)).snapshot.units[1].health).toBe(100)
	await page.reload()
	await expect(page.locator('[data-unit="1"]')).toHaveAttribute('data-health', '100')
	await page.clock.resume()
	await expect(page.locator('.turn-sweep')).toHaveCount(0)
	await page.getByRole('button', { name: 'End round', exact: true }).click()
	await expect.poll(async () => (await stored(page)).snapshot.player).toBe(1)
	await page.reload()
	await expect(page.getByRole('button', { name: 'End round', exact: true })).toBeVisible({ timeout: 30000 })
	await expect.poll(async () => (await stored(page)).snapshot.player, { timeout: 30000 }).toBe(2)
	expect((await stored(page)).snapshot.round).toBe(4)
})

test('new games require replacement confirmation; local matches leave the solo save untouched', async ({ page }) => {
	await seed(page)
	await page.goto('/play/1/')
	expect((await stored(page)).id).toBe('browser-test')
	await page.goto('/play/2/?ai=medium')
	await expect(page.getByRole('dialog', { name: 'A battle awaits your return' })).toBeVisible()
	expect((await stored(page)).map.id).toBe('1')
	await page.getByRole('link', { name: 'Resume match', exact: true }).click()
	await expect(page.locator('[data-unit="0"]')).toHaveAttribute('data-health', '100')
	await page.goto('/play/1/?ai=easy&new=1')
	await expect(page.getByRole('dialog', { name: 'A battle awaits your return' })).toBeVisible()
	await page.getByRole('link', { name: 'Resume match', exact: true }).click()
	await expect(page.locator('.board')).toBeVisible()
	await page.goto('/play/2/?ai=medium')
	await page.getByRole('button', { name: 'Replace and start new game' }).click()
	await expect.poll(async () => (await stored(page)).map.id).toBe('2')
	await page.goto('/')
	await page.getByRole('button', { name: 'Discard saved match', exact: true }).click()
	await page.getByRole('dialog').getByRole('button', { name: 'Discard saved match', exact: true }).click()
	expect(await page.evaluate((key) => localStorage.getItem(key), savedMatchKey)).toBeNull()
})

test('corrupt saves are preserved until explicitly discarded', async ({ page }) => {
	await page.goto('/')
	await page.evaluate((key) => localStorage.setItem(key, '{'), savedMatchKey)
	await page.goto('/play/1/?ai=easy')
	await expect(page.getByText(/This save is damaged/)).toBeVisible()
	expect(await page.evaluate((key) => localStorage.getItem(key), savedMatchKey)).toBe('{')
	await page.getByRole('button', { name: 'Replace and start new game' }).click()
	await expect(page.locator('.board')).toBeVisible()
	await expect.poll(async () => (await stored(page)).version).toBe(1)
})

test('map chooser shows badges without unit previews and keeps medals in progression', async ({ page }) => {
	const failed: string[] = []
	page.on('response', (response) => {
		if (response.status() === 404) failed.push(response.url())
	})
	await page.goto('/')
	const card = page.locator('a.map').filter({ has: page.getByRole('heading', { name: 'Neighbor Trouble', exact: true }) })
	await expect(card.locator('.map-characteristics')).toBeVisible()
	await expect(card.getByLabel('Mobile friendly: Yes', { exact: true })).toBeVisible()
	await expect(page.locator('a.map img[src*="/units/"]')).toHaveCount(0)
	await expect(page.locator('a.map .terrain-icon')).toHaveCount(0)
	await expect(card.locator('.map-thumbnail + .map-characteristics')).toBeVisible()
	await expect(page.locator('[data-earned]')).toHaveCount(0)
	await page.setViewportSize({ width: 320, height: 740 })
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	const longTitle = page.getByRole('heading', { name: 'Long Island Iced Tea', exact: true })
	await expect(longTitle).toHaveCSS('white-space', 'nowrap')
	await expect(longTitle).toHaveCSS('text-overflow', 'ellipsis')
	await expect(longTitle).toHaveAttribute('title', 'Long Island Iced Tea')
	expect(failed).toEqual([])
	await page.goto('/profile/')
	await expect(page.locator('[data-earned]').first()).toBeVisible()
})
