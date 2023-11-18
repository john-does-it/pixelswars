import globalVariables from './globalVariables.mjs'
import { sounds } from './getSounds.mjs'
import { getBuildingData, getUnitData, getLandscapeData } from './getDatas.mjs'
import { preventCancelMove } from './handleNavigation.mjs'
import { logToConsoleContainer, logToUIFeedbackContainer } from './uiFeedback.mjs'

export function captureBuilding () {
  globalVariables.buildingDatas = getBuildingData(globalVariables.selectedUnit)

  if (getUnitData(globalVariables.selectedUnit).unitName.includes('infantry') && getLandscapeData(globalVariables.selectedUnit).landscapeType === 'building') {
    if (globalVariables.selectedUnit.dataset.capture_capacity === 0) {
      logToConsoleContainer('Unit hasn\'t the capture capacity.required')
      return
    }
    if (Number(globalVariables.buildingDatas.buildingCapturePoint) === 20 && Number(globalVariables.buildingDatas.buildingPlayerAppartenance) === getUnitData(globalVariables.selectedUnit).unitPlayer) {
      logToConsoleContainer('You already own this building.')
      return
    }
    logToConsoleContainer('This building can be captured by your unit. <span class="_color -green">press <span class="_text -bold">Spacebar</span> to capture</span> the building.')
    logToUIFeedbackContainer('<span class="_color -green">Press <span class="_text -bold">Spacebar</span> to capture</span> the building.')
    document.addEventListener('keypress', startCaptureBuilding)
  }
}

function startCaptureBuilding (event) {
  if (event.code === 'Space' && globalVariables.selectedUnit.dataset.capture_capacity > 0) {
    event.preventDefault()
    preventCancelMove(globalVariables.selectedUnit)
    const updatedCapturePoints = Number(globalVariables.buildingDatas.buildingCapturePoint) - 10
    globalVariables.buildingDatas.building.setAttribute('data-capture_points', updatedCapturePoints)
    if (updatedCapturePoints === 10) {
      sounds.jumpCapture.play()
      globalVariables.buildingDatas.building.classList.add('-halfcaptured')
    }
    if (updatedCapturePoints === 0) {
      sounds.trumpetFanfare.volume = 0.5
      sounds.trumpetFanfare.play()
      globalVariables.buildingDatas.building.classList.remove('-capturedby1', '-capturedby2', '-halfcaptured')
      globalVariables.buildingDatas.building.classList.add('-capturedby' + globalVariables.currentPlayer)
      globalVariables.buildingDatas.building.setAttribute('data-player', globalVariables.currentPlayer)
      globalVariables.buildingDatas.building.setAttribute('data-capture_points', 20)
    }
    globalVariables.selectedUnit.setAttribute('data-capture_capacity', 0)
  }

  document.removeEventListener('keypress', startCaptureBuilding)
}
