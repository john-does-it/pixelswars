import globalVariables from './globalVariables.mjs'
import { cells } from './unitsAndCells.mjs'
import { numberOfCols, numberOfRows } from './getNumberOfColsAndRows.mjs'
import { isCellContainUnit } from './helpers.mjs'
import { removeHandleFightEventListenersOnUnit } from './handleEventListeners.mjs'
import { getEnemyUnitsInRange, returnAdjacentCells } from './handleFight.mjs'

export const currentPlayerUI = document.getElementById('current-player-ui')
export const currentRoundUI = document.getElementById('current-round-ui')
export const currentPlayerUIContainer = document.getElementById('current-player')
export const currentMoneyPlayerOneUIContainer = document.getElementById('current-money-player-one')
export const currentMoneyPlayerTwoUIContainer = document.getElementById('current-money-player-two')
export const currentRoundUIContainer = document.getElementById('current-round')
export const consoleContainer = document.getElementById('console-container')
export const UIFeedbackContainer = document.getElementById('uifeedback-container')
export const dialogContainer = document.getElementById('dialog-container')
export const dialogContent = document.getElementById('dialog-content')

const currentPlayerMiniatures = currentPlayerUI.getElementsByTagName('img')

export function logToConsoleContainer (message) {
  const newMessage = document.createElement('p')
  newMessage.innerHTML = message
  consoleContainer.appendChild(newMessage)
  consoleContainer.scrollTop = consoleContainer.scrollHeight
}

export function toggleYouWinDialogContainer () {
  dialogContainer.show()
}

export function youWinMessageInDialogContainer (winner) {
  const newMessage = document.createElement('p')
  newMessage.innerText = winner + ', congratulation you win! 😼'
  dialogContent.appendChild(newMessage)
}

export function logToUIFeedbackContainer (message) {
  const newMessage = document.createElement('p')
  newMessage.innerHTML = message
  // UIFeedbackContainer.appendChild(newMessage)
  // UIFeedbackContainer.classList.add('_color', '-white', '-bglightblack')
}

export function updateMoneyUI () {
  currentMoneyPlayerOneUIContainer.innerText = globalVariables.playerOneMoney
  currentMoneyPlayerTwoUIContainer.innerText = globalVariables.playerTwoMoney
}

export function updateCurrentPlayerUI () {
  currentPlayerUI.classList.add('glow')
  currentRoundUI.classList.add('glow')
  currentPlayerUIContainer.innerText = globalVariables.currentPlayer
  currentRoundUIContainer.innerText = globalVariables.round

  for (let i = 0; i < currentPlayerMiniatures.length; i++) {
    currentPlayerMiniatures[i].classList.toggle('active')
  }

  setTimeout(() => {
    currentPlayerUI.classList.remove('glow')
    currentRoundUI.classList.remove('glow')
  }, 3000)
}


export function highlightReachableCells () {
  if ((globalVariables.selectedUnitCellIndex + 1) % numberOfCols !== 0) {
    const rightCell = cells[globalVariables.selectedUnitCellIndex + 1]

    if (rightCell.dataset.cost_of_movement <= globalVariables.selectedUnitResidualMovementRange && !isCellContainUnit(rightCell)) {
      rightCell.classList.add('-reachable')
    }
  }

  if (globalVariables.cellIndex % numberOfCols !== 0) {
    const leftCell = cells[globalVariables.selectedUnitCellIndex - 1]

    if (leftCell.dataset.cost_of_movement <= globalVariables.selectedUnitResidualMovementRange && !isCellContainUnit(leftCell)) {
      leftCell.classList.add('-reachable')
    }
  }

  if (globalVariables.cellIndex - numberOfCols >= 0) {
    const topCell = cells[globalVariables.selectedUnitCellIndex - numberOfCols]

    if (topCell.dataset.cost_of_movement <= globalVariables.selectedUnitResidualMovementRange && !isCellContainUnit(topCell)) {
      topCell.classList.add('-reachable')
    }
  }

  if (globalVariables.cellIndex + numberOfCols <= numberOfCols * numberOfRows) {
    const bottomCell = cells[globalVariables.selectedUnitCellIndex + numberOfCols]

    if (bottomCell.dataset.cost_of_movement <= globalVariables.selectedUnitResidualMovementRange && !isCellContainUnit(bottomCell)) {
      bottomCell.classList.add('-reachable')
    }
  }
}

export function highlightCurrentPlayerAttackRange (selectedUnitCellIndex, selectedUnitAttackRange) {
  const adjacentCells = returnAdjacentCells(selectedUnitCellIndex, selectedUnitAttackRange)

  adjacentCells.forEach(cell => {
    const adjacentCell = document.querySelector(`.cell-container[data-index="${cell}"]`)
    adjacentCell.classList.add('-inrange')
  })

  getEnemyUnitsInRange(adjacentCells)
}

export function removeHighlightRangeOnUnits () {
  cells.forEach(cell => {
    if (cell.classList.contains('-inrange')) {
      cell.classList.remove('-inrange')
    }

    if (cell.classList.contains('-reachable')) {
      cell.classList.remove('-reachable')
    }
  })
}

export function resetResidualMoveCapacityOnUnits () {
  const updatedUnits = document.querySelectorAll('.unit-container')

  updatedUnits.forEach(unit => {
    unit.setAttribute('data-residual_move_capacity', unit.dataset.movement_range)
    // const movementCapacityContainer = unit.querySelector('.-movementrange')
    // movementCapacityContainer.innerHTML = unit.dataset.movement_range
  })
}

export function resetResidualAttackCapacityOnUnits () {
  const updatedUnits = document.querySelectorAll('.unit-container')

  updatedUnits.forEach(unit => {
    unit.setAttribute('data-residual_attack_capacity', unit.dataset.attack_capacity)
    // const attackCapacityContainer = unit.querySelector('.-attackcapacity')
    // attackCapacityContainer.innerHTML = unit.dataset.attack_capacity
    removeHandleFightEventListenersOnUnit(unit)
  })
}

export function updateUnitResidualMoveCapacity () {
  globalVariables.selectedUnit.setAttribute('data-residual_move_capacity', Number(globalVariables.selectedUnitResidualMovementRange))
  // const movementCapacityContainer = globalVariables.selectedUnit.querySelector('.-movementrange')
  // movementCapacityContainer.innerHTML = globalVariables.selectedUnitResidualMovementRange
}

export function resetResidualCaptureCapacityOnUnits () {
  const updatedUnits = document.querySelectorAll('.unit-container')

  updatedUnits.forEach(unit => {
    if (unit.dataset.capture_capacity === '0') {
      unit.setAttribute('data-capture_capacity', 1)
    }
  })
}

export function highlightMoneyMakeFromCity (building) {
  building.classList.add('-active')
  setTimeout(() => {
    building.classList.remove('-active')
  }, 5000)
}

export function showConsole () {
  consoleContainer.classList.toggle('active')
}
