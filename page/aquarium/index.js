import { createWidget, widget, align, text_style, setStatusBarVisible } from '@zos/ui'
import { px } from '@zos/utils'
import { SPECIES, sizeLabel } from '../../lib/game.js'
import { load } from '../../lib/store.js'

const W = 390
const COLS = 3
const CELL_W = 106
const CELL_H = 116
const GRID_X = (W - COLS * CELL_W) / 2
const GRID_Y = 118
const WATER = 0x0b2135

Page({
  build() {
    setStatusBarVisible(false)
    const save = load()
    const rows = Math.ceil(SPECIES.length / COLS)
    const height = GRID_Y + rows * CELL_H + 40

    createWidget(widget.FILL_RECT, { x: 0, y: 0, w: px(W), h: px(height), color: WATER })

    const text = (x, y, w, h, str, size, color) =>
      createWidget(widget.TEXT, {
        x: px(x), y: px(y), w: px(w), h: px(h), text: str, text_size: px(size), color,
        align_h: align.CENTER_H, align_v: align.CENTER_V, text_style: text_style.ELLIPSIS
      })

    const caught = SPECIES.filter((f) => save.fish[f.id]).length
    text(0, 44, W, 36, 'Aquarium', 30, 0xffffff)
    text(0, 80, W, 26, `${caught}/${SPECIES.length} species · ${save.total} caught`, 17, 0x90caf9)

    SPECIES.forEach((f, i) => {
      const x = GRID_X + (i % COLS) * CELL_W
      const y = GRID_Y + Math.floor(i / COLS) * CELL_H
      const rec = save.fish[f.id]
      createWidget(widget.FILL_RECT, { x: px(x + 4), y: px(y + 4), w: px(CELL_W - 8), h: px(CELL_H - 8), radius: px(14), color: 0x12304a })
      createWidget(widget.IMG, { x: px(x + (CELL_W - 64) / 2), y: px(y + 12), src: `fish/${f.id}${rec ? '_s' : '_q'}.png` })
      const nameColor = !rec ? 0x546e7a : f.legendary ? 0xffd54f : 0xffffff
      text(x + 4, y + 56, CELL_W - 8, 24, rec ? f.name : '???', 15, nameColor)
      text(x + 4, y + 80, CELL_W - 8, 22, rec ? `×${rec.count} · ${sizeLabel(f, rec.best).replace('EU size', 'EU').replace(' cm', 'cm')}` : '', 14, 0x90a4ae)
    })
  }
})
