import globalVariables from './globalVariables.mjs'
import { addEventListenerSelectUnitToUnits, removeEventListenerSelectUnitToUnits, removeIsInRangeFromUnits } from './handleEventListeners.mjs'
import { logToConsoleContainer, logToUIFeedbackContainer, highlightSelectedUnit, highlightCurrentPlayerAttackRange, highlightReachableCells, removeHighlightsOnUnits, removeHighlightRangeOnUnits } from './uiFeedback.mjs'
import { getUnitData, getLandscapeIndexOfUnit } from './getDatas.mjs'
import { arrowNav } from './handleNavigation.mjs'
import { endRoundButton } from './getButtons.mjs'
import { sounds } from './getSounds.mjs'
import { capitalize } from './helpers.mjs'
import { captureBuilding } from './captureBuilding.mjs'

export function selectUnit (event) {
  const clickedCell = event.target

  if (isUnitIsSelectable(clickedCell)) {
    logToUIFeedbackContainer('<span class="_color -green">Use the <span class="_text -bold">Arrows</span> to move</span> the unit. Then <span class="_color -green">Press <span class="_text -bold">Enter</span> to validate</span> the move or <span class="_color -green">press <span class="_text -bold">Escape</span> to cancel.')

    endRoundButton.setAttribute('disabled', 'disabled')

    globalVariables.unitSelected = true
    globalVariables.selectedUnit = clickedCell
    const selectedUnitDataPipe = getUnitData(globalVariables.selectedUnit)
    const shortMeowVariants = [sounds.shortMeow, sounds.shortMeow2, sounds.shortMeow3]

    if (globalVariables.selectedUnit.classList.contains('-infantry')) {
      const randomVariant = shortMeowVariants[Math.floor(Math.random() * shortMeowVariants.length)]
      randomVariant.load()
      randomVariant.volume = 0.25
      randomVariant.play()
    }

    if (globalVariables.selectedUnit.classList.contains('-jeep')) {
      sounds.jeepEngine.volume = 0.2
      sounds.jeepEngine.play()
    }

    globalVariables.selectedUnitName = selectedUnitDataPipe.unitName
    globalVariables.selectedUnitResidualMovementRange = selectedUnitDataPipe.unitResidualMovementCapacity
    globalVariables.selectedUnitAttackRange = selectedUnitDataPipe.unitAttackRange
    globalVariables.selectedUnitResidualAttackCapacity = selectedUnitDataPipe.unitResidualAttackCapacity
    const selectedunitExclusionAttackRange = selectedUnitDataPipe.unitExclusionAttackRange
    globalVariables.selectedUnitCellIndex = getLandscapeIndexOfUnit(globalVariables.selectedUnit)
    globalVariables.initialUnitCellIndex = globalVariables.selectedUnitCellIndex

    highlightSelectedUnit(globalVariables.selectedUnit)
    highlightCurrentPlayerAttackRange(globalVariables.selectedUnitCellIndex, globalVariables.selectedUnitAttackRange, selectedunitExclusionAttackRange)
    highlightReachableCells()
    removeEventListenerSelectUnitToUnits()
    logToConsoleContainer(`${capitalize(globalVariables.selectedUnitName)} is currently selected. <span class="_color -green">Use the <span class="_text -bold">arrows</span> to move the unit</span> then <span class="_color -green">press <span class="_text -bold">Enter</span> to validate the move</span> or <span class="_color -green"><span class="_text -bold">Escape</span> to cancel</span>.`)
    captureBuilding()

    document.addEventListener('keydown', arrowNav)
  }
}

function isUnitIsSelectable (clickedCell) {
  if (globalVariables.unitSelected) {
    logToConsoleContainer('A unit is already selected.')
    return false
  }

  const player = Number(clickedCell.dataset.player)

  if (player !== globalVariables.currentPlayer) {
    logToConsoleContainer('<span class="_color -red">This unit is not your property.</span>')
    return false
  }
  return true
}

export function unselectUnit () {
  if (globalVariables.isFighting === false) {
    globalVariables.unitSelected = false
    globalVariables.selectedUnit = null
    removeHighlightsOnUnits()
    removeHighlightRangeOnUnits()
    endRoundButton.removeAttribute('disabled')
    document.removeEventListener('keydown', arrowNav)
    addEventListenerSelectUnitToUnits()
    removeIsInRangeFromUnits()
  } else {
    logToConsoleContainer('<span class="_color -red">You can\'t unselect a unit while a fight is on going.</span>')
  }
}
