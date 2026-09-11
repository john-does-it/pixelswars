// Combat: shared classic scripts; see js/README.md.

function getUnitAttackCells(unit, cellIndex = Number(unit.parentElement.dataset.index)) {
  return CombatRules.attackCells(cellIndex, numberOfCols, numberOfRows,
    Number(unit.dataset.attack_range), Number(unit.dataset.exclusion_attack_range || 0))
}

function canUnitAttack(attacker, defender) {
  return Boolean(attacker && defender && attacker.isConnected && defender.isConnected &&
    Number(attacker.dataset.health) > 0 && Number(defender.dataset.health) > 0 &&
    attacker.dataset.player !== defender.dataset.player &&
    CombatRules.canTarget(attacker.dataset.type, defender.dataset.type) &&
    getUnitAttackCells(attacker).includes(Number(defender.parentElement.dataset.index)))
}

function getEnemyUnitsInRange(adjacentCells) {
  const cells = document.querySelectorAll('.cell-container')
  const enemyUnitsInRange = []

  adjacentCells.forEach((adjacentCellIndex) => {
    const cell = cells[adjacentCellIndex]
    if (cell) {
      const unitContainer = cell.querySelector('.unit-container')

      if (unitContainer && Number(unitContainer.dataset.player) !== currentPlayer &&
          Number(unitContainer.dataset.health) > 0 &&
          CombatRules.canTarget(selectedUnit.dataset.type, unitContainer.dataset.type)) {
        enemyUnitsInRange.push(unitContainer)
      }
    }
  })

  return enemyUnitsInRange
}

function highlightUnitAttackRange(cellIndex, selectedUnit) {
  const adjacentCells = getUnitAttackCells(selectedUnit, cellIndex)

  adjacentCells.forEach((cell) => {
    const adjacentCell = document.querySelector(`.cell-container[data-index="${cell}"]`)
    const unit = adjacentCell.querySelector('.unit-container')
    if (unit && !CombatRules.canTarget(selectedUnit.dataset.type, unit.dataset.type)) return
    adjacentCell.classList.add('-attackable')
  })
}

function removeAttackableFromCells() {
  cells.forEach((element) => {
    element.classList.remove('-attackable')
  })
}

function removeInRangeFromUnits() {
  const units = document.querySelectorAll('.unit-container')

  units.forEach((unit) => {
    unit.classList.remove('-inrange')
  })
}

function addInRangeToEnemyUnits(index) {
  removeInRangeFromUnits()

  const adjacentCells = getUnitAttackCells(selectedUnit, index)
  const enemyUnits = getEnemyUnitsInRange(adjacentCells)

  if (Number(selectedUnit.dataset.residual_attack_capacity) !== 0) {
    const counter = enemyUnits.length

    enemyUnits.forEach((enemyUnit) => {
      enemyUnit.classList.add('-inrange')
    })

    if (counter === 0) {
      const inRangeMessages = document.querySelectorAll('.inrangemessage')
      inRangeMessages.forEach((inRangeMessage) => {
        inRangeMessage.remove()
      })
    }
  }

  return enemyUnits
}

async function handleFight(event) {
  if (selectedUnit === null || isFighting) {
    return
  }

  // Capture the participants before awaiting animations; a click may target a child icon.
  const attacker = selectedUnit
  const defender = event.currentTarget || event.target.closest('.unit-container')
  if (!canUnitAttack(attacker, defender)) return

  if (Number(attacker.dataset.residual_attack_capacity) <= 0) {
    playSound(sounds.emptyGunShot)
    return
  }

  originalIndex = Number(attacker.parentElement.dataset.index)
  originalMoveCapacity = Number(attacker.dataset.residual_move_capacity)
  endRoundButton.disabled = true
  isFighting = true
  try {
    playFightSound(attacker.dataset.name)
    applyCombatDamage(attacker, defender)
    attacker.dataset.residual_attack_capacity = Number(attacker.dataset.residual_attack_capacity) - 1
    if (Number(attacker.dataset.residual_attack_capacity) === 0) {
      removeInRangeFromUnits()
      updateUnitStatus(attacker, '-outofammo', true)
    }

    if (Number(defender.dataset.health) <= 0) {
      await handleDeathOfUnit(defender, Number(defender.parentElement.dataset.index), attacker)
    } else {
      await new Promise(resolve => setTimeout(resolve, Number(attacker.dataset.sound_delay)))
      // Retaliation uses the defender's own range and type permissions.
      if (canUnitAttack(defender, attacker)) {
        playFightSound(defender.dataset.name)
        applyCombatDamage(defender, attacker)
        if (Number(attacker.dataset.health) <= 0) {
          await handleDeathOfUnit(attacker, Number(attacker.parentElement.dataset.index), defender)
        } else {
          await new Promise(resolve => setTimeout(resolve, Number(defender.dataset.sound_delay)))
        }
      }
    }
  } finally {
    isFighting = false
    endRoundButton.disabled = false
    if (attacker.isConnected) {
      updateCellsAndUnitsState(Number(attacker.parentElement.dataset.index))
    } else {
      unselectUnit()
    }
  }
  checkIfLost()
}

function applyCombatDamage(attacker, defender) {
  const damage = CombatRules.damage(Number(attacker.dataset.attack_damage), Number(attacker.dataset.health),
    Number(defender.dataset.defense), Number(defender.parentElement.dataset.defense_bonus),
    attacker.dataset.type, defender.dataset.type)
  defender.dataset.health = Math.max(0, Math.round(Number(defender.dataset.health) - damage))
  updateHealthAnimation(defender)
}

function checkIfLost() {
  let numberOfPlayerOneUnits = 0
  let numberOfPlayerTwoUnits = 0

  const survivingUnits = document.querySelectorAll('.unit-container')

  survivingUnits.forEach((unit) => {
    if (Number(unit.dataset.player) === 1) {
      numberOfPlayerOneUnits++
    }
    if (Number(unit.dataset.player) === 2) {
      numberOfPlayerTwoUnits++
    }
  })

  if (numberOfPlayerOneUnits === 0) {
    toggleYouWinDialogContainer()
    youWinMessageInDialogContainer('Player two')
  }

  if (numberOfPlayerTwoUnits === 0) {
    toggleYouWinDialogContainer()
    youWinMessageInDialogContainer('Player one')
  }
}

function handleDeathOfUnit(unit, cellIndex, killingUnit) {
  return new Promise((resolve) => {
    const cell = cells[cellIndex]
    const deathDelay = Number(killingUnit.dataset.sound_delay)

    setTimeout(() => {
      createExplosion(cell)
      unit.remove()
      resolve() // Resolve the promise after completing the unit removal
    }, deathDelay)
  })
}

function addEventListenerHandleFightToEnemyUnitsInRange(enemyUnitsInRange) {
  // If an existing event listener is present, remove it
  removeHandleFightEventListeners()
  enemyUnitsInRange.forEach((enemyUnit) => {
    // Attach a new event listener
    enemyUnit.fightEventListener = (event) => handleFight(event)
    enemyUnit.addEventListener('click', enemyUnit.fightEventListener)
  })
}

function removeHandleFightEventListeners() {
  const units = document.querySelectorAll('.unit-container')
  units.forEach((unit) => {
    // Check if the named reference exists and remove it
    if (unit.fightEventListener) {
      unit.removeEventListener('click', unit.fightEventListener)
      unit.fightEventListener = null // Clear the reference
    }
  })
}
