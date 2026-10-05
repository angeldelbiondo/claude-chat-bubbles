// Shared by the engine tests. The test host has no bottom for `ui.render`, so
// tests stand in for it with a leaf node, as the engine's own row is one.
// `session.append` cannot be driven here (a hook there must call `next`), so the
// "prompt known to have no media" path is covered by the unit tests of
// `hooks/media.ts`, and by use.

export const text = (t: string) => ({ type: 'text', text: t })
export const image = { type: 'image' }

/** The engine's own drawing of the row: a leaf node. */
export const ENGINE_ROW = () => ({ type: 'engine', ref: 0 }) as never
