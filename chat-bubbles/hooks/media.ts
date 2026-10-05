// Which of your prompts carry pasted images or files. The app's own row is the
// only thing that draws those, so Chat Bubbles draws it only for them. The
// record is plugin state and is also written to the plugin store: row id to
// yes/no, nothing else. A row never seen (sent before the mod was installed) is
// unknown, and an unknown row is left to the app.

export type Seen = Readonly<Record<string, boolean>>
type Block = { type: string; text?: string }

const KEPT = 2000
// A row id is a uuid. Anything else in a record is dropped: an older version kept
// the start of what you typed as a key, and session state outlives a reload.
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The record reduced to row id -> yes/no, the newest KEPT of them. */
export const clean = (record: Record<string, unknown>): Seen =>
  Object.fromEntries(Object.entries(record).filter((entry): entry is [string, boolean] => ID.test(entry[0]) && typeof entry[1] === 'boolean').slice(-KEPT))

/** A stored prompt's blocks: a plain prompt is stored as a bare string. */
export const blocksOf = (content: unknown): Block[] =>
  typeof content === 'string' ? [{ type: 'text', text: content }] : Array.isArray(content) ? content : []

/** Whether a row's blocks hold anything but text (an image, a document). */
export const hasMedia = (blocks: readonly Block[]) => blocks.some(b => b.type !== 'text')

/** The record with a stored row added. */
export const remember = (seen: Seen, uuid: string, blocks: readonly Block[]): Seen => clean({ ...seen, [uuid]: hasMedia(blocks) })
