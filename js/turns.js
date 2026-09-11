// Turns: shared classic scripts; see js/README.md.

function endRound() {
  if (isFighting) return
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

function resetUnitStatuses() {
  const units = document.querySelectorAll('.unit-container')
  units.forEach((unit) => {
    updateUnitStatus(unit, '-outofammo', false)
    updateUnitStatus(unit, '-outofmovement', false)
    updateUnitStatus(unit, '-outofcapture', false)
  })
}

function determinePlayer() {
  if (currentRound === 1 || currentRound % 2 === 1) {
    currentPlayer = 1
  } else if (currentRound % 2 !== 1) {
    currentPlayer = 2
  }

  if (allowPlayMusic) {
    controlMusicForCurrentPlayer()
  }
}

function resetUnitsResidualMoveCapacity() {
  const units = document.querySelectorAll('.unit-container')

  units.forEach((unit) => {
    unit.setAttribute('data-residual_move_capacity', unit.dataset.movement_range)
  })
}

function resetResidualCaptureCapacityOnUnits() {
  const updatedUnits = document.querySelectorAll('.unit-container')

  updatedUnits.forEach((unit) => {
    if (unit.dataset.capture_capacity === '0') {
      unit.setAttribute('data-capture_capacity', 1)
    }
  })
}

function resetUnitsResidualAttackCapacity() {
  const units = document.querySelectorAll('.unit-container')

  units.forEach((unit) => {
    unit.setAttribute('data-residual_attack_capacity', unit.dataset.attack_capacity)
  })
}
