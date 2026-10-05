import { describe, expect, test } from 'claude-code/testing'

import { GROUPS, MINE, findPreset, isPalette, pickRandom, randomNeon, searchPresets, slug } from '../hooks/palette'

describe('findPreset', () => {
  test('matches exact names first, ignoring case and accents', () => {
    expect(findPreset('DRACULA')?.name).toBe('Dracula')
    expect(findPreset('canadiens de montreal')?.name).toBe('Canadiens de Montréal')
  })
  test('falls back to prefix, then substring', () => {
    expect(findPreset('jurassic')?.name).toBe('Jurassic Park')
    expect(findPreset('frontenac')?.name).toBe('Château Frontenac')
  })
  test('returns undefined for blank or unknown queries', () => {
    expect(findPreset('   ')).toBe(undefined)
    expect(findPreset('zzzz-not-a-theme')).toBe(undefined)
  })
})

describe('searchPresets', () => {
  test('finds by collection and caps the result', () => {
    const hits = searchPresets('hockey')
    expect(hits.length > 5).toBe(true)
    expect(hits.every(one => one.group === 'Hockey' || slug(one.name).includes('hockey'))).toBe(true)
    expect(searchPresets('a', [], 10).length).toBe(10)
  })
})

describe('collections', () => {
  test('end with the person\'s own', () => {
    expect(GROUPS[GROUPS.length - 1]).toBe(MINE)
  })
  test('pickRandom stays inside a collection', () => {
    const pick = pickRandom('zodiac', () => 0.5)
    expect(pick?.group).toBe('Zodiac')
  })
})

describe('isPalette', () => {
  test('accepts the mixer\'s output and rejects junk', () => {
    expect(isPalette(randomNeon(() => 0.3))).toBe(true)
    expect(isPalette({ id: 'x', name: 'x', group: 'x', accent: 'red' })).toBe(false)
    expect(isPalette(null)).toBe(false)
  })
})
