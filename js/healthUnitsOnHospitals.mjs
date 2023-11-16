import { getUnitData } from './getDatas.mjs'

export function healthUnitOnHospital () {
  const units = document.querySelectorAll('.unit-container')

  units.forEach(unit => {
    const hospitalParent = unit.parentElement

    if (hospitalParent && hospitalParent.classList.contains('-hospital') && unit.getAttribute('data-player') === hospitalParent.getAttribute('data-player')) {
      let currentHealth = getUnitData(unit).unitHealth

      if (currentHealth < 75) {
        currentHealth = Number(currentHealth) + 25
        unit.setAttribute('data-health', currentHealth)
        const healthCapacityContainer = unit.querySelector('.-health')
        healthCapacityContainer.innerHTML = currentHealth
      } else if (currentHealth >= 75 && currentHealth < 100) {
        currentHealth = 100
        unit.setAttribute('data-health', currentHealth)
        const healthCapacityContainer = unit.querySelector('.-health')
        healthCapacityContainer.innerHTML = currentHealth
      }
    }
  })
}
