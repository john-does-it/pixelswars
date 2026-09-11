// World: shared classic scripts; see js/README.md.

function calculateCellSize() {
  const gridAspectRatio = numberOfCols / numberOfRows
  const windowAspectRatio = window.innerWidth / window.innerHeight

  let cellSize

  if (windowAspectRatio > gridAspectRatio) {
    cellSize = window.innerHeight / (numberOfRows + 4)
  } else {
    cellSize = window.innerWidth / (numberOfCols + 1)
  }

  return cellSize
}

function adjustGridSize() {
  const cellSize = calculateCellSize()

  cells.forEach((cell) => {
    cell.style.width = `${cellSize}px`
    cell.style.height = `${cellSize}px` // Keeping cells square
  })
}

function initWorld() {
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

function getGridDimensions() {
  const style = getComputedStyle(document.getElementById('grid'))

  const rows = style.getPropertyValue('grid-template-rows').trim().split(' ').length
  const cols = style.getPropertyValue('grid-template-columns').trim().split(' ').length

  return { rows, cols }
}

function isCellContainUnit(cell) {
  return cell.querySelector('.unit-container') !== null
}

function getLandscapeData(unit) {
  const landscape = unit.parentElement
  const landscapeIndex = landscape.dataset.index
  const landcapeCostOfMovement = landscape.dataset.cost_of_movement
  const landscapeDefenseBonus = landscape.dataset.defense_bonus
  const landscapeType = landscape.dataset.type
  const landscapeDatas = { landscapeIndex, landcapeCostOfMovement, landscapeDefenseBonus, landscapeType }
  return landscapeDatas
}

function getBuildingData(unit) {
  const building = unit.parentElement
  const buildingCapturePoint = building.dataset.capture_points
  const buildingPlayerAppartenance = building.dataset.player
  const buildingDatas = { building, buildingCapturePoint, buildingPlayerAppartenance }
  return buildingDatas
}
