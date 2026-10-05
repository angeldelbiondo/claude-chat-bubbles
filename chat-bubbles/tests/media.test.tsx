import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { blocksOf, carriesMedia, hasMedia, remember } from '../hooks/media'
import { ENGINE_ROW, image, text } from './helpers'

const ENGINE = { timeoutMs: 20_000 }

describe('media record', () => {
  test('hasMedia is true for anything but text', () => {
    expect(hasMedia([text('hi')])).toBe(false)
    expect(hasMedia([image, text('hi')])).toBe(true)
    expect(hasMedia([text('hi'), { type: 'document' }])).toBe(true)
  })

  test('a plain prompt is stored as a bare string, one with media as blocks', () => {
    expect(blocksOf('hola')).toEqual([{ type: 'text', text: 'hola' }])
    expect(hasMedia(blocksOf('hola'))).toBe(false)
    expect(blocksOf([image, text('hola')]).length).toBe(2)
    expect(blocksOf(undefined)).toEqual([])
  })

  test('a long prompt is keyed by its start only', () => {
    const log = 'x'.repeat(50_000)
    const seen = remember({}, 'long-1', blocksOf(log))
    expect(Object.keys(seen).every(k => k.length <= 200)).toBe(true)
    expect(carriesMedia(seen, 'nope', log)).toBe(false)
  })

  test('a prompt is found by id or by text, and media wins', () => {
    let seen = remember({}, 'a1', [text('plain one')])
    seen = remember(seen, 'a2', [image, text('with picture'), text('[Image: source: x.png]')])
    expect(carriesMedia(seen, 'a1', 'whatever')).toBe(false)
    expect(carriesMedia(seen, 'nope', 'plain one')).toBe(false)
    expect(carriesMedia(seen, 'a2', '')).toBe(true)
    expect(carriesMedia(seen, 'nope', 'with picture')).toBe(true)
    seen = remember(seen, 'a3', [text('with picture')])
    expect(carriesMedia(seen, 'nope', 'with picture')).toBe(true)
  })

  test('a prompt never seen is unknown, and the record stays bounded', () => {
    expect(carriesMedia({}, 'never', 'never typed this')).toBe(undefined)
    let seen = {}
    for (let i = 0; i < 2100; i++) seen = remember(seen, `id-${i}`, [text(`t-${i}`)])
    expect(Object.keys(seen).length <= 2000).toBe(true)
    expect(carriesMedia(seen, 'id-2099', '')).toBe(false)
  })
})

const mountPrompt = async ($: Engine, requestId: string, body: string) => {
  await $.command.run({ command: 'bubbles', args: 'matrix', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
  return $.ui.mount({
    plugin: 'chat-bubbles',
    surface: 'desktop',
    component: 'UserMessage',
    requestId,
    props: { text: body, origin: { kind: 'sdk' }, isExpanded: true },
  })
}

describe('the prompt row on desktop', () => {
  test('a prompt never seen gets the app row and the bubble, so nothing is lost', ENGINE, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, ENGINE_ROW)
    const ui = await mountPrompt($, 'unknown-1', 'de una sesión retomada')
    expect(await ui.find({ type: 'engine' })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: 'de una sesión retomada' })).toBeTruthy()
  })

  // Measured on the desktop app: a Box around the app's row shrinks it and breaks
  // its own right alignment (the image drifted to the middle, the empty pill to
  // the left), so the row is drawn bare and the bubble is pulled up over its pill.
  test('the app row is bare and the bubble is pulled up over its empty pill', ENGINE, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, ENGINE_ROW)
    const ui = await mountPrompt($, 'unknown-2', 'con adjunto')
    const bubble = await ui.find({ type: 'Box', key: 'you-bubble' })
    expect(bubble?.props.marginTop).toBe(-5)
    expect(bubble?.props.position).toBe('relative')
    // no wrapper Box around the app's row: none of the boxes pulls anything with a bottom margin
    const boxes = await ui.findAll({ type: 'Box' })
    expect(boxes.some(b => b.props.marginBottom !== undefined)).toBe(false)
  })

  test('an image with no text is the app row alone', ENGINE, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, ENGINE_ROW)
    const ui = await mountPrompt($, 'img-2', '')
    expect(await ui.find({ type: 'engine' })).toBeTruthy()
    expect(await ui.find({ type: 'Box', key: 'you-bubble' })).toBe(undefined)
  })
})
