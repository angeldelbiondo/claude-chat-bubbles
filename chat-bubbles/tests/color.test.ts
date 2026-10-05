import { describe, expect, test } from 'claude-code/testing'

import { contrast, ensureContrast, hueOf, inkOn, isCool, isHex, loopGradient, mix, normalizeHex } from '../hooks/color'
import { lookOf } from '../hooks/look'
import { PRESETS } from '../hooks/presets'

describe('normalizeHex', () => {
  test('accepts 3 and 6 digits, with or without #, any case', () => {
    expect(normalizeHex('#FF2BD6')).toBe('#ff2bd6')
    expect(normalizeHex('f0f')).toBe('#ff00ff')
    expect(normalizeHex('  #abc ')).toBe('#aabbcc')
  })
  test('rejects anything else', () => {
    expect(normalizeHex('red')).toBe(null)
    expect(normalizeHex('#12345')).toBe(null)
    expect(normalizeHex('')).toBe(null)
  })
})

describe('contrast', () => {
  test('matches the WCAG extremes', () => {
    expect(Math.round(contrast('#000000', '#ffffff'))).toBe(21)
    expect(contrast('#777777', '#777777')).toBe(1)
  })
  test('ensureContrast reaches the bar and leaves passing colors alone', () => {
    expect(contrast(ensureContrast('#fff07a', '#f7f6f2', 4.5), '#f7f6f2') >= 4.5).toBe(true)
    expect(ensureContrast('#ffffff', '#000000', 4.5)).toBe('#ffffff')
  })
  test('inkOn picks the readable ink', () => {
    expect(inkOn('#ffd23f')).toBe('#111111')
    expect(inkOn('#1d1d6b')).toBe('#ffffff')
  })
})

describe('mix and gradients', () => {
  test('mix interpolates and clamps', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mix('#000000', '#ffffff', 2)).toBe('#ffffff')
  })
  test('loopGradient yields steps per stop', () => {
    expect(loopGradient(['#000000', '#ffffff'], 4).length).toBe(8)
  })
})

describe('rival color', () => {
  test('a cool theme gets a warm bubble and a warm theme a cool one', () => {
    expect(isCool('#00ff41')).toBe(true)
    expect(isCool('#ff2bd6')).toBe(false)
    expect(hueOf(lookOf(PRESETS.find(p => p.name === 'The Matrix')!, 'dark').you) < 60).toBe(true)
    expect(hueOf(lookOf(PRESETS.find(p => p.name === "Synthwave '84")!, 'dark').you) > 180).toBe(true)
  })
})

describe('every preset', () => {
  test('is well formed and uniquely named', () => {
    const names = new Set<string>()
    for (const one of PRESETS) {
      expect([one.accent, one.secondary, one.highlight, one.text].every(isHex)).toBe(true)
      expect(names.has(one.name.toLowerCase())).toBe(false)
      names.add(one.name.toLowerCase())
    }
  })
  test('stays readable on dark and light canvases', () => {
    for (const one of PRESETS) {
      for (const base of ['dark', 'light'] as const) {
        const look = lookOf(one, base)
        expect(contrast(look.text, look.replyBg) >= 4.5).toBe(true)
        expect(contrast(look.youText, look.youBg) >= 4.5).toBe(true)
        expect(contrast(look.you, look.youBg) >= 3).toBe(true)
        expect(contrast(look.accent, look.replyBg) >= 3).toBe(true)
      }
    }
  })
})
