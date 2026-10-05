// Engine tests: the plugin loaded by the engine's own host, its hooks drawn on
// the surfaces a person uses.

import { describe, expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const

// The first engine test pays for the host's cold start; on a busy machine that
// can pass the default 5 s, so engine tests get room.
const ENGINE = { timeoutMs: 20_000 }

/** `/theme <args>` as the person would type it at an 80-column terminal. */
const theme = ($: Engine, args: string) =>
  $.command.run({
    command: 'bubbles',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })

describe('/theme', () => {
  test('applies a theme by name and reports it', ENGINE, async $ => {
    const done = await theme($, 'dracula')
    expect(done.text).toContain('Dracula')
  })

  test('lists every collection', ENGINE, async $ => {
    const done = await theme($, 'list')
    expect(done.text).toContain('Hockey')
    expect(done.text).toContain('Dev Classics')
  })

  test('suggests close names for a typo', ENGINE, async $ => {
    const done = await theme($, 'drakula')
    expect(done.text).toContain('No theme matches')
  })

  test('rejects a bad background and accepts a hex', ENGINE, async $ => {
    expect((await theme($, 'bg nope')).text).toContain("isn't a hex color")
    expect((await theme($, 'bg #1a1a2e')).text).toContain('#1a1a2e')
    expect((await theme($, 'bg auto')).text).toContain('Background back')
  })
})

describe('drawing', () => {
  test('a prompt is redrawn as a right-hand bubble in the terminal', ENGINE, async $ => {
    await theme($, 'matrix')
    const ui = await $.ui.mount({
      plugin: 'chat-bubbles',
      surface: 'terminal',
      component: 'UserMessage',
      props: { text: 'make it pop', origin: { kind: 'composer' }, isExpanded: true },
    })
    expect(await ui.find({ type: 'Text', text: 'make it pop' })).toBeTruthy()
    expect(await ui.find({ type: 'Box', key: 'you-bubble' })).toBeTruthy()
  })

  // The engine's own row is a leaf node, and the engine refuses a tree that
  // sets `width` or `minWidth` on any Box above it (then it draws its own row,
  // unchanged). A stand-in Text would not catch that, so these use the real
  // kind of node.
  for (const [surface, isExpanded] of [['desktop', true], ['terminal', false]] as const) {
    test(`a prompt wraps the engine's own row without a refused tree on ${surface}`, ENGINE, async ($, on) => {
      on('ui.render', { component: 'UserMessage' }, () => ({ type: 'engine', ref: 0 }) as never)
      await theme($, 'matrix')
      const ui = await $.ui.mount({
        plugin: 'chat-bubbles',
        surface,
        component: 'UserMessage',
        props: { text: 'look at this', origin: { kind: 'sdk' }, isExpanded },
      })
      expect(await ui.find({ type: 'Box', key: 'you-bubble' })).toBeTruthy()
    })
  }

  test('on desktop tool rows are left to the engine: no empty stripe', ENGINE, async ($, on) => {
    on('ui.render', { component: 'ToolGroup' }, ($, e) => {
      const { Text } = $.ui.resolve(e)
      return <Text>engine group</Text>
    })
    await theme($, 'matrix')
    const ui = await $.ui.mount({
      plugin: 'chat-bubbles',
      surface: 'desktop',
      component: 'ToolGroup',
      props: { calls: [], isActive: true, isExpanded: false },
    })
    expect(await ui.find({ type: 'Text', text: '▍' })).toBe(undefined)
  })

  for (const surface of SURFACES) {

    test(`a reply is painted in theme colors on ${surface}`, ENGINE, async $ => {
      await theme($, 'nord')
      const ui = await $.ui.mount({
        plugin: 'chat-bubbles',
        surface,
        component: 'AssistantMessage',
        props: { text: '# Plan\n- one **bold** step\n- `code` here', isFirstOfReply: true },
      })
      expect(await ui.find({ type: 'Text', text: '✦ Claude' })).toBeTruthy()
      expect(await ui.find({ type: 'Text', text: 'bold' })).toBeTruthy()
    })

    test(`the footer chip opens the studio on ${surface}`, ENGINE, async ($, on) => {
      const opened: { id: string; columns?: number; focus?: true }[] = []
      // Stand in for the engine's pane host and record what the click asked for.
      on('ui.open', (_$, e) => {
        opened.push({ id: e.id, columns: e.columns, focus: e.focus })
        return { value: { isPlaced: true } }
      })
      await theme($, 'dracula')
      const ui = await $.ui.mount({
        plugin: 'chat-bubbles',
        surface,
        component: 'SessionMode',
        props: { modes: ['accept edits on'] },
      })
      const chip = await ui.find({ type: 'Button', key: 'open-studio' })
      expect(chip?.props.label).toBe('🎨 Dracula')
      await ui.press({ key: 'open-studio' })
      expect(opened).toEqual([{ id: 'chat-bubbles', columns: 64, focus: true }])
    })

    test(`with no theme the engine draws its own on ${surface}`, ENGINE, async ($, on) => {
      // Stand in for the engine's own drawing beneath the plugin.
      on('ui.render', { component: 'UserMessage' }, ($, e) => {
        const { Text } = $.ui.resolve(e)
        return <Text>engine row</Text>
      })
      await theme($, 'off')
      const ui = await $.ui.mount({
        plugin: 'chat-bubbles',
        surface,
        component: 'UserMessage',
        props: { text: 'plain', origin: { kind: 'sdk' }, isExpanded: true },
      })
      expect(await ui.find({ type: 'Box', key: 'you-bubble' })).toBe(undefined)
      expect(await ui.find({ type: 'Text', text: 'engine row' })).toBeTruthy()
    })
  }
})
