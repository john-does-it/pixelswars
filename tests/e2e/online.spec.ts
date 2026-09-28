import { test, expect, type Page } from '@playwright/test'
import { PeerServer } from 'peer'
import type { Server } from 'node:http'
import { loadEnv } from 'vite'

const relayConfigured = Boolean(loadEnv('development', process.cwd(), 'VITE_').VITE_METERED_APP)
const relayEndpoint = 'https://*.metered.live/api/v1/turn/credentials**'
const relayResponse = [{ urls: 'turn:standard.relay.metered.ca:80', username: 'e2e-user', credential: 'e2e-password' }]

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

async function localIce(page: Page, withoutCandidates = false) {
	await page.route(relayEndpoint, (route) => route.fulfill({ json: relayResponse }))
	// Real PeerServer and WebRTC, with local signaling/ICE to keep CI independent of public services.
	await page.addInitScript(
		({ port, withoutCandidates }) => {
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
					Reflect.set(window, 'onlineIceConfiguration', configuration)
					super({ ...configuration, iceServers: [], ...(withoutCandidates ? { iceTransportPolicy: 'relay' } : {}) })
					if (withoutCandidates) {
						this.addEventListener('icegatheringstatechange', () => {
							Reflect.set(window, 'onlineIceGatheringComplete', this.iceGatheringState === 'complete')
						})
					}
				}
			}
		},
		{ port: signalPort, withoutCandidates }
	)
}

test('relay lookup starts only on request and a provider outage allows retry', async ({ page }) => {
	test.skip(!relayConfigured, 'Build with Metered settings to exercise the credential API')
	await localIce(page)
	let unavailable = true
	let requests = 0
	await page.route(relayEndpoint, (route) => {
		requests++
		return unavailable ? route.fulfill({ status: 503 }) : route.fulfill({ json: relayResponse })
	})
	await page.goto('/play/1/?online=1')
	await expect(page.getByRole('button', { name: 'Create a game' })).toBeVisible()
	expect(requests).toBe(0)
	await page.getByRole('button', { name: 'Create a game' }).click()
	await expect(page.getByRole('alert')).toContainText('connection relay is unavailable')
	expect(requests).toBe(1)
	unavailable = false
	await page.getByRole('button', { name: 'Create a game' }).click()
	await expect(page.getByLabel('Invitation link', { exact: true })).toHaveValue(/#invite=PW2\./)
	await expect(page.getByRole('alert')).toHaveCount(0)
	expect(requests).toBe(2)
})

for (const blockedSide of ['host', 'guest'] as const) {
	test(`missing local candidates show browser guidance on the ${blockedSide} only`, async ({ page, browser }) => {
		const guestContext = await browser.newContext({ bypassCSP: true })
		const guest = await guestContext.newPage()
		try {
			await page.clock.install()
			await guest.clock.install()
			// Relay-only ICE with no relay configured produces a real, empty candidate search.
			await localIce(page, blockedSide === 'host')
			await localIce(guest, blockedSide === 'guest')
			await page.goto('/play/1/?online=1')
			await page.getByRole('button', { name: 'Create a game' }).click()
			const invitation = page.getByLabel('Invitation link', { exact: true })
			await expect(invitation).toHaveValue(/#invite=PW2\./)
			await guest.goto(await invitation.inputValue())
			await guest.getByRole('button', { name: 'Join', exact: true }).click()
			const blocked = blockedSide === 'host' ? page : guest
			const other = blockedSide === 'host' ? guest : page
			await expect.poll(() => blocked.evaluate(() => Reflect.get(window, 'onlineIceGatheringComplete'))).toBe(true)
			await blocked.clock.fastForward(36000)
			await expect(blocked.getByRole('alert')).toContainText('Check its WebRTC settings and any VPN or privacy extensions')
			await expect(blocked.getByRole('alert')).toContainText('recommended WebRTC setting')
			await expect(blocked.getByRole('button', { name: blockedSide === 'host' ? 'Create a game' : 'Join', exact: true })).toBeEnabled()
			await other.clock.fastForward(36000)
			await expect(other.getByRole('alert')).toContainText('devices could not connect')
		} finally {
			await guestContext.close()
		}
	})
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
		if (relayConfigured) {
			for (const device of [page, guest]) {
				expect(await device.evaluate(() => Reflect.get(window, 'onlineIceConfiguration'))).toEqual({ iceServers: [{ ...relayResponse[0], urls: [relayResponse[0].urls] }], iceTransportPolicy: 'all' })
			}
		}
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
		await guest.goto('/')
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

test('an incomplete connection times out on both devices and the invitation can be retried', async ({ page, browser, isMobile }) => {
	const guestContext = await browser.newContext({ viewport: page.viewportSize()!, isMobile, hasTouch: isMobile, bypassCSP: true })
	const guest = await guestContext.newPage()
	try {
		await page.clock.install()
		for (const device of [page, guest]) {
			await localIce(device)
			await device.addInitScript(() => {
				// Suppress the initial exchange while keeping real signaling and WebRTC.
				Object.assign(window, { dropOnlinePackets: true, onlinePacketAttempted: false })
				const send = RTCDataChannel.prototype.send
				RTCDataChannel.prototype.send = function (data: string | Blob | ArrayBuffer | ArrayBufferView) {
					if (Reflect.get(window, 'dropOnlinePackets')) {
						Reflect.set(window, 'onlinePacketAttempted', true)
						return
					}
					return send.call(this, data as ArrayBufferView<ArrayBuffer>)
				}
			})
		}
		await page.goto('/play/1/?online=1')
		await page.getByRole('button', { name: 'Create a game' }).click()
		const invitation = page.getByLabel('Invitation link', { exact: true })
		await expect(invitation).toHaveValue(/#invite=PW2\./)
		await guest.goto(await invitation.inputValue())
		await guest.getByRole('button', { name: 'Join', exact: true }).click()
		for (const device of [page, guest]) {
			await expect.poll(() => device.evaluate(() => Reflect.get(window, 'onlinePacketAttempted'))).toBe(true)
		}
		await page.clock.fastForward(36000)
		for (const device of [page, guest]) {
			await expect(device.getByRole('alert')).toContainText('devices could not connect')
			await expect(device.getByText('Waiting for the other device…', { exact: true })).toHaveCount(0)
			await device.evaluate(() => Reflect.set(window, 'dropOnlinePackets', false))
		}
		await guest.getByRole('button', { name: 'Join', exact: true }).click()
		await expect(page.getByText('Online · You play blue (Player 1)', { exact: true })).toBeVisible()
		await expect(guest.getByText(/Online · You play red/)).toBeVisible()
	} finally {
		await guestContext.close()
	}
})
