import { getDeviceInfo, SCREEN_SHAPE_ROUND } from '@zos/device'
import { SQUARE, ROUND } from './layout.js'

// Round watches get the round layout; widgets use px() on its 480 px design width.
export const IS_ROUND = getDeviceInfo().screenShape === SCREEN_SHAPE_ROUND
export const L = IS_ROUND ? ROUND : SQUARE
