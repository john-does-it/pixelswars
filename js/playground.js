const cells = document.querySelectorAll('.cell-container')
const endRoundButton = document.getElementById('end-round')
const uiFeedbackContainer = document.getElementById('uifeedback-container')

const sounds = {
  cinematicMetal: document.getElementById('cinematic-metal'),
  infantry: document.getElementById('infantry'),
  infantry2: document.getElementById('infantry-2'),
  infantry3: document.getElementById('infantry-3'),
  jeepEngine: document.getElementById('jeep-engine'),
  artillery: document.getElementById('artillery'),
  gunBattle: document.getElementById('gun-battle'),
  trumpetFanfare: document.getElementById('trumpet-fanfare'),
  bomb: document.getElementById('bomb'),
  missileLaunch: document.getElementById('missile-launch'),
  jumpCapture: document.getElementById('jump-capture'),
  wooshMovement: document.getElementById('woosh-movement'),
  militaryMarch: document.getElementById('military-march'),
  mechanicBuilding: document.getElementById('mechanic-building'),
  nextRound: document.getElementById('next-round'),
  cashMachine: document.getElementById('cash-machine')
}

const infantrySounds = [sounds.infantry, sounds.infantry2, sounds.infantry3]

Object.values(sounds).forEach(sound => {
  if (sound && sound.load) {
    sound.load()
  }
})

function playSound (sound) {
  if (sound) {
    sound.pause()
    sound.currentTime = 0
    sound.play()
  }
}

function playSelectSound (unitType) {
  let randomInfantrySound

  switch (unitType) {
    case 'infantry':
      randomInfantrySound = infantrySounds[Math.floor(Math.random() * infantrySounds.length)]
      playSound(randomInfantrySound)
      break
    case 'jeep':
      playSound(sounds.jeepEngine)
      break
    case 'artillery':
      playSound(sounds.artillery)
      break
    default:
      break
  }
}

function playFightSound (unitType) {
  switch (unitType) {
    case 'infantry':
      playSound(sounds.gunBattle)
      break
    case 'jeep':
      playSound(sounds.gunBattle)
      break
    case 'artillery':
      playSound(sounds.missileLaunch)
      break
    default:
      break
  }
}

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

const numberOfCols = getGridDimensions().cols
const numberOfRows = getGridDimensions().rows

let currentPlayer = 1
let currentRound = 1
let selectedUnit = null
let isSelectedUnit = false
let isFighting = false

let originalIndex
let originalMoveCapacity

endRoundButton.addEventListener('click', endRound)

function endRound () {
  currentRound++
  determinePlayer()
  updateCurrentPlayerUI()
  resetUnitsResidualMoveCapacity()
  playSound(sounds.nextRound)

  if (selectedUnit) {
    unselectUnit()
  }

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
    element.addEventListener('click', unitClickHandler)
  })

  function unitClickHandler (event) {
    const tryToSelectUnit = event.currentTarget

    if (!isSelectedUnit && Number(tryToSelectUnit.dataset.player) === currentPlayer) {
      selectedUnit = tryToSelectUnit
      isSelectedUnit = true
      originalIndex = Number(tryToSelectUnit.parentElement.dataset.index)
      originalMoveCapacity = selectedUnit.dataset.residual_move_capacity
      highlightReachableCells(originalIndex)
      removeInRangeFromUnits()
      addInRangeToEnemyUnits(originalIndex)
      const enemyUnitsInRange = addInRangeToEnemyUnits(originalIndex)
      enemyUnitsInRange.forEach(enemyUnit => {
        enemyUnit.addEventListener('click', handleFight)
      })
      playSelectSound(selectedUnit.dataset.type)
    }
  }
}

function getLandscapeData (unit) {
  const landscape = unit.parentElement
  const landscapeIndex = landscape.dataset.index
  const lansdcapeCostOfMovement = landscape.dataset.cost_of_movement
  const landscapeDefenseBonus = landscape.dataset.defense_bonus
  const landscapeType = landscape.dataset.type
  const landscapeDatas = { landscapeIndex, lansdcapeCostOfMovement, landscapeDefenseBonus, landscapeType }
  return landscapeDatas
}

function removeHandleFightEventListeners () {
  const units = document.querySelectorAll('.unit-container')
  units.forEach(unit => {
    unit.removeEventListener('click', handleFight)
  })
}

function handleFight (event) {
  if (selectedUnit === null || isFighting) {
    return
  }

  isFighting = true

  if (selectedUnit.dataset.residual_attack_capacity > 0) {
    playFightSound(selectedUnit.dataset.name)
    // delay based on selectedUnit.dataset.sound_delay
    // then inflict damage
    console.log('ATT', selectedUnit.dataset.attack_damage, 'DEF', selectedUnit.dataset.defense, 'HEA', selectedUnit.dataset.health)
    const damage = (((selectedUnit.dataset.attack_damage * (selectedUnit.dataset.health / 100)) * 1.5) - Number(event.target.dataset.defense)) - (getLandscapeData(event.target).landscapeDefenseBonus / 2)
    console.log('damage', damage)
    event.target.setAttribute('data-health', event.target.dataset.health - damage)
    uiFeedbackContainer.innerText = 'The enemy unit has now ' + event.target.dataset.health + ' HP'
  }

  isFighting = false
}

function removeInRangeFromUnits () {
  const units = document.querySelectorAll('.unit-container')
  console.log(units)
  units.forEach(unit => {
    unit.classList.remove('-inrange')
  })
  console.log(units)
}

function addInRangeToEnemyUnits (index) {
  removeInRangeFromUnits()

  const adjacentCells = returnAdjacentCells(index, Number(selectedUnit.dataset.attack_range))

  const enemyUnits = getEnemyUnitsInRange(adjacentCells)

  enemyUnits.forEach(enemyUnit => {
    enemyUnit.classList.add('-inrange')
  })

  return enemyUnits
}

function unselectUnit () {
  if (isSelectedUnit) {
    selectedUnit = null
    isSelectedUnit = false
    removeReachableFromCells()
    removeAttackableFromCells()
    removeInRangeFromUnits()
    removeHandleFightEventListeners()
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
  /* TO DO: let user choose between azerty or qwerty keyboard then bind key depending on current keyboardMode (if azerty qsdz else wsad) */
  // move left
  if (event.key === 'ArrowLeft' || event.key === 'q') {
    console.log('press ArrowLeft')
    const leftCell = cells[updatedIndex - 1]
    const adjacentCells = returnAdjacentCells(Number(updatedIndex - 1), selectedUnit.dataset.attack_range)
    getEnemyUnitsInRange(adjacentCells)

    if (leftCell && updatedIndex % numberOfCols !== 0 && unitMoveCapacity >= leftCell.dataset.cost_of_movement && !isCellContainUnit(leftCell)) {
      addInRangeToEnemyUnits(updatedIndex - 1)
      updateUnitResidualMoveCapacity(unitMoveCapacity, leftCell.dataset.cost_of_movement)
      removeReachableFromCells()
      removeAttackableFromCells()
      highlightReachableCells(updatedIndex - 1)
      removeInRangeFromUnits()
      addInRangeToEnemyUnits(updatedIndex - 1)
      const enemyUnitsInRange = addInRangeToEnemyUnits(updatedIndex - 1)
      enemyUnitsInRange.forEach(enemyUnit => {
        enemyUnit.addEventListener('click', (event) => handleFight(event))
      })
      leftCell.appendChild(selectedUnit)
    }
  }

  // move right
  if (event.key === 'ArrowRight' || event.key === 'd') {
    console.log('press ArrowRight')
    const rightCell = cells[updatedIndex + 1]
    const adjacentCells = returnAdjacentCells(Number(updatedIndex + 1), selectedUnit.dataset.attack_range)
    getEnemyUnitsInRange(adjacentCells)

    if (rightCell && (updatedIndex + 1) % numberOfCols !== 0 && unitMoveCapacity >= rightCell.dataset.cost_of_movement && !isCellContainUnit(rightCell)) {
      addInRangeToEnemyUnits(updatedIndex + 1)
      updateUnitResidualMoveCapacity(unitMoveCapacity, rightCell.dataset.cost_of_movement)
      removeReachableFromCells()
      removeAttackableFromCells()
      highlightReachableCells(updatedIndex + 1)
      removeInRangeFromUnits()
      addInRangeToEnemyUnits(updatedIndex + 1)
      const enemyUnitsInRange = addInRangeToEnemyUnits(updatedIndex + 1)
      enemyUnitsInRange.forEach(enemyUnit => {
        enemyUnit.addEventListener('click', (event) => handleFight(event))
      })
      rightCell.appendChild(selectedUnit)
    }
  }

  // move up
  if (event.key === 'ArrowUp' || event.key === 'z') {
    console.log('press ArrowUp')
    const topCell = cells[updatedIndex - numberOfCols]
    const adjacentCells = returnAdjacentCells(Number(updatedIndex - numberOfCols), selectedUnit.dataset.attack_range)
    getEnemyUnitsInRange(adjacentCells)

    if (topCell && updatedIndex - numberOfCols >= 0 && unitMoveCapacity >= topCell.dataset.cost_of_movement && !isCellContainUnit(topCell)) {
      addInRangeToEnemyUnits(updatedIndex - numberOfCols)
      updateUnitResidualMoveCapacity(unitMoveCapacity, topCell.dataset.cost_of_movement)
      removeReachableFromCells()
      removeAttackableFromCells()
      highlightReachableCells(updatedIndex - numberOfCols)
      removeInRangeFromUnits()
      addInRangeToEnemyUnits(updatedIndex - numberOfCols)
      const enemyUnitsInRange = addInRangeToEnemyUnits(updatedIndex - numberOfCols)
      enemyUnitsInRange.forEach(enemyUnit => {
        enemyUnit.addEventListener('click', (event) => handleFight(event))
      })
      topCell.appendChild(selectedUnit)
    }
  }

  // move down
  if (event.key === 'ArrowDown' || event.key === 's') {
    console.log('press ArrowDown')
    const bottomCell = cells[updatedIndex + numberOfCols]
    const adjacentCells = returnAdjacentCells(Number(updatedIndex + numberOfCols), selectedUnit.dataset.attack_range)
    getEnemyUnitsInRange(adjacentCells)

    if (bottomCell && updatedIndex + numberOfCols <= numberOfCols * numberOfRows && unitMoveCapacity >= bottomCell.dataset.cost_of_movement && !isCellContainUnit(bottomCell)) {
      addInRangeToEnemyUnits(updatedIndex + numberOfCols)
      updateUnitResidualMoveCapacity(unitMoveCapacity, bottomCell.dataset.cost_of_movement)
      removeReachableFromCells()
      removeAttackableFromCells()
      highlightReachableCells(updatedIndex + numberOfCols)
      removeInRangeFromUnits()
      addInRangeToEnemyUnits(updatedIndex + numberOfCols)
      const enemyUnitsInRange = addInRangeToEnemyUnits(updatedIndex + numberOfCols)
      enemyUnitsInRange.forEach(enemyUnit => {
        enemyUnit.addEventListener('click', (event) => handleFight(event))
      })
      bottomCell.appendChild(selectedUnit)
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
    adjacentCell.classList.add('-attackable')
  })
}

function removeReachableFromCells () {
  cells.forEach(element => {
    element.classList.remove('-reachable')
  })
}

function removeAttackableFromCells () {
  cells.forEach(element => {
    element.classList.remove('-attackable')
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

  console.log(adjacentCells)
  return adjacentCells
}

// adjacentCells return a object like [34, 36, 27, 43, 26, 28, 42, 44]
function getEnemyUnitsInRange (adjacentCells) {
  const cells = document.querySelectorAll('.cell-container')
  const enemyUnitsInRange = []

  adjacentCells.forEach(adjacentCellIndex => {
    const cell = cells[adjacentCellIndex]
    const unitContainer = cell.querySelector('.unit-container')

    if (unitContainer && Number(unitContainer.dataset.player) !== currentPlayer) {
      enemyUnitsInRange.push(unitContainer)
    }
  })

  return enemyUnitsInRange
}

function isCellContainUnit (cell) {
  return cell.querySelector('.unit-container') !== null
}

initWorld()
selectUnit()
