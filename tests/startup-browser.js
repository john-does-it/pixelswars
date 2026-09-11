// Exercise bootstrap bindings through real DOM events in a disposable board.
;(() => {
  const output = parent.document.getElementById('results')
  const results = []
  const assert = (condition, label) => {
    if (!condition) throw new Error(label)
    results.push('PASS: ' + label)
  }
  try {
    HTMLMediaElement.prototype.play = () => Promise.resolve()
    assert(cells.length === numberOfRows * numberOfCols &&
      [...cells].every((cell, index) => Number(cell.dataset.index) === index &&
        Number(cell.dataset.cost_of_movement) > 0 && parseFloat(cell.style.width) > 0),
    'Startup initializes dimensions, terrain and cell sizes')
    const unit = document.querySelector('.unit-container[data-player="1"]')
    const start = unit.parentElement
    const capacity = unit.dataset.residual_move_capacity
    unit.click()
    assert(selectedUnit === unit && isSelectedUnit, 'Startup binds unit selection')
    const index = Number(start.dataset.index)
    const move = [[-1, 'ArrowLeft'], [1, 'ArrowRight'], [-numberOfCols, 'ArrowUp'], [numberOfCols, 'ArrowDown']]
      .find(([offset]) => cells[index + offset]?.classList.contains('-reachable') &&
        !cells[index + offset].querySelector('.unit-container') &&
        (Math.abs(offset) !== 1 || Math.floor(index / numberOfCols) === Math.floor((index + offset) / numberOfCols)))
    assert(!!move, 'Initial unit has a free adjacent reachable cell')
    window.dispatchEvent(new KeyboardEvent('keydown', {key: move[1]}))
    assert(unit.parentElement === cells[index + move[0]] && Number(unit.dataset.residual_move_capacity) < Number(capacity),
      'Keyboard listener moves the unit and spends movement')
    cancelMoveSmartphoneUI.click()
    assert(unit.parentElement === start && unit.dataset.residual_move_capacity === capacity && !isSelectedUnit,
      'Cancel control restores position and movement')
    unit.click()
    validMoveSmartphoneUI.click()
    assert(!isSelectedUnit, 'Validate control clears selection')
    unit.dataset.residual_move_capacity = '0'
    unit.dataset.residual_attack_capacity = '0'
    endRoundButton.click()
    assert(currentPlayer === 2 && currentRound === 2 &&
      unit.dataset.residual_move_capacity === unit.dataset.movement_range &&
      unit.dataset.residual_attack_capacity === unit.dataset.attack_capacity,
    'End-round listener advances once and resets capacities')
    const enemy = document.querySelector('.unit-container[data-player="2"]')
    enemy.click()
    assert(selectedUnit === enemy, 'New player can select their units')
    endRoundButton.click()
    assert(currentPlayer === 1 && currentRound === 3 && !isSelectedUnit,
      'Second round returns control and clears selection')
    output.textContent = results.join('\n') + '\nALL PASSED (' + results.length + ')'
  } catch (error) {
    output.textContent = results.join('\n') + '\nFAIL: ' + error.stack
  }
})()
