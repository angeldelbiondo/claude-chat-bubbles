# Chat Bubbles for Claude Code

Your chat with Claude, laid out like every messenger you already use: **your
messages on the right, Claude's on the left**, and your bubble in a **rival
color** so you can tell who said what before you read a word.

```
                                   ╭──────────────────────────────╮
                                   │ fix the failing login test   │  ← you: right, warm
                                   ╰──────────────────────────────╯
╭──────────────────────────────────────────────────────────────────╮
│ ✦ Claude                                                         │  ← Claude: left, quiet
│ The test mocks an expired token. I updated the fixture and…      │
╰──────────────────────────────────────────────────────────────────╯
▍ Bash(npm test)  ✗ 2 failed                                          ← only failures shout
```

A fork of [Theme Studio](https://github.com/allianceoptima/claude-theme-studio)
by Alliance Optima, redesigned for reading speed. It keeps all **441
contrast-checked themes** and the studio.

## What's different from Theme Studio

| | Theme Studio | Chat Bubbles |
| --- | --- | --- |
| Your messages | Full width, left, a **YOU** chip | **Right-aligned bubble**, like a messenger |
| Your bubble color | The theme's accent (same family as Claude's) | A **rival color**: orange under a cool theme, sky blue under a warm one |
| Claude's replies | Solid colored header bar | A quiet card with a `✦ Claude` label |
| Intensity | Full neon | Each color pulled 25% toward neutral ink, softer backgrounds |
| Finished tools | Accent stripe (everything is colored) | Gray: only **running** and **failing** tools stand out |
| Desktop tool rows | Empty colored bars under the app's own tool summary | Left to the app: no empty bars |
| Pasted images (desktop) | Hidden in full-color mode | A choice: `/bubbles prompt frame` keeps them, the default text bubble does not |
| Command | `/theme` (replaces Claude Code's built-in `/theme`) | `/bubbles` (the built-in `/theme` keeps working) |

## Install

Requires Claude Code 2.1.286 or later (plugin function hooks), in the terminal or
the desktop app's Code tab.

```
/plugin marketplace add angeldelbiondo/claude-chat-bubbles
/plugin install chat-bubbles@claude-chat-bubbles
```

Start a new session (or run `/reload-plugins`), then:

```
/bubbles matrix
```

Using Theme Studio too? Turn one off: both redraw the same messages.

## Commands

| Command | Does |
| --- | --- |
| `/bubbles` | Open the studio: search, browse collections, mix your own, toggle options |
| `/bubbles <name>` | Apply a theme: `/bubbles dracula`, `/bubbles matrix` (ignores case and accents, takes prefixes) |
| `/bubbles random [collection]` | A random theme, optionally from one collection |
| `/bubbles next` · `/bubbles prev` | Step through the current collection |
| `/bubbles list [collection]` | Every theme, or one collection's |
| `/bubbles bg <#hex \| auto>` | One background for every theme; text is re-checked for contrast |
| `/bubbles base <auto \| dark \| light>` | Tune colors for a dark or light canvas |
| `/bubbles prompt <bubble | frame | native>` | Your prompts: a text bubble (default), a frame around the app's own row (keeps pasted images), or untouched |
| `/bubbles off` | Back to Claude Code's own look |

## How the rival color works

The bubble color is picked from the opposite side of the color wheel from the
theme's accent:

- **Cool theme** (greens, blues, violets) → **orange** bubble (`#ff8c42` dark / `#c2410c` light)
- **Warm theme** (reds, pinks, yellows) → **sky blue** bubble (`#38bdf8` dark / `#0369a1` light)

Your text on the bubble is held to WCAG AA (4.5:1), the border to 3:1. The test
suite checks every theme on both canvases.

## Your prompts: three ways to draw them

`/bubbles prompt <bubble | frame | native>`, also a button in the studio.

| Mode | What you get | Trade-off |
| --- | --- | --- |
| `bubble` (default) | A right-aligned bubble the mod draws itself, in the rival color, sized to your text | Draws the prompt's **text only**: images and files pasted into a prompt are not shown |
| `frame` | The app's own message row, framed in the rival color | Keeps pasted images, but the app sizes its row, so the frame can be tight and leave empty space |
| `native` | The app's own row, untouched | No rival color |

## Where it draws (and where it can't)

Plugins can't reach Claude Code's window chrome (the sidebar, the prompt box, the
app background) or recolor the desktop app's native bubble in place, so no theme
can. The app's own message row is also drawn once and sized by the app: the engine
refuses a tree that sets `width`, `height` or `overflow` on any Box above it, and
a frame around it that shrinks to fit collapses to nothing. That is why `bubble`
draws its own text instead of restyling the row.

## Security and privacy

Chat Bubbles only draws. Checked with `claude plugin validate`, it calls:

| Engine API | Why |
| --- | --- |
| `$.ui.*` | Draw messages, the studio pane, toasts |
| `$.state` / `$.store` | Remember your theme and options (local to your machine) |
| `$.config.list` | Read whether Claude Code's theme is dark or light |
| `$.settings.read` | Read `prefersReducedMotion` |
| `$.command.register`, `$.clock` | The `/bubbles` command, the spinner shimmer |

It makes **no network requests**, reads or writes **no files**, runs **no
processes** and **never calls the model**. There are no runtime dependencies.
Mods run with your permissions, so read the code before installing any mod,
this one included: it's about 1,000 lines of TypeScript in
[`chat-bubbles/hooks`](chat-bubbles/hooks).

Found a vulnerability? See [SECURITY.md](SECURITY.md).

## Development

```
git clone https://github.com/angeldelbiondo/claude-chat-bubbles
cd claude-chat-bubbles
claude --plugin-dir ./chat-bubbles   # edits hot-reload
```

| Script | Does |
| --- | --- |
| `npm run typecheck` | `tsc` over the plugin and its tests (run `/plugin-types .claude/types` in Claude Code once first) |
| `npm run validate` | `claude plugin validate` on the marketplace and the plugin |
| `npm test` | `claude plugin test`: unit tests plus engine tests on terminal and desktop |

See [CONTRIBUTING.md](CONTRIBUTING.md) to add a theme.

## En español

Chat Bubbles ordena el chat de Claude Code como cualquier app de mensajería: tus
mensajes a la derecha, en un color rival al del tema (naranja si el tema es frío,
celeste si es cálido), y los de Claude a la izquierda. Baja la intensidad de los
441 temas y deja en gris las tools que terminaron bien, para que solo resalten
las que fallan o están corriendo. Se instala con los dos comandos de arriba y se
usa con `/bubbles <tema>`.

## Credits

Forked from [Theme Studio](https://github.com/allianceoptima/claude-theme-studio)
by Alliance Optima, under the MIT license. The 441 palettes, the studio and the
markdown painter are theirs.

## Trademarks

Theme names describe the palettes they evoke. They are not affiliated with,
sponsored by or endorsed by the owners of any franchise, team, brand or place
named, and every trademark belongs to its owner. The themes carry colors only:
no logos, artwork or other marks.

## License

[MIT](LICENSE)
