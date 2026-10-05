# Changelog

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
versions follow [Semantic Versioning](https://semver.org/).

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
