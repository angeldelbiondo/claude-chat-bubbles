// Which of your prompts carry pasted images or files. The app's own row is the
// only thing that draws those, so Chat Bubbles draws it only for them. The
// record is plugin state and is also written to the plugin store: row id to
// yes/no, nothing else. A row never seen (sent before the mod was installed) is
// unknown, and an unknown row is left to the app.

export type Seen = Readonly<Record<string, boolean>>
type Block = { type: string; text?: string }

const KEPT = 2000

/** A stored prompt's blocks: a plain prompt is stored as a bare string. */
export const blocksOf = (content: unknown): Block[] =>
  typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : []

/** Whether a row's blocks hold anything but text (an image, a document). */
export const hasMedia = (blocks: readonly Block[]) => blocks.some(b => b.type !== 'text')

/** The record with a stored row added, oldest dropped past the limit. */
export const remember = (seen: Seen, uuid: string, blocks: readonly Block[]): Seen => {
  const entries = Object.entries({ ...seen, [uuid]: hasMedia(blocks) })
  return Object.fromEntries(entries.slice(-KEPT))
}

/** Whether a stored value is a record of booleans, fit to trust after a restart. */
export const isSeen = (value: unknown): value is Seen =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && Object.values(value).every(v => typeof v === 'boolean')
