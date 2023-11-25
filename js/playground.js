// Initialization and Configuration
const cells = document.querySelectorAll('.cell-container')
const endRoundButton = document.getElementById('end-round')
const uiFeedbackContainer = document.getElementById('uifeedback-container')
const currentMoneyPlayerOneUIContainer = document.getElementById('current-money-player-one')
const currentMoneyPlayerTwoUIContainer = document.getElementById('current-money-player-two')
const numberOfCols = getGridDimensions().cols
const numberOfRows = getGridDimensions().rows

let currentPlayer = 1
let currentRound = 1
let selectedUnit = null
let isSelectedUnit = false
let isFighting = false
let originalIndex
let originalMoveCapacity
let playerOneMoney = 0
let playerTwoMoney = 0

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

// Utility functions
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
    const unitContainer = cell.querySelector('.unit-container')

    if (unitContainer && Number(unitContainer.dataset.player) !== currentPlayer) {
      enemyUnitsInRange.push(unitContainer)
    }
  })

  return enemyUnitsInRange
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

  function unitClickHandler (event) {
    const tryToSelectUnit = event.currentTarget

    if (!isSelectedUnit && Number(tryToSelectUnit.dataset.player) === currentPlayer) {
      uiFeedbackContainer.innerHTML = '<p>🪖 Unit selected, use arrows or ZQSD to move the unit. Press Enter to valid your move or espace to cancel.</p>'
      selectedUnit = tryToSelectUnit
      playSelectSound(selectedUnit.dataset.type)
      isSelectedUnit = true
      originalIndex = Number(tryToSelectUnit.parentElement.dataset.index)
      originalMoveCapacity = Number(selectedUnit.dataset.residual_move_capacity)
      highlightReachableCells(originalIndex)
      removeInRangeFromUnits()
      addInRangeToEnemyUnits(originalIndex)
      const enemyUnitsInRange = addInRangeToEnemyUnits(originalIndex)
      addEventListenerHandleFightToEnemyUnitsInRange(enemyUnitsInRange)
    }
  }
}

function unselectUnit () {
  selectedUnit = null
  isSelectedUnit = false
  removeReachableFromCells()
  removeAttackableFromCells()
  removeInRangeFromUnits()
  removeHandleFightEventListeners()
}

function keyboardBindWhileSelectedUnit (event, selectedUnit) {
  const updatedIndex = Number(selectedUnit.parentElement.dataset.index)
  const unitMoveCapacity = calculateUnitMoveCapacity(selectedUnit)

  switch (event.key) {
    case ' ':
      handleSpacePress(selectedUnit)
      break
    case 'ArrowLeft':
    case 'q':
      handleDirectionalMove(updatedIndex - 1, unitMoveCapacity, selectedUnit, 'left')
      break
    case 'ArrowRight':
    case 'd':
      handleDirectionalMove(updatedIndex + 1, unitMoveCapacity, selectedUnit, 'right')
      break
    case 'ArrowUp':
    case 'z':
      handleDirectionalMove(updatedIndex - numberOfCols, unitMoveCapacity, selectedUnit, 'up')
      break
    case 'ArrowDown':
    case 's':
      handleDirectionalMove(updatedIndex + numberOfCols, unitMoveCapacity, selectedUnit, 'down')
      break
    case 'Enter':
      console.log('press Enter')
      unselectUnit()
      break
    case 'Escape':
      console.log('press Escape')
      handleCancelMove()
      break
  }

  function handleSpacePress (selectedUnit) {
    console.log('press Space')
    captureBuilding()
  }

  function handleCancelMove () {
    const originalCell = cells[originalIndex]
    originalCell.appendChild(selectedUnit)
    resetUnitResidualMoveCapacity(originalMoveCapacity)
    if (resetUnitResidualMoveCapacity(originalMoveCapacity) !== 0) {
      selectedUnit.classList.remove('-outofmovement')
    }
    unselectUnit()
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
    selectedUnit.classList.add('-outofmovement')
  }
  removeInRangeFromUnits()
  const enemyUnitsInRange = addInRangeToEnemyUnits(index)
  addEventListenerHandleFightToEnemyUnitsInRange(enemyUnitsInRange)
}

function updateUnitResidualMoveCapacity (unitMoveCapacity, costOfMovement) {
  const residualMoveCapacity = unitMoveCapacity - costOfMovement
  selectedUnit.setAttribute('data-residual_move_capacity', residualMoveCapacity)

  // if (residualMoveCapacity === 0) {
  //   selectedUnit.classList.add('-outofmovement')
  // }
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

  // Highlight left cell if it's within the grid and reachable
  if (cellIndex % numberOfCols !== 0 && unitMoveCapacity >= Number(cells[cellIndex - 1].dataset.cost_of_movement)) {
    const leftCell = cells[cellIndex - 1]
    leftCell.classList.add('-reachable')
    reachableCells.push(leftCell)
  }

  // Highlight right cell if it's within the grid and reachable
  if ((cellIndex + 1) % numberOfCols !== 0 && unitMoveCapacity >= Number(cells[cellIndex + 1].dataset.cost_of_movement)) {
    const rightCell = cells[cellIndex + 1]
    rightCell.classList.add('-reachable')
    reachableCells.push(rightCell)
  }

  // Highlight top cell if it's within the grid and reachable
  if (cellIndex - numberOfCols >= 0 && unitMoveCapacity >= Number(cells[cellIndex - numberOfCols].dataset.cost_of_movement)) {
    const topCell = cells[cellIndex - numberOfCols]
    topCell.classList.add('-reachable')
    reachableCells.push(topCell)
  }

  // Highlight bottom cell if it's within the grid and reachable
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

function removeOutOfAmmoFromUnits () {
  const units = document.querySelectorAll('.unit-container')

  units.forEach(unit => {
    unit.classList.remove('-outofammo')
  })
}

function removeOutOfMovementFromUnits () {
  const units = document.querySelectorAll('.unit-container')

  units.forEach(unit => {
    unit.classList.remove('-outofmovement')
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

    // Check if an element with class 'loremipsum' already exists in uiFeedbackContainer
    if (!uiFeedbackContainer.querySelector('.inrangemessage')) {
      const messageElement = document.createElement('p')
      messageElement.classList.add('inrangemessage')
      messageElement.innerHTML = '🎯 ' + counter + ' enemy unit(s) in range, click on an enemy unit to attack.'

      // Append the new paragraph element to the uiFeedbackContainer
      uiFeedbackContainer.appendChild(messageElement)
    }

    // Check if an element with class 'loremipsum' already exists in uiFeedbackContainer
    if (uiFeedbackContainer.querySelector('.inrangemessage')) {
      // Create a new paragraph element
      const inRangeMessage = uiFeedbackContainer.querySelector('.inrangemessage')
      inRangeMessage.remove()
      const messageElement = document.createElement('p')
      messageElement.classList.add('inrangemessage')
      messageElement.innerHTML = '🎯 ' + counter + ' enemy unit(s) in range, click on an enemy unit to attack.'

      // Append the new paragraph element to the uiFeedbackContainer
      uiFeedbackContainer.appendChild(messageElement)
    }

    if (counter === 0) {
      const inRangeMessages = document.querySelectorAll('.inrangemessage')
      inRangeMessages.forEach(inRangeMessage => {
        inRangeMessage.remove()
      })
    }
  }

  return enemyUnits
}

function calculateDamage (attackerDamage, attackerHealth, defenderDefense, defenderHealth, defenderLandscapeDefenseBonus) {
  const damage = (attackerDamage - (((defenderDefense + defenderLandscapeDefenseBonus) - 10) / 100) + ((attackerDamage * (attackerHealth / 400))))
  return damage
}

function handleFight (event) {
  if (selectedUnit === null || isFighting) {
    return
  }

  if (Number(selectedUnit.dataset.residual_attack_capacity) === 0) {
    playSound(sounds.emptyGunShot)
    uiFeedbackContainer.innerHTML = '<p>❌ You are out of ammo</p>'
    return
  }

  originalIndex = Number(getLandscapeData(selectedUnit).landscapeIndex) // prevent move cancellation
  isFighting = true
  playFightSound(selectedUnit.dataset.name)

  // New damage calculation
  const damage = calculateDamage(selectedUnit.dataset.attack_damage, selectedUnit.dataset.health, event.target.dataset.defense, event.target.dataset.health, getLandscapeData(event.target).landscapeDefenseBonus)
  event.target.setAttribute('data-health', Math.round(Number(event.target.dataset.health) - damage))
  selectedUnit.setAttribute('data-residual_attack_capacity', Number(selectedUnit.dataset.residual_attack_capacity) - 1)
  uiFeedbackContainer.innerHTML = `<p>💥 ${Math.round(damage)} damages inflicted to the enemy unit.</p>`

  if (Number(selectedUnit.dataset.residual_attack_capacity) === 0) {
    selectedUnit.classList.add('-outofammo')
  }

  // Calculate the array of adjacent cells for the enemy unit
  const enemyAttackRangeCells = returnAdjacentCells(
    Number(getLandscapeData(event.target).landscapeIndex),
    Number(event.target.dataset.attack_range)
  )

  // Check if selectedUnit is within the enemy's attack range
  if (Number(event.target.dataset.health) > 0 && enemyAttackRangeCells.includes(Number(getLandscapeData(selectedUnit).landscapeIndex))) {
    const returnDamage = calculateDamage(event.target.dataset.attack_damage, event.target.dataset.health, selectedUnit.dataset.defense, selectedUnit.dataset.health, getLandscapeData(selectedUnit).landscapeDefenseBonus)
    selectedUnit.setAttribute('data-health', Math.max(0, Math.round(selectedUnit.dataset.health - returnDamage)))
    uiFeedbackContainer.innerHTML += `<p>🔄 Enemy unit has riposted and inflicted ${Math.round(returnDamage)} damage in return.</p>`
  }

  if (Number(event.target.dataset.health) <= 0) {
    uiFeedbackContainer.innerHTML = '<p>☠️ Enemy destroyed!</p>'
    event.target.remove()
    addInRangeToEnemyUnits(Number(getLandscapeData(selectedUnit).landscapeIndex))
  }

  // If selected unit is dead
  if (Number(selectedUnit.dataset.health) <= 0) {
    const previouslySelectedUnit = selectedUnit
    previouslySelectedUnit.remove()
    unselectUnit()
    isFighting = false

    return
  }

  const healthStatPreview = document.getElementById('statpreview-health')
  healthStatPreview.innerHTML = Number(event.target.dataset.health)
  updateCellsAndUnitsState(Number(getLandscapeData(selectedUnit).landscapeIndex))

  isFighting = false
}

let buildingDatas

function captureBuilding () {
  buildingDatas = getBuildingData(selectedUnit)

  if (selectedUnit.dataset.name.includes('infantry') && getLandscapeData(selectedUnit).landscapeType === 'building') {
    if (Number(selectedUnit.dataset.capture_capacity) === 0) {
      console.log('Unit hasn\'t the capture capacity.required')
    } else if (Number(buildingDatas.buildingCapturePoint) === 20 && Number(buildingDatas.buildingPlayerAppartenance) === Number(selectedUnit.dataset.player)) {
      console.log('You already own this building.')
    } else {
      document.addEventListener('keypress', startCaptureBuilding)
    }
  }
}

function startCaptureBuilding (event) {
  if (event.code === 'Space' && selectedUnit.dataset.capture_capacity > 0) {
    event.preventDefault()
    originalIndex = getLandscapeData(selectedUnit).index
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
  }

  document.removeEventListener('keypress', startCaptureBuilding)
}

function endRound () {
  currentRound++
  unselectUnit()
  distributeMoney()
  determinePlayer()
  updateCurrentPlayerUI()
  resetUnitsResidualMoveCapacity()
  resetUnitsResidualAttackCapacity()
  resetResidualCaptureCapacityOnUnits()
  removeOutOfAmmoFromUnits()
  removeOutOfMovementFromUnits()
  playSound(sounds.nextRound)

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

  function distributeMoney () {
    const buildings = document.querySelectorAll('.-building')

    buildings.forEach(building => {
      if (building.classList.contains('-city') && building.dataset.player !== '0') {
        if (building.dataset.player === '1' && currentPlayer === 2) {
          playerOneMoney = playerOneMoney + 200
          sounds.cashMachine.play()
          highlightMoneyMakeFromCity(building)
        } else if (building.dataset.player === '2' && currentPlayer === 1) {
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

      function updateMoneyUI () {
        currentMoneyPlayerOneUIContainer.innerText = playerOneMoney
        currentMoneyPlayerTwoUIContainer.innerText = playerTwoMoney
      }
      updateMoneyUI()
    })
  }
}

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

// UI Management
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

    statsHTML += `<span class="miniature" style="background-image: url('${cellBackground}'); background-size: contain; width: 25px; height: 25px; display: block;"></span>` + '<span class="stat -defense _flex -justifycenter -aligncenter">' + cell.dataset.defense_bonus + '</span>' + '<span class="stat -movement _flex -justifycenter -aligncenter">' + cell.dataset.cost_of_movement + '</span>'

    statsContainer.innerHTML = statsHTML
  }
}

// Event Listeners and Handlers
endRoundButton.addEventListener('click', endRound)
// Single event listener for keyboard actions
window.addEventListener('keydown', (event) => {
  if (isSelectedUnit) {
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
