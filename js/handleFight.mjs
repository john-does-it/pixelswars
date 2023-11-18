import globalVariables from './globalVariables.mjs'
import { cells } from './unitsAndCells.mjs'
import { logToConsoleContainer, logToUIFeedbackContainer, toggleYouWinDialogContainer, youWinMessageInDialogContainer } from './uiFeedback.mjs'
import { removeIsInRangeFromUnits, addEventListenerHandleFightToEnemyUnitsInRange, removeHandleFightEventListenersOnUnits } from './handleEventListeners.mjs'
import { getUnitData, getLandscapeData, getLandscapeIndexOfUnit } from './getDatas.mjs'
import { preventCancelMove } from './handleNavigation.mjs'
import { playBattleSound, getSoundDelay, sounds } from './getSounds.mjs'
import { unselectUnit } from './unitSelection.mjs'
import { capitalize, delay } from './helpers.mjs'
import { numberOfCols, numberOfRows } from './getNumberOfColsAndRows.mjs'

export async function handleFight (event) {
  if (globalVariables.isFighting) {
    return
  }

  if (globalVariables.selectedUnitResidualAttackCapacity > 0 && globalVariables.selectedUnit) {
    globalVariables.isFighting = true

    preventCancelMove(globalVariables.selectedUnit)

    const attackerData = getUnitData(globalVariables.selectedUnit)
    const attackerDamage = attackerData.unitAttackDamage * 1.4 // Bonus for attacker
    const attackerDefense = attackerData.unitDefense
    const attackerHealth = attackerData.unitHealth
    const attackerLandscapeDefenseBonus = Number(getLandscapeData(globalVariables.selectedUnit).landscapeDefenseBonus)
    const attackerCellIndex = getLandscapeIndexOfUnit(globalVariables.selectedUnit)

    const defenderUnit = event.currentTarget
    const defenderData = getUnitData(defenderUnit)
    const defenderCellIndex = getLandscapeIndexOfUnit(defenderUnit)

    const defenderDamage = defenderData.unitAttackDamage
    const defenderDefense = defenderData.unitDefense
    const defenderHealth = defenderData.unitHealth
    const defenderAttackRange = defenderData.unitAttackRange
    const defenderLandscapeDefenseBonus = Number(getLandscapeData(defenderUnit).landscapeDefenseBonus)

    logToConsoleContainer(`Fight: ${capitalize(attackerData.unitName)} vs ${capitalize(defenderData.unitName)}.`)

    playBattleSound(globalVariables.selectedUnit)

    const attackerFightResult = fight(attackerDamage, defenderDefense, defenderHealth, attackerHealth, defenderUnit, defenderLandscapeDefenseBonus)

    fightResult(attackerFightResult.unit, attackerFightResult.residualHealth)
    updateSelectedUnitAttackCapacity(globalVariables.selectedUnit)

    // If the enemy unit is not dead and has the attack range capacity to riposte then figh back
    if (attackerFightResult.residualHealth > 0 && returnAdjacentCells(defenderCellIndex, defenderAttackRange).includes(attackerCellIndex)) {
      await delay(getSoundDelay(globalVariables.selectedUnit) + 1000) // Delay for a brief period before the riposte
      const defenderFightResult = fight(defenderDamage, attackerDefense, attackerHealth, defenderHealth, globalVariables.selectedUnit, attackerLandscapeDefenseBonus)
      fightResult(defenderFightResult.unit, defenderFightResult.residualHealth)
      playBattleSound(defenderUnit)
    }
  }

  globalVariables.isFighting = false
  unselectUnit()
  removeHandleFightEventListenersOnUnits()
}

function fight (damage, defense, defenderHealth, health, unit, landscapeDefenseBonus) {
  const totalDamage = (damage + health / 10 - (defense + landscapeDefenseBonus) / 3) / 2
  const residualHealth = Math.round(defenderHealth - totalDamage)

  return { unit, residualHealth }
}

function fightResult (unit, residualHealth) {
  if (unit) {
    unit.setAttribute('data-health', residualHealth)
    const targetHealthContainer = unit.querySelector('.-health')
    targetHealthContainer.innerHTML = residualHealth
    const landscapeIndex = getLandscapeData(unit).landscapeIndex

    if (residualHealth <= 0) {
      setTimeout(() => {
        unit.remove()
        const cell = cells[landscapeIndex]
        createExplosion(cell)
        checkIfLost()
      }, getSoundDelay(globalVariables.selectedUnit))

      if (unit === globalVariables.selectedUnit) {
        globalVariables.isFighting = false
        unselectUnit()
        logToConsoleContainer('Your unit has been destroyed!')
      } else {
        logToConsoleContainer('Enemy destroyed!')
      }
    }

    removeIsInRangeFromUnits()
    return residualHealth
  }
}

function createExplosion (cell) {
  const imgElement = document.createElement('img')
  sounds.bomb.volume = 0.5
  sounds.bomb.play()
  imgElement.src = 'assets/gifs/explosion.gif'
  imgElement.classList.add('explosion')
  cell.appendChild(imgElement)

  setInterval(() => {
    imgElement.remove()
  }, 500)
}

function checkIfLost () {
  let numberOfPlayerOneUnits = 0
  let numberOfPlayerTwoUnits = 0
  const survivingUnits = document.querySelectorAll('.unit-container')

  survivingUnits.forEach(unit => {
    if (unit.dataset.player === '1') {
      numberOfPlayerOneUnits++
    }
    if (unit.dataset.player === '2') {
      numberOfPlayerTwoUnits++
    }
  })

  if (numberOfPlayerOneUnits === 0) {
    toggleYouWinDialogContainer()
    youWinMessageInDialogContainer('Player two')
    logToConsoleContainer('<span class="_color -red">Player one, you have lost.</span>')
  }

  if (numberOfPlayerTwoUnits === 0) {
    toggleYouWinDialogContainer()
    youWinMessageInDialogContainer('Player one')
    logToConsoleContainer('<span class="_color -red">Player two, you have lost.</span>')
  }
}
checkIfLost()

function updateSelectedUnitAttackCapacity (selectedUnit) {
  globalVariables.selectedUnitResidualAttackCapacity--
  selectedUnit.setAttribute('data-residual_attack_capacity', globalVariables.selectedUnitResidualAttackCapacity)
  const attackCapacityContainer = selectedUnit.querySelector('.-attackcapacity')
  attackCapacityContainer.innerHTML = globalVariables.selectedUnitResidualAttackCapacity
}

export function returnAdjacentCells (unitCellIndex, unitAttackRange) {
  const adjacentCells = []

  for (let i = 1; i <= unitAttackRange; i++) {
    const rightCell = unitCellIndex + i
    const leftCell = unitCellIndex - i
    const topCell = unitCellIndex - (i * numberOfCols)
    const bottomCell = unitCellIndex + (i * numberOfCols)

    const moduloRightCell = rightCell % numberOfCols
    const moduloLeftCell = leftCell % numberOfCols
    const moduloCurrentCell = unitCellIndex % numberOfCols

    if (moduloLeftCell < moduloCurrentCell && moduloLeftCell >= 0) {
      adjacentCells.push(leftCell)
    }

    if (moduloRightCell > moduloCurrentCell && moduloRightCell < numberOfCols) {
      adjacentCells.push(rightCell)
    }

    if (topCell >= 0) {
      adjacentCells.push(topCell)
    }

    if (bottomCell < numberOfCols * numberOfRows) {
      adjacentCells.push(bottomCell)
    }

    // if unit as a attack range superior to one, we need to increase the size of the area by adding entry in our array
    for (let j = 1; j <= unitAttackRange; j++) {
      const bottomRightCell = bottomCell + j
      const bottomLeftCell = bottomCell - j
      const topRightCell = topCell + j
      const topLeftCell = topCell - j

      if (topLeftCell >= 0 && topLeftCell % numberOfCols < moduloCurrentCell) {
        adjacentCells.push(topLeftCell)
      }

      if (topRightCell >= 0 && topRightCell % numberOfCols > moduloCurrentCell) {
        adjacentCells.push(topRightCell)
      }

      if (bottomLeftCell < numberOfCols * numberOfRows && bottomLeftCell % numberOfCols < moduloCurrentCell) {
        adjacentCells.push(bottomLeftCell)
      }

      if (bottomRightCell < numberOfCols * numberOfRows && bottomRightCell % numberOfCols > moduloCurrentCell) {
        adjacentCells.push(bottomRightCell)
      }
    }
  }

  return adjacentCells
}

export function getUnitsInRange (adjacentCells) {
  const unitsInRange = adjacentCells
    .map(cellIndex => document.querySelector(`.cell-container[data-index="${cellIndex}"]`))
    .flatMap(cellContainer => Array.from(cellContainer.querySelectorAll('.unit-container')))
    .filter(unitContainer => Number(unitContainer.dataset.player) === globalVariables.currentPlayer)

  return unitsInRange
}

export function getEnemyUnitsInRange (adjacentCells) {
  const enemyUnitsInRange = adjacentCells
    .map(cellIndex => document.querySelector(`.cell-container[data-index="${cellIndex}"]`))
    .flatMap(cellContainer => Array.from(cellContainer.querySelectorAll('.unit-container')))
    .filter(unitContainer => Number(unitContainer.dataset.player) !== globalVariables.currentPlayer)

  if (enemyUnitsInRange.length !== 0 && globalVariables.selectedUnitResidualAttackCapacity !== 0) {
    addEventListenerHandleFightToEnemyUnitsInRange(enemyUnitsInRange)
    logToUIFeedbackContainer(`${enemyUnitsInRange.length} enemy units in range. <span class="_color -green">Click on an enemy unit</span> to start a fight.`)
    logToConsoleContainer(`${enemyUnitsInRange.length} enemy units in range. <span class="_color -green">Click on an enemy unit</span> to start a fight.`)
  }
}
