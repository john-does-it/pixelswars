const globalVariables = {
  currentPlayer: 1,
  round: 1 || Number(),
  selectedUnit: null,
  unitSelected: false,
  cellIndex: null || Number(),
  nextCell: null || Number(),
  nextCellContainer: null,
  costOfMovement: null || Number(),
  initialUnitCellIndex: null || Number(),
  selectedUnitName: null,
  selectedUnitResidualMovementRange: null || Number(),
  selectedUnitAttackRange: null || Number(),
  selectedUnitResidualAttackCapacity: null || Number(),
  selectedUnitCellIndex: null || Number(),
  playerOneMoney: 0 || Number(),
  playerTwoMoney: 0 || Number(),
  isFighting: false,
  buildingDatas: null,
  factory: null
}

export default globalVariables
