import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SQUARE, ROUND } from '../lib/layout.js'

const R = ROUND.w / 2
const inCircle = (x, y, margin = 0) => Math.hypot(x - R, y - R) <= R - margin

test('square layout keeps the 1.0 positions', () => {
  assert.deepEqual(SQUARE.rodTip, { x: 279, y: 315 })
  assert.deepEqual(SQUARE.reelEnd, { x: 262, y: 300 })
})

test('round rod tip, reel end and every bobber spot are inside the circle', () => {
  const BOBBER = 28
  assert.ok(inCircle(ROUND.rodTip.x, ROUND.rodTip.y, 40), 'rod tip')
  assert.ok(inCircle(ROUND.reelEnd.x, ROUND.reelEnd.y, 40), 'reel end')
  const { x, y, w, h } = ROUND.spot
  for (const [sx, sy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
    assert.ok(inCircle(sx, sy, 12) && inCircle(sx + BOBBER, sy + BOBBER, 12), `spot ${sx},${sy}`)
    assert.ok(sy - 44 > ROUND.bar.tenseY + 8, 'the bite "!" stays below the bars')
  }
})

test('round bars and catch card fit inside the circle', () => {
  const { x, w, reelY, tenseY } = ROUND.bar
  for (const y of [reelY, tenseY + 8]) assert.ok(inCircle(x, y, 12) && inCircle(x + w, y, 12))
  const c = ROUND.card
  const r = 24 // the card's corner radius
  for (const [cx, cy] of [[c.x + r, c.y + r], [c.x + c.w - r, c.y + r], [c.x + r, c.y + c.h - r], [c.x + c.w - r, c.y + c.h - r]])
    assert.ok(inCircle(cx, cy, r + 12))
})

test('round lake scene puts the rod tip and dock on screen', () => {
  const s = ROUND.scene
  assert.equal(s.w * 6, ROUND.w)
  assert.equal(s.h * 6, ROUND.h)
  assert.ok(s.horizon * 6 < ROUND.spot.y, 'bobbers land on water')
  // Some dock planks right next to the post are visible.
  assert.ok(inCircle(s.dock.posts[0] * 6, (s.dock.top + 2) * 6))
})
