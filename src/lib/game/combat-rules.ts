type MatchupTable = Record<string, Record<string, number>>

// Shared by the browser game and Node regression tests.
const CombatRules = (() => {
	const modifiers: MatchupTable = {
		'infantry-sniper': { infantry: 1.5, 'infantry-rocket': 1.5, jeep: 0.5, tank: 0.5, artillery: 1, 'anti-air': 1, aircraft: 0, plane: 0, helicopter: 0 },
		'infantry-rocket': { infantry: 1.2, 'infantry-rocket': 1.5, jeep: 2.5, tank: 2.5, artillery: 2.15, 'anti-air': 2.5, aircraft: 0, plane: 0, helicopter: 0 },
		'anti-air': { infantry: 0, 'infantry-rocket': 0, jeep: 0, tank: 0, artillery: 0, 'anti-air': 0, aircraft: 1, plane: 1, helicopter: 2 },
		plane: { infantry: 1, 'infantry-rocket': 1.5, jeep: 1, tank: 1.5, artillery: 1, 'anti-air': 1, aircraft: 1, plane: 1, helicopter: 2 },
		helicopter: { infantry: 2, 'infantry-rocket': 2, jeep: 1, tank: 1, artillery: 1, 'anti-air': 1, aircraft: 1, plane: 0.5, helicopter: 1 },
		aircraft: { infantry: 1, 'infantry-rocket': 1.5, jeep: 1, tank: 1, artillery: 1, 'anti-air': 1, aircraft: 1, plane: 1, helicopter: 1 },
		infantry: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1, infantry: 1, jeep: 1.25, tank: 0.5, artillery: 0.8 },
		jeep: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.5, infantry: 1, jeep: 1, tank: 0.75, artillery: 1 },
		tank: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.5, infantry: 1.5, jeep: 1.25, tank: 1, artillery: 1.25 },
		artillery: { aircraft: 0, plane: 0, helicopter: 0, 'infantry-rocket': 1.35, infantry: 1.35, jeep: 1.45, tank: 1.6, artillery: 1, 'anti-air': 1.25 }
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
		// Tanks and combat ships share the same bonus against both artillery units.
		if ((attackerType === 'tank' || attackerType === 'attack-ship') && (defenderType === 'artillery' || defenderType === 'artillery-ship')) return modifiers.tank.artillery
		// Naval artillery shares the land artillery's offensive matchups, but remains a ship when targeted.
		if (attackerType === 'artillery-ship') attackerType = 'artillery'
		if (attackerType === 'transport' || attackerType === 'transport-helicopter' || attackerType === 'transport-ship') return 0
		if (attackerType === 'attack-ship') return defenderType === 'plane' || defenderType === 'helicopter' || defenderType === 'transport-helicopter' ? 0 : defenderType === 'tank' ? 0.8 : 1
		if (defenderType === 'attack-ship' || defenderType === 'transport-ship' || defenderType === 'artillery-ship') return ({ infantry: 0.25, 'infantry-sniper': 0.25, 'infantry-rocket': 1.5, jeep: 0.5, tank: 1, artillery: 1.1, 'anti-air': 0, plane: 1.5, helicopter: 1 } as Record<string, number>)[attackerType] ?? 1
		// Snipers share infantry vulnerabilities, but have their own attack matchups.
		const defenderMatchup = defenderType === 'infantry-sniper' ? 'infantry' : defenderType === 'transport' ? 'jeep' : defenderType === 'transport-helicopter' ? 'helicopter' : defenderType
		return modifiers[attackerType]?.[defenderMatchup] ?? 1
	}

	// Zero means an impossible attack, not a shot that consumes ammo for no damage.
	function canTarget(attackerType: string, defenderType: string): boolean {
		return typeModifier(attackerType, defenderType) > 0
	}

	function damage(attack: number, health: number, maxHealth: number, defense: number, terrainDefense: number, attackerType: string, defenderType: string): number {
		// Each defense point grants 0.75% reduction; unit and terrain compound.
		const protection = (value: number) => 1 - (Math.min(100, Math.max(0, value)) * 0.75) / 100
		const baseDamage = Math.max(0, attack) * protection(defense) * protection(terrainDefense)
		const healthRatio = maxHealth > 0 ? Math.min(1, Math.max(0, health) / maxHealth) : 0
		return baseDamage * healthRatio * typeModifier(attackerType, defenderType)
	}

	return { attackCells, typeModifier, canTarget, damage }
})()

export default CombatRules
