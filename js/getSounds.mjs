import { playSoundButton } from './getButtons.mjs'

export const sounds = {
  cinematicMetal: document.getElementById('cinematic-metal'),
  shortMeow: document.getElementById('short-meow'),
  shortMeow2: document.getElementById('short-meow-2'),
  shortMeow3: document.getElementById('short-meow-3'),
  jeepEngine: document.getElementById('jeep-engine'),
  gunBattle: document.getElementById('gun-battle'),
  trumpetFanfare: document.getElementById('trumpet-fanfare'),
  bomb: document.getElementById('bomb'),
  missileLaunch: document.getElementById('missile-launch'),
  jumpCapture: document.getElementById('jump-capture'),
  wooshMovement: document.getElementById('woosh-movement'),
  militaryMarch: document.getElementById('military-march'),
  mechanicBuilding: document.getElementById('mechanic-building'),
  nextRound: document.getElementById('next-round'),
  cashMachine: document.getElementById('cash-machine')
}

export function playBattleSound (unit) {
  if (unit.dataset.type === 'infantry' || unit.dataset.type === 'jeep') {
    sounds.gunBattle.load()
    sounds.gunBattle.volume = 0.25
    sounds.gunBattle.play()
  }

  if (unit.dataset.type === 'artillery') {
    sounds.missileLaunch.volume = 0.25
    sounds.missileLaunch.play()
    const duration = sounds.missileLaunch.duration

    setTimeout(() => {
      sounds.bomb.volume = 0.5
      sounds.bomb.play()
    }, duration * 1000)
  }
}

export function getSoundDelay (unit) {
  return Number(unit.dataset.sound_delay)
}

playSoundButton.addEventListener('click', function () {
  if (sounds.cinematicMetal.paused) {
    const playSymbol = '🔈'
    playSoundButton.innerHTML = `${playSymbol}`
    sounds.cinematicMetal.volume = 0.125
    sounds.cinematicMetal.play()
  } else {
    const pauseSymbol = '🔇'
    playSoundButton.innerHTML = `${pauseSymbol}`
    sounds.cinematicMetal.pause()
  }
})
