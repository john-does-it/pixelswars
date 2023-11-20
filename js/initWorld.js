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
selectUnit()

const currentPlayer = 1
let selectedUnit

function selectUnit () {
  const playableUnits = document.querySelectorAll('.unit-container')

  playableUnits.forEach(element => {
    element.addEventListener('click', function (event) {
      const tryToSelectUnit = element

      if (element.classList.contains('unit-container') && Number(tryToSelectUnit.dataset.player) === currentPlayer) {
        console.log('current player SUCCESS')
      } else {
        return
      }

      selectedUnit = tryToSelectUnit
      console.log('selectedUnit', selectedUnit)

      moveUnit(event, selectedUnit)
    })
  })
}

function moveUnit (selectUnit) {
  function keyboardBind (event) {
    // Define the event handler function
    const initialIndex = Number(selectedUnit.parentElement.dataset.index)

    if (event.key === ' ') {
      console.log('want to capture')
    }
    if (event.key === 'ArrowLeft') {
      console.log('want to move left')
      // + add  next cell doesnt contain a unit + replace 8 by number of
      if (initialIndex % 8 !== 0) {
        console.log('not out of grid')
        cells.forEach(cell => {
          if (Number(cell.dataset.index) === initialIndex - 1) {
            console.log('success', cell, cell.children)
            cell.appendChild(selectedUnit)
          }
        })
      } else {
        console.log('out of grid')
      }
    }
    if (event.key === 'ArrowRight') {
      console.log('want to move right')
    }
    if (event.key === 'ArrowUp') {
      console.log('want to move up')
    }
    if (event.key === 'ArrowDown') {
      console.log('want to move down')
    }
    if (event.key === 'Escape') {
      window.removeEventListener('keydown', keyboardBind, true)
    }
  }

  window.addEventListener('keydown', keyboardBind, true)
}

console.log(selectedUnit)
// select a unit
// want to move it
// // check if out of grid, if next potential cell contain a unit and if residual want to move cap is enough, if yes move
// handle fight if enemyinrange
