# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
versions follow [Semantic Versioning](https://semver.org/).

## Chat Bubbles [0.1.6] — 2026-10-05

### Fixed

- A gray bump showed at the corner of slash command bubbles (`/reload-plugins`,
  `/bubbles`…): those rows come in by another door that the mod did not note, so
  it drew the app's row (with its empty pill) for them. They are noted now.

### Changed

- A prompt the mod never saw (sent before it was installed) keeps the app's own
  look instead of getting a bubble over the app's row: no stray pill, no image lost.
- The row ids and a yes/no (never text) are written to the plugin store, so earlier
  prompts keep their look after a restart.
- On the terminal a prompt is just the bubble again, as before 0.1.3.
- Tests store rows through the plugin's real `session.append` hook, so the whole
  path (store the row, then draw it) is covered.

## Chat Bubbles [0.1.5] — 2026-10-05

### Fixed

- The bubble touched the image (5px apart). It is pulled up 4.7 cells instead of 5,
  which leaves ~10px and still covers the app's empty pill (it starts ~12px under
  the image).

## Chat Bubbles [0.1.4] — 2026-10-04

### Fixed

- Attachments drifted to the middle of the chat and an empty pill appeared on the
  left: a Box around the app's row shrinks it and breaks its own right alignment.
  The row is now drawn bare, so it stays on the right as the app places it.
- The empty pill the app's row leaves is now covered: the bubble is pulled up
  5 cells (80px, measured on desktop: a cell is 16px, the pill ~23px) and
  positioned so it paints over the pill.

## Chat Bubbles [0.1.3] — 2026-10-04

### Added

- Pasted images and files now show with the `bubble` mode: the app draws them
  above your bubble, outside the colored block. The mod learns which prompts
  carry media from the `session.append` event (a prompt with only text is just
  the bubble; one never seen, as after a resume, keeps the app's row so nothing
  is lost). The record is plugin state, so it survives a reload.

## Chat Bubbles [0.1.2] — 2026-10-04

### Added

- `/bubbles prompt <bubble | frame | native>` (and a studio button) to choose how
  your prompts are drawn.

### Changed

- The default is now `bubble`: the mod draws your prompt's text itself, so the
  bubble is right-aligned, sized to the text and never squeezed. Measured on the
  desktop app: a frame around the app's own row wrapped text at ~330px with empty
  space below, and a frame that shrinks to fit collapsed to nothing.
- `frame` is the previous behavior (keeps pasted images). `native` leaves the row alone.

## Chat Bubbles [0.1.1] — 2026-10-04

### Fixed

- Your prompts were never restyled on desktop: the tree wrapped the engine's own
  row in a Box with `width`, which the engine refuses (it then draws its own row,
  unchanged). The row now takes its width from the parent.
- Tests draw a real engine node instead of a Text stand-in, so a refused tree
  like this one fails in CI.

## Chat Bubbles [0.1.0] — 2026-10-04

Forked from Theme Studio 1.1.0.

### Changed

- Your prompts are a right-aligned bubble, the way messengers lay them out.
- Your bubble takes a rival color: orange under a cool theme, sky blue under a
  warm one, contrast-checked on dark and light canvases.
- Claude's replies are a quiet card with a `✦ Claude` label instead of a solid bar;
  `#` headings are underlined instead of filled.
- Every theme color is pulled 25% toward neutral ink; backgrounds are softer.
- Finished tools are gray, so only running and failing tools stand out.
- The command is `/bubbles`, so Claude Code's built-in `/theme` keeps working.

### Fixed

- Desktop app: no more empty colored bars under the app's own tool summary.
- Desktop app: images and attachments pasted into a prompt stay visible.

### Removed

- Neon Usage (the usage band); use any usage mod alongside.

---

Theme Studio's history, before the fork:

## [1.1.0] — 2026-10-04

### Theme Studio

- The 🎨 theme chip in the footer is now a button: click it to open the studio,
  docked beside the transcript where the surface docks panes. Escape closes it.

## [1.0.0] — 2026-10-04

First public release.

### Theme Studio

- 441 palettes in 63 collections, each contrast-checked on dark and light canvases.
- Recolors prompts, replies (headings, lists, quotes, bold, italic, inline code,
  strikethrough), tool rows, folded tool runs, tool results, the spinner, the
  footer, the end-of-turn line, slash-command output and every mod pane.
- `/theme <name | random | next | prev | list | bg | base | off | help>`.
- The studio pane: search across every theme, browse by collection, mix and save
  your own, and options for message style, chrome, canvas and background.
- A background override for every theme (`/theme bg`), with text re-checked for
  contrast against it.
- Follows Claude Code's dark/light theme setting and `prefersReducedMotion`.
- Theme, saved mixes and options persist across sessions; stored data is
  validated on load.

### Neon Usage

- One-line band above the prompt: context fill, five-hour and seven-day windows
  with reset countdowns, session cost and a mood emoji.
- Follows Theme Studio's colors and canvas when it is installed.
- `/neon-usage [on | off]`.
