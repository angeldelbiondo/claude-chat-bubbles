// Which of your prompts carry pasted images or files. The app's own row is the
// only thing that draws those, so Chat Bubbles draws it only for them. The
// record is plugin state (it survives a reload), keyed by the row's uuid and by
// the start of its text (the render site may name the row either way); `true`
// wins when both are seen. A prompt never seen (a resumed session) is unknown,
// and unknown is treated as "may have media".

export type Seen = Readonly<Record<string, boolean>>
type Block = { type: string; text?: string }

const KEPT = 2000
// A pasted log must not become a 50 KB key: only the start of the text is kept.
const KEY = 200
const keyOf = (text: string) => text.slice(0, KEY)

/** A stored prompt's blocks: a plain prompt is stored as a bare string. */
export const blocksOf = (content: unknown): Block[] =>
  typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : []

/** Whether a row's blocks hold anything but text (an image, a document). */
export const hasMedia = (blocks: readonly Block[]) => blocks.some(b => b.type !== 'text')

/** The record with a stored prompt added: its id, and the first text block it typed. */
export const remember = (seen: Seen, uuid: string, blocks: readonly Block[]): Seen => {
  const has = hasMedia(blocks)
  const next: Record<string, boolean> = { ...seen, [uuid]: has }
  const typed = blocks.find(b => b.type === 'text')?.text
  if (typed) next[keyOf(typed)] = has || seen[keyOf(typed)] === true
  const keys = Object.keys(next)
  return keys.length > KEPT ? Object.fromEntries(Object.entries(next).slice(-KEPT)) : next
}

/** True or false once the prompt was seen; undefined for one never seen. */
export const carriesMedia = (seen: Seen, id: string, text: string): boolean | undefined => seen[id] ?? seen[keyOf(text)]
