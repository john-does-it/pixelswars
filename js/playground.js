const cells = document.querySelectorAll('.cell-container')
const endRoundButton = document.getElementById('end-round')

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

let currentPlayer = 1
let currentRound = 1
let selectedUnit = null
let isSelectedUnit = false

let originalIndex
let originalMoveCapacity

endRoundButton.addEventListener('click', endRound)

function endRound () {
  currentRound++
  determinePlayer()
  updateCurrentPlayerUI()
  resetUnitsResidualMoveCapacity()

  function determinePlayer () {
    if (currentRound === 1 || currentRound % 2 === 1) {
      currentPlayer = 1
    }
    if (currentRound % 2 !== 1) {
      currentPlayer = 2
    }
  }

  function updateCurrentPlayerUI () {
    const currentPlayerUI = document.getElementById('current-player-ui')
    const currentRoundContainer = document.getElementById('current-round')
    // const currentMoneyPlayerOneUIContainer = document.getElementById('current-money-player-one')
    // const currentMoneyPlayerTwoUIContainer = document.getElementById('current-money-player-two')
    const currentPlayerMiniatures = currentPlayerUI.getElementsByTagName('img')

    currentRoundContainer.classList.add('glow')
    currentRoundContainer.innerText = currentRound

    for (let i = 0; i < currentPlayerMiniatures.length; i++) {
      currentPlayerMiniatures[i].classList.toggle('active')
    }

    setTimeout(() => {
      currentPlayerUI.classList.remove('glow')
      currentRoundContainer.classList.remove('glow')
    }, 3000)
  }
}

function selectUnit () {
  unselectUnit() // Unselect any previously selected unit
  const playableUnits = document.querySelectorAll('.unit-container')

  playableUnits.forEach(element => {
    element.addEventListener('click', function (event) {
      const tryToSelectUnit = element

      if (!isSelectedUnit && Number(tryToSelectUnit.dataset.player) === currentPlayer) {
        selectedUnit = tryToSelectUnit
        isSelectedUnit = true
        originalIndex = Number(element.parentElement.dataset.index)
        originalMoveCapacity = selectedUnit.dataset.residual_move_capacity
        highlightReachableCells(Number(element.parentElement.dataset.index))
      }
    })
  })
}

function unselectUnit () {
  if (isSelectedUnit) {
    selectedUnit = null
    isSelectedUnit = false
    removeReachableFromCells()
    removeInRangeFromCells()
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
    console.log('press Space')
    if (selectedUnit.classList.contains('-infantry')) {
      console.log('is infantry')
    }
  }

  // move left
  if (event.key === 'ArrowLeft') {
    console.log('press ArrowLeft')
    const leftCell = cells[updatedIndex - 1]

    if (leftCell && updatedIndex % numberOfCols !== 0 && unitMoveCapacity >= leftCell.dataset.cost_of_movement && !isCellContainUnit(leftCell)) {
      updateUnitResidualMoveCapacity(unitMoveCapacity, leftCell.dataset.cost_of_movement)
      removeReachableFromCells()
      removeInRangeFromCells()
      highlightReachableCells(updatedIndex - 1)
      leftCell.appendChild(selectedUnit)
    }
  }

  // move right
  if (event.key === 'ArrowRight') {
    console.log('press ArrowRight')
    const rightCell = cells[updatedIndex + 1]

    if (rightCell && (updatedIndex + 1) % numberOfCols !== 0 && unitMoveCapacity >= rightCell.dataset.cost_of_movement && !isCellContainUnit(rightCell)) {
      updateUnitResidualMoveCapacity(unitMoveCapacity, rightCell.dataset.cost_of_movement)
      removeReachableFromCells()
      removeInRangeFromCells()
      highlightReachableCells(updatedIndex + 1)
      rightCell.appendChild(selectedUnit)
    }
  }

  // move up
  if (event.key === 'ArrowUp') {
    console.log('press ArrowUp')
    const topCell = cells[updatedIndex - numberOfCols]

    if (topCell && updatedIndex - numberOfCols >= 0 && unitMoveCapacity >= topCell.dataset.cost_of_movement && !isCellContainUnit(topCell)) {
      updateUnitResidualMoveCapacity(unitMoveCapacity, topCell.dataset.cost_of_movement)
      removeReachableFromCells()
      removeInRangeFromCells()
      topCell.appendChild(selectedUnit)
      highlightReachableCells(updatedIndex - numberOfCols)
    }
  }

  // move down
  if (event.key === 'ArrowDown') {
    console.log('press ArrowDown')
    const bottomCell = cells[updatedIndex + numberOfCols]

    if (bottomCell && updatedIndex + numberOfCols <= numberOfCols * numberOfRows && unitMoveCapacity >= bottomCell.dataset.cost_of_movement && !isCellContainUnit(bottomCell)) {
      updateUnitResidualMoveCapacity(unitMoveCapacity, bottomCell.dataset.cost_of_movement)
      removeReachableFromCells()
      removeInRangeFromCells()
      bottomCell.appendChild(selectedUnit)
      highlightReachableCells(updatedIndex + numberOfCols)
    }
  }
  // valid move
  if (event.key === 'Enter') {
    console.log('press Enter')
    unselectUnit()
  }

  // cancel move
  if (event.key === 'Escape') {
    console.log('press Escape')
    const originalCell = cells[originalIndex]
    originalCell.appendChild(selectedUnit)
    resetUnitResidualMoveCapacity(originalMoveCapacity)
    unselectUnit()
  }
}

function updateUnitResidualMoveCapacity (unitMoveCapacity, costOfMovement) {
  const residualMoveCapacity = unitMoveCapacity - costOfMovement
  selectedUnit.setAttribute('data-residual_move_capacity', residualMoveCapacity)
}

function resetUnitResidualMoveCapacity (originalMoveCapacity) {
  const residualMoveCapacity = originalMoveCapacity
  selectedUnit.setAttribute('data-residual_move_capacity', residualMoveCapacity)
}

function resetUnitsResidualMoveCapacity () {
  const units = document.querySelectorAll('.unit-container')

  units.forEach(unit => {
    unit.setAttribute('data-residual_move_capacity', unit.dataset.movement_range)
  })
}

function highlightReachableCells (cellIndex) {
  const unitMoveCapacity = Number(selectedUnit.dataset.residual_move_capacity)

  // Highlight left cell if it's within the grid and reachable
  if (cellIndex % numberOfCols !== 0 && unitMoveCapacity >= Number(cells[cellIndex - 1].dataset.cost_of_movement)) {
    const leftCell = cells[cellIndex - 1]
    leftCell.classList.add('-reachable')
  }

  // Highlight right cell if it's within the grid and reachable
  if ((cellIndex + 1) % numberOfCols !== 0 && unitMoveCapacity >= Number(cells[cellIndex + 1].dataset.cost_of_movement)) {
    const rightCell = cells[cellIndex + 1]
    rightCell.classList.add('-reachable')
  }

  // Highlight top cell if it's within the grid and reachable
  if (cellIndex - numberOfCols >= 0 && unitMoveCapacity >= Number(cells[cellIndex - numberOfCols].dataset.cost_of_movement)) {
    const topCell = cells[cellIndex - numberOfCols]
    topCell.classList.add('-reachable')
  }

  // Highlight bottom cell if it's within the grid and reachable
  if (cellIndex + numberOfCols < numberOfCols * numberOfRows && unitMoveCapacity >= Number(cells[cellIndex + numberOfCols].dataset.cost_of_movement)) {
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

function statPreview () {
  const statsContainer = document.getElementById('stats-container')

  function addHoverListeners () {
    cells.forEach(cell => {
      cell.addEventListener('mouseenter', (event) => { showCellsStats(cell, event) })
    })
  }

  window.addEventListener('load', addHoverListeners) // Pass function reference

  function getBackgroundImage (element) {
    const style = window.getComputedStyle(element, null).getPropertyValue('background-image')
    return style.replace(/url\((['"])?(.*?)\1\)/gi, '$2')
  }

  function showCellsStats (cell, event) {
    let statsHTML = ''

    for (const child of cell.children) {
      if (child.classList.contains('unit-container')) {
        let unitBackground = getBackgroundImage(child)
        unitBackground = unitBackground.replace('.png', '-fit.png')

        statsHTML += `
        <span class="miniature" style="background-image: url('${unitBackground}');background-size: contain;background-repeat: no-repeat;width: 25px;height: 25px;display: block;"></span>` +
        '<span class="stat -health _flex -justifycenter -aligncenter">' +
        child.dataset.health + '</span>' +
        '<span class="stat -attackcapacity _flex -justifycenter -aligncenter">' +
        child.dataset.attack_capacity + '</span>' +
        '<span class="stat -attackrange _flex -justifycenter -aligncenter">' +
        child.dataset.attack_range + '</span>' +
        '<span class="stat -movement _flex -justifycenter -aligncenter">' +
        child.dataset.residual_move_capacity +
         '</span>' +
        '<span class="stat -attackdamage _flex -justifycenter -aligncenter">' +
        child.dataset.attack_damage + '</span>' +
        '<span class="stat -defense _flex -justifycenter -aligncenter">' +
        child.dataset.defense + '</span>'
      }
    }

    const cellBackground = getBackgroundImage(cell)

    statsHTML += `<span class="miniature" style="background-image: url('${cellBackground}'); background-size: contain; width: 25px; height: 25px; display: block;"></span>` + '<span class="stat -defense _flex -justifycenter -aligncenter">' + cell.dataset.defense_bonus + '</span>' + '<span class="stat -movement _flex -justifycenter -aligncenter">' + cell.dataset.cost_of_movement + '</span>'

    statsContainer.innerHTML = statsHTML
  }
}
statPreview()

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

initWorld()
selectUnit()
