const cells = document.querySelectorAll('.cell-container')
const endRoundButton = document.getElementById('end-round')
const currentMoneyPlayerOneUIContainer = document.getElementById('current-money-player-one')
const currentMoneyPlayerTwoUIContainer = document.getElementById('current-money-player-two')
const dialogContainer = document.getElementById('dialog-container')
const dialogContent = document.getElementById('dialog-content')
const factoryContainer = document.getElementById('factory-container')
const factoriesButtons = factoryContainer.querySelectorAll('button[data-cost][data-type]')
const togglePlayerMusicButton = document.getElementById('toggle-player-music')
const showSmartphoneUI = document.getElementById('smartphone-ui')
const validMoveSmartphoneUI = document.getElementById('valid-move')
const cancelMoveSmartphoneUI = document.getElementById('cancel-move')
const captureBuildingSmartphoneUI = document.getElementById('capture-building')


const factories = document.querySelectorAll('.-factory')
const numberOfCols = getGridDimensions().cols
const numberOfRows = getGridDimensions().rows

const getDeviceType = () => {
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
    return 'smartphone'
  } else {
    return 'desktop'
  }
}

const currentDevice = getDeviceType()

let currentPlayer = 1
let currentRound = 1
let selectedUnit = null
let isSelectedUnit = false
let isFighting = false
let originalIndex
let originalMoveCapacity
let playerOneMoney = 0
let playerTwoMoney = 0
let buildingDatas
let factory
let allowPlayMusic = false

const eventListenersMap = new Map()
