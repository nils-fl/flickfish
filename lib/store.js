import { LocalStorage } from '@zos/storage'
import { migrate } from './game.js'

const KEY = 'flickfish'
const storage = new LocalStorage()

export function load() {
  try {
    const raw = storage.getItem(KEY)
    if (raw) return migrate(JSON.parse(raw))
  } catch (e) {
    console.log('flickfish: unreadable save, starting fresh')
  }
  return migrate(null)
}

export function save(s) {
  storage.setItem(KEY, JSON.stringify(s))
}
