export function capitalize (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isCellContainUnit (cell) {
  return cell.querySelector('.unit-container') !== null
}
