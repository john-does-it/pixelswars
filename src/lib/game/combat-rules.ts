type MatchupTable = Record<string, Record<string, number>>

// Shared by the browser game and Node regression tests.
const CombatRules = (() => {
	const modifiers: MatchupTable = {
		'infantry-rocket': { infantry: 0.5, 'infantry-rocket': 1.5, jeep: 2.5, tank: 2.5, artillery: 2.5, aircraft: 0, plane: 0, helicopter: 0 },
		plane: { infantry: 1, 'infantry-rocket': 1.5, jeep: 1, tank: 1.5, artillery: 1, aircraft: 1, plane: 1, helicopter: 2 },
		helicopter: { infantry: 2, 'infantry-rocket': 2, jeep: 1, tank: 1, artillery: 1, aircraft: 1, plane: 0.5, helicopter: 1 },
		aircraft: { infantry: 1, 'infantry-rocket': 1.5, jeep: 1, tank: 1, artillery: 1, aircraft: 1, plane: 1, helicopter: 1 },
		infantry: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.5, infantry: 1, jeep: 0.5, tank: 0.5, artillery: 1.5 },
		jeep: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.5, infantry: 1.5, jeep: 1, tank: 0.5, artillery: 1 },
		tank: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.5, infantry: 1.5, jeep: 1.5, tank: 1, artillery: 0.5 },
		artillery: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.5, infantry: 0.5, jeep: 1, tank: 1.5, artillery: 1 }
	}

	function attackCells(index: number, cols: number, rows: number, range: number, exclusion = 0): number[] {
		const result: number[] = []
		const x = index % cols
		const y = Math.floor(index / cols)
		// Preserve the prototype's square ranges, including diagonal attacks.
		for (let row = Math.max(0, y - range); row <= Math.min(rows - 1, y + range); row++) {
			for (let col = Math.max(0, x - range); col <= Math.min(cols - 1, x + range); col++) {
				const distance = Math.max(Math.abs(col - x), Math.abs(row - y))
				if (distance > exclusion) result.push(row * cols + col)
			}
		}
		return result
	}

	function typeModifier(attackerType: string, defenderType: string): number {
		return modifiers[attackerType]?.[defenderType] ?? 1
	}

	// Zero means an impossible attack, not a shot that consumes ammo for no damage.
	function canTarget(attackerType: string, defenderType: string): boolean {
		return typeModifier(attackerType, defenderType) > 0
	}

	function damage(attack: number, health: number, defense: number, terrainDefense: number, attackerType: string, defenderType: string): number {
		const base = Math.max(0, attack - (defense + terrainDefense) / 10)
		return ((base * Math.max(0, health)) / 100) * typeModifier(attackerType, defenderType)
	}

	return { attackCells, typeModifier, canTarget, damage }
})()

export default CombatRules
