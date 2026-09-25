// Pure game logic for FlickFish. No @zos imports so it can be unit-tested with node.
// The page feeds step() the current time and whether the player acted (flick or tap);
// step() mutates the session and returns effects for the page to play (vibrations etc.).

export const SCHEMA_VERSION = 1

// Hours are [from, to) and may wrap past midnight.
export const TIMES = {
  dawn: [5, 9],
  day: [9, 17],
  dusk: [17, 21],
  night: [21, 5]
}

// weight: rarity; hookMs: bite window; diff: reel difficulty (1-3, legendary 4); size: cm (junk: see unit).
export const SPECIES = [
  { id: 'minnow', name: 'Minnow', weight: 30, hookMs: 1200, diff: 1, size: [4, 9] },
  { id: 'perch', name: 'Perch', weight: 22, hookMs: 1100, diff: 1, size: [12, 30] },
  { id: 'carp', name: 'Carp', weight: 18, hookMs: 1000, diff: 2, size: [30, 80] },
  { id: 'trout', name: 'Trout', weight: 14, hookMs: 900, diff: 2, size: [25, 60], time: 'dawn' },
  { id: 'pike', name: 'Pike', weight: 10, hookMs: 800, diff: 3, size: [50, 110], time: 'dusk' },
  { id: 'catfish', name: 'Catfish', weight: 12, hookMs: 900, diff: 3, size: [40, 120], time: 'night' },
  { id: 'eel', name: 'Eel', weight: 10, hookMs: 800, diff: 2, size: [40, 90], time: 'night' },
  { id: 'koi', name: 'Koi', weight: 3, hookMs: 700, diff: 2, size: [30, 70], time: 'day' },
  { id: 'goldfish', name: 'Goldfish', weight: 2, hookMs: 700, diff: 1, size: [8, 20] },
  { id: 'boot', name: 'Old Boot', weight: 6, hookMs: 1300, diff: 1, size: [38, 46], unit: 'EU size', junk: true },
  { id: 'duck', name: 'Rubber Duck', weight: 3, hookMs: 1300, diff: 1, size: [8, 12], junk: true },
  { id: 'moonfish', name: 'Moon Fish', weight: 1, hookMs: 600, diff: 4, size: [60, 150], time: 'night', legendary: true }
]
export const BY_ID = Object.fromEntries(SPECIES.map((f) => [f.id, f]))

export const WAIT_MS = [3000, 15000]
export const NIBBLE_MS = 400
export const RESULT_GUARD_MS = 800 // ignore input right after a result so a stray flick doesn't recast
export const REEL_START = 25
export const REEL_TIMEOUT_MS = 30000
// Tension a tap adds during a pull; each pull rolls its own strength.
export const pullPower = (f, rng) => (20 + 8 * f.diff) * (0.8 + 0.4 * rng())
export const TENSION_DECAY = 35 // per second
export const PULL_PULSE_MS = 350
export const PULL_DRIFT = 5 // % per second per difficulty while the fish pulls

export function timeOfDay(hour) {
  for (const [name, [from, to]] of Object.entries(TIMES)) {
    if (from < to ? hour >= from && hour < to : hour >= from || hour < to) return name
  }
  return 'day'
}

export function available(hour) {
  const t = timeOfDay(hour)
  return SPECIES.filter((f) => !f.time || f.time === t)
}

export function pickFish(hour, rng) {
  const pool = available(hour)
  const total = pool.reduce((sum, f) => sum + f.weight, 0)
  let r = rng() * total
  for (const f of pool) {
    r -= f.weight
    if (r < 0) return f
  }
  return pool[pool.length - 1]
}

// Bigger is rarer.
export function rollSize(f, rng) {
  const [min, max] = f.size
  return Math.round(min + (max - min) * Math.pow(rng(), 1.5))
}

export function newSession() {
  return { state: 'idle', since: 0 }
}

function enter(s, state, now) {
  s.state = state
  s.since = now
  s.turn = 0
}

function cast(s, now, rng, hour, fx) {
  const f = pickFish(hour, rng)
  const wait = WAIT_MS[0] + rng() * (WAIT_MS[1] - WAIT_MS[0])
  const nibbles = Math.floor(rng() * 3)
  const at = []
  for (let i = 0; i < nibbles; i++) at.push(now + 1000 + rng() * (wait - 2000))
  at.sort((a, b) => a - b)
  Object.assign(s, { fish: f.id, size: rollSize(f, rng), biteAt: now + wait, nibbles: at, nibbleUntil: 0 })
  enter(s, 'waiting', now)
  fx.push('cast')
}

function startReel(s, now, rng) {
  const f = BY_ID[s.fish]
  Object.assign(s, {
    progress: REEL_START,
    tension: 0,
    pullUntil: 0,
    nextPull: now + nextPullGap(f, rng),
    nextPulse: 0,
    lastT: now
  })
}

// Calm time between pulls: harder fish give you less of it.
function nextPullGap(f, rng) {
  return 2500 + rng() * 2500 - 450 * f.diff
}

// % per tap: about 10 / 14 / 19 taps for difficulty 1 / 2 / 3.
function reelStep(f) {
  return 8 / (0.5 + 0.5 * f.diff)
}

// Crown rotation (in reel units, 1 unit = one tap) needed to count as a deliberate turn.
// Accumulated over the whole wait/bite, so slow turns reporting small angles still add up.
export const CROWN_MIN = 0.5

// Advance the session. `act` is true when the player flicked or tapped this frame;
// `reel` is how much the crown was turned since the last frame, in reel units.
export function step(s, now, act, rng, hour, reel = 0) {
  const fx = []
  s.turn = (s.turn || 0) + reel
  const turned = s.turn >= CROWN_MIN
  const f = s.fish && BY_ID[s.fish]

  switch (s.state) {
    case 'idle':
      if (act) cast(s, now, rng, hour, fx)
      break

    case 'waiting':
      if (act || turned) {
        enter(s, 'spooked', now)
        fx.push('fail')
        break
      }
      while (s.nibbles.length && s.nibbles[0] <= now) {
        s.nibbles.shift()
        s.nibbleUntil = now + NIBBLE_MS
        fx.push('nibble')
      }
      if (now >= s.biteAt) {
        enter(s, 'bite', now)
        fx.push('bite')
      }
      break

    case 'bite':
      if (act || turned) {
        enter(s, 'reeling', now)
        startReel(s, now, rng)
        fx.push('hook')
      } else if (now - s.since > f.hookMs) {
        enter(s, 'missed', now)
        fx.push('fail')
      }
      break

    case 'reeling': {
      const dt = Math.max(0, now - s.lastT) / 1000
      s.lastT = now
      const pulling = now < s.pullUntil
      s.tension = Math.max(0, s.tension - TENSION_DECAY * dt)
      if (pulling) {
        // The fish swims away while pulling.
        s.progress -= PULL_DRIFT * f.diff * dt
        if (now >= s.nextPulse) {
          s.nextPulse = now + PULL_PULSE_MS
          fx.push('pull')
        }
      } else if (now >= s.nextPull) {
        s.pullUntil = now + 500 + rng() * (300 + 200 * f.diff)
        s.pullPower = pullPower(f, rng)
        s.nextPull = s.pullUntil + nextPullGap(f, rng)
        s.nextPulse = now + PULL_PULSE_MS
        fx.push('pull')
      }
      const units = (act ? 1 : 0) + reel
      if (units > 0) {
        if (pulling) s.tension += units * s.pullPower
        else s.progress += units * reelStep(f)
      }
      if (s.tension >= 100) {
        enter(s, 'snapped', now)
        fx.push('fail')
      } else if (s.progress >= 100) {
        s.progress = 100
        enter(s, 'caught', now)
        fx.push('catch')
      } else if (s.progress <= 0 || now - s.since > REEL_TIMEOUT_MS) {
        enter(s, 'escaped', now)
        fx.push('fail')
      }
      break
    }

    default:
      // Result screens: a flick after the guard time casts again straight away.
      if (act && now - s.since > RESULT_GUARD_MS) cast(s, now, rng, hour, fx)
  }
  return fx
}

export function isPulling(s, now) {
  return s.state === 'reeling' && now < s.pullUntil
}

export function isNibbling(s, now) {
  return s.state === 'waiting' && now < s.nibbleUntil
}

// ---- Collection ----

export function newSave() {
  return { v: SCHEMA_VERSION, fish: {}, total: 0, casts: 0 }
}

export function migrate(saved) {
  const base = newSave()
  if (!saved || typeof saved !== 'object') return base
  const s = Object.assign(base, saved)
  s.fish = saved.fish && typeof saved.fish === 'object' ? saved.fish : {}
  s.v = SCHEMA_VERSION
  return s
}

// Returns { isNew, isRecord } for the catch card.
export function recordCatch(save, id, size, now) {
  const prev = save.fish[id]
  const isNew = !prev
  const isRecord = !isNew && size > prev.best
  save.fish[id] = {
    count: (prev ? prev.count : 0) + 1,
    best: prev ? Math.max(prev.best, size) : size,
    first: prev ? prev.first : now
  }
  save.total += 1
  return { isNew, isRecord }
}

export function sizeLabel(f, size) {
  return f.unit ? `${f.unit} ${size}` : `${size} cm`
}

// Tiny seeded RNG (mulberry32) for tests and simulations.
export function seeded(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
