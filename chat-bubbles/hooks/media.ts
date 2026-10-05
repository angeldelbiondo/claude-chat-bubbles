// Which of your prompts carry pasted images or files. The app's own row is the
// only thing that draws those, so Chat Bubbles draws it only for them. The
// record is plugin state, keyed by the row's uuid and, for typed prompts, by the
// start of the text (the render site may name the row either way). `true` wins
// when both are seen. A prompt never seen (sent before the mod was installed) is
// unknown, and an unknown row is left to the app.

export type Seen = Readonly<Record<string, boolean>>
type Block = { type: string; text?: string }

const KEPT = 2000
// A pasted log must not become a 50 KB key: only the start of the text is kept.
const KEY = 200
// Text keys carry what you typed, so they live in session memory only; ids are
// what persists (see `persistable`).
const TEXT = 't:'
const keyOf = (text: string) => TEXT + text.slice(0, KEY)

/** A stored prompt's blocks: a plain prompt is stored as a bare string. */
export const blocksOf = (content: unknown): Block[] =>
  typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : []

/** Whether a row's blocks hold anything but text (an image, a document). */
export const hasMedia = (blocks: readonly Block[]) => blocks.some(b => b.type !== 'text')

/** The record with a stored row added: its id, and for typed prompts the start of its text. */
export const remember = (seen: Seen, uuid: string, blocks: readonly Block[], withText = true): Seen => {
  const has = hasMedia(blocks)
  const next: Record<string, boolean> = { ...seen, [uuid]: has }
  const typed = withText ? blocks.find(b => b.type === 'text')?.text : undefined
  if (typed) next[keyOf(typed)] = has || seen[keyOf(typed)] === true
  const entries = Object.entries(next)
  return entries.length > KEPT ? Object.fromEntries(entries.slice(-KEPT)) : next
}

/** What is worth keeping across sessions: the ids and a yes/no, never the text. */
export const persistable = (seen: Seen): Seen => Object.fromEntries(Object.entries(seen).filter(([key]) => !key.startsWith(TEXT)))

/** Whether a stored value is a record of booleans, fit to trust after a restart. */
export const isSeen = (value: unknown): value is Seen =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(v => typeof v === 'boolean')

/** True or false once the prompt was seen; undefined for one never seen. */
export const carriesMedia = (seen: Seen, id: string, text: string): boolean | undefined => seen[id] ?? seen[keyOf(text)]
