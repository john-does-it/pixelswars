const cells = document.querySelectorAll('.cell-container')

function initWorld () {
  const landscapes = [
    {
      selector: '.-grass',
      cost: 2,
      defense: 0
    },
    {
      selector: '.-moutain',
      cost: 5,
      defense: 50
    },
    {
      selector: '.-water',
      cost: 10,
      defense: 0
    },
    {
      selector: '.-building',
      cost: 2,
      defense: 40
    },
    {
      selector: '.-road',
      cost: 1,
      defense: 0
    },
    {
      selector: '.-forest',
      cost: 3,
      defense: 30
    }
  ]

  cells.forEach((cell, index) => {
    cell.setAttribute('data-index', index)
  })

  landscapes.forEach((landscape) => {
    const elements = document.querySelectorAll(landscape.selector)

    elements.forEach((element) => {
      element.setAttribute('data-cost_of_movement', landscape.cost)
      element.setAttribute('data-defense_bonus', landscape.defense)
    })
  })
}
initWorld()

function getGridDimensions () {
  const style = getComputedStyle(document.getElementById('grid'))

  const rows = style.getPropertyValue('grid-template-rows').trim().split(' ').length
  const cols = style.getPropertyValue('grid-template-columns').trim().split(' ').length

  return { rows, cols }
}
getGridDimensions()

function isCellContainUnit (cell) {
  return cell.querySelector('.unit-container') !== null
}

const numberOfCols = getGridDimensions().cols
const numberOfRows = getGridDimensions().rows

const currentPlayer = 1
let selectedUnit = null
let isSelectedUnit = false

function selectUnit () {
  unselectUnit() // Unselect any previously selected unit
  const playableUnits = document.querySelectorAll('.unit-container')
  playableUnits.forEach(element => {
    element.addEventListener('click', function (event) {
      const tryToSelectUnit = element

      if (!isSelectedUnit && Number(tryToSelectUnit.dataset.player) === currentPlayer) {
        selectedUnit = tryToSelectUnit
        isSelectedUnit = true
        highlightReachableCells(Number(element.parentElement.dataset.index))
      }
    })
  })
}

function unselectUnit () {
  if (isSelectedUnit) {
    selectedUnit = null
    isSelectedUnit = false
  }
}

// Single event listener for keyboard actions
window.addEventListener('keydown', (event) => {
  if (isSelectedUnit) {
    keyboardBindWhileSelectedUnit(event, selectedUnit)
  }
})

function keyboardBindWhileSelectedUnit (event, selectedUnit) {
  const updatedIndex = Number(selectedUnit.parentElement.dataset.index)

  let unitMoveCapacity

  if (Number(selectedUnit.dataset.movement_range) === Number(selectedUnit.dataset.residual_move_capacity)) {
    unitMoveCapacity = Number(selectedUnit.dataset.movement_range)
  } else {
    unitMoveCapacity = Number(selectedUnit.dataset.residual_move_capacity)
  }

  // capture building
  if (event.key === ' ') {
    console.log('want to capture')
    if (selectedUnit.classList.contains('-infantry')) {
      console.log('is infantry')
    }
  }

  // move left
  if (event.key === 'ArrowLeft') {
    console.log('want to move left')
    const leftCell = cells[updatedIndex - 1]

    if (updatedIndex % numberOfCols !== 0 && leftCell.dataset.cost_of_movement <= unitMoveCapacity && !isCellContainUnit(leftCell)) {
      updateUnitResidualMoveCapacity(unitMoveCapacity, leftCell.dataset.cost_of_movement)

      removeReachableFromCells()
      removeInRangeFromCells()
      leftCell.appendChild(selectedUnit)
      highlightReachableCells(updatedIndex - 1)
    }
  }

  // move right
  if (event.key === 'ArrowRight') {
    console.log('want to move right')

    if (updatedIndex + 1 % numberOfCols !== 0) {
      const rightCell = cells[updatedIndex + 1]

      if ((updatedIndex + 1) % numberOfCols && rightCell.dataset.cost_of_movement <= unitMoveCapacity && !isCellContainUnit(rightCell)) {
        updateUnitResidualMoveCapacity(unitMoveCapacity, rightCell.dataset.cost_of_movement)

        removeReachableFromCells()
        removeInRangeFromCells()
        rightCell.appendChild(selectedUnit)
        highlightReachableCells(updatedIndex + 1)
      }
    }
  }

  // move up
  if (event.key === 'ArrowUp') {
    console.log('want to move up')
  }

  // move down
  if (event.key === 'ArrowDown') {
    console.log('want to move down')
  }
  // valid move
  if (event.key === 'Enter') {
    console.log('want to valid move')
  }

  // cancel move
  if (event.key === 'Escape') {
    unselectUnit()
    // reset to what was the initial index of the unit before any move, append the cell to the parent container and reset the residual move capacity of the unit
  }
}

function updateUnitResidualMoveCapacity (unitMoveCapacity, costOfMovement) {
  const residualMoveCapacity = unitMoveCapacity - costOfMovement
  selectedUnit.setAttribute('data-residual_move_capacity', residualMoveCapacity)
}

function highlightReachableCells (cellIndex) {
  console.log(cellIndex % numberOfCols, selectedUnit.dataset.residual_move_capacity, cells[cellIndex - 1].dataset.cost_of_movement, cells[cellIndex - 1])
  if (cellIndex % numberOfCols !== 0 && selectedUnit.dataset.residual_move_capacity > cells[cellIndex - 1].dataset.cost_of_movement) {
    const leftCell = cells[cellIndex - 1]
    leftCell.classList.add('-reachable')
  }

  if ((cellIndex + 1) % numberOfCols !== 0 && selectedUnit.dataset.residual_move_capacity > cells[cellIndex + 1].dataset.cost_of_movement) {
    const rightCell = cells[cellIndex + 1]
    rightCell.classList.add('-reachable')
  }

  if (cellIndex - numberOfCols >= 0) {
    const topCell = cells[cellIndex - numberOfCols]
    topCell.classList.add('-reachable')
  }

  if (cellIndex + numberOfCols <= numberOfCols * numberOfRows) {
    const bottomCell = cells[cellIndex + numberOfCols]
    bottomCell.classList.add('-reachable')
  }

  highlightUnitAttackRange(cellIndex, selectedUnit)
}

function highlightUnitAttackRange (cellIndex, selectedUnit) {
  const adjacentCells = returnAdjacentCells(cellIndex, selectedUnit.dataset.attack_range)

  adjacentCells.forEach(cell => {
    const adjacentCell = document.querySelector(`.cell-container[data-index="${cell}"]`)
    adjacentCell.classList.add('-inrange')
  })
  // getEnemyUnitsInRange(adjacentCells)
}

function removeReachableFromCells () {
  cells.forEach(element => {
    element.classList.remove('-reachable')
  })
}

function removeInRangeFromCells () {
  cells.forEach(element => {
    element.classList.remove('-inrange')
  })
}

function returnAdjacentCells (cellIndex, attackRange) {
  const adjacentCells = []

  for (let i = 1; i <= attackRange; i++) {
    const rightCell = cellIndex + i
    const leftCell = cellIndex - i
    const topCell = cellIndex - (i * numberOfCols)
    const bottomCell = cellIndex + (i * numberOfCols)

    const moduloRightCell = rightCell % numberOfCols
    const moduloLeftCell = leftCell % numberOfCols
    const moduloCurrentCell = cellIndex % numberOfCols

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
    for (let j = 1; j <= attackRange; j++) {
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

// Initial function calls
selectUnit()
