// Run in the real game's global scope, against disposable DOM fixtures.
;(async () => {
  const output = window.parent.document.getElementById('results')
  const results = []
  const runtimeErrors = []
  window.addEventListener('error', event => runtimeErrors.push(event.message))
  window.addEventListener('unhandledrejection', event => runtimeErrors.push(String(event.reason)))
  const assert = (condition, message) => {
    if (!condition) throw new Error(message)
    results.push('PASS: ' + message)
    output.textContent = results.join('\n')
  }
  const flush = () => new Promise(resolve => setTimeout(resolve, 0))
  const center = numberOfCols * 3 + 3
  const templates = { infantry: 'infantryUnitPlayer', jeep: 'jeepUnitPlayer', tank: 'tankPlayer', artillery: 'artilleryPlayer' }
  const spawn = (type, player, index, extra = {}) => {
    const fragment = document.createElement('template')
    fragment.innerHTML = unitsHTML[templates[type] + (player === 1 ? 'One' : 'Two')]
    const unit = fragment.content.firstElementChild
    Object.assign(unit.dataset, {sound_delay:'1'}, extra)
    cells[index].append(unit)
    return unit
  }
  const reset = () => {
    isFighting = false
    unselectUnit()
    document.querySelectorAll('.unit-container, .explosion').forEach(unit => unit.remove())
    cells.forEach(cell => { cell.dataset.defense_bonus = '0' })
    currentPlayer = 1
    dialogContainer.close()
    dialogContent.innerHTML = ''
    // Both players retain a unit to avoid incidental victory dialogs.
    spawn('infantry', 1, 0)
    spawn('infantry', 2, cells.length - 1)
  }
  const select = unit => unitClickHandler({currentTarget:unit})
  const fire = target => handleFight({currentTarget:target, target})
  const preview = cell => cell.dispatchEvent(new MouseEvent('mouseenter'))
  const shownHealth = () => document.getElementById('statpreview-health')?.textContent
  try {
    Object.values(sounds).forEach(sound => { sound.pause(); sound.play = () => Promise.resolve() })
    reset()
    let attacker = spawn('artillery', 1, center)
    let defender = spawn('tank', 2, center + 1)
    const diagonal = spawn('infantry', 2, center + numberOfCols + 1)
    select(attacker)
    assert(!cells[center + 1].classList.contains('-attackable') && !cells[center + numberOfCols + 1].classList.contains('-attackable'), 'Artillery has no adjacent or diagonal attack highlight')
    assert(!defender.classList.contains('-inrange') && !diagonal.classList.contains('-inrange'), 'Excluded targets have no crosshair')
    await fire(defender)
    assert(defender.dataset.health === '180' && attacker.dataset.residual_attack_capacity === '1', 'Invalid close shot changes neither health nor ammunition')
    cells[center + 2].append(defender)
    updateCellsAndUnitsState(center)
    assert(defender.classList.contains('-inrange'), 'Target at distance two is attackable')
    preview(cells[center + 2])
    await fire(defender)
    await flush()
    assert(defender.dataset.health === '79' && attacker.dataset.health === '120' && shownHealth() === '79', 'Artillery bonus vs tank applies and preview updates without retaliation')

    reset()
    attacker = spawn('infantry', 1, center)
    defender = spawn('artillery', 2, center + 1)
    select(attacker)
    await fire(defender)
    assert(defender.dataset.health === '64' && attacker.dataset.health === '100', 'Infantry bonus applies; adjacent artillery cannot retaliate')

    reset()
    attacker = spawn('jeep', 1, center)
    defender = spawn('tank', 2, center + 1)
    select(attacker)
    const fight = fire(defender)
    const originalSelection = selectedUnit
    handleCancelMove()
    unitClickHandler({currentTarget:cells[0].querySelector('.unit-container')})
    endRound()
    assert(isFighting && endRoundButton.disabled && selectedUnit === originalSelection && currentPlayer === 1, 'Actions stay locked during combat')
    await fight
    assert(defender.dataset.health === '151' && attacker.dataset.health === '0' && !attacker.isConnected, 'Jeep malus and tank retaliation bonus apply; killed attacker is removed')
    assert(!isFighting && !endRoundButton.disabled && selectedUnit === null, 'Combat unlocks and selection clears after attacker death')

    reset()
    attacker = spawn('tank', 1, center)
    defender = spawn('infantry', 2, center + 1, {type:'aircraft'})
    select(attacker)
    await fire(defender)
    assert(!defender.classList.contains('-inrange') && !cells[center + 1].classList.contains('-attackable') && defender.dataset.health === '100' && attacker.dataset.residual_attack_capacity === '2', 'Tank cannot target aircraft or spend ammunition on them')
    attacker.dataset.type = 'aircraft'
    defender.dataset.type = 'tank'
    defender.dataset.health = '500'
    defender.dataset.max_health = '500'
    await fire(defender)
    assert(defender.dataset.health === '376' && attacker.dataset.health === '180', 'Surviving tank cannot retaliate against an aircraft')

    reset()
    attacker = spawn('infantry', 1, center)
    defender = spawn('infantry', 2, center + 1)
    select(attacker)
    defender.querySelector('.health').dispatchEvent(new MouseEvent('click', {bubbles:true}))
    while (isFighting) await flush()
    assert(defender.dataset.health === '61' && attacker.dataset.health === '76' && attacker.dataset.residual_attack_capacity === '1', 'Real click listener applies one shot and a surviving neutral retaliation')
    cells[center + 3].append(defender)
    await fire(defender)
    assert(defender.dataset.health === '61' && attacker.dataset.residual_attack_capacity === '1', 'Stale target outside range cannot be attacked')
    await fire(cells[0].querySelector('.unit-container'))
    assert(attacker.dataset.residual_attack_capacity === '1', 'Friendly targets cannot consume a shot')

    reset()
    attacker = spawn('infantry', 1, center)
    defender = spawn('artillery', 2, center + 1, {health:'1'})
    select(attacker)
    preview(cells[center + 1])
    // Exercise a click originating on the health icon, not the unit itself.
    await handleFight({currentTarget:defender, target:defender.querySelector('.health')})
    await flush()
    assert(!defender.isConnected && shownHealth() === undefined, 'Child-icon clicks hit the unit; killed defender stats disappear')
    assert(runtimeErrors.length === 0, 'No game errors or unhandled rejections during combat tests: ' + runtimeErrors.join('; '))
    output.textContent = results.join('\n') + '\nALL PASSED (' + results.length + ')'
  } catch (error) {
    output.textContent = results.join('\n') + '\nFAIL: ' + error.stack
  }
})()
