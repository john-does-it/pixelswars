const sounds = {
  cinematicMetal: document.getElementById('cinematic-metal'),
  infantry: document.getElementById('infantry'),
  infantry2: document.getElementById('infantry-2'),
  infantry3: document.getElementById('infantry-3'),
  jeepEngine: document.getElementById('jeep-engine'),
  tankEngine: document.getElementById('tank-engine'),
  artilleryTouret: document.getElementById('artillery-touret'),
  gunBattle: document.getElementById('gun-battle'),
  emptyGunShot: document.getElementById('empty-gun-shot'),
  tankShot: document.getElementById('tank-shot'),
  trumpetFanfare: document.getElementById('trumpet-fanfare'),
  bomb: document.getElementById('bomb'),
  missileLaunch: document.getElementById('missile-launch'),
  jumpCapture: document.getElementById('jump-capture'),
  wooshMovement: document.getElementById('woosh-movement'),
  militaryMarch: document.getElementById('military-march'),
  mechanicBuilding: document.getElementById('mechanic-building'),
  nextRound: document.getElementById('next-round'),
  cashMachine: document.getElementById('cash-machine'),
  playerOneMusic: document.getElementById('player-one-music'),
  playerTwoMusic: document.getElementById('player-two-music')
}

const infantrySounds = [sounds.infantry, sounds.infantry2, sounds.infantry3]

// Audio: shared classic scripts; see js/README.md.

function playSound(sound) {
  if (sound) {
    sound.volume = 0.5
    sound.currentTime = 0
    sound.play()
  }
}

function playSelectSound(unitType) {
  let randomInfantrySound

  switch (unitType) {
    case 'infantry':
      randomInfantrySound = infantrySounds[Math.floor(Math.random() * infantrySounds.length)]
      playSound(randomInfantrySound)
      break
    case 'jeep':
      playSound(sounds.jeepEngine)
      break
    case 'artillery':
      playSound(sounds.artilleryTouret)
      break
    case 'tank':
      playSound(sounds.tankEngine)
      break
    default:
      break
  }
}

function playFightSound(unitType) {
  switch (unitType) {
    case 'infantry':
      playSound(sounds.gunBattle)
      break
    case 'jeep':
      playSound(sounds.gunBattle)
      break
    case 'artillery':
      playSound(sounds.missileLaunch)
      break
    case 'tank':
      playSound(sounds.tankShot)
      break
    default:
      break
  }
}

function playMusic() {
  allowPlayMusic = !allowPlayMusic // Toggle music play state

  if (allowPlayMusic) {
    // Set volume and pause both tracks to reset their state
    sounds.playerOneMusic.volume = 0.25
    sounds.playerTwoMusic.volume = 0.25
    sounds.playerOneMusic.pause()
    sounds.playerTwoMusic.pause()

    // Play music for the current player
    const currentMusic = currentPlayer === 1 ? sounds.playerOneMusic : sounds.playerTwoMusic
    currentMusic.load()
    currentMusic.play()
    togglePlayerMusicButton.innerHTML = '<img src="./assets/icons/icon-play-sound.png" alt="icon play / mute sound" width="16" height="16">'
  } else {
    // Pause both music tracks
    sounds.playerOneMusic.pause()
    sounds.playerTwoMusic.pause()
    togglePlayerMusicButton.innerHTML = '<img src="./assets/icons/icon-mute-sound.png" alt="icon play / mute sound" width="16" height="16">'
  }
}

function controlMusicForCurrentPlayer() {
  // Load and play music for the current player, pause for the other
  const playerMusic = currentPlayer === 1 ? sounds.playerOneMusic : sounds.playerTwoMusic
  const otherMusic = currentPlayer === 1 ? sounds.playerTwoMusic : sounds.playerOneMusic

  playerMusic.volume = 0.125
  playerMusic.load()
  playerMusic.play()
  otherMusic.pause()
}
