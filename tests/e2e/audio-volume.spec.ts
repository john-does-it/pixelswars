import { test, expect } from '@playwright/test'
import { readMapFixture } from '../map-fixtures'

test('each infantry type plays its own selection sound on every selection', async ({ page }) => {
	const map = readMapFixture(1)
	map.id = 'local-11111111-1111-4111-8111-111111111111'
	map.units = [
		{ type: 'infantry', player: 1, cell: 1 },
		{ type: 'infantry-sniper', player: 1, cell: 2 },
		{ type: 'infantry-rocket', player: 1, cell: 3 },
		{ type: 'infantry', player: 2, cell: 63 }
	]
	await page.addInitScript((map) => {
		localStorage.setItem('pixelswar-library-v1:' + map.id, JSON.stringify(map))
		const audioState = window as unknown as { playedSounds: string[] }
		audioState.playedSounds = []
		HTMLMediaElement.prototype.play = function () {
			audioState.playedSounds.push(this.src)
			return Promise.resolve()
		}
	}, map)
	await page.goto('/play/local/?id=' + map.id)
	const cells = [1, 2, 3, 1, 2, 3]
	for (const cell of cells) await page.locator(`[data-cell="${cell}"]`).click()
	const sounds = await page.evaluate(() => (window as unknown as { playedSounds: string[] }).playedSounds)
	expect(sounds.map((url) => new URL(url).pathname)).toEqual(cells.map((cell) => `/assets/mp3/infantry-voice-${cell}.mp3`))
	for (const url of new Set(sounds)) expect((await page.request.get(url)).status()).toBe(200)
})

test('volume adjusts existing music silently without restarting playback', async ({ page }) => {
	await page.addInitScript(() => {
		const audioState = window as unknown as { playedAudio: HTMLMediaElement[] }
		audioState.playedAudio = []
		HTMLMediaElement.prototype.play = function () {
			audioState.playedAudio.push(this)
			return Promise.resolve()
		}
	})
	await page.goto('/play/1/')
	await page.getByRole('button', { name: 'Options and help', exact: true }).click()
	const volume = page.getByRole('slider', { name: 'Sound', exact: true })
	await volume.fill('50')
	const playCount = () => page.evaluate(() => (window as unknown as { playedAudio: HTMLMediaElement[] }).playedAudio.length)
	await expect.poll(playCount).toBe(0)
	await page.getByRole('button', { name: 'Music off', exact: true }).click()
	await expect.poll(playCount).toBe(1)
	await volume.fill('25')
	await expect.poll(() => page.evaluate(() => (window as unknown as { playedAudio: HTMLMediaElement[] }).playedAudio[0].volume)).toBeCloseTo(0.125 * 0.25)
	await expect.poll(playCount).toBe(1)
})

test('unit selection audio can be muted independently and stays muted after reload', async ({ page }) => {
	await page.addInitScript(() => {
		const audioState = window as unknown as { playedSounds: string[] }
		audioState.playedSounds = []
		HTMLMediaElement.prototype.play = function () {
			audioState.playedSounds.push(this.src)
			return Promise.resolve()
		}
	})
	const sounds = () => page.evaluate(() => (window as unknown as { playedSounds: string[] }).playedSounds.map((url) => new URL(url).pathname))
	const options = page.getByRole('button', { name: 'Options and help', exact: true })
	const toggle = page.getByRole('button', { name: 'Unit selection', exact: true })
	await page.goto('/play/1/')
	await page.locator('[data-cell="1"]').click()
	await expect.poll(sounds).toHaveLength(1)
	await options.click()
	await expect(toggle).toHaveAttribute('aria-pressed', 'true')
	await toggle.click()
	await expect(toggle).toHaveAttribute('aria-pressed', 'false')
	await page.keyboard.press('Escape')
	await page.locator('[data-cell="3"]').click()
	await page.locator('[data-cell="1"]').click()
	await expect.poll(sounds).toHaveLength(1)
	await page.keyboard.press('ArrowDown')
	await expect.poll(sounds).toContain('/assets/mp3/woosh-movement.mp3')
	await options.click()
	await page.getByRole('button', { name: 'Music off', exact: true }).click()
	await expect.poll(sounds).toContain('/assets/mp3/player-one-music.mp3')
	const layout = await page.locator('.settings-controls').evaluate((element) => {
		const parent = element.getBoundingClientRect()
		const volume = element.querySelector('.volume-control')!.getBoundingClientRect()
		const toggles = element.querySelector('.audio-toggles')!.getBoundingClientRect()
		return { fullWidth: Math.abs(volume.width - parent.width) < 1, separateRow: volume.bottom <= toggles.top }
	})
	expect(layout).toEqual({ fullWidth: true, separateRow: true })
	await page.setViewportSize({ width: 320, height: 800 })
	expect(await page.locator('.audio-toggles').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
	await page.reload()
	await options.click()
	await expect(toggle).toHaveAttribute('aria-pressed', 'false')
	await toggle.click()
	await page.keyboard.press('Escape')
	await page.locator('[data-cell="1"]').click()
	await expect.poll(sounds).toContain('/assets/mp3/infantry-voice-1.mp3')
})
