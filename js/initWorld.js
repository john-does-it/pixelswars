import { cells } from './unitsAndCells.mjs'
import { logToConsoleContainer } from './uiFeedback.mjs'

function initWorld () {
  const landscape = [
    {
      selector: '.-grass',
      cost: 2,
      defense: 0
    },
    {
      selector: '.-crater',
      cost: 10,
      defense: 0
    },
    {
      selector: '.-moutain',
      cost: 5,
      defense: 40
    },
    {
      selector: '.-ruins.-ongrass',
      cost: 4,
      defense: 30
    },
    {
      selector: '.-sand',
      cost: 3,
      defense: 0
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
      selector: '.-bush.-ongrass',
      cost: 3,
      defense: 10
    }
  ]

  cells.forEach((cell, index) => {
    cell.setAttribute('data-index', index)
    const statsContainer = document.createElement('div')
    statsContainer.className = 'stats-container -cell _flex -row'
    cell.appendChild(statsContainer)
  })

  landscape.forEach((type) => {
    const elements = document.querySelectorAll(type.selector)

    elements.forEach((element) => {
      const statsContainer = element.querySelector('.stats-container.-cell')

      element.setAttribute('data-cost_of_movement', type.cost)
      const StatContainer = document.createElement('span')
      StatContainer.className = 'stat -costofmovement _flex -justifycenter -aligncenter _color -white'
      StatContainer.textContent = type.cost
      statsContainer.appendChild(StatContainer)

      element.setAttribute('data-defense_bonus', type.defense)
      const bonusDefense = document.createElement('span')
      bonusDefense.className = 'stat -bonusofdefense _flex -justifycenter -aligncenter _color -white'
      bonusDefense.textContent = type.defense
      statsContainer.appendChild(bonusDefense)
    })
  })
  logToConsoleContainer('...Map initialised...')
}
initWorld()
