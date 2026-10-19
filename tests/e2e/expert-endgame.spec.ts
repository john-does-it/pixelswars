import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { readMapFixture } from '../map-fixtures'
import { createSavedMatch, parseSavedMatch, savedMatchKey } from '../../src/lib/game/saved-match.ts'
import type { GameState } from '../../src/lib/game/types.ts'

test('Expert finishes the saved covered-tank endgame during the resumed turn', async ({ page }) => {
	test.setTimeout(60000)
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	const state: GameState = JSON.parse(readFileSync(new URL('../fixtures/expert-endgame.json', import.meta.url), 'utf8')).state
	const save = createSavedMatch(readMapFixture(4), state, 'expert', 'endgame-regression')
	parseSavedMatch(JSON.stringify(save))
	await page.goto('/')
	await page.evaluate(([key, raw]) => localStorage.setItem(key, raw), [savedMatchKey, JSON.stringify(save)])
	await page.goto('/play/4/?ai=expert')
	await expect(page.getByRole('button', { name: 'Play again', exact: true })).toBeVisible({ timeout: 50000 })
	await expect(page.getByText(`Round ${state.round}`, { exact: true })).toBeVisible()
	await expect(page.locator('[data-unit="4"]')).toHaveCount(0)
	expect(errors).toEqual([])
})
