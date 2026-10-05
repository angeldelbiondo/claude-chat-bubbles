// Palette helpers: lookup, validation of stored data, the mixer's random
// neon. Pure functions over the preset table.

import type { Palette } from '../types'
import { hslToHex, isHex } from './color'
import { PRESETS } from './presets'

export const MINE = 'My themes'

/** Collections in table order, then the person's own. */
export const GROUPS: readonly string[] = [...new Set(PRESETS.map(one => one.group)), MINE]

export const DEFAULT_CUSTOM: Palette = {
  id: 'custom',
  name: 'Custom',
  group: MINE,
  accent: '#ff2bd6',
  secondary: '#00f0ff',
  highlight: '#fffb00',
  text: '#f5e9ff',
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** True for a well-formed palette, so a hand-edited or stale store can't break drawing. */
export const isPalette = (v: unknown): v is Palette => {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.group === 'string' &&
    isHex(o.accent) &&
    isHex(o.secondary) &&
    isHex(o.highlight) &&
    isHex(o.text) &&
    (o.background === undefined || isHex(o.background))
  )
}

/** Exact name first, then accent-insensitive prefix, then substring. */
export const findPreset = (query: string, mine: readonly Palette[] = []): Palette | undefined => {
  const q = slug(query)
  if (!q) return undefined
  const all = [...PRESETS, ...mine]
  return (
    all.find(one => slug(one.name) === q) ??
    all.find(one => slug(one.name).startsWith(q)) ??
    all.find(one => slug(one.name).includes(q))
  )
}

/** Every theme whose name or collection matches, best first, at most `limit`. */
export const searchPresets = (query: string, mine: readonly Palette[] = [], limit = 30): Palette[] => {
  const q = slug(query)
  if (!q) return []
  const all = [...PRESETS, ...mine]
  const score = (one: Palette) => {
    const n = slug(one.name)
    if (n === q) return 0
    if (n.startsWith(q)) return 1
    if (n.includes(q)) return 2
    return slug(one.group).includes(q) ? 3 : 9
  }
  return all
    .map(one => ({ one, s: score(one) }))
    .filter(x => x.s < 9)
    .sort((a, b) => a.s - b.s)
    .slice(0, limit)
    .map(x => x.one)
}

export const inGroup = (group: string, mine: readonly Palette[] = []): Palette[] =>
  group === MINE ? [...mine] : PRESETS.filter(one => one.group === group)

/** A random pick, optionally from one collection; `rand` is injectable for tests. */
export const pickRandom = (group?: string, rand: () => number = Math.random): Palette | undefined => {
  const pool = group ? PRESETS.filter(one => slug(one.group) === slug(group)) : PRESETS
  return pool[Math.floor(rand() * pool.length)]
}

/** A split-complementary neon palette around a random hue. */
export const randomNeon = (rand: () => number = Math.random): Palette => {
  const h = Math.floor(rand() * 360)
  return {
    ...DEFAULT_CUSTOM,
    name: 'Random neon',
    accent: hslToHex(h, 1, 0.58),
    secondary: hslToHex((h + 150) % 360, 1, 0.55),
    highlight: hslToHex((h + 60) % 360, 1, 0.6),
    text: hslToHex(h, 0.6, 0.94),
  }
}
