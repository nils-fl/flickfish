// Wrist-flick detector. Feed it raw accelerometer samples; it keeps a slow moving
// baseline of the acceleration magnitude (≈ gravity at rest) and reports a flick when
// a sample deviates from it by more than FLICK_RATIO × baseline. Working with the ratio
// makes it independent of the sensor's units. Slow arm movements stay close to 1 g and
// don't trigger.

export const FLICK_RATIO = 0.8
export const COOLDOWN_MS = 400
const ALPHA = 0.05 // baseline smoothing

export function createFlick(ratio = FLICK_RATIO, cooldown = COOLDOWN_MS) {
  return { base: 0, mag: 0, ratio, cooldown, last: -Infinity }
}

export function magnitude(a) {
  return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
}

// Returns true when this sample completes a flick.
export function feed(d, sample, now) {
  const m = magnitude(sample)
  d.mag = m
  if (!d.base) {
    d.base = m
    return false
  }
  const spike = Math.abs(m - d.base) > d.ratio * d.base
  // Spikes don't drag the baseline around.
  if (!spike) d.base += (m - d.base) * ALPHA
  if (!spike || now - d.last < d.cooldown) return false
  d.last = now
  return true
}
