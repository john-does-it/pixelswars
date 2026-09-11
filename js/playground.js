// Bootstrap: load last, after all game scripts and the board markup.
adjustGridSize()
initWorld()
selectUnit()
statPreview()
updateMoneyUI()

Object.values(sounds).forEach((sound) => {
  if (sound && sound.load) {
    sound.load()
  }
})

captureBuildingSmartphoneUI.disabled = true
factoryContainer.querySelector('.-close').addEventListener('click', unselectFactory)
factoriesButtons.forEach(button => button.addEventListener('click', buyUnit))
validMoveSmartphoneUI.addEventListener('click', unselectUnit)
cancelMoveSmartphoneUI.addEventListener('click', handleCancelMove)
togglePlayerMusicButton.addEventListener('click', playMusic)
endRoundButton.addEventListener('click', endRound)
window.addEventListener('resize', adjustGridSize)

window.addEventListener('keydown', (event) => {
  if (isSelectedUnit && currentDevice === 'desktop') {
    keyboardBindWhileSelectedUnit(event, selectedUnit)
  }
})

addEventListenerToFactories()
