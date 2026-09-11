// Selection: shared classic scripts; see js/README.md.

function selectUnit() {
  unselectUnit() // Unselect any previously selected unit

  const playableUnits = document.querySelectorAll('.unit-container')

  playableUnits.forEach((element) => {
    element.addEventListener('click', unitClickHandler)
  })
}

function unitClickHandler(event) {
  if (isFighting) return
  const tryToSelectUnit = event.currentTarget

  if (Number(tryToSelectUnit.dataset.player) !== currentPlayer) {
    return
  }

  // Now handling the specific case where the selected unit is not the currently selected one.
  if (tryToSelectUnit !== selectedUnit) {
    unselectUnit()
  }

  isSelectedUnit = true
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
    smartphoneBindWhileSelectedUnit(selectedUnit)
  }
}

function unselectUnit() {
  if (isFighting) return
  selectedUnit = null
  isSelectedUnit = false
  showSmartphoneUI.classList.remove('-active')
  removeReachableFromCells()
  removeAttackableFromCells()
  removeInRangeFromUnits()
  removeHandleFightEventListeners()
}

function attachCaptureBuildingEventListenerIfCapturable() {
  buildingDatas = getBuildingData(selectedUnit)
  captureBuildingSmartphoneUI.disabled = true

  if (selectedUnit.dataset.name.includes('infantry') && getLandscapeData(selectedUnit).landscapeType === 'building') {
    if (currentDevice === 'smartphone') {
      captureBuildingSmartphoneUI.disabled = false
      captureBuildingSmartphoneUI.addEventListener('click', startCaptureBuilding)
    }
    if (Number(selectedUnit.dataset.capture_capacity) === 0 || (Number(buildingDatas.buildingCapturePoint) === 20 && Number(buildingDatas.buildingPlayerAppartenance) === Number(selectedUnit.dataset.player))) {
      captureBuildingSmartphoneUI.disabled = true
    } else if (Number(selectedUnit.dataset.capture_capacity) === 0 && Number(buildingDatas.buildingPlayerAppartenance) !== Number(selectedUnit.dataset.player)) {
      captureBuildingSmartphoneUI.disabled = true
    } else {
      document.addEventListener('keypress', startCaptureBuilding)
    }
  }
}
