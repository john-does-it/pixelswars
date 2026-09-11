;(async () => {
  const results = []
  const output = parent.document.getElementById('results')
  const assert = (condition, message) => {
    if (!condition) throw Error(message)
    results.push('PASS: ' + message)
    output.textContent = results.join('\n')
  }
  const button = type => factoryContainer.querySelector(`button[data-type="${type}"]`)
  const status = type => button(type).closest('.factoryunit-container').querySelector('.factory-availability').textContent
  try {
    Object.values(sounds).forEach(sound => { sound.pause(); sound.play = () => Promise.resolve() })
    // The rectangular map has no factory terrain yet; use a disposable fixture.
    const site = factories[0] || cells[0]
    if (!factories.length) {
      site.classList.add('-factory')
      site.addEventListener('click', selectFactory)
    }
    site.querySelectorAll('.unit-container').forEach(unit => unit.remove())
    site.dataset.player = '1'
    currentPlayer = 1
    playerOneMoney = 0
    site.click()
    assert(Array.from(factoriesButtons).every(button => button.disabled) && status('infantry') === 'Need 200$ more', 'Zero budget disables all purchases and shows shortfall')
    playerOneMoney = 600
    updateMoneyUI()
    assert(!button('infantry').disabled && !button('jeep').disabled && button('tank').disabled && status('tank') === 'Need 600$ more', 'Exact price is affordable; expensive units show the correct shortfall')
    assert(button('jeep').closest('.factoryunit-container').classList.contains('-affordable') && button('tank').hasAttribute('aria-describedby'), 'Affordable units are highlighted and explanations are accessible')
    button('tank').click()
    assert(playerOneMoney === 600 && !site.querySelector('.unit-container'), 'Disabled purchase does not spend money or create a unit')
    button('jeep').click()
    assert(playerOneMoney === 0 && site.querySelector('.unit-container').dataset.type === 'jeep' && factory === null, 'Buying at exact price creates one unit and closes the factory')
    site.click()
    assert(Array.from(factoriesButtons).every(button => button.disabled) && factoryContainer.querySelector('.factory-budget').textContent.includes('occupied'), 'Occupied factory clearly blocks production')
    factoryContainer.querySelector('.-close').click()
    assert(factory === null && !factoryContainer.classList.contains('_flex'), 'Close button closes the factory without buying')
    site.querySelector('.unit-container').remove()
    site.dataset.player = '2'
    currentPlayer = 2
    playerTwoMoney = 1200
    site.click()
    assert(Array.from(factoriesButtons).every(button => !button.disabled) && factoryContainer.querySelector('.factory-budget').textContent.includes('Player 2'), 'Player two uses their own budget')
    button('tank').click()
    assert(playerTwoMoney === 0 && playerOneMoney === 0 && site.querySelector('.unit-container').dataset.player === '2', 'Player two purchase charges only player two')
    site.querySelector('.unit-container').remove()
    site.click()
    assert(status('tank') === 'Need 1200$ more' && button('tank').disabled, 'Reopening recalculates the remaining budget')
    factoryContainer.querySelector('.-close').click()
    site.dataset.player = '0'
    site.click()
    assert(factory === null, 'Neutral factory cannot be used')
    // Leave a representative panel visible for visual review.
    site.dataset.player = '2'
    playerTwoMoney = 600
    updateMoneyUI()
    site.click()
    output.textContent = results.join('\n') + '\nALL PASSED (' + results.length + ')'
  } catch (error) { output.textContent = results.join('\n') + '\nFAIL: ' + error.stack }
})()
