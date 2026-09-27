import { test, expect, type Page } from '@playwright/test'
import { PeerServer } from 'peer'
import type { Server } from 'node:http'

// Local signaling runs on a random test port, outside the production CSP allowlist.
test.use({ bypassCSP: true })

let signalServer: Server
let signalPort: number
test.beforeEach(async () => {
	await new Promise<void>((resolve) => {
		PeerServer({ port: 0, host: '127.0.0.1' }, (server) => {
			signalServer = server as Server
			signalPort = (server.address() as { port: number }).port
			resolve()
		})
	})
})
test.afterEach(() => {
	signalServer?.close()
})

async function localIce(page: Page) {
	// Real PeerServer and WebRTC, with local signaling/ICE to keep CI independent of public services.
	await page.addInitScript((port) => {
		const NativeSocket = window.WebSocket
		window.WebSocket = class extends NativeSocket {
			constructor(address: string | URL, protocols?: string | string[]) {
				const url = new URL(address)
				if (url.hostname === '0.peerjs.com') {
					url.protocol = 'ws:'
					url.host = `127.0.0.1:${port}`
				}
				super(url, protocols)
			}
		}
		const NativeConnection = window.RTCPeerConnection
		window.RTCPeerConnection = class extends NativeConnection {
			constructor(configuration?: RTCConfiguration) {
				super({ ...configuration, iceServers: [] })
			}
		}
	}, signalPort)
}

test('two devices connect, synchronize a match and pause when a player leaves', async ({ page, browser, isMobile }) => {
	test.setTimeout(90000)
	const guestContext = await browser.newContext({ viewport: page.viewportSize()!, isMobile, hasTouch: isMobile, bypassCSP: true })
	const guest = await guestContext.newPage()
	const errors: string[] = []
	page.on('pageerror', (error) => errors.push(error.message))
	guest.on('pageerror', (error) => errors.push(error.message))
	await localIce(page)
	await localIce(guest)
	try {
		await page.goto('/')
		await page.getByRole('link', { name: /Emberfall/ }).click()
		await page.getByRole('link', { name: 'Play 1v1 online' }).click()
		await page.getByRole('button', { name: 'Create a game' }).click()
		await expect(page.getByLabel('Invitation link', { exact: true })).toHaveValue(/#invite=PW2\./)
		const invitation = await page.getByLabel('Invitation link').inputValue()
		await guest.goto(new URL('/play/2/?online=1', invitation).href)
		await guest.getByRole('button', { name: 'Join a game' }).click()
		await guest.getByLabel('Invitation link or code').fill(invitation)
		await guest.getByRole('button', { name: 'Join', exact: true }).click()
		await expect(guest.getByRole('alert')).toContainText('another map')
		await guest.goto(invitation)
		await expect(guest.getByRole('heading', { level: 1 })).toHaveText('A friend challenges you')
		await expect(guest.getByText('Invite a friend.', { exact: false })).toHaveCount(0)
		await expect(guest.getByRole('button', { name: 'Start over' })).toHaveCount(0)
		await expect(guest.locator('textarea')).toHaveCount(0)
		await guest.getByRole('button', { name: 'Join', exact: true }).click()
		await expect(page.getByText('Online · You play blue (Player 1)', { exact: true })).toBeVisible()
		await expect(guest.getByText(/Online · You play red/)).toBeVisible()
		await expect(page.getByRole('dialog', { name: 'Waiting for your friend' })).toHaveCount(0)
		await expect(guest.getByRole('dialog', { name: 'Waiting for your friend' })).toHaveCount(0)
		await expect(page.locator('dialog.turn-transition')).toHaveCount(0)
		const cell = (device: Page, index: number) => device.locator(`[data-cell="${index}"]`)
		const end = (device: Page) => device.getByRole('button', { name: 'End round', exact: true })
		const capture = (device: Page) => device.getByRole('button', { name: 'Capture', exact: true }).click()
		const changeTurn = async (from: Page, to: Page) => {
			await end(from).click()
			await expect(to.locator('dialog.turn-transition')).toBeVisible()
			await expect(to.locator('dialog.turn-transition')).toHaveCount(0)
			await expect(end(to)).toBeVisible()
			await expect(end(from)).toBeHidden()
		}
		await expect(end(guest)).toBeHidden()
		await cell(guest, 61).click()
		await expect(guest.locator('.reachable')).toHaveCount(0)
		await cell(page, 1).click()
		await cell(page, 9).click()
		await expect(cell(guest, 9).locator('[data-unit="1"]')).toBeVisible()
		await page.getByRole('button', { name: 'Cancel move', exact: true }).click()
		await expect(cell(guest, 1).locator('[data-unit="1"]')).toBeVisible()
		await cell(page, 1).click()
		await cell(page, 9).click()
		await cell(page, 8).click()
		await capture(page)
		await cell(page, 2).click()
		await cell(page, 10).click()
		await capture(page)
		await expect(cell(guest, 8)).toHaveClass(/-halfcaptured/)
		await changeTurn(page, guest)
		await cell(guest, 61).click()
		await expect(cell(guest, 53).locator('.movement-marker')).toBeVisible()
		await cell(guest, 53).click()
		await expect(cell(page, 53).locator('[data-unit="7"]')).toBeVisible()
		await guest.getByRole('button', { name: 'Confirm move', exact: true }).click()
		await changeTurn(guest, page)
		await cell(page, 8).click()
		await capture(page)
		await cell(page, 9).click()
		await page.getByRole('button', { name: 'Confirm move', exact: true }).click()
		await cell(page, 10).click()
		await capture(page)
		await page.getByRole('button', { name: 'Confirm move', exact: true }).click()
		await expect(cell(guest, 8)).toHaveClass(/-capturedby1/)
		await changeTurn(page, guest)
		await changeTurn(guest, page)
		await cell(page, 8).click()
		await expect(guest.getByRole('dialog', { name: 'Army base' })).toHaveCount(0)
		await page.getByRole('button', { name: 'Buy Infantry', exact: true }).click()
		await expect(cell(guest, 8).locator('[data-unit]')).toBeVisible()
		await expect(guest.locator('[data-unit]')).toHaveCount(11)
		const extra = await guestContext.newPage()
		await localIce(extra)
		await extra.goto(invitation)
		await extra.getByRole('button', { name: 'Join', exact: true }).click()
		await expect(extra.getByRole('alert')).toContainText('already has two players', { timeout: 10000 })
		await expect(page.getByText('Online · You play blue (Player 1)', { exact: true })).toBeVisible()
		await extra.close()
		await guest.getByRole('link', { name: '← Pixel’s War' }).click()
		await expect(page.getByRole('dialog', { name: 'Game paused' })).toBeVisible({ timeout: 15000 })
		await expect(end(page)).toBeHidden()
		expect(errors).toEqual([])
	} finally {
		await guestContext.close()
	}
})

test('expired invitations and unavailable signaling give recoverable errors', async ({ page }) => {
	await localIce(page)
	await page.goto('/play/1/?online=1')
	await page.getByRole('button', { name: 'Create a game' }).click()
	const invitation = page.getByLabel('Invitation link', { exact: true })
	await expect(invitation).toHaveValue(/#invite=PW2\./)
	const address = await invitation.inputValue()
	// Keep lazy-loaded navigation slow enough to expose overlapping navigations.
	await page.route('**/_app/immutable/**/*.js', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 500))
		await route.continue()
	})
	await page.getByRole('link', { name: '← Pixel’s War' }).click()
	await expect(page).toHaveURL('/')
	await page.goto(address)
	await page.getByRole('button', { name: 'Join', exact: true }).click()
	await expect(page.getByRole('alert')).toContainText('no longer available', { timeout: 10000 })
	await page.getByRole('link', { name: '← Pixel’s War' }).click()
	await expect(page).toHaveURL('/')
	await page.goto('/play/1/?online=1')
	// Stop the real signaling listener to exercise an actual connection failure.
	signalServer.close()
	await page.getByRole('button', { name: 'Create a game' }).click()
	await expect(page.getByRole('alert')).toContainText('connection service is unavailable', { timeout: 20000 })
	await expect(page.getByRole('button', { name: 'Create a game' })).toBeEnabled()
})

test('invalid invitations show a recoverable error', async ({ page }) => {
	await localIce(page)
	await page.goto('/play/1/?online=1')
	await page.getByRole('button', { name: 'Join a game' }).click()
	await page.getByLabel('Invitation link or code').fill('not-an-invitation')
	await page.getByRole('button', { name: 'Join', exact: true }).click()
	await expect(page.getByRole('alert')).toContainText('invalid')
	await expect(page.getByRole('button', { name: 'Join', exact: true })).toBeEnabled()
	await page.getByRole('link', { name: '← Pixel’s War' }).click()
	await expect(page).toHaveURL('/')
	await page.goto('/play/1/?online=1')
	await expect(page.getByRole('button', { name: 'Create a game' })).toBeVisible()
})
