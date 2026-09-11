// Ui: shared classic scripts; see js/README.md.

function updateCurrentPlayerUI() {
  const currentPlayerUI = document.getElementById('current-player-ui')
  const currentRoundContainer = document.getElementById('current-round')
  const currentPlayerMiniatures = currentPlayerUI.getElementsByTagName('img')

  currentRoundContainer.classList.add('glow')
  currentRoundContainer.innerText = currentRound

  for (let i = 0; i < currentPlayerMiniatures.length; i++) {
    currentPlayerMiniatures[i].classList.toggle('active')
  }

  setTimeout(() => {
    currentPlayerUI.classList.remove('glow')
    currentRoundContainer.classList.remove('glow')
  }, 3000)
}

function updateMoneyUI() {
  currentMoneyPlayerOneUIContainer.innerText = playerOneMoney
  currentMoneyPlayerTwoUIContainer.innerText = playerTwoMoney
  updateFactoryAvailability()
}

function createExplosion(cell) {
  const imgElement = document.createElement('img')
  sounds.bomb.volume = 0.5
  sounds.bomb.play()
  imgElement.src = 'assets/gifs/explosion.gif'
  imgElement.classList.add('explosion')
  cell.appendChild(imgElement)

  setTimeout(() => {
    imgElement.remove()
  }, 500) // Duration of the explosion GIF display
}

function updateUnitStatus(unit, statusType, add) {
  let statusElement = unit.querySelector(`.${statusType}`)
  if (add) {
    if (!statusElement) {
      statusElement = document.createElement('div')
      statusElement.classList.add('status')
      statusElement.classList.add(`${statusType}`)
      unit.appendChild(statusElement)
    }
  } else {
    if (statusElement) {
      statusElement.remove()
    }
  }
}

function updateHealthAnimation(unit) {
  const healthIcon = unit.querySelector('.health')

  if (!healthIcon) {
    return
  }

  const maxHealth = parseInt(unit.dataset.max_health, 10)
  const currentHealth = parseInt(unit.dataset.health, 10)
  let healthPercentage = (currentHealth / maxHealth) * 100

  // Ensure a minimum of 10%
  healthPercentage = Math.max(10, healthPercentage)

  // Calculate animation duration inversely proportional to health percentage
  // The lower the health, the faster the pulse
  const animationDuration = (healthPercentage / 100) * 2 // Adjust the multiplier (0.5 here) to control the speed

  // Update the animation duration
  healthIcon.style.animationDuration = `${animationDuration}s`
}

function toggleYouWinDialogContainer() {
  dialogContainer.show()
}

function youWinMessageInDialogContainer(winner) {
  const newMessage = document.createElement('p')
  newMessage.innerText = winner + ', congratulation you win!'
  dialogContent.appendChild(newMessage)
}

function statPreview() {
  const statsContainer = document.getElementById('stats-container')
  // Observe the displayed cell so damage, healing and unit removal stay in sync.
  let previewedCell = null
  const previewObserver = new MutationObserver(() => {
    if (previewedCell) showCellsStats(previewedCell)
  })

  function addHoverListeners() {
    cells.forEach((cell) => {
      cell.addEventListener('mouseenter', () => {
        previewObserver.disconnect()
        previewedCell = cell
        showCellsStats(cell)
        previewObserver.observe(cell, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: [
            'data-health', 'data-residual_attack_capacity', 'data-attack_range',
            'data-residual_move_capacity', 'data-attack_damage', 'data-defense',
            'data-defense_bonus', 'data-cost_of_movement'
          ]
        })
      })
    })
  }

  window.addEventListener('load', addHoverListeners) // Pass function reference

  function getBackgroundImage(element) {
    const style = window.getComputedStyle(element, null).getPropertyValue('background-image')
    return style.replace(/url\((['"])?(.*?)\1\)/gi, '$2')
  }

  function showCellsStats(cell) {
    let statsHTML = ''

    for (const child of cell.children) {
      if (child.classList.contains('unit-container')) {
        let unitBackground = getBackgroundImage(child)
        unitBackground = unitBackground.replace('.png', '-fit.png')

        statsHTML +=
          `
          <span class="miniature" style="background-image: url('${unitBackground}');"></span>` +
          '<span class="stat -health _flex -justifycenter -aligncenter" id="statpreview-health">' +
          child.dataset.health +
          '</span>' +
          '<span class="stat -attackcapacity _flex -justifycenter -aligncenter">' +
          child.dataset.residual_attack_capacity +
          '</span>' +
          '<span class="stat -attackrange _flex -justifycenter -aligncenter">' +
          child.dataset.attack_range +
          '</span>' +
          '<span class="stat -movement _flex -justifycenter -aligncenter">' +
          child.dataset.residual_move_capacity +
          '</span>' +
          '<span class="stat -attackdamage _flex -justifycenter -aligncenter">' +
          child.dataset.attack_damage +
          '</span>' +
          '<span class="stat -defense _flex -justifycenter -aligncenter">' +
          child.dataset.defense +
          '</span>'
      }
    }

    const cellBackground = getBackgroundImage(cell)

    statsHTML += `<span class="miniature" style="background-image: url('${cellBackground}');"></span>` + '<span class="stat -defense _flex -justifycenter -aligncenter">' + cell.dataset.defense_bonus + '</span>' + '<span class="stat -movement _flex -justifycenter -aligncenter">' + cell.dataset.cost_of_movement + '</span>'

    // Sanitize and set the HTML content
    // eslint-disable-next-line no-undef
    statsContainer.innerHTML = DOMPurify.sanitize(statsHTML)
  }
}
