import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { unitTypes } from '../src/lib/game/catalog.ts'
import { damageStage, unitSprite } from '../src/lib/game/unit-sprites.ts'
import type { Player, UnitTypeId } from '../src/lib/game/types.ts'

test('damage stages use each unit’s maximum health and recover when healed', () => {
	for (const [type, { maxHealth }] of Object.entries(unitTypes) as [UnitTypeId, (typeof unitTypes)[UnitTypeId]][]) {
		const unit = { type, player: 1 as Player, health: maxHealth }
		for (const [ratio, expected] of [
			[1, 0],
			[0.81, 0],
			[0.8, 1],
			[0.61, 1],
			[0.6, 2],
			[0.41, 2],
			[0.4, 3],
			[0.21, 3],
			[0.2, 4],
			[0.01, 4],
			[1, 0]
		]) {
			unit.health = ratio * maxHealth
			assert.equal(damageStage(unit), expected, `${type} at ${ratio}`)
		}
	}
})

test('every selected board and preview sprite has a source asset', () => {
	for (const [type, { maxHealth }] of Object.entries(unitTypes) as [UnitTypeId, (typeof unitTypes)[UnitTypeId]][]) {
		for (const player of [1, 2] as const) {
			for (const ratio of [1, 0.8, 0.6, 0.4, 0.2]) {
				for (const fit of [false, true]) {
					const sprite = unitSprite({ type, player, health: ratio * maxHealth }, fit)
					assert.ok(existsSync(new URL(`..${sprite}.base64`, import.meta.url)), sprite)
				}
			}
		}
	}
})

test('every unit sound references an available audio asset', () => {
	for (const [type, definition] of Object.entries(unitTypes)) {
		for (const sound of [definition.selectSound, definition.fightSound]) {
			assert.ok(existsSync(new URL(`../assets/mp3/${sound}.mp3`, import.meta.url)), `${type}: ${sound}`)
		}
	}
})
