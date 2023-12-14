// Initialization and Configuration
const cells = document.querySelectorAll('.cell-container')
const endRoundButton = document.getElementById('end-round')
const currentMoneyPlayerOneUIContainer = document.getElementById('current-money-player-one')
const currentMoneyPlayerTwoUIContainer = document.getElementById('current-money-player-two')
const dialogContainer = document.getElementById('dialog-container')
const dialogContent = document.getElementById('dialog-content')
const factoryContainer = document.getElementById('factory-container')
const factoriesButtons = factoryContainer.querySelectorAll('button')
const togglePlayerMusicButton = document.getElementById('toggle-player-music')
const smartphoneControls = document.getElementById('smartphone-controls')
const factories = document.querySelectorAll('.-factory')
const numberOfCols = getGridDimensions().cols
const numberOfRows = getGridDimensions().rows

console.log(smartphoneControls)

const getDeviceType = () => {
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(navigator.userAgent) || /Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(navigator.userAgent)) {
    console.log('should be a tablet or a smartphone')
    return 'smartphone'
  }

  console.log('should be a PC')
  return 'desktop'
}
getDeviceType()

const currentDevice = getDeviceType()

const unitsHTML = {
  infantryUnitPlayerOne:
  `
  <div class="unit-container -infantry -one _flex" data-player="1" data-capture_capacity="1" data-name="infantry" data-attack_damage="40" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="10" data-movement_range="5" data-residual_move_capacity="5" data-health="100" data-max_health="100" data-type="infantry" data-cost="200"  data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>  
  `,
  infantryUnitPlayerTwo:
  `
  <div class="unit-container -infantry -two _flex" data-capture_capacity="1" data-player="2" data-name="infantry" data-attack_damage="40" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="10" data-movement_range="5" data-residual_move_capacity="5" data-health="100" data-max_health="100" data-type="infantry" data-cost="200"  data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>  
  `,
  jeepUnitPlayerOne:
  `
  <div class="unit-container -jeep -one _flex" data-player="1" data-name="jeep" data-attack_damage="50" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="20" data-movement_range="8" data-residual_move_capacity="8" data-health="125" data-max_health="125" data-type="jeep" data-cost="600" data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>
  `,
  jeepUnitPlayerTwo:
  `
  <div class="unit-container -jeep -two _flex" data-player="2" data-name="jeep" data-attack_damage="50" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="20" data-movement_range="8" data-residual_move_capacity="8" data-health="125" data-max_health="125" data-type="jeep" data-cost="600" data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>  
  `,
  artilleryPlayerOne:
  `
  <div class="unit-container -artillery -one _flex" data-player="1" data-name="artillery" data-attack_damage="60" data-attack_range="3" data-exclusion_attack_range="1" data-attack_capacity="1" data-residual_attack_capacity="1" data-defense="25" data-movement_range="3" data-residual_move_capacity="3" data-health="120" data-max_health="120" data-type="artillery" data-cost="1200" data-sound_delay="2000">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>
  `,
  artilleryPlayerTwo:
  `
  <div class="unit-container -artillery -two _flex" data-player="2" data-name="artillery" data-attack_damage="60" data-attack_range="3" data-exclusion_attack_range="1" data-attack_capacity="1" data-residual_attack_capacity="1" data-defense="25" data-movement_range="3" data-residual_move_capacity="3" data-health="120" data-max_health="120" data-type="artillery" data-cost="1200" data-sound_delay="2000">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>
  `,
  tankPlayerOne:
  `
  <div class="unit-container -tank -one _flex" data-player="1" data-name="tank" data-attack_damage="70" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="40" data-movement_range="5" data-residual_move_capacity="5" data-health="180" data-max_health="180" data-type="tank" data-cost="1200" data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>
  `,
  tankPlayerTwo:
  `
  <div class="unit-container -tank -two _flex" data-player="2" data-name="tank" data-attack_damage="70" data-attack_range="1" data-attack_capacity="2" data-residual_attack_capacity="2" data-defense="40" data-movement_range="5" data-residual_move_capacity="5" data-health="180" data-max_health="180" data-type="tank" data-cost="1200" data-sound_delay="500">
    <img class="health" src="./assets/icons/icon-health.png" alt="icon health">
  </div>
  `
}

let currentPlayer = 1
let currentRound = 1
let selectedUnit = null
let isSelectedUnit = false
let isFighting = false
let originalIndex
let originalMoveCapacity
let playerOneMoney = 0
let playerTwoMoney = 0
let buildingDatas
let factory
let allowPlayMusic = false

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
getGridDimensions()
selectUnit()
statPreview()
preloadImages()

// Utility functions
function preloadImages () {
  const imagePaths = [
    'assets/gifs/explosion.gif',
    'assets/cells/cell-city-on-grass-captured-by-1.png',
    'assets/cells/cell-city-on-grass-captured-by-2.png',
    'assets/cells/cell-city-on-grass-half-captured-by-1.png',
    'assets/cells/cell-city-on-grass-half-captured-by-2.png',
    'assets/cells/cell-city-on-grass-half-captured.png',
    'assets/cells/cell-city-on-grass-halfcaptured-by-1.png',
    'assets/cells/cell-city-on-grass-halfcaptured-by-2.png',
    'assets/cells/cell-city-on-grass-halfcaptured.png',
    'assets/cells/cell-city-on-grass.png',
    'assets/cells/cell-factory-on-grass-captured-by-1.png',
    'assets/cells/cell-factory-on-grass-captured-by-2.png',
    'assets/cells/cell-factory-on-grass-half-captured-by-1.png',
    'assets/cells/cell-factory-on-grass-halfcaptured-by-2.png',
    'assets/cells/cell-factory-on-grass-halfcaptured.png',
    'assets/cells/cell-factory-on-grass.png',
    'assets/cells/cell-forest-on-grass-variant.png',
    'assets/cells/cell-forest-on-grass.png',
    'assets/cells/cell-grass-variant-2.png',
    'assets/cells/cell-grass-variant-3.png',
    'assets/cells/cell-grass-variant.png',
    'assets/cells/cell-grass.png',
    'assets/cells/cell-hospital-on-grass-captured-by-1.png',
    'assets/cells/cell-hospital-on-grass-captured-by-2.png',
    'assets/cells/cell-hospital-on-grass-halfcaptured-by-1.png',
    'assets/cells/cell-hospital-on-grass-halfcaptured-by-2.png',
    'assets/cells/cell-hospital-on-grass-halfcaptured.png',
    'assets/cells/cell-hospital-on-grass.png',
    'assets/cells/cell-moutain-on-grass.png',
    'assets/cells/cell-road-corner-bottom.png',
    'assets/cells/cell-road-corner-top.png',
    'assets/cells/cell-road-end-top.png',
    'assets/cells/cell-road-h.png',
    'assets/cells/cell-road-v.png',
    'assets/cells/cell-water-grass-on-right-and-bottom.png',
    'assets/cells/cell-water-grass-on-right.png',
    'assets/cells/cell-water.png'
  ]

  imagePaths.forEach(path => {
    const img = new Image()
    img.src = path
  })
}

function getGridDimensions () {
  const style = getComputedStyle(document.getElementById('grid'))

  const rows = style.getPropertyValue('grid-template-rows').trim().split(' ').length
  const cols = style.getPropertyValue('grid-template-columns').trim().split(' ').length

  return { rows, cols }
}

function isCellContainUnit (cell) {
  return cell.querySelector('.unit-container') !== null
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

function getEnemyUnitsInRange (adjacentCells) {
  const cells = document.querySelectorAll('.cell-container')
  const enemyUnitsInRange = []

  adjacentCells.forEach(adjacentCellIndex => {
    const cell = cells[adjacentCellIndex]
    if (cell) {
      const unitContainer = cell.querySelector('.unit-container')

      if (unitContainer && Number(unitContainer.dataset.player) !== currentPlayer) {
        enemyUnitsInRange.push(unitContainer)
      }
    }
  })

  return enemyUnitsInRange
}

function getLandscapeData (unit) {
  const landscape = unit.parentElement
  const landscapeIndex = landscape.dataset.index
  const landcapeCostOfMovement = landscape.dataset.cost_of_movement
  const landscapeDefenseBonus = landscape.dataset.defense_bonus
  const landscapeType = landscape.dataset.type
  const landscapeDatas = { landscapeIndex, landcapeCostOfMovement, landscapeDefenseBonus, landscapeType }
  return landscapeDatas
}

function getBuildingData (unit) {
  const building = unit.parentElement
  const buildingCapturePoint = building.dataset.capture_points
  const buildingPlayerAppartenance = building.dataset.player
  const buildingDatas = { building, buildingCapturePoint, buildingPlayerAppartenance }
  return buildingDatas
}

// Game Mechanics and Logic
function selectUnit () {
  unselectUnit() // Unselect any previously selected unit

  const playableUnits = document.querySelectorAll('.unit-container')

  playableUnits.forEach(element => {
    element.addEventListener('click', unitClickHandler)
  })
}

function unitClickHandler (event) {
  const tryToSelectUnit = event.currentTarget

  if (Number(tryToSelectUnit.dataset.player) !== currentPlayer) {
    return
  }

  // Now handling the specific case where the selected unit is not the currently selected one.
  if (tryToSelectUnit !== selectedUnit) {
    unselectUnit()
  }

  isSelectedUnit = true

  // if smartphone show arrow to control the unit
  /*
  if (getDeviceType !== 'desktop') {
    smartphoneControls.classList.add('-active')
  }
  */

  console.log(isSelectedUnit)

  selectedUnit = tryToSelectUnit
  playSelectSound(selectedUnit.dataset.type)
  originalIndex = Number(tryToSelectUnit.parentElement.dataset.index)
  originalMoveCapacity = Number(selectedUnit.dataset.residual_move_capacity)
  highlightReachableCells(originalIndex)
  removeInRangeFromUnits()
  addInRangeToEnemyUnits(originalIndex)
  const enemyUnitsInRange = addInRangeToEnemyUnits(originalIndex)
  addEventListenerHandleFightToEnemyUnitsInRange(enemyUnitsInRange)
  attachCaptureBuildingEventListenerIfCapturable()
  if (isSelectedUnit && currentDevice === 'smartphone') {
    removeSmartMoveEventListeners()
    smartphoneBindWhileSelectedUnit(selectedUnit)
  }
}

function unselectUnit () {
  selectedUnit = null
  isSelectedUnit = false
  /*
  if (getDeviceType !== 'desktop') {
    smartphoneControls.classList.remove('-active')
  }
  */
  removeReachableFromCells()
  removeAttackableFromCells()
  removeInRangeFromUnits()
  removeHandleFightEventListeners()
}

function attachCaptureBuildingEventListenerIfCapturable () {
  buildingDatas = getBuildingData(selectedUnit)

  if (selectedUnit.dataset.name.includes('infantry') && getLandscapeData(selectedUnit).landscapeType === 'building') {
    if (Number(selectedUnit.dataset.capture_capacity) === 0 || (Number(buildingDatas.buildingCapturePoint) === 20 && Number(buildingDatas.buildingPlayerAppartenance) === Number(selectedUnit.dataset.player))) {
      console.log('Cannot be captured')
    } else if (Number(selectedUnit.dataset.capture_capacity) === 0 && Number(buildingDatas.buildingPlayerAppartenance) !== Number(selectedUnit.dataset.player)) {
      console.log('todo: give feedback')
    } else {
      document.addEventListener('keypress', startCaptureBuilding)
    }
  }
}

function keyboardBindWhileSelectedUnit (event, selectedUnit) {
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
      unselectUnit()
      break
  }
}

function smartphoneBindWhileSelectedUnit (selectedUnit) {
  console.log('test')
  // add click event listener on reachable cells
  const reachableCells = document.querySelectorAll('.-reachable')
  console.log(reachableCells)

  reachableCells.forEach(reachableCell => {
    reachableCell.addEventListener('click', (event) => smartMove(event))
  })
}

function smartMove (event) {
  if (!event.target.contains(selectedUnit)) {
    event.target.appendChild(selectedUnit)
    updateCellsAndUnitsState(Number(selectedUnit.parentElement.dataset.index))
    smartphoneBindWhileSelectedUnit(selectedUnit)
  }
}

function removeSmartMoveEventListeners () {
  const reachableCells = document.querySelectorAll('.-reachable')

  reachableCells.forEach(reachableCell => {
    reachableCell.removeEventListener('click', smartMove)
  })
}

function handleCancelMove () {
  const originalCell = cells[originalIndex]
  originalCell.appendChild(selectedUnit)
  resetUnitResidualMoveCapacity(originalMoveCapacity)
  if (resetUnitResidualMoveCapacity(originalMoveCapacity) !== 0) {
    updateUnitStatus(selectedUnit, '-outofmovement', false)
  }
}

function handleDirectionalMove (targetIndex, moveCapacity, selectedUnit, direction) {
  const targetCell = cells[targetIndex]
  const adjacentCells = returnAdjacentCells(targetIndex, selectedUnit.dataset.attack_range)
  getEnemyUnitsInRange(adjacentCells)

  if (isValidMove(targetCell, targetIndex, moveCapacity, direction)) {
    processUnitMove(targetIndex, moveCapacity, selectedUnit, targetCell)
    const enemyUnitsInRange = addInRangeToEnemyUnits(targetIndex)
    addEventListenerHandleFightToEnemyUnitsInRange(enemyUnitsInRange)
    playSound(sounds.wooshMovement)
  }
}

function calculateUnitMoveCapacity (selectedUnit) {
  const movementRange = Number(selectedUnit.dataset.movement_range)
  const residualCapacity = Number(selectedUnit.dataset.residual_move_capacity)
  return movementRange === residualCapacity ? movementRange : residualCapacity
}

function isValidMove (cell, index, moveCapacity, direction) {
  if (!cell || moveCapacity < cell.dataset.cost_of_movement || isCellContainUnit(cell)) {
    return false
  }

  switch (direction) {
    case 'left':
      return (index + 1) % numberOfCols !== 0
    case 'right':
      return (index) % numberOfCols !== 0
    case 'up':
      return (index) >= 0
    case 'down':
      return (index) <= numberOfCols * numberOfRows
    default:
      return false
  }
}

function processUnitMove (index, moveCapacity, selectedUnit, targetCell) {
  addInRangeToEnemyUnits(index)
  updateUnitResidualMoveCapacity(moveCapacity, targetCell.dataset.cost_of_movement)
  updateCellsAndUnitsState(index)
  targetCell.appendChild(selectedUnit)
}

function updateCellsAndUnitsState (index) {
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

function resetResidualCaptureCapacityOnUnits () {
  const updatedUnits = document.querySelectorAll('.unit-container')

  updatedUnits.forEach(unit => {
    if (unit.dataset.capture_capacity === '0') {
      unit.setAttribute('data-capture_capacity', 1)
    }
  })
}

function resetUnitsResidualAttackCapacity () {
  const units = document.querySelectorAll('.unit-container')

  units.forEach(unit => {
    unit.setAttribute('data-residual_attack_capacity', unit.dataset.attack_capacity)
  })
}

function highlightReachableCells (cellIndex) {
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

function removeInRangeFromUnits () {
  const units = document.querySelectorAll('.unit-container')

  units.forEach(unit => {
    unit.classList.remove('-inrange')
  })
}

function addInRangeToEnemyUnits (index) {
  removeInRangeFromUnits()

  const adjacentCells = returnAdjacentCells(index, Number(selectedUnit.dataset.attack_range))
  const enemyUnits = getEnemyUnitsInRange(adjacentCells)

  if (Number(selectedUnit.dataset.residual_attack_capacity) !== 0) {
    const counter = enemyUnits.length

    enemyUnits.forEach(enemyUnit => {
      enemyUnit.classList.add('-inrange')
    })

    if (counter === 0) {
      const inRangeMessages = document.querySelectorAll('.inrangemessage')
      inRangeMessages.forEach(inRangeMessage => {
        inRangeMessage.remove()
      })
    }
  }

  return enemyUnits
}

async function handleFight (event) {
  if (selectedUnit === null || isFighting) {
    return
  }

  if (Number(selectedUnit.dataset.residual_attack_capacity) === 0) {
    playSound(sounds.emptyGunShot)
    return
  }

  updateCellsAndUnitsState(Number(getLandscapeData(selectedUnit).landscapeIndex))

  endRoundButton.disabled = true // Disable the "End Round" button

  originalIndex = Number(getLandscapeData(selectedUnit).landscapeIndex) // prevent move cancellation

  isFighting = true
  playFightSound(selectedUnit.dataset.name)

  // New damage calculation
  const damage = calculateDamage(
    Number(selectedUnit.dataset.attack_damage),
    Number(selectedUnit.dataset.health),
    Number(event.target.dataset.defense),
    Number(getLandscapeData(event.target).landscapeDefenseBonus)
  )

  event.target.setAttribute('data-health', Math.round(Number(event.target.dataset.health) - damage))
  updateHealthAnimation(event.target)
  selectedUnit.setAttribute('data-residual_attack_capacity', Number(selectedUnit.dataset.residual_attack_capacity) - 1)

  if (Number(selectedUnit.dataset.residual_attack_capacity) === 0) {
    removeInRangeFromUnits()
  }

  if (Number(selectedUnit.dataset.residual_attack_capacity) === 0) {
    updateUnitStatus(selectedUnit, '-outofammo', true)
  }

  handleFightBack(event)

  // If enemy unit is dead
  if (Number(event.target.dataset.health) <= 0) {
    const previouslyTargetedUnit = event.target
    await handleDeathOfUnit(previouslyTargetedUnit, Number(getLandscapeData(previouslyTargetedUnit).landscapeIndex), selectedUnit)
    updateCellsAndUnitsState(Number(getLandscapeData(selectedUnit).landscapeIndex))
    isFighting = false
    endRoundButton.disabled = false // Re-enable the "End Round" button
    checkIfLost()
  }
}

function handleFightBack (event) {
  // Calculate the array of adjacent cells for the enemy unit
  const enemyAttackRangeCells = returnAdjacentCells(
    Number(getLandscapeData(event.target).landscapeIndex),
    Number(event.target.dataset.attack_range)
  )

  // delay the ripost using selectedUnit.dataset.sound_delay
  const riposteDelay = Number(selectedUnit.dataset.sound_delay)

  // if enemy not dead and can ripost
  if (Number(event.target.dataset.health) > 0 && enemyAttackRangeCells.includes(Number(getLandscapeData(selectedUnit).landscapeIndex))) {
    setTimeout(() => {
      playFightSound(event.target.dataset.name)
    }, riposteDelay)
    const returnDamage = calculateDamage(
      Number(event.target.dataset.attack_damage),
      Number(event.target.dataset.health),
      Number(selectedUnit.dataset.defense),
      Number(getLandscapeData(selectedUnit).landscapeDefenseBonus)
    )
    selectedUnit.setAttribute('data-health', Math.max(0, Math.round(Number(selectedUnit.dataset.health) - returnDamage)))
    updateHealthAnimation(selectedUnit)
    const healthStatPreview = document.getElementById('statpreview-health')

    if (healthStatPreview) {
      healthStatPreview.innerHTML = Number(event.target.dataset.health)
    }
  }

  // If selected unit is dead after riposte
  if (Number(selectedUnit.dataset.health) <= 0) {
    handleDeathOfSelectedUnit()
  }

  // Re-enable the "End Round" button here if riposte is complete and selected unit is not dead
  endRoundButton.disabled = false
  isFighting = false
}

async function handleDeathOfSelectedUnit () {
  handleDeathOfUnit(selectedUnit, Number(getLandscapeData(selectedUnit).landscapeIndex), event.target)
  unselectUnit()
  checkIfLost()
}

function checkIfLost () {
  let numberOfPlayerOneUnits = 0
  let numberOfPlayerTwoUnits = 0

  const survivingUnits = document.querySelectorAll('.unit-container')

  survivingUnits.forEach(unit => {
    if (Number(unit.dataset.player) === 1) {
      numberOfPlayerOneUnits++
    }
    if (Number(unit.dataset.player) === 2) {
      numberOfPlayerTwoUnits++
    }
  })

  if (numberOfPlayerOneUnits === 0) {
    toggleYouWinDialogContainer()
    youWinMessageInDialogContainer('Player two')
  }

  if (numberOfPlayerTwoUnits === 0) {
    toggleYouWinDialogContainer()
    youWinMessageInDialogContainer('Player one')
  }
}

function handleDeathOfUnit (unit, cellIndex, killingUnit) {
  return new Promise((resolve) => {
    const cell = cells[cellIndex]
    const deathDelay = Number(killingUnit.dataset.sound_delay)

    setTimeout(() => {
      createExplosion(cell)
      unit.remove()
      resolve() // Resolve the promise after completing the unit removal
    }, deathDelay)
  })
}

function createExplosion (cell) {
  const imgElement = document.createElement('img')
  sounds.bomb.volume = 0.5
  sounds.bomb.play()
  imgElement.src = 'assets/gifs/explosion.gif'
  imgElement.classList.add('explosion')
  cell.appendChild(imgElement)

  setTimeout(() => {
    imgElement.remove()
  }, 500) // Duration of the explosion GIF display
}

function calculateDamage (attackerDamage, attackerHealth, defenderDefense, defenderLandscapeDefenseBonus) {
  const totalDefenseBonus = (defenderDefense + defenderLandscapeDefenseBonus) / 10
  const healthFactor = (1 / 100) * attackerHealth
  const damage = (attackerDamage - totalDefenseBonus) * healthFactor
  return damage
}

function unselectFactory () {
  factory = null
  factoryContainer.classList.remove('_flex')
  factoryContainer.classList.remove('-column')
}

function selectFactory (event) {
  // if a unit isn't on the factory, allow player to buy a unit
  if (Number(event.target.dataset.player) === currentPlayer && event.target.classList.contains('-factory')) {
    factory = event.target
    factoryContainer.classList.toggle('_flex')
    factoryContainer.classList.toggle('-column')
    factoriesButtons.forEach(button => button.addEventListener('click', buyUnit))
  }
}

function buyUnit (event) {
  if (!Array.from(factory.children).some(child => child.classList.contains('unit-container'))) {
    const unitType = event.target.dataset.type
    const unitCost = Number(event.target.dataset.cost)
    const currentPlayerMoney = (currentPlayer === 1) ? playerOneMoney : playerTwoMoney

    if (unitCost > currentPlayerMoney) {
      // logToConsoleContainer('<span class="_color -red">You can\'t afford that unit.</span>')
      return
    }

    if (unitType === 'infantry') {
      sounds.militaryMarch.play()
    }

    if (unitType === 'jeep' || unitType === 'tank') {
      sounds.mechanicBuilding.play()
    }

    const unitMapping = {
      infantry: {
        1: unitsHTML.infantryUnitPlayerOne,
        2: unitsHTML.infantryUnitPlayerTwo
      },
      jeep: {
        1: unitsHTML.jeepUnitPlayerOne,
        2: unitsHTML.jeepUnitPlayerTwo
      },
      artillery: {
        1: unitsHTML.artilleryPlayerOne,
        2: unitsHTML.artilleryPlayerTwo
      },
      tank: {
        1: unitsHTML.tankPlayerOne,
        2: unitsHTML.tankPlayerTwo
      }
    }

    if (unitMapping[unitType]) {
      const newUnitHTML = unitMapping[unitType][currentPlayer]
      createAndAddUnit(newUnitHTML)

      if (currentPlayer === 1) {
        playerOneMoney -= unitCost
      } else {
        playerTwoMoney -= unitCost
      }
      updateMoneyUI()
    }

    factoryContainer.classList.toggle('_flex')
    factoryContainer.classList.toggle('-column')
  } else {
    unselectFactory()
  }
}

function createAndAddUnit (unitHTML) {
  // Sanitize the HTML string with DOMPurify
  // eslint-disable-next-line no-undef
  const sanitizedUnitHTML = DOMPurify.sanitize(unitHTML)

  const newUnitElement = document.createElement('div')
  newUnitElement.innerHTML = sanitizedUnitHTML // Use the sanitized HTML

  factory.appendChild(newUnitElement)
  const toReplaceBy = newUnitElement.querySelector('.unit-container')
  newUnitElement.replaceWith(toReplaceBy)

  selectUnit() // update units adding new units
}

function captureBuilding () {
  document.addEventListener('keypress', startCaptureBuilding)
}

function startCaptureBuilding (event) {
  event.preventDefault()

  if (selectedUnit && selectedUnit.dataset.capture_capacity && selectedUnit.dataset.capture_capacity > 0) {
    event.preventDefault()
    originalIndex = Number(getLandscapeData(selectedUnit).landscapeIndex)
    const updatedCapturePoints = Number(buildingDatas.buildingCapturePoint) - 10
    buildingDatas.building.setAttribute('data-capture_points', updatedCapturePoints)
    if (updatedCapturePoints === 10) {
      playSound(sounds.jumpCapture)
      buildingDatas.building.classList.add('-halfcaptured')
    }
    if (updatedCapturePoints === 0) {
      playSound(sounds.trumpetFanfare)
      buildingDatas.building.classList.remove('-capturedby1', '-capturedby2', '-halfcaptured')
      buildingDatas.building.classList.add('-capturedby' + currentPlayer)
      buildingDatas.building.setAttribute('data-player', currentPlayer)
      buildingDatas.building.setAttribute('data-capture_points', 20)
    }
    selectedUnit.setAttribute('data-capture_capacity', 0)
    updateUnitStatus(selectedUnit, '-outofcapture', true)
  }

  document.removeEventListener('keypress', startCaptureBuilding)
}

function healthUnitOnHospital () {
  const units = document.querySelectorAll('.unit-container')

  units.forEach(unit => {
    const hospitalParent = unit.parentElement

    if (hospitalParent && hospitalParent.classList.contains('-hospital') && unit.getAttribute('data-player') === hospitalParent.getAttribute('data-player') && Number(hospitalParent.dataset.player) === currentPlayer) {
      let currentHealth

      if (Number(unit.dataset.health) < Number(unit.dataset.max_health) - 25) {
        currentHealth = Number(unit.dataset.health) + 25
        unit.setAttribute('data-health', currentHealth)
        updateHealthAnimation(unit)
      } else if (Number(unit.dataset.health) >= Number(unit.dataset.max_health) - 25) {
        currentHealth = Number(unit.dataset.max_health)
        unit.setAttribute('data-health', currentHealth)
        updateHealthAnimation(unit)
      }
    }
  })
}

function endRound () {
  currentRound++
  unselectUnit()
  distributeMoney()
  determinePlayer()
  updateCurrentPlayerUI()
  updateMoneyUI()
  resetUnitsResidualMoveCapacity()
  resetUnitsResidualAttackCapacity()
  resetResidualCaptureCapacityOnUnits()
  healthUnitOnHospital()
  resetUnitStatuses()
  playSound(sounds.nextRound)
  unselectFactory()
}

function resetUnitStatuses () {
  const units = document.querySelectorAll('.unit-container')
  units.forEach(unit => {
    updateUnitStatus(unit, '-outofammo', false)
    updateUnitStatus(unit, '-outofmovement', false)
    updateUnitStatus(unit, '-outofcapture', false)
  })
}

function determinePlayer () {
  if (currentRound === 1 || currentRound % 2 === 1) {
    currentPlayer = 1
  } else if (currentRound % 2 !== 1) {
    currentPlayer = 2
  }

  if (allowPlayMusic) {
    controlMusicForCurrentPlayer()
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

function distributeMoney () {
  const buildings = document.querySelectorAll('.-building')

  buildings.forEach(building => {
    if (building.classList.contains('-city') && building.dataset.player !== '0') {
      if (Number(building.dataset.player) === 1 && currentPlayer === 2) {
        playerOneMoney = playerOneMoney + 200
        sounds.cashMachine.play()
        highlightMoneyMakeFromCity(building)
      } else if (Number(building.dataset.player) === 2 && currentPlayer === 1) {
        playerTwoMoney = playerTwoMoney + 200
        sounds.cashMachine.play()
        highlightMoneyMakeFromCity(building)
      }
    }

    function highlightMoneyMakeFromCity (building) {
      building.classList.add('-active')
      setTimeout(() => {
        building.classList.remove('-active')
      }, 5000)
    }
  })
}

function updateMoneyUI () {
  currentMoneyPlayerOneUIContainer.innerText = playerOneMoney
  currentMoneyPlayerTwoUIContainer.innerText = playerTwoMoney
}
updateMoneyUI()

// Sound Management
const sounds = {
  cinematicMetal: document.getElementById('cinematic-metal'),
  infantry: document.getElementById('infantry'),
  infantry2: document.getElementById('infantry-2'),
  infantry3: document.getElementById('infantry-3'),
  jeepEngine: document.getElementById('jeep-engine'),
  tankEngine: document.getElementById('tank-engine'),
  artilleryTouret: document.getElementById('artillery-touret'),
  gunBattle: document.getElementById('gun-battle'),
  emptyGunShot: document.getElementById('empty-gun-shot'),
  tankShot: document.getElementById('tank-shot'),
  trumpetFanfare: document.getElementById('trumpet-fanfare'),
  bomb: document.getElementById('bomb'),
  missileLaunch: document.getElementById('missile-launch'),
  jumpCapture: document.getElementById('jump-capture'),
  wooshMovement: document.getElementById('woosh-movement'),
  militaryMarch: document.getElementById('military-march'),
  mechanicBuilding: document.getElementById('mechanic-building'),
  nextRound: document.getElementById('next-round'),
  cashMachine: document.getElementById('cash-machine'),
  playerOneMusic: document.getElementById('player-one-music'),
  playerTwoMusic: document.getElementById('player-two-music')
}

const infantrySounds = [sounds.infantry, sounds.infantry2, sounds.infantry3]

Object.values(sounds).forEach(sound => {
  if (sound && sound.load) {
    sound.load()
  }
})

function playSound (sound) {
  if (sound) {
    sound.volume = 0.5
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
      playSound(sounds.artilleryTouret)
      break
    case 'tank':
      playSound(sounds.tankEngine)
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
    case 'tank':
      playSound(sounds.tankShot)
      break
    default:
      break
  }
}

// eslint-disable-next-line no-unused-vars
function playMusic () {
  allowPlayMusic = !allowPlayMusic // Toggle music play state

  if (allowPlayMusic) {
    // Set volume and pause both tracks to reset their state
    sounds.playerOneMusic.volume = 0.25
    sounds.playerTwoMusic.volume = 0.25
    sounds.playerOneMusic.pause()
    sounds.playerTwoMusic.pause()

    // Play music for the current player
    const currentMusic = currentPlayer === 1 ? sounds.playerOneMusic : sounds.playerTwoMusic
    currentMusic.load()
    currentMusic.play()
    togglePlayerMusicButton.innerHTML = '<img src="./assets/icons/icon-play-sound.png" alt="icon play / mute sound" width="16" height="16">'
  } else {
    // Pause both music tracks
    sounds.playerOneMusic.pause()
    sounds.playerTwoMusic.pause()
    togglePlayerMusicButton.innerHTML = '<img src="./assets/icons/icon-mute-sound.png" alt="icon play / mute sound" width="16" height="16">'
  }
}

function controlMusicForCurrentPlayer () {
  // Load and play music for the current player, pause for the other
  const playerMusic = currentPlayer === 1 ? sounds.playerOneMusic : sounds.playerTwoMusic
  const otherMusic = currentPlayer === 1 ? sounds.playerTwoMusic : sounds.playerOneMusic

  playerMusic.volume = 0.125
  playerMusic.load()
  playerMusic.play()
  otherMusic.pause()
}

// UI Management
function updateUnitStatus (unit, statusType, add) {
  let statusElement = unit.querySelector(`.${statusType}`)
  if (add) {
    if (!statusElement) {
      statusElement = document.createElement('div')
      statusElement.classList.add('status')
      statusElement.classList.add(`${statusType}`)
      unit.appendChild(statusElement)
    }
  } else {
    if (statusElement) {
      statusElement.remove()
    }
  }
}

function updateHealthAnimation (unit) {
  const healthIcon = unit.querySelector('.health')

  if (!healthIcon) {
    return
  }

  const maxHealth = parseInt(unit.dataset.max_health, 10)
  const currentHealth = parseInt(unit.dataset.health, 10)
  let healthPercentage = (currentHealth / maxHealth) * 100

  // Ensure a minimum of 10%
  healthPercentage = Math.max(10, healthPercentage)

  // Calculate animation duration inversely proportional to health percentage
  // The lower the health, the faster the pulse
  const animationDuration = (healthPercentage / 100) * 2 // Adjust the multiplier (0.5 here) to control the speed

  // Update the animation duration
  healthIcon.style.animationDuration = `${animationDuration}s`
}

function toggleYouWinDialogContainer () {
  dialogContainer.show()
}

function youWinMessageInDialogContainer (winner) {
  const newMessage = document.createElement('p')
  newMessage.innerText = winner + ', congratulation you win!'
  dialogContent.appendChild(newMessage)
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
                <span class="miniature" style="background-image: url('${unitBackground}');"></span>` +
                '<span class="stat -health _flex -justifycenter -aligncenter" id="statpreview-health">' +
                child.dataset.health + '</span>' +
                '<span class="stat -attackcapacity _flex -justifycenter -aligncenter">' +
                child.dataset.residual_attack_capacity + '</span>' +
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

    statsHTML += `<span class="miniature" style="background-image: url('${cellBackground}');"></span>` +
                '<span class="stat -defense _flex -justifycenter -aligncenter">' +
                cell.dataset.defense_bonus + '</span>' +
                '<span class="stat -movement _flex -justifycenter -aligncenter">' +
                cell.dataset.cost_of_movement + '</span>'

    // Sanitize and set the HTML content
    // eslint-disable-next-line no-undef
    statsContainer.innerHTML = DOMPurify.sanitize(statsHTML)
  }
}

// Event Listeners and Handlers
togglePlayerMusicButton.addEventListener('click', playMusic)

endRoundButton.addEventListener('click', endRound)

window.addEventListener('keydown', (event) => {
  // Single event listener for keyboard actions
  if (isSelectedUnit && currentDevice === 'desktop') {
    keyboardBindWhileSelectedUnit(event, selectedUnit)
  }
})

function addEventListenerHandleFightToEnemyUnitsInRange (enemyUnitsInRange) {
  // If an existing event listener is present, remove it
  removeHandleFightEventListeners()
  enemyUnitsInRange.forEach(enemyUnit => {
    // Attach a new event listener
    enemyUnit.fightEventListener = (event) => handleFight(event)
    enemyUnit.addEventListener('click', enemyUnit.fightEventListener)
  })
}

function removeHandleFightEventListeners () {
  const units = document.querySelectorAll('.unit-container')
  units.forEach(unit => {
    // Check if the named reference exists and remove it
    if (unit.fightEventListener) {
      unit.removeEventListener('click', unit.fightEventListener)
      unit.fightEventListener = null // Clear the reference
    }
  })
}

function addEventListenerToFactories () {
  factories.forEach(factory => factory.addEventListener('click', selectFactory))
}
addEventListenerToFactories()
