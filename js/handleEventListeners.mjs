import globalVariables from './globalVariables.mjs'
import { factories } from './unitsAndCells.mjs'
import { selectUnit } from './unitSelection.mjs'
import { handleFight } from './handleFight.mjs'
import { logToConsoleContainer, showConsole } from './uiFeedback.mjs'
import { endRoundButton, showConsoleButton } from './getButtons.mjs'
import { endRound } from './endRound.mjs'
import { selectFactory } from './factories.mjs'

export function addEventListenerToUnits () {
  const units = document.querySelectorAll('.unit-container')

  units.forEach(unit => unit.addEventListener('click', selectUnit))
}
addEventListenerToUnits()

export function addEventListenerToFactories () {
  factories.forEach(factory => factory.addEventListener('click', selectFactory))
}
addEventListenerToFactories()

export function removeEventListenerToUnits () {
  const units = document.querySelectorAll('.unit-container')

  units.forEach(unit => unit.removeEventListener('click', selectUnit))
}

export function addEventListenerToEnemyUnitsInRange (enemyUnitsInRange) {
  console.log(globalVariables.selectedUnit.dataset.residual_attack_capacity)
  if (Number(globalVariables.selectedUnit.dataset.residual_attack_capacity) !== 0) {
    enemyUnitsInRange.forEach(enemyUnit => {
      enemyUnit.addEventListener('click', handleFight)
      enemyUnit.classList.add('-inrange')
    })
  }
}

export function removeIsInRangeFromUnits () {
  const units = document.querySelectorAll('.unit-container')

  units.forEach(unit => {
    unit.classList.remove('-inrange')
  })
}

export function removeHandleFightEventListenersOnUnit (unit) {
  unit.removeEventListener('click', handleFight)
}

function addEventListenerToEndRoundButton () {
  endRoundButton.addEventListener('click', function () {
    if (globalVariables.unitSelected) {
      logToConsoleContainer('A unit is currently selected. Please cancel (escape) or valid the selected unit\'s movement (enter) before ending the round.')
      endRoundButton.blur()
    } else {
      endRound()
    }
  })
}
addEventListenerToEndRoundButton()

showConsoleButton.addEventListener('click', showConsole)
