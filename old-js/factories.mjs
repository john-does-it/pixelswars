import globalVariables from './globalVariables.mjs'
import unitsHTML from './unitsHTML.mjs'
import { logToConsoleContainer, updateMoneyUI } from './uiFeedback.mjs'
import { sounds } from './getSounds.mjs'
import { selectUnit } from './unitSelection.mjs'

const factoryContainer = document.getElementById('factory-container')
const factoriesButtons = factoryContainer.querySelectorAll('button')

export function unselectFactory () {
  globalVariables.factory = null
  factoryContainer.classList.remove('_flex')
  factoryContainer.classList.remove('-column')
}

export function selectFactory (event) {
  // if a unit isn't on the factory, allow player to buy a unit
  if (Number(event.target.dataset.player) === globalVariables.currentPlayer && event.target.classList.contains('-factory')) {
    globalVariables.factory = event.target
    console.log(globalVariables.factory, typeof globalVariables.factory)
    factoryContainer.classList.toggle('_flex')
    factoryContainer.classList.toggle('-column')
    factoriesButtons.forEach(button => button.addEventListener('click', buyUnit))
  }
}

export function buyUnit (event) {
  if (!Array.from(globalVariables.factory.children).some(child => child.classList.contains('unit-container'))) {
    const unitType = event.target.dataset.type
    const unitCost = Number(event.target.dataset.cost)
    const currentPlayerMoney = (globalVariables.currentPlayer === 1) ? globalVariables.playerOneMoney : globalVariables.playerTwoMoney

    if (unitCost > currentPlayerMoney) {
      logToConsoleContainer('<span class="_color -red">You can\'t afford that unit.</span>')
      return
    }

    if (unitType === 'infantry') {
      sounds.militaryMarch.play()
    }

    if (unitType === 'jeep') {
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
      }
    }

    if (unitMapping[unitType]) {
      const newUnitHTML = unitMapping[unitType][globalVariables.currentPlayer]
      createAndAddUnit(newUnitHTML)

      if (globalVariables.currentPlayer === 1) {
        globalVariables.playerOneMoney -= unitCost
      } else {
        globalVariables.playerTwoMoney -= unitCost
      }
      updateMoneyUI()
    }
    factoryContainer.classList.toggle('_flex')
    factoryContainer.classList.toggle('-column')
  } else {
    logToConsoleContainer('<span class="_color -red">You can\'t create a new unit if there is already a unit on the factory</span>')
    unselectFactory()
  }
}

function createAndAddUnit (unitHTML) {
  const newUnitElement = document.createElement('div')
  newUnitElement.innerHTML = unitHTML

  globalVariables.factory.appendChild(newUnitElement)
  const toReplaceBy = newUnitElement.querySelector('.unit-container')
  newUnitElement.replaceWith(toReplaceBy)

  const updatedNewUnitElement = globalVariables.factory.querySelector('.unit-container')
  updatedNewUnitElement.addEventListener('click', selectUnit)
}
