import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import { blocksOf, clean, hasMedia, remember } from '../hooks/media'
import { ENGINE_ROW, id, image, store, text } from './helpers'

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

  test('only the row id and a yes/no are kept, never any text', () => {
    const seen = remember(remember({}, id(1), [text('secreto')]), id(2), [image, text('foto privada [Image: source: x.png]')])
    expect(seen).toEqual({ [id(1)]: false, [id(2)]: true })
  })

  test('text keys left by an older version (in session state or in the store) are dropped', () => {
    const dirty = { 'ahora se ve asi': true, 't:hola estoy probando': false, [id(3)]: true, [id(4)]: 'si', loose: false }
    expect(clean(dirty)).toEqual({ [id(3)]: true })
    expect(remember(dirty as never, id(5), [text('x')])).toEqual({ [id(3)]: true, [id(5)]: false })
  })

  test('an unseen row is unknown, and the record stays bounded', () => {
    expect(remember({}, id(1), [text('x')])[id(9)]).toBe(undefined)
    let seen = {}
    for (let i = 0; i < 2100; i++) seen = remember(seen, id(i), [text(`t-${i}`)])
    expect(Object.keys(seen).length).toBe(2000)
    expect((seen as Record<string, boolean>)[id(2099)]).toBe(false)
    expect((seen as Record<string, boolean>)[id(0)]).toBe(undefined)
  })
})

/** Mounts a prompt on desktop, once the theme is on. */
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

// The canvas of the dark base, which the Matrix theme in these tests resolves to.
const CANVAS = '#15151b'

describe('the prompt row on desktop', () => {
  test('a prompt the mod never saw is left to the app: nothing lost, no pill', ENGINE, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, ENGINE_ROW)
    const ui = await mountPrompt($, id(20), 'de antes de instalar')
    expect(await ui.find({ type: 'engine' })).toBeTruthy()
    expect(await ui.find({ type: 'Box', key: 'you-bubble' })).toBe(undefined)
  })

  test('a prompt stored with text only is just the bubble, with no plate', ENGINE, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, ENGINE_ROW)
    await store($, id(21), 'solo texto')
    const ui = await mountPrompt($, id(21), 'solo texto')
    expect(await ui.find({ type: 'engine' })).toBe(undefined)
    expect(await ui.find({ type: 'Text', text: 'solo texto' })).toBeTruthy()
    const boxes = await ui.findAll({ type: 'Box' })
    expect(boxes.some(b => b.props.backgroundColor === CANVAS)).toBe(false)
  })

  test('a slash command row is just the bubble too', ENGINE, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, ENGINE_ROW)
    await store($, id(22), [text('<command-name>/reload-plugins</command-name>')], 'command')
    const ui = await mountPrompt($, id(22), '/reload-plugins')
    expect(await ui.find({ type: 'engine' })).toBe(undefined)
    expect(await ui.find({ type: 'Text', text: '/reload-plugins' })).toBeTruthy()
  })

  // Measured on the desktop app: a Box around the app's row shrinks it and breaks
  // its own right alignment (the image drifted to the middle, the empty pill to
  // the left), so the row is drawn bare and the bubble is pulled up over its pill.
  // The bubble's rounded corners are transparent and the pill showed through the
  // top-right one, so the bubble sits on a plate of the canvas color.
  test('a prompt with an image: bare app row, bubble pulled up over the pill on a canvas plate', ENGINE, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, ENGINE_ROW)
    await store($, id(23), [image, text('mira esto'), text('[Image: source: x.png]')])
    const ui = await mountPrompt($, id(23), 'mira esto')
    expect(await ui.find({ type: 'engine' })).toBeTruthy()
    expect(await ui.find({ type: 'Text', text: 'mira esto' })).toBeTruthy()
    const bubble = await ui.find({ type: 'Box', key: 'you-bubble' })
    expect(bubble?.props.marginTop).toBe(-4.7)
    expect(bubble?.props.position).toBe('relative')
    const boxes = await ui.findAll({ type: 'Box' })
    expect(boxes.some(b => b.props.backgroundColor === CANVAS)).toBe(true)
    // no wrapper Box around the app's row: none of the boxes pulls anything with a bottom margin
    expect(boxes.some(b => b.props.marginBottom !== undefined)).toBe(false)
  })

  test('an image with no text is the app row alone', ENGINE, async ($, on) => {
    on('ui.render', { component: 'UserMessage' }, ENGINE_ROW)
    await store($, id(24), [image])
    const ui = await mountPrompt($, id(24), '')
    expect(await ui.find({ type: 'engine' })).toBeTruthy()
    expect(await ui.find({ type: 'Box', key: 'you-bubble' })).toBe(undefined)
  })
})
