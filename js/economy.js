// Economy: shared classic scripts; see js/README.md.

function unselectFactory() {
  factory = null
  factoryContainer.classList.remove('_flex')
  factoryContainer.classList.remove('-column')
}

function selectFactory(event) {
  if (isFighting) return
  if (Number(event.target.dataset.player) === currentPlayer && event.target.classList.contains('-factory')) {
    if (factory === event.target) {
      unselectFactory()
      return
    }
    factory = event.target
    updateFactoryAvailability()
    factoryContainer.classList.add('_flex', '-column')
  }
}

function updateFactoryAvailability() {
  if (!factory) return
  const money = currentPlayer === 1 ? playerOneMoney : playerTwoMoney
  const occupied = isCellContainUnit(factory)
  let budget = factoryContainer.querySelector('.factory-budget')
  if (!budget) {
    budget = document.createElement('p')
    budget.className = 'factory-budget _color -white'
    budget.setAttribute('role', 'status')
    factoryContainer.firstElementChild.after(budget)
  }
  budget.textContent = `Player ${currentPlayer} · Available: ${money}$${occupied ? ' · Factory occupied' : ''}`

  factoriesButtons.forEach(button => {
    const missing = Math.max(0, Number(button.dataset.cost) - money)
    const available = missing === 0 && !occupied && Number(factory.dataset.player) === currentPlayer
    const row = button.closest('.factoryunit-container')
    let status = row.querySelector('.factory-availability')
    if (!status) {
      status = document.createElement('span')
      status.className = 'factory-availability'
      status.id = `factory-availability-${button.dataset.type}`
      row.append(status)
      button.setAttribute('aria-describedby', status.id)
    }
    button.disabled = !available
    row.classList.toggle('-affordable', available)
    row.classList.toggle('-unavailable', !available)
    status.textContent = occupied ? 'Free this factory to build a unit' : missing > 0 ? `Need ${missing}$ more` : 'Available'
  })
}

function buyUnit(event) {
  if (isFighting || !factory || Number(factory.dataset.player) !== currentPlayer) return
  if (!Array.from(factory.children).some((child) => child.classList.contains('unit-container'))) {
    const button = event.currentTarget
    const unitType = button.dataset.type
    const unitCost = Number(button.dataset.cost)
    const currentPlayerMoney = currentPlayer === 1 ? playerOneMoney : playerTwoMoney

    if (unitCost > currentPlayerMoney) {
      updateFactoryAvailability()
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

    unselectFactory()
  } else {
    unselectFactory()
  }
}

function createAndAddUnit(unitHTML) {
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

function captureBuilding() {
  document.addEventListener('keypress', startCaptureBuilding)
}

function startCaptureBuilding(event) {
  event.preventDefault()

  if (selectedUnit && selectedUnit.dataset.capture_capacity && selectedUnit.dataset.capture_capacity > 0) {
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

  captureBuildingSmartphoneUI.disabled = true
  document.removeEventListener('keypress', startCaptureBuilding)
}

function healthUnitOnHospital() {
  const units = document.querySelectorAll('.unit-container')

  units.forEach((unit) => {
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

function distributeMoney() {
  const buildings = document.querySelectorAll('.-building')

  buildings.forEach((building) => {
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

    function highlightMoneyMakeFromCity(building) {
      building.classList.add('-active')
      setTimeout(() => {
        building.classList.remove('-active')
      }, 5000)
    }
  })
}

function addEventListenerToFactories() {
  factories.forEach((factory) => factory.addEventListener('click', selectFactory))
}
