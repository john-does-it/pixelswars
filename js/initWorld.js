// import { logToConsoleContainer } from './uiFeedback.mjs'
const cells = document.querySelectorAll('.cell-container')

function initWorld () {
  const landscape = [
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
    const statsContainer = document.createElement('div')
    statsContainer.className = 'stats-container -cell'
    cell.appendChild(statsContainer)
  })

  landscape.forEach((type) => {
    const elements = document.querySelectorAll(type.selector)

    elements.forEach((element) => {
      element.setAttribute('data-cost_of_movement', type.cost)
      element.setAttribute('data-defense_bonus', type.defense)

      const statsContainer = element.querySelector('.stats-container.-cell')
      const StatContainer = document.createElement('span')
      StatContainer.className = 'stat -costofmovement _flex -justifycenter -aligncenter _color -white'
      StatContainer.textContent = type.cost
      statsContainer.appendChild(StatContainer)

      const bonusDefense = document.createElement('span')
      bonusDefense.className = 'stat -bonusofdefense _flex -justifycenter -aligncenter _color -white'
      bonusDefense.textContent = type.defense
      statsContainer.appendChild(bonusDefense)
    })
  })
  // logToConsoleContainer('...Map initialised...')
}
initWorld()

function getGridDimensions () {
  const style = getComputedStyle(document.getElementById('grid'))

  const rows = style.getPropertyValue('grid-template-rows').trim().split(' ').length
  const cols = style.getPropertyValue('grid-template-columns').trim().split(' ').length

  return { rows, cols }
}
getGridDimensions()

const numberOfCols = getGridDimensions().cols
const numberOfRows = getGridDimensions().rows

const currentPlayer = 1
let selectedUnit = null
let isSelectedUnit = false

// Function to select a unit
function selectUnit () {
  unselectUnit() // Unselect any previously selected unit
  const playableUnits = document.querySelectorAll('.unit-container')
  playableUnits.forEach(element => {
    element.addEventListener('click', function (event) {
      const tryToSelectUnit = element

      console.log(element.parentElement.dataset.index)

      if (!isSelectedUnit && Number(tryToSelectUnit.dataset.player) === currentPlayer) {
        selectedUnit = tryToSelectUnit
        isSelectedUnit = true
      }
    })
  })
}

// Function to unselect a unit
function unselectUnit () {
  if (isSelectedUnit) {
    isSelectedUnit = false
    selectedUnit = null
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

    cells.forEach(cell => {
      const childrenArray = Array.from(cell.children)
      const containsUnitContainer = childrenArray.some(child => child.classList.contains('unit-container'))
      const costOfMovement = Number(cell.dataset.cost_of_movement)

      // for the corresponding "next" cell if not out of grid, not already containing a unit and enough move capacity to reach the next cell
      if ((updatedIndex) % numberOfCols !== 0 && Number(cell.dataset.index) === updatedIndex - 1 && !containsUnitContainer && costOfMovement <= unitMoveCapacity) {
        console.log('Movement is valid.')
        updateUnitResidualMoveCapacity(unitMoveCapacity, costOfMovement)
        cell.appendChild(selectedUnit)
      }
    })
  }

  // move right
  if (event.key === 'ArrowRight') {
    console.log('want to move right')

    cells.forEach(cell => {
      const childrenArray = Array.from(cell.children)
      const containsUnitContainer = childrenArray.some(child => child.classList.contains('unit-container'))
      const costOfMovement = Number(cell.dataset.cost_of_movement)

      // for the corresponding "next" cell if not out of grid, not already containing a unit and enough move capacity to reach the next cell
      if (Number(cell.dataset.index) === updatedIndex + 1 && (updatedIndex + 1) % numberOfCols !== 0 && !containsUnitContainer && costOfMovement <= unitMoveCapacity) {
        console.log('Movement is valid.')
        updateUnitResidualMoveCapacity(unitMoveCapacity, costOfMovement)
        cell.appendChild(selectedUnit)
      }
    })
  }

  // move up
  if (event.key === 'ArrowUp') {
    console.log('want to move up')

    cells.forEach(cell => {
      const childrenArray = Array.from(cell.children)
      const containsUnitContainer = childrenArray.some(child => child.classList.contains('unit-container'))
      const costOfMovement = Number(cell.dataset.cost_of_movement)

      // for the corresponding "next" cell if not out of grid, not already containing a unit and enough move capacity to reach the next cell
      if (Number(cell.dataset.index) === updatedIndex - numberOfRows && updatedIndex - numberOfCols >= 0 && !containsUnitContainer && costOfMovement <= unitMoveCapacity) {
        console.log('Movement is valid.')
        updateUnitResidualMoveCapacity(unitMoveCapacity, costOfMovement)
        cell.appendChild(selectedUnit)
      }
    })
  }

  // move down
  if (event.key === 'ArrowDown') {
    console.log('want to move down')

    cells.forEach(cell => {
      const childrenArray = Array.from(cell.children)
      const containsUnitContainer = childrenArray.some(child => child.classList.contains('unit-container'))
      const costOfMovement = Number(cell.dataset.cost_of_movement)

      // for the corresponding "next" cell if not out of grid, not already containing a unit and enough move capacity to reach the next cell
      if (Number(cell.dataset.index) === updatedIndex + numberOfRows && updatedIndex + numberOfCols <= numberOfCols * numberOfRows && !containsUnitContainer && costOfMovement <= unitMoveCapacity) {
        console.log('Movement is valid.')
        updateUnitResidualMoveCapacity(unitMoveCapacity, costOfMovement)
        cell.appendChild(selectedUnit)
      }
    })
  }

  // valid move
  if (event.key === 'Enter') {
    cells.forEach(cell => {
      const costOfMovement = Number(cell.dataset.cost_of_movement)
      // for the corresponding "next" cell if not out of grid, not already containing a unit and enough move capacity to reach the next cell
      if (Number(cell.dataset.index) === updatedIndex) {
        updateUnitResidualMoveCapacity(unitMoveCapacity, costOfMovement)
        unselectUnit()
      }
    })
  }

  // cancel move
  if (event.key === 'Escape') {
    unselectUnit()
    // what was the initial index of the unit before any move, append the cell to the parent container and reset the residual move capacity of the unit
  }
}

function updateUnitResidualMoveCapacity (unitMoveCapacity, costOfMovement) {
  const residualMoveCapacity = unitMoveCapacity - costOfMovement
  selectedUnit.setAttribute('data-residual_move_capacity', residualMoveCapacity)
}

// Initial function calls
initWorld()
selectUnit()
