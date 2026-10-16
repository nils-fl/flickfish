// Screen layouts for square (390x450 design) and round (480x480 design) watches.
// Pure data (no @zos imports): tools/gen-sprites.mjs draws the lake scenes from `scene`
// and the pages place their widgets with the rest, so the rod tip stays in one place.

// Lake scene grid cells are 6 px. Coordinates in `scene` are cells, everything else design px.
const cellCenter = ([x, y]) => ({ x: x * 6 + 3, y: y * 6 + 3 })

export const SQUARE = {
  w: 390,
  h: 450,
  scene: {
    w: 65, h: 75, horizon: 30,
    waterBands: [38, 48, 61], // where the 2nd, 3rd and 4th water colours start
    skyShift: [0, 0], // added to the sun/moon and clouds in tools/sprites/art.mjs
    dock: { top: 66, right: 17, posts: [2, 13] },
    rod: { butt: [64, 74], tip: [46, 52] } // the rod is drawn from the bottom-right corner
  },
  clock: 10, title: 44, sub: 80,
  bar: { x: 60, w: 270, reelY: 114, tenseY: 132 },
  spot: { x: 120, w: 120, y: 215, h: 50 }, // where the bobber lands
  reelEndOffset: { x: -17, y: -15 }, // where a reeled-in fish reaches, relative to the rod tip
  hint: 414, debug: 390,
  card: { x: 45, y: 104, w: 300, h: 250 },
  aquarium: { title: 44, sub: 80, gridY: 118, bottom: 40 }
}

// Round: the corners are off screen, so texts sit lower, the horizon drops and the dock,
// rod and reel move in from the corners until they're inside the circle.
export const ROUND = {
  w: 480,
  h: 480,
  scene: {
    w: 80, h: 80, horizon: 36,
    waterBands: [45, 56, 70],
    skyShift: [7, 6],
    dock: { top: 64, right: 30, posts: [16, 27] },
    rod: { butt: [69, 70], tip: [54, 56] }
  },
  clock: 26, title: 58, sub: 94,
  bar: { x: 105, w: 270, reelY: 130, tenseY: 148 },
  spot: { x: 150, w: 150, y: 250, h: 50 },
  reelEndOffset: { x: -17, y: -15 },
  hint: 418, debug: 392,
  card: { x: 90, y: 115, w: 300, h: 250 },
  aquarium: { title: 64, sub: 100, gridY: 140, bottom: 140 }
}

for (const L of [SQUARE, ROUND]) {
  L.rodTip = cellCenter(L.scene.rod.tip)
  L.reelEnd = { x: L.rodTip.x + L.reelEndOffset.x, y: L.rodTip.y + L.reelEndOffset.y }
}
