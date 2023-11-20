import globalVariables from './globalVariables.mjs'
import { sounds } from './getSounds.mjs'
import { getLandscapeDataForNextCell, getLandscapeIndexOfUnit } from './getDatas.mjs'
import { unselectUnit } from './unitSelection.mjs'
import { captureBuilding } from './captureBuilding.mjs'
import { numberOfCols, numberOfRows } from './getNumberOfColsAndRows.mjs'
import { logToConsoleContainer, highlightReachableCells, highlightCurrentPlayerAttackRange, removeHighlightRangeOnUnits, updateUnitResidualMoveCapacity } from './uiFeedback.mjs'
import { capitalize } from './helpers.mjs'

function isMoveIsValid (selectedUnitResidualMovementRange, costOfMovement, cellIndex, pressedKey) {
  if (isOutOfGrid(pressedKey, cellIndex) && globalVariables.isFighting === false) {
    isNextCellContainsUnit()
    hasEnoughMovementCapacity(selectedUnitResidualMovementRange, costOfMovement)

    if (hasEnoughMovementCapacity(selectedUnitResidualMovementRange, costOfMovement) && isNextCellContainsUnit() === false && globalVariables.isFighting === false) {
      return true
    }
  } else {
    return false
  }

  function isOutOfGrid (pressedKey, cellIndex) {
    switch (pressedKey) {
      case 'ArrowRight':
        if ((cellIndex + 1) % numberOfCols !== 0) {
          return true
        } else {
          logToConsoleContainer('<span class="_color -red">Can\'t move to the right. Movement unauthorized. Out of grid.</span>')
          return false
        }
      case 'ArrowLeft':
        if (cellIndex % numberOfCols !== 0) {
          return true
        } else {
          logToConsoleContainer('<span class="_color -red">Can\'t move to the left. Movement unauthorized. Out of grid.</span>')
          return false
        }
      case 'ArrowUp':
        if (cellIndex - numberOfCols >= 0) {
          return true
        } else {
          logToConsoleContainer('<span class="_color -red">Can\'t move to the top. Movement unauthorized. Out of grid.</span>')
          return false
        }
      case 'ArrowDown':
        if (cellIndex + numberOfCols <= numberOfCols * numberOfRows) {
          return true
        } else {
          logToConsoleContainer('<span class="_color -red">Can\'t move to the bottom. Movement unauthorized. Out of grid.</span>')
          return false
        }
    }
  }
}

export function preventCancelMove (unit) {
  globalVariables.selectedUnitCellIndex = getLandscapeIndexOfUnit(unit)
  globalVariables.initialUnitCellIndex = globalVariables.selectedUnitCellIndex
  updateUnitResidualMoveCapacity()
}

function cancelMove (selectedUnit, initialUnitCellIndex) {
  const initialPositionContainer = document.querySelector(`.cell-container[data-index="${initialUnitCellIndex}"]`)
  initialPositionContainer.appendChild(selectedUnit)
  globalVariables.selectedUnitResidualMovementRange = selectedUnit.dataset.residual_move_capacity
  logToConsoleContainer(`${capitalize(selectedUnit.dataset.name)} has been unselected.`)
  unselectUnit()
}

function isNextCellContainsUnit () {
  const landscapeDataForNextCell = getLandscapeDataForNextCell(globalVariables.nextCell)
  const isCellContainUnitContainer = landscapeDataForNextCell.querySelector('.unit-container') !== null

  if (isCellContainUnitContainer) {
    logToConsoleContainer('<span class="_color -red">Can\'t move to that cell. The cell already contain one unit.</span>')
    return true
  } else {
    return false
  }
}

function hasEnoughMovementCapacity () {
  const landscapeDataForNextCell = getLandscapeDataForNextCell(globalVariables.nextCell)
  globalVariables.costOfMovement = Number(landscapeDataForNextCell.dataset.cost_of_movement)

  if (globalVariables.selectedUnitResidualMovementRange < globalVariables.costOfMovement) {
    logToConsoleContainer('<span class="_color -red">Can\'t move to that cell. Cost of movement is superior to the unit residual movement capacity.</span>')
    return false
  } else {
    return true
  }
}

export function arrowNav (event) {
  const pressedKey = event.key
  switch (pressedKey) {
    case 'Escape':
      cancelMove(globalVariables.selectedUnit, globalVariables.initialUnitCellIndex)
      break
    case 'Enter':
      validUnitMove(globalVariables.selectedUnit)
      break
    case 'ArrowRight':
      globalVariables.nextCell = globalVariables.cellIndex + 1
      if (isMoveIsValid(globalVariables.selectedUnitResidualMovementRange, globalVariables.costOfMovement, globalVariables.cellIndex, pressedKey)) {
        handleValidMove(globalVariables.selectedUnit)
      }
      break
    case 'ArrowLeft':
      globalVariables.nextCell = globalVariables.cellIndex - 1
      if (isMoveIsValid(globalVariables.selectedUnitResidualMovementRange, globalVariables.costOfMovement, globalVariables.cellIndex, pressedKey)) {
        handleValidMove(globalVariables.selectedUnit)
      }
      break
    case 'ArrowUp':
      globalVariables.nextCell = globalVariables.cellIndex - numberOfCols
      if (isMoveIsValid(globalVariables.selectedUnitResidualMovementRange, globalVariables.costOfMovement, globalVariables.cellIndex, pressedKey)) {
        handleValidMove(globalVariables.selectedUnit)
      }
      break
    case 'ArrowDown':
      globalVariables.nextCell = globalVariables.cellIndex + numberOfCols
      if (isMoveIsValid(globalVariables.selectedUnitResidualMovementRange, globalVariables.costOfMovement, globalVariables.cellIndex, pressedKey)) {
        handleValidMove(globalVariables.selectedUnit)
      }
      break
  }
}

function handleValidMove (selectedUnit) {
  moveUnitToCell()
  calculateAndUpdateUnitResidualMoveCapacity(globalVariables.costOfMovement)
  globalVariables.selectedUnitCellIndex = getLandscapeIndexOfUnit(selectedUnit)
  removeHighlightRangeOnUnits()
  highlightCurrentPlayerAttackRange(globalVariables.selectedUnitCellIndex, globalVariables.selectedUnitAttackRange, globalVariables.selectedUnitResidualMovementRange)
  highlightReachableCells()
  sounds.wooshMovement.volume = 0.125
  sounds.wooshMovement.play()
}

function moveUnitToCell () {
  globalVariables.nextCellContainer = document.querySelector(`.cell-container[data-index="${globalVariables.nextCell}"]`)
  globalVariables.nextCellContainer.appendChild(globalVariables.selectedUnit)
}

function validUnitMove () {
  updateUnitResidualMoveCapacity()
  unselectUnit()
}

function calculateAndUpdateUnitResidualMoveCapacity (costOfMovement) {
  globalVariables.selectedUnitResidualMovementRange -= costOfMovement
  logToConsoleContainer(`The residual move capacity of the unit is now ${globalVariables.selectedUnitResidualMovementRange}.`)
}
