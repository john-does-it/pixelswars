// Movement: shared classic scripts; see js/README.md.

function keyboardBindWhileSelectedUnit(event, selectedUnit) {
  if (isFighting) return
  const updatedIndex = Number(selectedUnit.parentElement.dataset.index)
  const unitMoveCapacity = calculateUnitMoveCapacity(selectedUnit)

  switch (event.key) {
    case ' ':
      captureBuilding()
      break
    case 'ArrowLeft':
    case 'q':
      handleDirectionalMove(updatedIndex - 1, unitMoveCapacity, selectedUnit, 'left')
      if (selectedUnit.classList.contains('-infantry')) {
        attachCaptureBuildingEventListenerIfCapturable()
      }
      break
    case 'ArrowRight':
    case 'd':
      handleDirectionalMove(updatedIndex + 1, unitMoveCapacity, selectedUnit, 'right')
      attachCaptureBuildingEventListenerIfCapturable()
      break
    case 'ArrowUp':
    case 'z':
      handleDirectionalMove(updatedIndex - numberOfCols, unitMoveCapacity, selectedUnit, 'up')
      attachCaptureBuildingEventListenerIfCapturable()
      break
    case 'ArrowDown':
    case 's':
      handleDirectionalMove(updatedIndex + numberOfCols, unitMoveCapacity, selectedUnit, 'down')
      attachCaptureBuildingEventListenerIfCapturable()
      break
    case 'Enter':
      if (isFighting === false) {
        unselectUnit()
      }
      break
    case 'Escape':
      handleCancelMove()
      break
  }
}

function smartphoneBindWhileSelectedUnit(selectedUnit) {
  const reachableCells = document.querySelectorAll('.-reachable')

  eventListenersMap.forEach((listener, cell) => {
    cell.removeEventListener('click', listener)
  })
  eventListenersMap.clear() // Clear the map after removing the listeners

  attachCaptureBuildingEventListenerIfCapturable()

  // show cancelmove / validmove smartphone ui
  showSmartphoneUI.classList.add('-active')

  reachableCells.forEach((reachableCell) => {
    const listener = (event) => smartMove(event, selectedUnit)
    reachableCell.addEventListener('click', listener)
    eventListenersMap.set(reachableCell, listener)
  })
}

function smartMove(event, selectedUnit) {
  if (isFighting) return
  if (event.target.classList.contains('-reachable') && !event.target.querySelector('.unit-container')) {
    event.target.appendChild(selectedUnit)
    attachCaptureBuildingEventListenerIfCapturable()
    updateUnitResidualMoveCapacity(selectedUnit.dataset.residual_move_capacity, event.target.dataset.cost_of_movement)
    updateCellsAndUnitsState(Number(selectedUnit.parentElement.dataset.index))
    smartphoneBindWhileSelectedUnit(selectedUnit)
  } else {
    console.log('The cell already contains a unit or is not reachable.')
  }
}

function handleCancelMove() {
  if (isFighting || !selectedUnit) return
  const originalCell = cells[originalIndex]
  originalCell.appendChild(selectedUnit)
  resetUnitResidualMoveCapacity(originalMoveCapacity)
  if (resetUnitResidualMoveCapacity(originalMoveCapacity) !== 0) {
    updateUnitStatus(selectedUnit, '-outofmovement', false)
  }
  unselectUnit()
}

function handleDirectionalMove(targetIndex, moveCapacity, selectedUnit, direction) {
  const targetCell = cells[targetIndex]

  if (isValidMove(targetCell, targetIndex, moveCapacity, direction)) {
    processUnitMove(targetIndex, moveCapacity, selectedUnit, targetCell)
    const enemyUnitsInRange = addInRangeToEnemyUnits(targetIndex)
    addEventListenerHandleFightToEnemyUnitsInRange(enemyUnitsInRange)
    playSound(sounds.wooshMovement)
  }
}

function calculateUnitMoveCapacity(selectedUnit) {
  const movementRange = Number(selectedUnit.dataset.movement_range)
  const residualCapacity = Number(selectedUnit.dataset.residual_move_capacity)
  return movementRange === residualCapacity ? movementRange : residualCapacity
}

function isValidMove(cell, index, moveCapacity, direction) {
  if (!cell || moveCapacity < cell.dataset.cost_of_movement || isCellContainUnit(cell)) {
    return false
  }

  switch (direction) {
    case 'left':
      return (index + 1) % numberOfCols !== 0
    case 'right':
      return index % numberOfCols !== 0
    case 'up':
      return index >= 0
    case 'down':
      return index <= numberOfCols * numberOfRows
    default:
      return false
  }
}

function processUnitMove(index, moveCapacity, selectedUnit, targetCell) {
  addInRangeToEnemyUnits(index)
  updateUnitResidualMoveCapacity(moveCapacity, targetCell.dataset.cost_of_movement)
  updateCellsAndUnitsState(index)
  targetCell.appendChild(selectedUnit)
}

function updateCellsAndUnitsState(index) {
  removeReachableFromCells()
  removeAttackableFromCells()
  highlightReachableCells(index)
  if (highlightReachableCells(index).length === 0) {
    updateUnitStatus(selectedUnit, '-outofmovement', true)
  }
  removeInRangeFromUnits()
  const enemyUnitsInRange = addInRangeToEnemyUnits(index)
  addEventListenerHandleFightToEnemyUnitsInRange(enemyUnitsInRange)
}

function updateUnitResidualMoveCapacity(unitMoveCapacity, costOfMovement) {
  const residualMoveCapacity = unitMoveCapacity - costOfMovement
  selectedUnit.setAttribute('data-residual_move_capacity', residualMoveCapacity)
}

function resetUnitResidualMoveCapacity(originalMoveCapacity) {
  const residualMoveCapacity = originalMoveCapacity
  selectedUnit.setAttribute('data-residual_move_capacity', residualMoveCapacity)
}

function highlightReachableCells(cellIndex) {
  const unitMoveCapacity = Number(selectedUnit.dataset.residual_move_capacity)

  const reachableCells = []

  if (cellIndex % numberOfCols !== 0 && unitMoveCapacity >= Number(cells[cellIndex - 1].dataset.cost_of_movement)) {
    const leftCell = cells[cellIndex - 1]
    leftCell.classList.add('-reachable')
    reachableCells.push(leftCell)
  }

  if ((cellIndex + 1) % numberOfCols !== 0 && unitMoveCapacity >= Number(cells[cellIndex + 1].dataset.cost_of_movement)) {
    const rightCell = cells[cellIndex + 1]
    rightCell.classList.add('-reachable')
    reachableCells.push(rightCell)
  }

  if (cellIndex - numberOfCols >= 0 && unitMoveCapacity >= Number(cells[cellIndex - numberOfCols].dataset.cost_of_movement)) {
    const topCell = cells[cellIndex - numberOfCols]
    topCell.classList.add('-reachable')
    reachableCells.push(topCell)
  }

  if (cellIndex + numberOfCols < numberOfCols * numberOfRows && unitMoveCapacity >= Number(cells[cellIndex + numberOfCols].dataset.cost_of_movement)) {
    const bottomCell = cells[cellIndex + numberOfCols]
    bottomCell.classList.add('-reachable')
    reachableCells.push(bottomCell)
  }

  highlightUnitAttackRange(cellIndex, selectedUnit)

  return reachableCells
}

function removeReachableFromCells() {
  cells.forEach((element) => {
    element.classList.remove('-reachable')
  })
}
