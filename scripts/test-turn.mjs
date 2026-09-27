import { loadEnv } from 'vite'
import { chromium } from '@playwright/test'
import { iceConfiguration } from '../src/lib/game/ice.ts'

const env = loadEnv('development', process.cwd(), 'VITE_')
let browser
try {
	const configuration = await iceConfiguration({ app: env.VITE_METERED_APP, apiKey: env.VITE_METERED_TURN_API_KEY, relayOnly: 'true' })
	browser = await chromium.launch({ channel: process.env.PW_CHANNEL || undefined })
	const page = await browser.newPage()
	const result = await page.evaluate(async (configuration) => {
		const host = new RTCPeerConnection(configuration)
		const guest = new RTCPeerConnection(configuration)
		const timers = []
		const bounded = (operation, label) => Promise.race([operation, new Promise((_, reject) => timers.push(setTimeout(() => reject(new Error(label)), 30000)))])
		const candidates = new Map([
			[host, []],
			[guest, []]
		])
		const candidateCounts = { host: 0, guest: 0 }
		const errorCodes = new Set()
		for (const [connection, remote, side] of [
			[host, guest, 'host'],
			[guest, host, 'guest']
		]) {
			connection.onicecandidate = ({ candidate }) => {
				if (!candidate) return
				candidateCounts[side]++
				if (remote.remoteDescription) void remote.addIceCandidate(candidate).catch(() => errorCodes.add('candidate-rejected'))
				else candidates.get(remote).push(candidate)
			}
			connection.onicecandidateerror = (event) => errorCodes.add(event.errorCode)
		}
		try {
			const channel = host.createDataChannel('pixelswars-relay-check')
			const delivered = new Promise((resolve) => {
				guest.ondatachannel = ({ channel: receiver }) => {
					receiver.onmessage = ({ data }) => receiver.send(data)
				}
				channel.onopen = () => channel.send('pixelswars-relay-check')
				channel.onmessage = ({ data }) => resolve(data)
			})
			await host.setLocalDescription(await host.createOffer())
			await guest.setRemoteDescription(host.localDescription)
			for (const candidate of candidates.get(guest).splice(0)) await guest.addIceCandidate(candidate)
			await guest.setLocalDescription(await guest.createAnswer())
			await host.setRemoteDescription(guest.localDescription)
			for (const candidate of candidates.get(host).splice(0)) await host.addIceCandidate(candidate)
			if ((await bounded(delivered, 'TURN data exchange timed out')) !== 'pixelswars-relay-check') throw new Error('Unexpected relay response')
			const stats = await host.getStats()
			let pair
			stats.forEach((stat) => {
				if (stat.type === 'transport' && stat.selectedCandidatePairId) pair = stats.get(stat.selectedCandidatePairId)
			})
			const local = pair && stats.get(pair.localCandidateId)
			const remote = pair && stats.get(pair.remoteCandidateId)
			if (local?.candidateType !== 'relay' || remote?.candidateType !== 'relay') throw new Error('Relay candidate pair was not selected')
			return { dataExchanged: true, localCandidate: local.candidateType, remoteCandidate: remote.candidateType }
		} catch {
			return { dataExchanged: false, candidateCounts, errorCodes: [...errorCodes], hostState: host.iceConnectionState, guestState: guest.iceConnectionState }
		} finally {
			timers.forEach(clearTimeout)
			host.close()
			guest.close()
		}
	}, configuration)
	console.log(result.dataExchanged ? 'TURN relay verified:' : 'TURN relay failed:', JSON.stringify(result))
	if (!result.dataExchanged) process.exitCode = 1
} catch (error) {
	// Avoid printing provider responses, credentials, request URLs or network addresses.
	console.error(error instanceof Error && error.message === 'relay' ? 'TURN credentials unavailable. Check the Metered app and credential-scoped API key.' : 'TURN verification failed. Check network access and the installed Playwright browser.')
	process.exitCode = 1
} finally {
	await browser?.close()
}
