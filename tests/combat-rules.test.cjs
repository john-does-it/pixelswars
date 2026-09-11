const { test } = require('node:test')
const assert = require('node:assert/strict')
const rules = require('../js/combat-rules.js')

test('all 16 approved unit matchups', () => {
  const types = ['infantry', 'jeep', 'tank', 'artillery']
  const expected = [[1, .5, .5, 1.5], [1.5, 1, .5, 1], [1.5, 1.5, 1, .5], [.5, 1, 1.5, 1]]
  types.forEach((attacker, row) => types.forEach((defender, col) => {
    assert.equal(rules.typeModifier(attacker, defender), expected[row][col], `${attacker} -> ${defender}`)
    assert.equal(rules.damage(40, 100, 10, 30, attacker, defender), 36 * expected[row][col])
  }))
})

test('aircraft, planes and helicopters cannot be targeted by tanks', () => {
  for (const target of ['aircraft', 'plane', 'helicopter']) {
    assert.equal(rules.canTarget('tank', target), false)
    assert.equal(rules.damage(70, 180, 0, 0, 'tank', target), 0)
  }
  assert.equal(rules.canTarget('aircraft', 'tank'), true)
})

test('future unspecified matchups are neutral', () => {
  assert.equal(rules.typeModifier('engineer', 'infantry'), 1)
  assert.equal(rules.typeModifier('tank', 'ship'), 1)
})

test('terrain and attacker health still affect damage; defense never heals a target', () => {
  assert.equal(rules.damage(40, 50, 10, 30, 'infantry', 'artillery'), 27)
  assert.equal(rules.damage(1, 100, 100, 100, 'jeep', 'infantry'), 0)
})

test('artillery excludes all eight neighbors but retains square range 2–3', () => {
  const cells = rules.attackCells(27, 8, 8, 3, 1)
  assert.equal(cells.length, 40)
  for (const excluded of [18, 19, 20, 26, 27, 28, 34, 35, 36]) assert.ok(!cells.includes(excluded))
  for (const included of [0, 3, 6, 9, 25, 29, 45, 51, 54]) assert.ok(cells.includes(included))
  assert.ok(!cells.includes(31))
})

test('ordinary units retain eight adjacent targets', () => {
  assert.deepEqual(rules.attackCells(27, 8, 8, 1), [18, 19, 20, 26, 28, 34, 35, 36])
})

test('both map sizes clip range at edges without wrapping or duplicate cells', () => {
  for (const [cols, rows] of [[8, 8], [12, 8]]) {
    for (let origin = 0; origin < cols * rows; origin++) {
      const actual = rules.attackCells(origin, cols, rows, 3, 1)
      const expected = []
      for (let target = 0; target < cols * rows; target++) {
        const distance = Math.max(Math.abs(target % cols - origin % cols), Math.abs(Math.floor(target / cols) - Math.floor(origin / cols)))
        if (distance >= 2 && distance <= 3) expected.push(target)
      }
      assert.deepEqual(actual, expected)
    }
  }
})
