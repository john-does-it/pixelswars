import globalVariables from './globalVariables.mjs'
import { buildings } from './unitsAndCells.mjs'
import { unselectFactory } from './factories.mjs'
import { unselectUnit } from './unitSelection.mjs'
import { resetResidualMoveCapacityOnUnits, resetResidualAttackCapacityOnUnits, resetResidualCaptureCapacityOnUnits, updateMoneyUI, updateCurrentPlayerUI, highlightMoneyMakeFromCity } from './uiFeedback.mjs'
import { healthUnitOnHospital } from './healthUnitsOnHospitals.mjs'
import { sounds } from './getSounds.mjs'

export function endRound () {
  globalVariables.round++
  unselectFactory()
  unselectUnit()
  resetResidualMoveCapacityOnUnits()
  resetResidualAttackCapacityOnUnits()
  resetResidualCaptureCapacityOnUnits()
  distributeMoney()
  determinePlayer()
  healthUnitOnHospital()
  updateMoneyUI()
  updateCurrentPlayerUI()
  sounds.nextRound.volume = 0.125
  sounds.nextRound.play()
}

export function determinePlayer () {
  if (globalVariables.round === 1 || globalVariables.round % 2 === 1) {
    globalVariables.currentPlayer = 1
  }
  if (globalVariables.round % 2 !== 1) {
    globalVariables.currentPlayer = 2
  }
  return globalVariables.currentPlayer
}
determinePlayer()

function distributeMoney () {
  buildings.forEach(building => {
    if (building.classList.contains('-city') && building.dataset.player !== '0') {
      if (building.dataset.player === '1' && globalVariables.currentPlayer === 2) {
        globalVariables.playerOneMoney = globalVariables.playerOneMoney + 200
        sounds.cashMachine.play()
        highlightMoneyMakeFromCity(building)
      } else if (building.dataset.player === '2' && globalVariables.currentPlayer === 1) {
        globalVariables.playerTwoMoney = globalVariables.playerTwoMoney + 200
        sounds.cashMachine.play()
        highlightMoneyMakeFromCity(building)
      }
    }
  })
}
