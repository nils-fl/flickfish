// Pixel art sources. '.' is transparent; every other character is a palette key.
// Fish face left, 16x10 cells.

export const PALETTE = {
  k: '#111111', // eye / outline
  w: '#f5f5f5', // white
  s: '#cfd8dc', // silver
  S: '#90a4ae', // blue grey
  y: '#cddc39', // perch yellow-green
  G: '#33691e', // dark green
  g: '#7cb342', // green
  l: '#aed581', // light green
  o: '#ff7043', // orange fin
  O: '#e65100', // deep orange
  f: '#ff9800', // goldfish orange
  b: '#c8a165', // bronze
  B: '#8d6e3f', // dark bronze
  p: '#f48fb1', // pink
  c: '#6d5a4b', // catfish
  C: '#3e2f27', // dark catfish
  e: '#546e7a', // eel
  E: '#263238', // dark eel
  r: '#e53935', // red
  h: '#8d6e63', // boot leather
  H: '#5d4037', // dark leather
  Y: '#ffeb3b', // duck yellow
  m: '#b39ddb', // moon fish
  M: '#7e57c2', // moon fish dark
  u: '#fff59d' // glow
}

export const FISH = {
  minnow: [
    '................',
    '................',
    '................',
    '.....SSSS.......',
    '...sSSSSSSs..s..',
    '..skssssssssss..',
    '...ssssssss..s..',
    '.....ssss.......',
    '................',
    '................'
  ],
  perch: [
    '......oo.o......',
    '.....oooooo.....',
    '...yyGyyGyyG..o.',
    '..yyyGyyGyyGyoo.',
    '.ykyyGyyGyyGyoo.',
    'yyyyyGyyGyyGyyo.',
    '.wwwwwwwwwwwwoo.',
    '..wwwwwwwwww..o.',
    '....o...o.......',
    '................'
  ],
  carp: [
    '................',
    '......BBB.......',
    '....bbbbbbb.....',
    '..bbBbBbBbBbb.B.',
    '.bkbbBbBbBbbbBB.',
    'bbbbbbbbbbbbbBB.',
    'kbbBbBbBbBbbbBB.',
    '.k.bbbbbbbbbb.B.',
    '.....BB..BB.....',
    '................'
  ],
  trout: [
    '................',
    '......gg........',
    '...gggkggggkg.g.',
    '..ggkgggggkgggg.',
    '.gkggggkgggggggg',
    'pppppppppppppgg.',
    '.sssssssssssspgg',
    '..ssssssssss..g.',
    '....s....s......',
    '................'
  ],
  pike: [
    '................',
    '.........GG.....',
    '...GGGGGGGGGG..G',
    '.GGlGGlGGGlGGGGG',
    'GkGGGlGGlGGGlGGG',
    'GGGGGGGGGGGGGG.G',
    'lllllllllllll...',
    '.lllllllllll....',
    '.....l....l.....',
    '................'
  ],
  catfish: [
    '................',
    '.......CC.......',
    '....ccccccc.....',
    '..cccccccccccC..',
    '.ckcccccccccCCC.',
    'cccccccccccccCC.',
    'k.ssssssssssCCC.',
    'k..ssssssss..C..',
    '.k..C....C......',
    '................'
  ],
  eel: [
    '................',
    '................',
    '..........eee...',
    '..eeee...eeeee..',
    '.eeeeee.eeeEEee.',
    'ekeeeeeeeeeE.eE.',
    'eeeeEEeeeeE...E.',
    '.eeeE..eeE......',
    '................',
    '................'
  ],
  koi: [
    '................',
    '......rr........',
    '....wwrrrwwww...',
    '..wwrrrrwwwrrw.r',
    '.wkrrrwwwwrrrwrr',
    'wwwrrwwwwwwrwwrr',
    '.wwwwwwrrrwwwwrr',
    '..wwwwwrrwwww..r',
    '.....w.....w....',
    '................'
  ],
  goldfish: [
    '................',
    '.......f....ff..',
    '....fffff..fOf..',
    '..fffffffffOff..',
    '.fkfffffffOfff..',
    'fffffffffffOff..',
    '.fffffffffffOf..',
    '..ffffffff..ff..',
    '.....O..........',
    '................'
  ],
  boot: [
    '.......HHHHH....',
    '.......hwhwh....',
    '.......hhwhh....',
    '.......hwhwh....',
    '.......hhhhh....',
    '.......hhhhh....',
    '.hhhhhhhhhhh....',
    'hhhhhhhhhhhh....',
    'HHHHHHHHHHHH....',
    '.HH.......HH....'
  ],
  duck: [
    '................',
    '...YYY..........',
    '..YYkYY.........',
    'ooYYYYY.........',
    '.ooYYYY.....Y...',
    '....YYYYYYYYYY..',
    '...YYYYYYYYYYY..',
    '...YYYYYYYYYY...',
    '....YYYYYYYY....',
    '................'
  ],
  moonfish: [
    '........u.......',
    '......MMM...u...',
    '....mmmmmmm.....',
    '..mmmuummmmmm.MM',
    '.mkmmuummmmmmMMM',
    'mmmmmmmmmumMMMM.',
    '.mmmmmmmmmmmmMMM',
    '..mmmmmmmmmm..MM',
    '.u...M..M....u..',
    '................'
  ]
}

export const BOBBER = [
  '...k...',
  '..rrr..',
  '.rrrrr.',
  'rrrrrrr',
  'wwwwwww',
  '.wwwww.',
  '..www..'
]

export const BOBBER_DIP = [
  '.......',
  '.......',
  '.......',
  '...k...',
  '..rrr..',
  '.rrrrr.',
  '.......'
]

export const RIPPLE = [
  '..wwwwwww..',
  '.w.......w.',
  'w.........w',
  '.w.......w.',
  '..wwwwwww..'
]

export const BANG = [
  '.uu.',
  'uuuu',
  'uuuu',
  'uuuu',
  '.uu.',
  '.uu.',
  '....',
  '.uu.',
  '.uu.'
]

// Lake scene palettes per time of day.
export const SCENES = {
  dawn: {
    sky: ['#3f4c8c', '#7a6aa8', '#d98cae', '#f6b98a'],
    orb: '#fff1c1', orbAt: [14, 21], orbR: 4, stars: false, clouds: '#f7c9b6',
    hills: '#3b3f63', trees: '#2b2e4a',
    water: ['#4f5f9a', '#3e4c82', '#303c6a', '#243056'], glint: '#f8c9a8'
  },
  day: {
    sky: ['#4aa3df', '#6bb8ea', '#8fcdf2', '#b5e0f7'],
    orb: '#fff59d', orbAt: [50, 7], orbR: 4, stars: false, clouds: '#ffffff',
    hills: '#5a8f4e', trees: '#3d6b35',
    water: ['#3b8fc4', '#2f7bb0', '#256a9a', '#1c5883'], glint: '#d6f0ff'
  },
  dusk: {
    sky: ['#2c2250', '#6b3868', '#c65a5a', '#f28b4b'],
    orb: '#ffcc80', orbAt: [48, 22], orbR: 5, stars: false, clouds: '#e0795f',
    hills: '#3a2440', trees: '#2a1a30',
    water: ['#5b3a5e', '#48304f', '#372640', '#281c31'], glint: '#ffb07a'
  },
  night: {
    sky: ['#070b1d', '#0c1430', '#131d42', '#1b2753'],
    orb: '#eef2ff', orbAt: [48, 8], orbR: 4, stars: true, clouds: null,
    hills: '#101730', trees: '#0a1024',
    water: ['#142046', '#101a3a', '#0c152f', '#081025'], glint: '#c5cff5'
  }
}
