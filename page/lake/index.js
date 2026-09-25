import { createWidget, widget, prop, event, align, text_style, setStatusBarVisible } from '@zos/ui'
import { onGesture, offGesture, GESTURE_UP } from '@zos/interaction'
import { push } from '@zos/router'
import { setPageBrightTime, pauseDropWristScreenOff } from '@zos/display'
import {
  Accelerometer, Vibrator, FREQ_MODE_NORMAL,
  VIBRATOR_SCENE_SHORT_LIGHT, VIBRATOR_SCENE_SHORT_MIDDLE, VIBRATOR_SCENE_SHORT_STRONG
} from '@zos/sensor'
import { px } from '@zos/utils'
import * as G from '../../lib/game.js'
import { createFlick, feed } from '../../lib/flick.js'
import { load, save } from '../../lib/store.js'

// Shows live accelerometer magnitude/baseline at the bottom, for tuning FLICK_RATIO.
const DEBUG_ACCEL = false

const W = 390
const LOOP_MS = 80
const ROD_TIP = { x: 46 * 6 + 3, y: 52 * 6 + 3 } // matches ROD_TIP in tools/gen-sprites.mjs
const REEL_END = { x: 262, y: 300 } // where a reeled-in fish reaches the rod
const BOBBER = { w: 28, h: 28 }
const LINE_DOTS = 10
const BAR = { x: 60, w: 270 }

const VIBRATION = {
  cast: VIBRATOR_SCENE_SHORT_LIGHT,
  nibble: VIBRATOR_SCENE_SHORT_LIGHT,
  bite: VIBRATOR_SCENE_SHORT_STRONG,
  hook: VIBRATOR_SCENE_SHORT_MIDDLE,
  pull: VIBRATOR_SCENE_SHORT_MIDDLE,
  catch: VIBRATOR_SCENE_SHORT_STRONG,
  fail: VIBRATOR_SCENE_SHORT_MIDDLE
}

const TOD_HINT = {
  dawn: 'Dawn · trout are rising',
  day: 'Day · koi glimmer in the sun',
  dusk: 'Dusk · pike are hunting',
  night: 'Night · something big stirs…'
}

const RESULT_TEXT = {
  missed: ['It got away…', 'Flick faster when it bites'],
  spooked: ['Too early!', 'Nibbles are fake-outs'],
  snapped: ['Snap! Line broke', "Don't reel while it pulls"],
  escaped: ['It escaped!', 'Reel faster between pulls']
}

const text = (opts) =>
  createWidget(widget.TEXT, {
    x: 0, w: px(W), align_h: align.CENTER_H, align_v: align.CENTER_V, text_style: text_style.NONE,
    text: '', ...opts
  })

Page({
  state: {},

  onInit() {
    this.save = load()
    this.session = G.newSession()
    this.flick = createFlick()
    this.act = false
    this.cache = new Map()
    this.spot = { x: 180, y: 240 }
    this.card = null
  },

  build() {
    setStatusBarVisible(false)
    setPageBrightTime({ brightTime: 60 * 1000 })
    const onTap = () => {
      this.act = true
    }

    this.tod = G.timeOfDay(new Date().getHours())
    this.bg = createWidget(widget.IMG, { x: 0, y: 0, w: px(W), h: px(450), src: `scene/${this.tod}.png` })
    this.bg.addEventListener(event.CLICK_UP, onTap)

    this.clock = text({ y: px(10), h: px(28), color: 0xffffff, text_size: px(22) })
    this.title = text({ y: px(44), h: px(36), color: 0xffffff, text_size: px(30) })
    this.sub = text({ y: px(80), h: px(26), color: 0xe0e0e0, text_size: px(18) })

    this.reelBg = createWidget(widget.FILL_RECT, { x: px(BAR.x), y: px(114), w: px(BAR.w), h: px(12), radius: px(6), color: 0x1a1a2e })
    this.reelFg = createWidget(widget.FILL_RECT, { x: px(BAR.x), y: px(114), w: px(12), h: px(12), radius: px(6), color: 0x66bb6a })
    this.tenseBg = createWidget(widget.FILL_RECT, { x: px(BAR.x), y: px(132), w: px(BAR.w), h: px(8), radius: px(4), color: 0x1a1a2e })
    this.tenseFg = createWidget(widget.FILL_RECT, { x: px(BAR.x), y: px(132), w: px(8), h: px(8), radius: px(4), color: 0xffca28 })

    this.dots = Array.from({ length: LINE_DOTS }, () =>
      createWidget(widget.FILL_RECT, { x: 0, y: 0, w: px(3), h: px(3), color: 0xeeeeee })
    )
    this.ripple = createWidget(widget.IMG, { x: 0, y: 0, src: 'ui/ripple.png' })
    this.bobber = createWidget(widget.IMG, { x: 0, y: 0, src: 'ui/bobber.png' })
    this.bobber.addEventListener(event.CLICK_UP, onTap)
    this.bang = createWidget(widget.IMG, { x: 0, y: 0, src: 'ui/bang.png' })

    this.hint = text({ y: px(414), h: px(24), color: 0xcfd8dc, text_size: px(16), text: 'Swipe up for your aquarium' })
    this.debug = text({ y: px(390), h: px(22), color: 0xffff00, text_size: px(16) })

    // Catch card, created last so it draws on top.
    this.cardPanel = createWidget(widget.FILL_RECT, { x: px(45), y: px(104), w: px(300), h: px(250), radius: px(24), color: 0x0e1a26 })
    this.cardPanel.addEventListener(event.CLICK_UP, onTap)
    this.cardFish = createWidget(widget.IMG, { x: px(147), y: px(124), src: 'fish/minnow.png' })
    this.cardName = text({ y: px(192), h: px(36), color: 0xffffff, text_size: px(28) })
    this.cardSize = text({ y: px(228), h: px(28), color: 0xb0bec5, text_size: px(22) })
    this.cardBadge = text({ y: px(260), h: px(30), color: 0xffd54f, text_size: px(24) })
    this.cardHint = text({ y: px(304), h: px(26), color: 0x90a4ae, text_size: px(18), text: 'Flick to cast again' })
    this.cardWidgets = [this.cardPanel, this.cardFish, this.cardName, this.cardSize, this.cardBadge, this.cardHint]

    this.accel = new Accelerometer()
    this.onAccel = () => {
      if (feed(this.flick, this.accel.getCurrent(), Date.now())) this.flicked = true
    }
    this.accel.onChange(this.onAccel)
    this.accel.setFreqMode(FREQ_MODE_NORMAL)
    this.accel.start()
    this.vibrator = new Vibrator()

    onGesture({
      callback: (e) => {
        if (e === GESTURE_UP && this.canLeave()) {
          push({ url: 'page/aquarium/index' })
          return true
        }
        return false
      }
    })

    this.loop = setInterval(() => this.frame(), LOOP_MS)
    this.frame()
  },

  canLeave() {
    const st = this.session.state
    return st === 'idle' || !!RESULT_TEXT[st] || st === 'caught'
  },

  frame() {
    const now = Date.now()
    const hour = new Date(now).getHours()
    // Flicks hook and cast; while reeling only taps count, so wrist movement doesn't add tension.
    const act = this.act || (this.flicked && this.session.state !== 'reeling')
    this.act = false
    this.flicked = false

    const fx = G.step(this.session, now, act, Math.random, hour)
    for (const f of fx) this.effect(f, now)
    this.render(now, hour)
  },

  effect(f, now) {
    const mode = VIBRATION[f]
    if (mode !== undefined) {
      try {
        this.vibrator.stop()
        this.vibrator.start({ mode })
      } catch (e) {}
    }
    if (f === 'cast') {
      pauseDropWristScreenOff({ duration: 60 * 1000 })
      this.save.casts += 1
      this.spot = { x: 120 + Math.random() * 120, y: 215 + Math.random() * 50 }
      this.card = null
      save(this.save)
    }
    if (f === 'catch') {
      const s = this.session
      this.card = { fish: s.fish, size: s.size, ...G.recordCatch(this.save, s.fish, s.size, now) }
      save(this.save)
    }
  },

  // setProperty only when a value changed.
  set(w, key, value) {
    const k = this.cache.get(w) || {}
    const v = typeof value === 'object' ? JSON.stringify(value) : value
    if (k[key] === v) return
    k[key] = v
    this.cache.set(w, k)
    w.setProperty(prop[key], value)
  },

  show(w, visible) {
    this.set(w, 'VISIBLE', visible)
  },

  render(now, hour) {
    const s = this.session
    const st = s.state
    const f = s.fish && G.BY_ID[s.fish]

    const tod = G.timeOfDay(hour)
    if (tod !== this.tod) {
      this.tod = tod
      this.set(this.bg, 'SRC', `scene/${tod}.png`)
    }
    const d = new Date(now)
    this.set(this.clock, 'TEXT', `${d.getHours()}:${d.getMinutes() < 10 ? '0' : ''}${d.getMinutes()}`)

    // Headline texts.
    let title = ''
    let sub = ''
    if (st === 'idle') [title, sub] = ['Flick to cast', TOD_HINT[tod]]
    else if (st === 'waiting') [title, sub] = ['Wait for the bite…', "Don't flick on nibbles!"]
    else if (st === 'bite') [title, sub] = ['BITE! Flick!', '']
    else if (st === 'reeling')
      [title, sub] = G.isPulling(s, now) ? ["It's pulling!", 'Hold on… wait for calm'] : ['Reel it in!', 'Tap to reel · pause when it buzzes']
    else if (RESULT_TEXT[st]) [title, sub] = RESULT_TEXT[st]
    this.set(this.title, 'TEXT', title)
    this.set(this.sub, 'TEXT', sub)
    this.set(this.title, 'COLOR', st === 'bite' ? 0xffd54f : 0xffffff)

    // Reel and tension bars.
    const reeling = st === 'reeling'
    for (const w of [this.reelBg, this.reelFg, this.tenseBg, this.tenseFg]) this.show(w, reeling)
    if (reeling) {
      const pw = Math.max(12, Math.round((BAR.w * s.progress) / 100))
      this.set(this.reelFg, 'MORE', { x: px(BAR.x), y: px(114), w: px(pw), h: px(12) })
      const tw = Math.max(8, Math.round((BAR.w * Math.min(100, s.tension)) / 100))
      this.set(this.tenseFg, 'MORE', {
        x: px(BAR.x), y: px(132), w: px(tw), h: px(8),
        color: s.tension > 65 ? 0xe53935 : s.tension > 30 ? 0xffa726 : 0xffca28
      })
    }

    // Bobber, ripple, "!" and fishing line.
    const inWater = st === 'waiting' || st === 'bite' || reeling
    let bx = this.spot.x
    let by = this.spot.y
    if (reeling) {
      const t = s.progress / 100
      bx += (REEL_END.x - bx) * t
      by += (REEL_END.y - by) * t
      if (G.isPulling(s, now)) bx += Math.floor(now / 60) % 2 ? 4 : -4
    } else if (st === 'waiting') {
      by += Math.floor(now / 500) % 2 ? 2 : 0
      if (G.isNibbling(s, now)) by += 4
    }
    bx = Math.round(bx)
    by = Math.round(by)
    this.show(this.bobber, inWater)
    this.show(this.ripple, inWater && (st !== 'waiting' || G.isNibbling(s, now)))
    this.show(this.bang, st === 'bite')
    if (inWater) {
      this.set(this.bobber, 'SRC', st === 'bite' || reeling ? 'ui/bobber_dip.png' : 'ui/bobber.png')
      this.set(this.bobber, 'MORE', { x: px(bx), y: px(by) })
      this.set(this.ripple, 'MORE', { x: px(bx - 8), y: px(by + 18) })
      this.set(this.bang, 'MORE', { x: px(bx + 6), y: px(by - 44) })
    }
    this.dots.forEach((dot, i) => {
      this.show(dot, inWater)
      if (!inWater) return
      const t = (i + 1) / (LINE_DOTS + 1)
      const sag = Math.sin(t * Math.PI) * (reeling ? 4 : 14)
      const x = ROD_TIP.x + (bx + BOBBER.w / 2 - ROD_TIP.x) * t
      const y = ROD_TIP.y + (by + 4 - ROD_TIP.y) * t + sag
      this.set(dot, 'MORE', { x: px(Math.round(x)), y: px(Math.round(y)) })
    })

    // Catch card.
    const card = st === 'caught' && this.card
    this.cardWidgets.forEach((w) => this.show(w, !!card))
    if (card) {
      const cf = G.BY_ID[card.fish]
      this.set(this.cardFish, 'SRC', `fish/${card.fish}.png`)
      this.set(this.cardName, 'TEXT', cf.legendary ? `★ ${cf.name} ★` : cf.name)
      this.set(this.cardName, 'COLOR', cf.legendary ? 0xffd54f : 0xffffff)
      this.set(this.cardSize, 'TEXT', G.sizeLabel(cf, card.size))
      this.set(this.cardBadge, 'TEXT', card.isNew ? 'NEW!' : card.isRecord ? 'Record!' : `Caught ×${this.save.fish[card.fish].count}`)
    }
    this.show(this.hint, this.canLeave() && !card)

    this.show(this.debug, DEBUG_ACCEL)
    if (DEBUG_ACCEL) this.set(this.debug, 'TEXT', `mag ${Math.round(this.flick.mag)} base ${Math.round(this.flick.base)}`)
  },

  onDestroy() {
    clearInterval(this.loop)
    try {
      this.accel.offChange(this.onAccel)
      this.accel.stop()
      this.vibrator.stop()
    } catch (e) {}
    offGesture()
    save(this.save)
  }
})
