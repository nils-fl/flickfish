// Renders the pixel art in tools/sprites/art.mjs into PNGs under assets/default.s/ (square)
// and assets/default.r/ (round), plus the procedural lake backgrounds (one set per screen
// shape, laid out by lib/layout.js), the app icon and docs/banner.png.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { PALETTE, FISH, BOBBER, BOBBER_DIP, RIPPLE, BANG, SCENES } from './sprites/art.mjs'
import { SQUARE, ROUND } from '../lib/layout.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'assets/default.s')
const OUT_ROUND = path.join(ROOT, 'assets/default.r')
const SILHOUETTE = '#2a3a4a'

// Lake scene grid: 6px cells, 65x75 = 390x450 square, 80x80 = 480x480 round.
export const SCENE_SCALE = 6
const { w: SCENE_W, h: SCENE_H } = SQUARE.scene

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const grid = (w, h, fill = null) => Array.from({ length: h }, () => Array(w).fill(fill))
const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function put(g, x, y, c) {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c
}

function stamp(g, lines, ox, oy, recolor) {
  lines.forEach((line, y) =>
    [...line].forEach((ch, x) => ch !== '.' && put(g, ox + x, oy + y, recolor ? rgb(recolor) : rgb(PALETTE[ch])))
  )
}

function fromArt(lines, recolor) {
  const g = grid(Math.max(...lines.map((l) => l.length)), lines.length)
  stamp(g, lines, 0, 0, recolor)
  return g
}

function writePng(file, g, scale, bg = null) {
  const w = g[0].length * scale
  const h = g.length * scale
  const png = new PNG({ width: w, height: h })
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = g[Math.floor(y / scale)][Math.floor(x / scale)] || (bg && bg(x, y, w, h))
      png.data.set(c ? [c[0], c[1], c[2], c[3] ?? 255] : [0, 0, 0, 0], (y * w + x) * 4)
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, PNG.sync.write(png))
}

function line(g, [x0, y0], [x1, y1], c) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= steps; i++) {
    put(g, Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), c)
  }
}

function disc(g, cx, cy, r, c) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) put(g, cx + x, cy + y, c)
}

function scene(p, D = SQUARE.scene) {
  const { w: SCENE_W, h: SCENE_H, horizon: HORIZON } = D
  const [sx, sy] = D.skyShift
  const g = grid(SCENE_W, SCENE_H)
  const sky = p.sky.map(rgb)
  const water = p.water.map(rgb)

  // Sky bands with a dithered edge between them.
  const band = HORIZON / sky.length
  for (let y = 0; y < HORIZON; y++) {
    const i = Math.min(sky.length - 1, Math.floor(y / band))
    const edge = y === Math.floor((i + 1) * band) - 1 && i + 1 < sky.length
    for (let x = 0; x < SCENE_W; x++) g[y][x] = edge && (x + y) % 2 ? sky[i + 1] : sky[i]
  }
  if (p.stars) {
    for (let y = 0; y < HORIZON - 6; y++)
      for (let x = 0; x < SCENE_W; x++) if (hash(x, y) > 0.975) g[y][x] = rgb(hash(y, x) > 0.5 ? '#ffffff' : '#8fa3d9')
  }
  const [ox, oy] = [p.orbAt[0] + sx, p.orbAt[1] + sy]
  disc(g, ox, oy, p.orbR, rgb(p.orb))
  if (p.stars) disc(g, ox + 2, oy - 1, p.orbR - 1, sky[0]) // crescent moon
  if (p.clouds) {
    // Clouds sit at the edges and low in the sky, away from the centered texts.
    for (const [cx, cy, w] of [[1 + sx, 17 + sy, 8], [55 + sx, 13 + sy, 9], [24 + sx, 25 + sy, 6]]) {
      for (let x = 0; x < w; x++) {
        put(g, cx + x, cy, rgb(p.clouds))
        if (x > 1 && x < w - 1) put(g, cx + x, cy - 1, rgb(p.clouds))
        if (x > 2 && x < w - 3) put(g, cx + x, cy - 2, rgb(p.clouds))
      }
    }
  }

  // Hills and a treeline on the far shore.
  for (let x = 0; x < SCENE_W; x++) {
    const top = Math.round(HORIZON - 3 - 2 * Math.sin(x / 7) - 1.5 * Math.sin(x / 3.1 + 1))
    for (let y = top; y < HORIZON; y++) g[y][x] = rgb(p.hills)
    if (hash(x, 3) > 0.62) {
      const h = 3 + Math.floor(hash(x, 7) * 4)
      for (let i = 0; i < h; i++) {
        const half = Math.floor(i / 2)
        for (let dx = -half; dx <= half; dx++) put(g, x + dx, top - h + i + 1, rgb(p.trees))
      }
    }
  }

  // Water bands, glints and the orb's reflection.
  const bands = [HORIZON, ...D.waterBands, SCENE_H]
  for (let i = 0; i < water.length; i++)
    for (let y = bands[i]; y < bands[i + 1]; y++) for (let x = 0; x < SCENE_W; x++) g[y][x] = water[i]
  const glint = rgb(p.glint)
  for (let y = HORIZON + 1; y < SCENE_H; y += 2) {
    for (let x = 0; x < SCENE_W; x++) {
      const near = Math.abs(x - ox) < 3 + (y - HORIZON) / 6 && y < HORIZON + 22
      const chance = near ? 0.55 : 0.93 + (y - HORIZON) / 900
      if (hash(x, y) > chance) for (let d = 0; d < 2 + Math.floor(hash(y, x) * 3); d++) put(g, x + d, y, glint)
    }
  }

  // Wooden dock bottom-left.
  const plank = rgb('#7b5a43')
  const gap = rgb('#4e3627')
  const { top, right, posts } = D.dock
  for (let y = top; y < SCENE_H; y++) for (let x = 0; x < right - (y < top + 2 ? top + 4 - y : 0); x++) g[y][x] = x % 4 === 3 ? gap : plank
  for (const px of posts) for (let y = top - 4; y < top; y++) put(g, px, y, gap)

  // Fishing rod coming in from the bottom right, handle and reel near where it enters the screen.
  const [bx, by] = D.rod.butt
  line(g, [SCENE_W - 1, SCENE_H - 1], D.rod.tip, rgb('#5d4037'))
  line(g, [bx, by - 1], [bx - 5, by - 8], rgb('#212121'))
  disc(g, bx - 5, by - 4, 1, rgb('#9e9e9e'))
  return g
}

let count = 0
// Sprites are the same on both screen shapes; only the lake scenes differ.
const out = (rel, g, scale, bg) => {
  for (const dir of [OUT, OUT_ROUND]) writePng(path.join(dir, rel), g, scale, bg)
  count++
}

for (const [name, p] of Object.entries(SCENES)) {
  writePng(path.join(OUT, `scene/${name}.png`), scene(p, SQUARE.scene), SCENE_SCALE)
  writePng(path.join(OUT_ROUND, `scene/${name}.png`), scene(p, ROUND.scene), SCENE_SCALE)
  count += 2
}
for (const [id, art] of Object.entries(FISH)) {
  out(`fish/${id}.png`, fromArt(art), 6)
  out(`fish/${id}_s.png`, fromArt(art), 4)
  out(`fish/${id}_q.png`, fromArt(art, SILHOUETTE), 4)
}
out('ui/bobber.png', fromArt(BOBBER), 4)
out('ui/bobber_dip.png', fromArt(BOBBER_DIP), 4)
out('ui/ripple.png', fromArt(RIPPLE), 4)
out('ui/bang.png', fromArt(BANG), 4)

// App icon: a bold, classic fish silhouette (forked tail, fin, eye) on a round pond,
// drawn procedurally so it stays readable at small icon sizes.
function iconFish() {
  const N = 20
  const cy = 10
  // Fill shape: oval body, filled forked tail, dorsal fin. The outline is drawn *around* it.
  const shape = (x, y) => {
    const body = ((x - 8) / 5.6) ** 2 + ((y - cy) / 3.9) ** 2 <= 1
    const d = Math.abs(y - cy)
    const tail = x >= 13 && x <= 16 && d <= (x - 12.2) * 1.15 && !(x >= 15 && d < (x - 14.3) * 1.3)
    const fin = y >= 5 && y <= 6 && x >= 6 && x <= 10 && x - 6 >= 2 * (6 - y)
    return body || tail || fin
  }
  const c = {
    outline: rgb('#6b260b'), body: rgb('#ff8f1f'), belly: rgb('#ffcf5c'), fin: rgb('#e8650c'),
    eye: rgb('#ffffff'), pupil: rgb('#1a1a1a'), bubble: rgb('#cfefff')
  }
  const g = grid(N, N)
  const inside = (x, y) => x >= 0 && y >= 0 && x < N && y < N && shape(x, y)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inside(x, y)) {
        if (x >= 13 || y <= 6) g[y][x] = c.fin
        else if (y >= cy + 1) g[y][x] = c.belly
        else g[y][x] = c.body
      } else if (inside(x - 1, y) || inside(x + 1, y) || inside(x, y - 1) || inside(x, y + 1)) {
        g[y][x] = c.outline
      }
    }
  }
  // Gill line, pectoral fin, eye, bubbles in front of the mouth.
  for (const y of [8, 9, 10, 11]) g[y][6] = c.fin
  for (const [x, y] of [[9, 11], [9, 12], [10, 12]]) g[y][x] = c.fin
  g[8][4] = c.eye
  g[8][5] = c.eye
  g[9][4] = c.pupil
  g[9][5] = c.eye
  for (const [x, y] of [[2, 7], [3, 5], [3, 4], [4, 3]]) g[y][x] = c.bubble
  return g
}
{
  const pond = (x, y, w) => {
    const r = Math.hypot(x - w / 2 + 0.5, y - w / 2 + 0.5)
    if (r > w / 2) return null
    return r > w / 2 - 10 ? rgb('#154a70') : rgb('#1f6aa0')
  }
  for (const dir of [OUT, OUT_ROUND]) writePng(path.join(dir, 'icon.png'), iconFish(), 12, pond)
  count++
}

// README banner: app icon + pixel title over a row of every species on the day lake.
{
  const FONT = {
    F: ['11111', '1....', '1....', '1111.', '1....', '1....', '1....'],
    L: ['1....', '1....', '1....', '1....', '1....', '1....', '11111'],
    I: ['11111', '..1..', '..1..', '..1..', '..1..', '..1..', '11111'],
    C: ['.1111', '1....', '1....', '1....', '1....', '1....', '.1111'],
    K: ['1...1', '1..1.', '1.1..', '11...', '1.1..', '1..1.', '1...1'],
    S: ['.1111', '1....', '1....', '.111.', '....1', '....1', '1111.'],
    H: ['1...1', '1...1', '1...1', '11111', '1...1', '1...1', '1...1']
  }
  const fish = Object.values(FISH)
  const W = fish.length * 17 + 3
  const H = 50
  const p = SCENES.day
  const g = grid(W, H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) g[y][x] = rgb(y < 20 ? p.sky[Math.min(3, Math.floor(y / 5))] : p.water[Math.min(3, Math.floor((y - 20) / 8))])
  }
  const title = 'FLICKFISH'
  const T = 2
  // Icon badge (fish on a pixel pond disc) to the left of the title, centered as a group.
  const IW = 20
  const GAP = 5
  const titleW = title.length * 6 * T - T
  const bx = Math.floor((W - (IW + GAP + titleW)) / 2)
  const fishIcon = iconFish()
  for (let y = 0; y < IW; y++) {
    for (let x = 0; x < IW; x++) {
      const r = Math.hypot(x - 9.5, y - 9.5)
      if (r > 10) continue
      put(g, bx + x, 1 + y, fishIcon[y][x] || rgb(r > 8.8 ? '#154a70' : '#1f6aa0'))
    }
  }
  let x0 = bx + IW + GAP
  for (const ch of title) {
    FONT[ch].forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c !== '1') return
        for (let dy = 0; dy < T; dy++)
          for (let dx = 0; dx < T; dx++) {
            put(g, x0 + x * T + dx + 1, 3 + y * T + dy + 1, rgb('#1c5883'))
            put(g, x0 + x * T + dx, 3 + y * T + dy, rgb('#ffffff'))
          }
      })
    )
    x0 += 6 * T
  }
  fish.forEach((art, i) => stamp(g, art, 2 + i * 17, 28 + (i % 2) * 8))
  writePng(path.join(ROOT, 'docs/banner.png'), g, 5)
  count++
}

// Contact sheet for eyeballing the art (not shipped).
if (process.argv.includes('--preview')) {
  const scenes = Object.values(SCENES).map((p) => scene(p))
  const W = SCENE_W * 4 + 5
  const fishRows = Math.ceil(Object.keys(FISH).length / 6)
  const g = grid(W, SCENE_H + 2 + fishRows * 12 + 12, rgb('#333333'))
  scenes.forEach((s, i) => s.forEach((row, y) => row.forEach((c, x) => (g[y + 1][i * (SCENE_W + 1) + x + 1] = c))))
  Object.values(FISH).forEach((art, i) => stamp(g, art, 2 + (i % 6) * 18, SCENE_H + 3 + Math.floor(i / 6) * 12))
  stamp(g, BOBBER, 120, SCENE_H + 3)
  stamp(g, BOBBER_DIP, 130, SCENE_H + 3)
  stamp(g, RIPPLE, 140, SCENE_H + 3)
  stamp(g, BANG, 155, SCENE_H + 3)
  const file = process.argv[process.argv.indexOf('--preview') + 1]
  writePng(file, g, 3)
  console.log(`preview: ${file}`)
}

// Store upload copy of the icon.
fs.mkdirSync(path.join(ROOT, 'store'), { recursive: true })
fs.copyFileSync(path.join(OUT, 'icon.png'), path.join(ROOT, 'store/icon.png'))

console.log(`wrote ${count} images`)
