// Headless economy audit through the real controller. Usage: node --experimental-strip-types scripts/audit-ai-economy.mjs [rounds] [map IDs...]
import { readFileSync } from 'node:fs'
import { initialState, playerIncome, unitAt } from '../src/lib/game/model.ts'
import { isProductionBuilding, unitTypes } from '../src/lib/game/catalog.ts'
import { createController } from '../src/lib/game/controller.ts'
import { runAiTurn } from '../src/lib/game/ai.ts'
import { initializeAiPlanning, planExpertProduction } from '../src/lib/game/ai-economy.ts'

const rounds = Number(process.argv[2] || 6)
const ids = process.argv.slice(3)
const files = JSON.parse(readFileSync(new URL('../src/lib/data/map-files.json', import.meta.url), 'utf8'))
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 30) throw new Error('Choose 1–30 rounds')
for (const id of ids.length ? ids : ['13', '15', '24']) {
	if (!files[id]) throw new Error('Unknown map: ' + id)
	const map = JSON.parse(readFileSync(new URL('../src/lib/data/' + files[id], import.meta.url), 'utf8'))
	const state = initialState(map)
	let seed = Number(id) || 1
	initializeAiPlanning(state, () => {
		seed = (seed * 1664525 + 1013904223) >>> 0
		return seed / 4294967296
	})
	const controller = createController(state, { delay: async () => {} })
	let purchases = []
	const buy = controller.buy.bind(controller)
	controller.buy = (type) => {
		const site = state.productionIndex
		const before = state.money[state.player]
		buy(type)
		if (state.money[state.player] < before) purchases.push({ site, type, cost: unitTypes[type].cost })
	}
	try {
		while (!state.winner && state.round <= rounds) {
			const player = state.player
			const round = state.round
			const startingBudget = state.money[player]
			const income = playerIncome(state, player)
			const sites = state.cells.filter((cell) => cell.owner === player && isProductionBuilding(cell.building))
			const blockedSites = sites.filter((cell) => unitAt(state, cell.index)).length
			const plan = player === 1 ? planExpertProduction(state) : null
			purchases = []
			await runAiTurn(
				controller,
				player === 1 ? 'expert' : 'medium',
				() => true,
				async () => {}
			)
			const spent = purchases.reduce((total, purchase) => total + purchase.cost, 0)
			if (state.money[player] < 0 || startingBudget - spent !== state.money[player]) throw new Error('Invalid purchase accounting')
			console.log(JSON.stringify({ map: id, round, player, income, startingBudget, sites: sites.length, blockedSites, plan, purchases, remainingBudget: state.money[player], winner: state.winner }))
		}
	} finally {
		controller.dispose()
	}
}
