import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as G from '../lib/game.js'

const NOON = 12
const rngOf = (...vals) => {
  let i = 0
  return () => vals[i++ % vals.length]
}

// Cast with a fixed RNG: pick first species in the pool (minnow), wait = min, no nibbles.
function castSession(now = 0, hour = NOON) {
  const s = G.newSession()
  G.step(s, now, true, rngOf(0), hour)
  return s
}

test('time of day wraps around midnight', () => {
  assert.equal(G.timeOfDay(6), 'dawn')
  assert.equal(G.timeOfDay(12), 'day')
  assert.equal(G.timeOfDay(18), 'dusk')
  assert.equal(G.timeOfDay(23), 'night')
  assert.equal(G.timeOfDay(2), 'night')
})

test('species are filtered by time of day', () => {
  const ids = (h) => G.available(h).map((f) => f.id)
  assert.ok(ids(6).includes('trout'))
  assert.ok(!ids(12).includes('trout'))
  assert.ok(ids(12).includes('koi'))
  assert.ok(ids(23).includes('moonfish'))
  assert.ok(!ids(12).includes('moonfish'))
  assert.ok(ids(3).includes('catfish'))
})

test('pickFish respects weights', () => {
  assert.equal(G.pickFish(NOON, rngOf(0)).id, 'minnow')
  assert.equal(G.pickFish(NOON, rngOf(0.999999)).id, G.available(NOON).at(-1).id)
})

test('moon fish is about 1% of night casts', () => {
  const rng = G.seeded(42)
  let moon = 0
  const n = 100000
  for (let i = 0; i < n; i++) if (G.pickFish(23, rng).id === 'moonfish') moon++
  assert.ok(moon / n > 0.007 && moon / n < 0.013, `moon rate ${moon / n}`)
})

test('size stays in range', () => {
  const rng = G.seeded(1)
  for (const f of G.SPECIES) {
    for (let i = 0; i < 200; i++) {
      const s = G.rollSize(f, rng)
      assert.ok(s >= f.size[0] && s <= f.size[1])
    }
  }
})

test('cast → wait → bite → hook → reel → caught', () => {
  const s = castSession(0)
  assert.equal(s.state, 'waiting')
  assert.equal(s.fish, 'minnow')
  assert.deepEqual(G.step(s, 1000, false, rngOf(0.5), NOON), [])
  assert.deepEqual(G.step(s, G.WAIT_MS[0], false, rngOf(0.5), NOON), ['bite'])
  assert.equal(s.state, 'bite')
  assert.deepEqual(G.step(s, G.WAIT_MS[0] + 300, true, rngOf(0.5), NOON), ['hook'])
  assert.equal(s.state, 'reeling')
  let t = G.WAIT_MS[0] + 400
  // Minnow: 8% per tap from 25% → 10 taps; first pull is several seconds away.
  for (let i = 0; i < 9; i++) G.step(s, (t += 100), true, rngOf(0.5), NOON)
  assert.equal(s.state, 'reeling')
  G.step(s, (t += 100), true, rngOf(0.5), NOON)
  assert.equal(s.state, 'caught')
  assert.equal(s.progress, 100)
})

test('flicking during the wait spooks the fish', () => {
  const s = castSession(0)
  assert.deepEqual(G.step(s, 500, true, rngOf(0.5), NOON), ['fail'])
  assert.equal(s.state, 'spooked')
})

test('nibbles fire as light fake-outs', () => {
  const s = G.newSession()
  // rng order: species, wait, nibble count (0.8*3 → 2), nibble times, size.
  G.step(s, 0, true, rngOf(0, 0.5, 0.8, 0.1, 0.2, 0.3), NOON)
  assert.equal(s.nibbles.length, 2)
  const fx = G.step(s, s.nibbles[1], false, rngOf(0.5), NOON)
  assert.deepEqual(fx, ['nibble', 'nibble'])
  assert.ok(G.isNibbling(s, s.nibbleUntil - 1))
  assert.equal(s.state, 'waiting')
})

test('missing the hook window lets the fish go', () => {
  const s = castSession(0)
  G.step(s, G.WAIT_MS[0], false, rngOf(0.5), NOON)
  G.step(s, G.WAIT_MS[0] + G.BY_ID.minnow.hookMs + 1, false, rngOf(0.5), NOON)
  assert.equal(s.state, 'missed')
})

function hooked(fish = 'pike') {
  const s = castSession(0)
  s.fish = fish
  G.step(s, G.WAIT_MS[0], false, rngOf(0.5), NOON)
  G.step(s, G.WAIT_MS[0] + 100, true, rngOf(0.5), NOON)
  return s
}

test('reeling during a pull builds tension and snaps the line', () => {
  const s = hooked()
  let t = s.nextPull
  assert.deepEqual(G.step(s, t, false, rngOf(0.5), NOON), ['pull'])
  assert.ok(G.isPulling(s, t + 1))
  G.step(s, (t += 50), true, rngOf(0.5), NOON)
  G.step(s, (t += 50), true, rngOf(0.5), NOON)
  G.step(s, (t += 50), true, rngOf(0.5), NOON)
  assert.equal(s.state, 'snapped')
})

test('pulls vibrate in pulses and tension decays', () => {
  const s = hooked()
  let t = s.nextPull
  G.step(s, t, false, rngOf(0.5), NOON)
  G.step(s, (t += 50), true, rngOf(0.5), NOON)
  const tension = s.tension
  assert.deepEqual(G.step(s, (t += G.PULL_PULSE_MS), false, rngOf(0.5), NOON), ['pull'])
  assert.ok(s.tension < tension)
})

test('a fish that pulls you back to zero escapes', () => {
  const s = hooked()
  s.progress = 1
  const t = s.nextPull
  G.step(s, t, false, rngOf(0.5), NOON)
  G.step(s, t + 500, false, rngOf(0.5), NOON)
  assert.equal(s.state, 'escaped')
})

test('reeling times out', () => {
  const s = hooked('minnow')
  s.nextPull = Infinity
  G.step(s, s.since + G.REEL_TIMEOUT_MS + 1, false, rngOf(0.5), NOON)
  assert.equal(s.state, 'escaped')
})

test('result screens ignore input briefly, then recast', () => {
  const s = castSession(0)
  G.step(s, 100, true, rngOf(0.5), NOON)
  assert.equal(s.state, 'spooked')
  assert.deepEqual(G.step(s, 100 + G.RESULT_GUARD_MS - 1, true, rngOf(0.5), NOON), [])
  assert.deepEqual(G.step(s, 100 + G.RESULT_GUARD_MS + 1, true, rngOf(0), NOON), ['cast'])
  assert.equal(s.state, 'waiting')
})

test('the crown hooks and reels', () => {
  const s = castSession(0)
  G.step(s, G.WAIT_MS[0], false, rngOf(0.5), NOON)
  assert.equal(s.state, 'bite')
  // A tiny accidental nudge doesn't hook.
  G.step(s, G.WAIT_MS[0] + 100, false, rngOf(0.5), NOON, 0.2)
  assert.equal(s.state, 'bite')
  assert.deepEqual(G.step(s, G.WAIT_MS[0] + 200, false, rngOf(0.5), NOON, 1), ['hook'])
  const p0 = s.progress
  G.step(s, G.WAIT_MS[0] + 300, false, rngOf(0.5), NOON, 2.5)
  assert.ok(Math.abs(s.progress - (p0 + 2.5 * 8)) < 1e-9)
})

test('turning the crown during a pull adds tension; during the wait it spooks', () => {
  const s = hooked()
  const t = s.nextPull
  G.step(s, t, false, rngOf(0.5), NOON)
  G.step(s, t + 10, false, rngOf(0.5), NOON, 1.5)
  assert.ok(Math.abs(s.tension - 1.5 * s.pullPower) < 1)
  const w = castSession(0)
  G.step(w, 500, false, rngOf(0.5), NOON, 1)
  assert.equal(w.state, 'spooked')
})

test('recordCatch tracks new species and records', () => {
  const save = G.newSave()
  assert.deepEqual(G.recordCatch(save, 'carp', 40, 1), { isNew: true, isRecord: false })
  assert.deepEqual(G.recordCatch(save, 'carp', 35, 2), { isNew: false, isRecord: false })
  assert.deepEqual(G.recordCatch(save, 'carp', 60, 3), { isNew: false, isRecord: true })
  assert.deepEqual(save.fish.carp, { count: 3, best: 60, first: 1 })
  assert.equal(save.total, 3)
})

test('migrate keeps old saves and fills new fields', () => {
  const s = G.migrate({ v: 0, fish: { eel: { count: 2, best: 70, first: 5 } } })
  assert.equal(s.v, G.SCHEMA_VERSION)
  assert.equal(s.fish.eel.best, 70)
  assert.equal(s.total, 0)
  assert.equal(G.migrate(null).casts, 0)
})

test('size labels', () => {
  assert.equal(G.sizeLabel(G.BY_ID.carp, 42), '42 cm')
  assert.equal(G.sizeLabel(G.BY_ID.boot, 42), 'EU size 42')
})
