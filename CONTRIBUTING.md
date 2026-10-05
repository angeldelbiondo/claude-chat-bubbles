# Contributing

Thanks for helping. Themes are the easiest place to start.

## Add a theme

Each theme is one line in [`chat-bubbles/hooks/presets.ts`](chat-bubbles/hooks/presets.ts):

```ts
p('Collection', 'Theme Name', '#accent', '#secondary', '#highlight', '#text'),
```

- Put it in its collection's block. A new collection name creates a new
  collection; collections appear in the studio in file order.
- Pick colors for a **dark** canvas. Light canvases are derived and contrast-checked
  automatically, but a palette tuned for dark looks best.
- **Accent** carries headings and chips, so it should be the most recognizable
  color. **Text** is body copy: keep it light and low-saturation.
- Names must be unique (case-insensitive) and describe a mood or place, not
  claim to be official. Colors only: no logos or artwork.

`npm test` fails if a theme is malformed, duplicates a name, or can't reach the
contrast bar on either canvas.

## Change the code

- Engine-facing code lives in `chat-bubbles/hooks/register.tsx`. Claude Code
  requires every helper that takes `$` to be a top-level function in that file.
- Everything else is pure and tested: `color.ts`, `look.ts`, `palette.ts`,
  `markdown.tsx`.
- Never name a local variable `h` or `Fragment` in a `.tsx` module: JSX compiles to
  those globals.

## Before a pull request

```
npm run check
```

Then try it for real: `claude --plugin-dir ./chat-bubbles`.
If a drawing doesn't validate, Claude Code prints a dim line in the transcript
naming the plugin, the component and the reason.
