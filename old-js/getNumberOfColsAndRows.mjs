function getGridDimensions () {
  const style = getComputedStyle(document.getElementById('grid'))

  const rows = style.getPropertyValue('grid-template-rows').trim().split(' ').length
  const cols = style.getPropertyValue('grid-template-columns').trim().split(' ').length

  return { rows, cols }
}
getGridDimensions()

export const numberOfCols = getGridDimensions().cols
export const numberOfRows = getGridDimensions().rows
