import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createFlick, feed } from '../lib/flick.js'

const G = 1000 // arbitrary units: the detector only looks at ratios
const at = (x, y, z) => ({ x, y, z })

function run(samples, dt = 40) {
  const d = createFlick()
  const hits = []
  samples.forEach((s, i) => feed(d, s, i * dt) && hits.push(i))
  return hits
}

const rest = (n) => Array.from({ length: n }, () => at(0, 0, G))

test('no flick while resting', () => {
  assert.deepEqual(run(rest(50)), [])
})

test('a sharp flick triggers once', () => {
  const hits = run([...rest(20), at(1500, 400, G), at(900, 200, G), ...rest(20)])
  assert.deepEqual(hits, [20])
})

test('slowly raising the arm does not trigger', () => {
  // Rotate gravity from the z axis to the y axis over 2 seconds.
  const raise = Array.from({ length: 50 }, (_, i) => {
    const a = (i / 49) * (Math.PI / 2)
    return at(0, G * Math.sin(a) * 1.05, G * Math.cos(a))
  })
  assert.deepEqual(run([...rest(20), ...raise, ...rest(20)]), [])
})

test('a second flick inside the cooldown is ignored, after it counts', () => {
  const flick = at(0, 2200, G)
  const hits = run([...rest(20), flick, ...rest(4), flick, ...rest(10), flick])
  // Samples are 40 ms apart: index 25 is 200 ms after 20 (ignored), 36 is 640 ms (counted).
  assert.deepEqual(hits, [20, 36])
})

test('works in other units (m/s²)', () => {
  const d = createFlick()
  for (let i = 0; i < 20; i++) feed(d, at(0, 0, 9.81), i * 40)
  assert.equal(feed(d, at(18, 4, 9.81), 800), true)
})
