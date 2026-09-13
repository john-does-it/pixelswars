type MatchupTable = Record<string, Record<string, number>>

// Shared by the browser game and Node regression tests.
const CombatRules = (() => {
	const modifiers: MatchupTable = {
		'infantry-sniper': { infantry: 1.5, 'infantry-rocket': 1.5, jeep: 0.5, tank: 0.5, artillery: 1, 'anti-air': 1, aircraft: 0, plane: 0, helicopter: 0 },
		'infantry-rocket': { infantry: 0.5, 'infantry-rocket': 1.5, jeep: 2.5, tank: 2.5, artillery: 2.5, 'anti-air': 2.5, aircraft: 0, plane: 0, helicopter: 0 },
		'anti-air': { infantry: 0, 'infantry-rocket': 0, jeep: 0, tank: 0, artillery: 0, 'anti-air': 0, aircraft: 1, plane: 1, helicopter: 2 },
		plane: { infantry: 1, 'infantry-rocket': 1.5, jeep: 1, tank: 1.5, artillery: 1, 'anti-air': 1, aircraft: 1, plane: 1, helicopter: 2 },
		helicopter: { infantry: 2, 'infantry-rocket': 2, jeep: 1, tank: 1, artillery: 1, 'anti-air': 1, aircraft: 1, plane: 0.5, helicopter: 1 },
		aircraft: { infantry: 1, 'infantry-rocket': 1.5, jeep: 1, tank: 1, artillery: 1, 'anti-air': 1, aircraft: 1, plane: 1, helicopter: 1 },
		infantry: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.5, infantry: 1, jeep: 0.5, tank: 0.5, artillery: 1.5 },
		jeep: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.5, infantry: 1.5, jeep: 1, tank: 0.5, artillery: 1 },
		tank: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.5, infantry: 1.5, jeep: 1.5, tank: 1, artillery: 0.5 },
		artillery: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.5, infantry: 0.5, jeep: 1, tank: 1.5, artillery: 1 }
	}

	function attackCells(index: number, columnCount: number, rowCount: number, range: number, exclusion = 0): number[] {
		const targetCells: number[] = []
		const originColumn = index % columnCount
		const originRow = Math.floor(index / columnCount)
		// Preserve the prototype's square ranges, including diagonal attacks.
		for (let row = Math.max(0, originRow - range); row <= Math.min(rowCount - 1, originRow + range); row++) {
			for (let column = Math.max(0, originColumn - range); column <= Math.min(columnCount - 1, originColumn + range); column++) {
				const distance = Math.max(Math.abs(column - originColumn), Math.abs(row - originRow))
				if (distance > exclusion) targetCells.push(row * columnCount + column)
			}
		}
		return targetCells
	}

	function typeModifier(attackerType: string, defenderType: string): number {
		// Snipers share infantry vulnerabilities, but have their own attack matchups.
		const defenderMatchup = defenderType === 'infantry-sniper' ? 'infantry' : defenderType
		return modifiers[attackerType]?.[defenderMatchup] ?? 1
	}

	// Zero means an impossible attack, not a shot that consumes ammo for no damage.
	function canTarget(attackerType: string, defenderType: string): boolean {
		return typeModifier(attackerType, defenderType) > 0
	}

	function damage(attack: number, health: number, maxHealth: number, defense: number, terrainDefense: number, attackerType: string, defenderType: string): number {
		const baseDamage = Math.max(0, attack - (defense + terrainDefense) / 10)
		const healthRatio = maxHealth > 0 ? Math.min(1, Math.max(0, health) / maxHealth) : 0
		return baseDamage * healthRatio * typeModifier(attackerType, defenderType)
	}

	return { attackCells, typeModifier, canTarget, damage }
})()

export default CombatRules
