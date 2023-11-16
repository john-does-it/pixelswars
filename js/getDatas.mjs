import globalVariables from './globalVariables.mjs'
import { cells } from './unitsAndCells.mjs'

export function getUnitData (unit) {
  if (unit) {
    const unitName = unit.dataset.name
    const unitMovementRange = Number(unit.dataset.movement_range)
    const unitResidualMovementCapacity = Number(unit.dataset.residual_move_capacity)
    const unitDefense = Number(unit.dataset.defense)
    const unitHealth = Number(unit.dataset.health)
    const unitAttackDamage = Number(unit.dataset.attack_damage)
    const unitAttackRange = Number(unit.dataset.attack_range)
    const unitExclusionAttackRange = Number(unit.dataset.exclusion_attack_range)
    const unitAttackCapacity = Number(unit.dataset.attack_capacity)
    const unitResidualAttackCapacity = Number(unit.dataset.residual_attack_capacity)
    const unitPlayer = Number(unit.dataset.player)
    const unitDatas = { unitName, unitMovementRange, unitDefense, unitHealth, unitAttackDamage, unitAttackRange, unitExclusionAttackRange, unitResidualMovementCapacity, unitAttackCapacity, unitResidualAttackCapacity, unitPlayer }
    return unitDatas
  }
}

export function getLandscapeData (unit) {
  const landscape = unit.parentElement
  const landscapeIndex = landscape.dataset.index
  const lansdcapeCostOfMovement = landscape.dataset.cost_of_movement
  const landscapeDefenseBonus = landscape.dataset.defense_bonus
  const landscapeType = landscape.dataset.type
  const landscapeDatas = { landscapeIndex, lansdcapeCostOfMovement, landscapeDefenseBonus, landscapeType }
  return landscapeDatas
}

export function getLandscapeIndexOfUnit (unit) {
  globalVariables.cellIndex = Number(getLandscapeData(unit).landscapeIndex)
  return globalVariables.cellIndex
}

export function getLandscapeDataForNextCell (nextCell) {
  const landscapeOnNextCell = cells[nextCell]
  globalVariables.costOfMovement = Number(landscapeOnNextCell.getAttribute('data-cost_of_movement'))
  return landscapeOnNextCell
}

export function getBuildingData (unit) {
  const building = unit.parentElement
  const buildingCapturePoint = building.dataset.capture_points
  const buildingPlayerAppartenance = building.dataset.player
  const buildingDatas = { building, buildingCapturePoint, buildingPlayerAppartenance }
  return buildingDatas
}
