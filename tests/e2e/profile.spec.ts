import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { makeBackup, emptyProfile, parseBackup, profileStorageKey } from '../../src/lib/profile.ts'
import { support } from '../../src/lib/support.ts'
import { defaultPreferences } from '../../src/lib/preferences-cookie.ts'

const medal = { map: '13', revision: 1, difficulty: 'hard' as const, earnedAt: '2026-10-16T12:00:00.000Z' }
const backup = makeBackup({ ...emptyProfile(), pseudonym: 'Saved commander', medals: [medal] }, { ...defaultPreferences, volume: 35, unitSelectionSounds: false })

test('profile backup previews before replacing, restores settings and medals, and survives reload', async ({ page }) => {
	await page.goto('/profile/')
	await page.getByLabel('Nickname (optional)').fill('Current commander')
	await page.getByRole('button', { name: 'Save nickname' }).click()
	await expect(page.getByRole('status')).toHaveText('Nickname saved.')
	const upload = page.getByLabel('Choose a JSON backup')
	await upload.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) })
	await expect(page.getByRole('region', { name: 'Restore preview' })).toContainText('Saved commander')
	await expect(page.getByLabel('Nickname (optional)')).toHaveValue('Current commander')
	await page.getByRole('button', { name: 'Cancel / close' }).click()
	await expect(page.getByRole('region', { name: 'Restore preview' })).toHaveCount(0)
	await upload.setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) })
	await page.getByRole('button', { name: 'Replace and restore' }).click()
	await expect(page.getByRole('status')).toHaveText('Progress and settings restored.')
	await page.reload()
	await expect(page.getByLabel('Nickname (optional)')).toHaveValue('Saved commander')
	await expect(page.locator('[data-earned="true"]')).toHaveCount(1)
	await expect(page.locator('[data-earned="true"]')).toHaveAttribute('data-difficulty', 'hard')
	const downloadEvent = page.waitForEvent('download')
	await page.getByRole('button', { name: 'Download backup' }).click()
	const download = await downloadEvent
	const exported = parseBackup(await readFile((await download.path())!, 'utf8'))
	expect(exported.profile.medals).toEqual([medal])
	expect(exported.preferences.volume).toBe(35)
	expect(exported.preferences.unitSelectionSounds).toBe(false)
	await page.goto('/')
	await expect(page.locator('[data-earned]')).toHaveCount(0)
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('invalid and future backups leave existing progress intact', async ({ page }) => {
	await page.goto('/profile/')
	await page.getByLabel('Nickname (optional)').fill('Keep me')
	await page.getByRole('button', { name: 'Save nickname' }).click()
	for (const contents of ['{', backup.replace('"version":1', '"version":99')]) {
		await page.getByLabel('Choose a JSON backup').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from(contents) })
		await expect(page.getByRole('status')).toContainText('Your progress has not changed.')
		await expect(page.getByRole('button', { name: 'Replace and restore' })).toHaveCount(0)
		await expect(page.getByLabel('Nickname (optional)')).toHaveValue('Keep me')
	}
	await page.reload()
	await expect(page.getByLabel('Nickname (optional)')).toHaveValue('Keep me')
})

test('profile handles unavailable storage and synchronizes progress between tabs', async ({ page, context }) => {
	await page.goto('/profile/')
	const second = await context.newPage()
	await second.goto('/profile/')
	await page.getByLabel('Choose a JSON backup').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup) })
	await page.getByRole('button', { name: 'Replace and restore' }).click()
	await expect(second.locator('[data-earned="true"]')).toHaveCount(1)
	await page.evaluate((key) => localStorage.removeItem(key), profileStorageKey)
	await expect(second.locator('[data-earned="true"]')).toHaveCount(0)
	await second.close()
	await page.addInitScript(() => {
		Storage.prototype.setItem = () => {
			throw new DOMException('Unavailable', 'QuotaExceededError')
		}
	})
	await page.reload()
	await page.getByLabel('Nickname (optional)').fill('Unsaved')
	await page.getByRole('button', { name: 'Save nickname' }).click()
	await expect(page.getByRole('alert')).toContainText('could not be read or saved')
})

test('support page displays the supplied PayPal QR code and a direct contribution link', async ({ page }) => {
	await page.goto('/support/')
	await expect(page.getByRole('heading', { name: 'Support the game' })).toBeVisible()
	await expect(page.getByText('Payment options will be available here soon. Thank you for playing!')).toHaveCount(0)
	await expect(page.getByRole('link', { name: 'Support via PayPal' })).toHaveAttribute('href', support.paypal)
	const qr = page.getByRole('img', { name: 'PayPal QR code for supporting Pixel’s War' })
	await expect(qr).toBeVisible()
	await expect.poll(() => qr.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(500)
	await expect(page.getByText('No public supporter names yet.')).toBeVisible()
	await expect(page.locator('main a[target="_blank"]')).toHaveCount(1)
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	await page.getByRole('combobox').selectOption('fr')
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Soutenir le jeu')
})

test('crypto support shows the Ethereum network and copies the exact destination', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: async (text: string) => {
					;(window as Window & { copiedAddress?: string }).copiedAddress = text
				}
			}
		})
	})
	await page.goto('/support/')
	await expect(page.getByRole('heading', { name: 'Support with crypto' })).toBeVisible()
	await expect(page.getByText('Network: Ethereum Mainnet', { exact: true })).toBeVisible()
	await expect(page.getByText('0x6bb68E9013eF885D4DC94e151f5249A4d0de3186', { exact: true })).toBeVisible()
	await page.getByRole('button', { name: 'Copy address', exact: true }).click()
	await expect(page.getByRole('status')).toHaveText('Address copied.')
	expect(await page.evaluate(() => (window as Window & { copiedAddress?: string }).copiedAddress)).toBe('0x6bb68E9013eF885D4DC94e151f5249A4d0de3186')
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	await page.evaluate(() => {
		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: {
				writeText: async () => {
					throw new Error('Denied')
				}
			}
		})
	})
	await page.getByRole('button', { name: 'Copy address', exact: true }).click()
	await expect(page.getByRole('status')).toContainText('Select it above to copy it manually.')
	await page.getByRole('combobox').selectOption('fr')
	await expect(page.getByText('Réseau : Ethereum Mainnet', { exact: true })).toBeVisible()
	await expect(page.getByRole('button', { name: 'Copier l’adresse' })).toBeVisible()
})

test('board uses the saved nickname for the human side without overflowing on small screens', async ({ page }) => {
	await page.goto('/profile/')
	const nickname = 'A very long commander nickname'
	await page.getByLabel('Nickname (optional)').fill(nickname)
	await page.getByRole('button', { name: 'Save nickname' }).click()
	await expect(page.getByRole('status')).toHaveText('Nickname saved.')
	await page.setViewportSize({ width: 320, height: 740 })
	await page.goto('/play/1/')
	await expect(page.locator('.budgets .player-one')).toHaveText(nickname)
	await expect(page.locator('.budgets .player-two')).toHaveText('Player 2')
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	await page.goto('/play/1/?ai=easy')
	await expect(page.locator('.budgets .player-one')).toHaveText('AI')
	await expect(page.locator('.budgets .player-two')).toHaveText(nickname)
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
	await page.goto('/profile/')
	await page.getByLabel('Nickname (optional)').fill('')
	await page.getByRole('button', { name: 'Save nickname' }).click()
	await expect(page.getByRole('status')).toHaveText('Nickname saved.')
	await page.goto('/play/1/')
	await expect(page.locator('.budgets .player-one')).toHaveText('Player 1')
})
