// Chat Bubbles: Claude Code's chat laid out like a messenger. Your prompts are a
// bubble on the right in a rival color, Claude's replies a quiet card on the left,
// and only running or failing tools stand out. Colors come from 441 palettes or
// one you mix. `/bubbles` opens the studio; `/bubbles help` lists the commands.
// Forked from Theme Studio by Alliance Optima (MIT).

import { atom, read, update } from 'claude-code'
import type { ElementTable, EngineInterface, Register, RenderNode, Timer } from 'claude-code'

import type { BaseMode, MessageStyle, Palette, PromptStyle } from '../types'
import { isHex, loopGradient, normalizeHex } from './color'
import { lookOf, stripOf } from './look'
import type { Base, Look } from './look'
import { paint } from './markdown'
import { blocksOf, carriesMedia, isSeen, persistable, remember } from './media'
import {
  DEFAULT_CUSTOM,
  GROUPS,
  MINE,
  findPreset,
  inGroup,
  isPalette,
  pickRandom,
  randomNeon,
  searchPresets,
  slug,
} from './palette'
import { PRESETS } from './presets'

const PANE = 'chat-bubbles'

// ── State ────────────────────────────────────────────────────────────────
// Session values live in $.state (they survive hot reloads); the ones worth
// keeping between sessions are mirrored to $.store under the same key.

const active = atom({ plugin: 'chat-bubbles', key: 'active' } as const, null)
const group = atom({ plugin: 'chat-bubbles', key: 'group' } as const, GROUPS[0] ?? MINE)
const query = atom({ plugin: 'chat-bubbles', key: 'query' } as const, '')
const custom = atom({ plugin: 'chat-bubbles', key: 'custom' } as const, DEFAULT_CUSTOM)
const saved = atom({ plugin: 'chat-bubbles', key: 'saved' } as const, [])
const messageStyle = atom({ plugin: 'chat-bubbles', key: 'messageStyle' } as const, 'full')
const promptStyle = atom({ plugin: 'chat-bubbles', key: 'promptStyle' } as const, 'bubble')
const media = atom({ plugin: 'chat-bubbles', key: 'media' } as const, {})
const themeChrome = atom({ plugin: 'chat-bubbles', key: 'themeChrome' } as const, true)
const base = atom({ plugin: 'chat-bubbles', key: 'base' } as const, 'auto')
const resolvedBase = atom({ plugin: 'chat-bubbles', key: 'resolvedBase' } as const, 'dark')
const bgOverride = atom({ plugin: 'chat-bubbles', key: 'bgOverride' } as const, null)
const reducedMotion = atom({ plugin: 'chat-bubbles', key: 'reducedMotion' } as const, false)
const frame = atom({ plugin: 'chat-bubbles', key: 'frame' } as const, 0)
const notice = atom({ plugin: 'chat-bubbles', key: 'notice' } as const, '')

const STYLES: readonly MessageStyle[] = ['full', 'outline', 'off']
const STYLE_LABEL: Record<MessageStyle, string> = { full: 'full color', outline: 'outline only', off: 'off' }
const PROMPTS: readonly PromptStyle[] = ['bubble', 'frame', 'native']
const PROMPT_LABEL: Record<PromptStyle, string> = { bubble: 'bubble (text only)', frame: 'frame (keeps images)', native: 'native (untouched)' }
const BASES: readonly BaseMode[] = ['auto', 'dark', 'light']

type Slot = 'accent' | 'secondary' | 'highlight' | 'text' | 'background'
const SLOTS: readonly { slot: Slot; label: string }[] = [
  { slot: 'accent', label: 'Accent    ' },
  { slot: 'secondary', label: 'Secondary ' },
  { slot: 'highlight', label: 'Highlight ' },
  { slot: 'text', label: 'Text      ' },
  { slot: 'background', label: 'Background' },
]

const SPARKS = ['✦', '✧', '✶', '✷', '✸', '✹', '✸', '✷']
const MODE_LABEL: Record<string, string> = {
  thinking: 'thinking',
  requesting: 'warming up',
  responding: 'writing',
  'tool-input': 'preparing',
  'tool-use': 'working',
}
const SHIMMER_MS = 260
// How wide the studio asks to dock beside a fullscreen transcript; the person's own drag wins.
const STUDIO_COLUMNS = 64
const YOURS = ['composer', 'sdk', 'bridge']

// The app's row for a prompt leaves an empty pill (with no text it is only that,
// under any attachments). Measured on desktop: a margin unit is 16px, the pill is
// ~23px and starts ~12px under the attachments, and the bubble would start ~85px
// below that. Pulling it up 5 units covered the pill but left the bubble 5px from
// the image, touching it; 4.7 (75px) leaves ~10px and still covers the pill, which
// starts at ~12px. A margin unit is 16px at the default zoom.
const PILL_CELLS = 4.7

const HELP = [
  '**Chat Bubbles** — messenger-style chat for Claude Code.',
  '',
  '- `/bubbles` — open the studio (browse, search, mix your own)',
  '- `/bubbles <name>` — apply a theme by name, e.g. `/bubbles dracula`',
  '- `/bubbles random [collection]` — surprise me, e.g. `/bubbles random hockey`',
  '- `/bubbles next` · `/bubbles prev` — step through the current collection',
  '- `/bubbles list [collection]` — every theme, or one collection',
  '- `/bubbles bg <#hex | auto>` — set a background for every theme',
  '- `/bubbles base <auto | dark | light>` — tune colors for a dark or light canvas',
  '- `/bubbles prompt <bubble | frame | native>` — your prompts: a text bubble, a frame that keeps pasted images, or untouched',
  '- `/bubbles off` — back to Claude Code\'s own look',
].join('\n')

// ── Engine-facing helpers (top level, as the engine requires for `$`) ─────

async function persist($: EngineInterface, key: string, value: unknown) {
  try {
    await $.store.set(key, value)
  } catch {
    // The store refuses only non-JSON or oversize data; the session value stands.
  }
}

async function apply($: EngineInterface, palette: Palette | null) {
  await update($, active, () => palette)
  await persist($, 'active', palette)
  await update($, notice, () => (palette ? `Applied ${palette.name}` : "Theme off: Claude Code's own look"))
  $.ui.toast(palette ? `🎨 ${palette.name}` : '🎨 Theme off')
}

/** The Look every drawing uses, or null when no theme is on. */
async function currentLook($: EngineInterface): Promise<{ pal: Palette; look: Look } | null> {
  const pal = await read($, active)
  if (!pal) return null
  const look = lookOf(pal, (await read($, resolvedBase)) as Base, await read($, bgOverride))
  return { pal, look }
}

/** Whether the tool rows, spinner, footer and panes follow the theme. */
async function chromeLook($: EngineInterface) {
  if (!(await read($, themeChrome))) return null
  return currentLook($)
}

async function resolveBase($: EngineInterface) {
  const mode = await read($, base)
  let next: Base = mode === 'light' ? 'light' : 'dark'
  if (mode === 'auto') {
    try {
      const row = (await $.config.list()).find(r => r.key === 'theme')
      next = String(row?.value ?? '').startsWith('light') ? 'light' : 'dark'
    } catch {
      next = 'dark'
    }
  }
  await update($, resolvedBase, () => next)
}

/** Bring back what was picked in earlier sessions, skipping anything malformed. */
async function restore($: EngineInterface) {
  const get = async (key: string) => {
    try {
      return await $.store.get(key)
    } catch {
      return undefined
    }
  }
  const storedActive = await get('active')
  if (storedActive === null || isPalette(storedActive)) await update($, active, () => storedActive)
  const storedCustom = await get('custom')
  if (isPalette(storedCustom)) await update($, custom, () => storedCustom)
  const storedSaved = await get('saved')
  if (Array.isArray(storedSaved)) await update($, saved, () => storedSaved.filter(isPalette))
  const storedStyle = await get('messageStyle')
  if (STYLES.includes(storedStyle as MessageStyle)) await update($, messageStyle, () => storedStyle as MessageStyle)
  const storedPrompt = await get('promptStyle')
  if (PROMPTS.includes(storedPrompt as PromptStyle)) await update($, promptStyle, () => storedPrompt as PromptStyle)
  const storedChrome = await get('themeChrome')
  if (typeof storedChrome === 'boolean') await update($, themeChrome, () => storedChrome)
  const storedBase = await get('base')
  if (BASES.includes(storedBase as BaseMode)) await update($, base, () => storedBase as BaseMode)
  const storedMedia = await get('media')
  if (isSeen(storedMedia)) await update($, media, seen => ({ ...storedMedia, ...seen }))
  const storedBg = await get('bgOverride')
  if (storedBg === null || isHex(storedBg)) await update($, bgOverride, () => storedBg)
  try {
    const settings = await $.settings.read()
    await update($, reducedMotion, () => settings.prefersReducedMotion === true)
  } catch {
    // Settings unreadable: keep the motion on.
  }
}

async function step($: EngineInterface, delta: number) {
  const pal = await read($, active)
  const list = inGroup(pal?.group ?? (await read($, group)), await read($, saved))
  if (list.length === 0) return null
  const at = pal ? list.findIndex(one => one.id === pal.id) : -1
  const next = list[(at + delta + list.length) % list.length] ?? null
  if (next) await apply($, next)
  return next
}

async function setBackground($: EngineInterface, raw: string) {
  const arg = raw.trim().toLowerCase()
  if (arg === '' || arg === 'auto' || arg === 'off' || arg === 'none') {
    await update($, bgOverride, () => null)
    await persist($, 'bgOverride', null)
    return 'Background back to each theme\'s own tint.'
  }
  const hex = normalizeHex(arg)
  if (!hex) return `\`${raw.trim()}\` isn't a hex color. Try \`/bubbles bg #1a1a2e\` or \`/bubbles bg auto\`.`
  await update($, bgOverride, () => hex)
  await persist($, 'bgOverride', hex)
  return `Background set to \`${hex}\` for every theme. Text is re-checked for contrast against it.`
}

async function setBase($: EngineInterface, mode: BaseMode) {
  await update($, base, () => mode)
  await persist($, 'base', mode)
  await resolveBase($)
}

/** Opens the studio: docked beside the transcript where the surface docks panes, else above the prompt. */
async function openStudio($: EngineInterface) {
  return $.ui.open({ id: PANE, title: 'Chat Bubbles', focus: true, closeOnEscape: true, columns: STUDIO_COLUMNS })
}

// ── Pure drawing helpers ─────────────────────────────────────────────────

const formatDuration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

const listing = (collection?: string, mine: readonly Palette[] = []) => {
  const groups = collection ? GROUPS.filter(g => slug(g).includes(slug(collection))) : GROUPS
  const all = [...PRESETS, ...mine]
  const lines = groups
    .map(g => {
      const names = all.filter(one => one.group === g).map(one => one.name)
      return names.length ? `**${g}** (${names.length}): ${names.join(', ')}` : ''
    })
    .filter(Boolean)
  if (lines.length === 0) return `No collection matches \`${collection}\`. Try \`/bubbles list\`.`
  return `${all.length} themes in ${GROUPS.length - 1} collections. Apply one with \`/bubbles <name>\`.\n\n${lines.join('\n\n')}`
}

// ── Hooks ────────────────────────────────────────────────────────────────

export const register: Register = on => {
  let tick: Timer | null = null
  const stopShimmer = () => {
    tick?.cancel()
    tick = null
  }

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'bubbles',
      description: 'Recolor the chat: open the studio, or /bubbles <name> | random | next | list | bg | base | off',
      argumentHint: '[name | random | next | prev | list | bg <hex> | base <mode> | off | help]',
    })
    await restore($)
    await resolveBase($)
    return next(e)
  })

  // Follow Claude Code's own dark/light setting while the base is `auto`.
  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const done = await next(e)
    await resolveBase($)
    return done
  })

  on('prompt.submit', async ($, e, next) => {
    stopShimmer()
    if ((await chromeLook($)) && !(await read($, reducedMotion))) {
      tick = $.clock.every(SHIMMER_MS, () => void update($, frame, f => (f + 1) % 960))
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    stopShimmer()
    return next(e)
  })

  on('command.run', { command: 'bubbles' }, async ($, e) => {
    const [verb = '', ...rest] = e.args.trim().split(/\s+/)
    const arg = rest.join(' ')
    switch (verb.toLowerCase()) {
      case '':
        await openStudio($)
        return { text: 'Chat Bubbles studio opened.' }
      case 'help':
      case '?':
        return { text: HELP }
      case 'off':
      case 'reset':
      case 'none':
        await apply($, null)
        return { text: 'Theme off.' }
      case 'list':
      case 'all':
        return { text: listing(arg || undefined, await read($, saved)) }
      case 'random': {
        const pick = pickRandom(arg || undefined)
        if (!pick) return { text: `No collection matches \`${arg}\`. Try \`/bubbles list\`.` }
        await apply($, pick)
        return { text: `🎲 ${pick.name} · ${pick.group}` }
      }
      case 'next':
      case 'prev': {
        const one = await step($, verb.toLowerCase() === 'next' ? 1 : -1)
        return { text: one ? `🎨 ${one.name} · ${one.group}` : 'Nothing to step through yet.' }
      }
      case 'bg':
      case 'background':
        return { text: await setBackground($, arg) }
      case 'prompt': {
        const mode = arg.toLowerCase() as PromptStyle
        if (!PROMPTS.includes(mode)) return { text: `Use \`/bubbles prompt ${PROMPTS.join('\`, \`/bubbles prompt ')}\`. Now: ${PROMPT_LABEL[await read($, promptStyle)]}.` }
        await update($, promptStyle, () => mode)
        await persist($, 'promptStyle', mode)
        return { text: `Your prompts: ${PROMPT_LABEL[mode]}.` }
      }
      case 'base': {
        const mode = arg.toLowerCase() as BaseMode
        if (!BASES.includes(mode)) return { text: 'Use `/bubbles base auto`, `/bubbles base dark` or `/bubbles base light`.' }
        await setBase($, mode)
        return { text: `Colors tuned for a ${await read($, resolvedBase)} canvas (${mode}).` }
      }
      default: {
        const hit = findPreset(e.args, await read($, saved))
        if (!hit) {
          const near = searchPresets(e.args, await read($, saved), 5).map(one => `\`${one.name}\``)
          return { text: `No theme matches "${e.args.trim()}".${near.length ? ` Close: ${near.join(', ')}.` : ''} Try \`/bubbles list\`.` }
        }
        await apply($, hit)
        return { text: `🎨 ${hit.name} · ${hit.group}` }
      }
    }
  })

  // Note which prompts carry media, before they are drawn. A slash command's own
  // row comes in by another door; its stored text is the command's markup, so
  // only its id is kept.
  for (const door of ['prompt', 'command'] as const) {
    on('session.append', { door }, async ($, e, next) => {
      const blocks = blocksOf(e.message.content)
      const seen = await update($, media, was => remember(was, e.uuid, blocks, door === 'prompt'))
      await persist($, 'media', persistable(seen))
      return next(e)
    })
  }

  // Your prompts: a bubble on the right in the rival color, the way every
  // messenger does it. Other user-role rows (task notifications, messages from
  // agents) stay on the left with a quiet stripe.
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    const style = await read($, messageStyle)
    const current = await currentLook($)
    if (!current || style === 'off') return next(e)
    const { look } = current
    const { Box, Text } = $.ui.resolve(e)
    const isYours = YOURS.includes(e.props.origin.kind)

    if (!isYours) {
      if (!(await read($, themeChrome))) return next(e)
      return (
        <Box flexDirection="row">
          <Text color={look.muted}>{'▏'}</Text>
          <Box flexDirection="column" flexGrow={1}>
            {await next(e)}
          </Box>
        </Box>
      )
    }
    // Room on the left pushes the bubble right; long prompts wrap inside it.
    // The engine's own row may not sit under a Box that has `width` or
    // `minWidth` (the engine refuses the tree and draws its own), so the row
    // takes its width from the parent and only the spacer beside it has one.
    // `up` pulls the row over the app's row above it; both are positioned, so
    // the later one (this) paints on top. Only then: `frame` puts the app's row
    // inside this Box, and the engine refuses `position` on a Box above it.
    const right = (bubble: RenderNode, up = 0) => (
      <Box key="you-bubble" flexDirection="row" justifyContent="flex-end" {...(up ? { marginTop: -up, position: 'relative' as const } : {})}>
        <Box width="18%" flexShrink={0} />
        {bubble}
      </Box>
    )
    // `bubble` draws the prompt's text itself: predictable size and color, but
    // the app's own row also carries pasted images and files, which `text` does
    // not, so `frame` wraps that row instead (the app sizes it, so the frame
    // can be tighter than a bubble) and `native` leaves it alone.
    const mode = style === 'outline' ? 'frame' : await read($, promptStyle)
    if (mode === 'native') return next(e)
    if (mode === 'frame' || !e.props.isExpanded) {
      return right(
        <Box borderStyle="round" borderColor={look.you} backgroundColor={look.youBg} paddingX={1} flexShrink={1}>
          {await next(e)}
        </Box>,
      )
    }
    // Only text: the app's own row is all there is to draw.
    if (e.props.text.trim() === '') return next(e)
    const text = (
      <Box borderStyle="round" borderColor={look.you} backgroundColor={look.youBg} paddingX={1} flexShrink={1}>
        <Text color={look.youText} wrap="wrap">
          {e.props.text}
        </Text>
      </Box>
    )
    // A prompt known to have no media is just the bubble. One with media also
    // gets the app's own row without its text above the bubble: the images and
    // files, outside the colored block. Nothing wraps
    // that row (a wrapper shrinks it and breaks its own right alignment); the
    // empty pill it leaves is covered by pulling the bubble up.
    // The terminal draws images as text inside the prompt, so there it is just the bubble.
    if (e.surface === 'terminal') return right(text)
    // Never seen (sent before the mod was installed): the app's own row, so
    // nothing is lost and no empty pill is left behind.
    const known = carriesMedia(await read($, media), e.requestId, e.props.text)
    if (known === undefined) return next(e)
    if (!known) return right(text)
    return (
      <Box flexDirection="column">
        {await next({ ...e, props: { ...e.props, text: '' } })}
        {right(text, PILL_CELLS)}
      </Box>
    )
  })

  // Claude's replies: on the left, a quiet card; the label is text, not a bar.
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const style = await read($, messageStyle)
    const current = await currentLook($)
    if (!current || style === 'off') return next(e)
    const { look } = current
    const els = $.ui.resolve(e)
    const { Box, Text } = els
    if (style === 'outline' || e.props.text.length > 30000) {
      return (
        <Box borderStyle="round" borderColor={look.frame} paddingX={1}>
          {await next(e)}
        </Box>
      )
    }
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={look.frame} backgroundColor={look.replyBg} paddingX={1}>
        {e.props.isFirstOfReply ? (
          <Text bold color={look.accent}>
            {'✦ Claude'}
          </Text>
        ) : null}
        {paint(els, e.props.text, look)}
      </Box>
    )
  })

  // The footer's mode labels, then the theme's name as a button that opens the studio.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const current = await currentLook($)
    if (!current) return next(e)
    const { pal, look } = current
    const isChrome = await read($, themeChrome)
    const { Box, Text, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" gap={1}>
        {e.props.modes.length > 0 ? (
          isChrome ? (
            <Text color={look.muted}>{e.props.modes.join(' & ')}</Text>
          ) : (
            <Text dimColor>{e.props.modes.join(' & ')}</Text>
          )
        ) : null}
        <Box key="theme-chip" flexDirection="row">
          {isChrome ? <Text color={look.accent}>{'▍'}</Text> : null}
          <Button
            key="open-studio"
            label={`🎨 ${pal.name}`}
            plain
            hover={{ underline: true }}
            onPress={() => void openStudio($)}
          />
        </Box>
      </Box>
    )
  })

  // The hint under the prompt, in the theme's quiet color. The terminal keeps
  // its own line (its pills stay live); other surfaces take the tree.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const current = await chromeLook($)
    if (!current || e.surface === 'terminal') return next(e)
    const { Text } = $.ui.resolve(e)
    return <Text color={current.look.muted}>{e.props.tail ? `${e.props.hint} ${e.props.tail}` : e.props.hint}</Text>
  })

  // "Baked for 12s" at the end of a turn (terminal), with a spark.
  on('ui.render', { component: 'TurnDuration' }, async ($, e, next) => {
    const current = await chromeLook($)
    if (!current) return next(e)
    const { look } = current
    const { Text } = $.ui.resolve(e)
    return (
      <Text>
        <Text bold color={look.accent}>
          {'✦ '}
        </Text>
        <Text color={look.muted}>{`${e.props.word} for ${formatDuration(e.props.durationMs)}`}</Text>
      </Text>
    )
  })

  // Tool rows, folded runs, results and command output: a stripe and a strip.
  const striped = (look: Look, mark: string, drawn: RenderNode, K: Pick<ElementTable, 'Box' | 'Text'>, strength = 0.1, glyph = '▍') => (
    <K.Box flexDirection="row" backgroundColor={strength > 0 ? stripOf(look, mark, strength) : undefined}>
      <K.Text bold color={mark}>
        {glyph}
      </K.Text>
      <K.Box flexDirection="column" flexGrow={1}>
        {drawn}
      </K.Box>
    </K.Box>
  )

  // Tool rows are striped in the terminal only: the desktop app draws its own
  // folded tool summary, and a stripe around it is an empty bar.
  // Finished tools stay quiet so the ones running (highlight) and failing (red) are what you see.
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const current = await chromeLook($)
    if (!current || e.surface !== 'terminal') return next(e)
    const { look } = current
    const mark = e.props.isErrored ? look.error : e.props.isRunning ? look.highlight : look.muted
    return striped(look, mark, await next(e), $.ui.resolve(e), e.props.isErrored ? 0.16 : 0.06)
  })

  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const current = await chromeLook($)
    if (!current || e.surface !== 'terminal') return next(e)
    const { look } = current
    return striped(look, e.props.isActive ? look.highlight : look.muted, await next(e), $.ui.resolve(e), 0.05)
  })

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    const current = await chromeLook($)
    if (!current || e.surface !== 'terminal') return next(e)
    const { look } = current
    return striped(look, e.props.isErrored ? look.error : look.muted, await next(e), $.ui.resolve(e), 0, '▏')
  })

  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    const current = await chromeLook($)
    if (!current || e.surface !== 'terminal') return next(e)
    const { look } = current
    return striped(look, e.props.isErrored ? look.error : look.highlight, await next(e), $.ui.resolve(e), 0.08)
  })

  // The spinner: a twinkling spark and the word shimmering through the palette.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const current = await chromeLook($)
    if (!current) return next(e)
    const { pal, look } = current
    const { Box, Text } = $.ui.resolve(e)
    const still = await read($, reducedMotion)
    const f = still ? 0 : await read($, frame)
    const stops = loopGradient([look.accent, look.secondary, look.highlight, look.secondary])
    const spark = (
      <Text bold color={stops[(f * 2) % stops.length] ?? pal.accent}>
        {`${SPARKS[f % SPARKS.length] ?? '✦'} `}
      </Text>
    )
    // The terminal keeps its own line (elapsed time, tokens) beside the spark.
    if (e.surface === 'terminal') {
      return (
        <Box flexDirection="row">
          {spark}
          {await next(e)}
        </Box>
      )
    }
    const words = e.props.message ?? e.props.word
    return (
      <Box flexDirection="row" gap={1}>
        <Text>
          {spark}
          {[...words].map((ch, i) => (
            <Text bold color={stops[(i + f) % stops.length] ?? look.accent}>
              {ch}
            </Text>
          ))}
          <Text color={look.text}>{e.props.suffix}</Text>
        </Text>
        <Text color={look.muted}>{MODE_LABEL[e.props.mode] ?? ''}</Text>
      </Box>
    )
  })

  // Every pane a mod opens, this one included: a tinted backdrop.
  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    const current = await chromeLook($)
    if (!current) return next(e)
    const { Box } = $.ui.resolve(e)
    return (
      <Box flexDirection="column" backgroundColor={current.look.replyBg} paddingX={1}>
        {await next(e)}
      </Box>
    )
  })

  // ── The studio ──────────────────────────────────────────────────────────
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    // Mobile draws no fields: collections become buttons and the mixer is hidden.
    const Input = 'Input' in els ? els.Input : undefined
    const Select = 'Select' in els ? els.Select : undefined

    const pal = await read($, active)
    const shown = await read($, group)
    const search = await read($, query)
    const mixer = await read($, custom)
    const mine = await read($, saved)
    const style = await read($, messageStyle)
    const prompt = await read($, promptStyle)
    const isChrome = await read($, themeChrome)
    const mode = await read($, base)
    const canvas = (await read($, resolvedBase)) as Base
    const bg = await read($, bgOverride)
    const said = await read($, notice)
    const ui = lookOf(pal ?? DEFAULT_CUSTOM, canvas, bg)

    const results = search ? searchPresets(search, mine, 40) : inGroup(shown, mine)
    const swatch = (one: Palette) => (
      <Text>
        <Text color={one.accent}>██</Text>
        <Text color={one.secondary}>██</Text>
        <Text color={one.highlight}>██</Text>
        <Text color={one.text}>██</Text>
        <Text color={lookOf(one, canvas, bg).replyBg}>██</Text>
      </Text>
    )
    const heading = (label: string) => (
      <Text bold color={ui.accent}>
        {label}
      </Text>
    )

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          {heading('💬 CHAT BUBBLES')}
          <Box gap={1}>
            <Text color={ui.text}>Active:</Text>
            {pal ? swatch(pal) : null}
            <Text bold color={ui.secondary}>
              {pal ? `${pal.name} · ${pal.group}` : "Claude Code's own look"}
            </Text>
          </Box>
        </Box>

        <Box flexDirection="column">
          {Input ? (
            <Input
              key="search"
              label="Search"
              value={search}
              placeholder={`${PRESETS.length} themes: try "hockey", "neon", "gryffindor"`}
              submitLabel="search"
              onInput={value => void update($, query, () => value)}
              onSubmit={value => void update($, query, () => value)}
            />
          ) : null}
          {search ? (
            <Box gap={1}>
              <Text color={ui.muted}>{`${results.length === 40 ? '40+' : results.length} match${results.length === 1 ? '' : 'es'}`}</Text>
              <Button key="clear-search" label="Clear" plain dimColor onPress={() => update($, query, () => '')} />
            </Box>
          ) : Select ? (
            <Select
              key="group"
              label="Collection"
              value={shown}
              options={GROUPS.map(g => ({ value: g, label: g === MINE ? `${g} (${mine.length})` : g }))}
              onSelect={value => update($, group, () => value)}
            />
          ) : (
            <Box flexWrap="wrap" gap={1}>
              {GROUPS.map(g => (
                <Button key={`g-${slug(g)}`} label={g} dimColor={g !== shown} onPress={() => update($, group, () => g)} />
              ))}
            </Box>
          )}
          {results.length === 0 ? (
            <Text color={ui.muted}>{search ? 'No theme matches that.' : 'No saved themes yet. Mix one below and press Enter on "Save as".'}</Text>
          ) : null}
          {results.map(one => (
            <Box key={`row-${one.id}`} gap={1}>
              {swatch(one)}
              <Button
                key={`apply-${one.id}`}
                label={search ? `${one.name} · ${one.group}` : one.name}
                variant={pal?.id === one.id ? 'primary' : undefined}
                onPress={() => apply($, one)}
              />
              {pal?.id === one.id ? <Text color={ui.highlight}>◆ on</Text> : null}
            </Box>
          ))}
        </Box>

        {Input ? (
          <Box flexDirection="column">
            {heading('MIX YOUR OWN')}
            {SLOTS.map(({ slot, label }) => (
              <Box key={`slot-${slot}`} gap={1}>
                <Text color={mixer[slot] ?? lookOf(mixer, canvas).replyBg}>██</Text>
                <Input
                  key={`hex-${slot}`}
                  label={label}
                  value={mixer[slot] ?? ''}
                  placeholder={slot === 'background' ? 'auto (tinted from the accent)' : '#ff2bd6'}
                  submitLabel="set"
                  onSubmit={async value => {
                    if (slot === 'background' && value.trim() === '') {
                      const next = await update($, custom, c => ({ ...c, background: undefined }))
                      await persist($, 'custom', next)
                      await update($, notice, () => 'Mixer background back to auto')
                      return
                    }
                    const hex = normalizeHex(value)
                    if (!hex) {
                      await update($, notice, () => `"${value}" isn't a hex color. Try #ff2bd6 or f0f.`)
                      return
                    }
                    const next = await update($, custom, c => ({ ...c, [slot]: hex }))
                    await persist($, 'custom', next)
                    await update($, notice, () => `${slot} set to ${hex}`)
                  }}
                />
              </Box>
            ))}
            <Box gap={1} flexWrap="wrap">
              {swatch(mixer)}
              <Button
                key="apply-custom"
                label="Apply custom"
                variant="primary"
                onPress={async () => apply($, { ...(await read($, custom)), id: 'custom', name: 'Custom', group: MINE })}
              />
              <Button
                key="random-neon"
                label="🎲 Random neon"
                onPress={async () => {
                  const next = await update($, custom, () => randomNeon())
                  await persist($, 'custom', next)
                  await apply($, next)
                }}
              />
            </Box>
            <Input
              key="save-name"
              label="Save as"
              placeholder="name your theme, Enter to save"
              submitLabel="save"
              onSubmit={async value => {
                const name = value.trim().slice(0, 60)
                if (!name) return
                const one: Palette = { ...(await read($, custom)), name, group: MINE, id: `mine:${slug(name)}` }
                const list = await update($, saved, l => [...l.filter(x => x.id !== one.id), one])
                await persist($, 'saved', list)
                await update($, group, () => MINE)
                await update($, query, () => '')
                await apply($, one)
              }}
            />
          </Box>
        ) : null}

        <Box flexDirection="column">
          {heading('LOOK')}
          <Box gap={1} flexWrap="wrap">
            <Button
              key="style-toggle"
              label={`Messages: ${STYLE_LABEL[style]}`}
              onPress={async () => {
                const next = await update($, messageStyle, v => STYLES[(STYLES.indexOf(v) + 1) % STYLES.length] ?? 'full')
                await persist($, 'messageStyle', next)
              }}
            />
            <Button
              key="prompt-toggle"
              label={`Prompts: ${PROMPT_LABEL[prompt]}`}
              onPress={async () => {
                const next = await update($, promptStyle, v => PROMPTS[(PROMPTS.indexOf(v) + 1) % PROMPTS.length] ?? 'bubble')
                await persist($, 'promptStyle', next)
              }}
            />
            <Button
              key="chrome-toggle"
              label={`Tools, spinner & panes: ${isChrome ? 'on' : 'off'}`}
              onPress={async () => {
                const next = await update($, themeChrome, v => !v)
                await persist($, 'themeChrome', next)
              }}
            />
            <Button
              key="base-toggle"
              label={`Canvas: ${mode}${mode === 'auto' ? ` (${canvas})` : ''}`}
              onPress={async () => setBase($, BASES[(BASES.indexOf(mode) + 1) % BASES.length] ?? 'auto')}
            />
          </Box>
          {Input ? (
            <Box gap={1}>
              <Text color={bg ?? ui.replyBg}>██</Text>
              <Input
                key="bg-override"
                label="Background for every theme"
                value={bg ?? ''}
                placeholder="auto — or a hex like #1a1a2e"
                submitLabel="set"
                onSubmit={async value => {
                  await update($, notice, () => '')
                  const said = await setBackground($, value)
                  await update($, notice, () => said.replace(/`/g, ''))
                }}
              />
            </Box>
          ) : null}
          <Box gap={1} flexWrap="wrap">
            {mine.length > 0 && shown === MINE && !search ? (
              <Button
                key="clear-mine"
                label="Clear my themes"
                dimColor
                onPress={async () => {
                  await update($, saved, () => [])
                  await persist($, 'saved', [])
                }}
              />
            ) : null}
            <Button key="off" label="Theme off" dimColor onPress={() => apply($, null)} />
          </Box>
        </Box>
        {said ? <Text color={ui.highlight}>{said}</Text> : null}
      </Box>
    )
  })
}
