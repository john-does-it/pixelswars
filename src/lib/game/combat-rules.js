// Shared by the browser game and Node regression tests.
const CombatRules = (() => {
	const modifiers = {
		infantry: { infantry: 1, jeep: 0.5, tank: 0.5, artillery: 1.5 },
		jeep: { infantry: 1.5, jeep: 1, tank: 0.5, artillery: 1 },
		tank: { infantry: 1.5, jeep: 1.5, tank: 1, artillery: 0.5, aircraft: 0 },
		artillery: { infantry: 0.5, jeep: 1, tank: 1.5, artillery: 1 }
	}

	function attackCells(index, cols, rows, range, exclusion = 0) {
		const result = []
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

	function typeModifier(attackerType, defenderType) {
		const category = (type) => (['plane', 'helicopter'].includes(type) ? 'aircraft' : type)
		return modifiers[category(attackerType)]?.[category(defenderType)] ?? 1
	}

	// Zero means an impossible attack, not a shot that consumes ammo for no damage.
	function canTarget(attackerType, defenderType) {
		return typeModifier(attackerType, defenderType) > 0
	}

	function damage(attack, health, defense, terrainDefense, attackerType, defenderType) {
		const base = Math.max(0, attack - (defense + terrainDefense) / 10)
		return ((base * Math.max(0, health)) / 100) * typeModifier(attackerType, defenderType)
	}

	return { attackCells, typeModifier, canTarget, damage }
})()

export default CombatRules
