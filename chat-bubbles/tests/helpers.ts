// Shared by the engine tests. The test host has no bottom for `ui.render`, so
// tests stand in for it with a leaf node, as the engine's own row is one.

import type { Engine } from 'claude-code/testing'

export const text = (t: string) => ({ type: 'text', text: t })
export const image = { type: 'image' }

/** A row id of the real shape (a uuid), numbered. */
export const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** The engine's own drawing of the row: a leaf node. */
export const ENGINE_ROW = () => ({ type: 'engine', ref: 0 }) as never

/**
 * Stores a user row the way the engine does, through the plugin's real
 * `session.append` hook. The test host has no bottom for that event, so the call
 * rejects after the hook has run (and noted the row); the rejection is expected.
 */
export const store = (
  $: Engine,
  uuid: string,
  content: { type: string; text?: string }[] | string,
  door: 'prompt' | 'command' = 'prompt',
) =>
  $.session
    .append({ message: { type: 'user', role: 'user', content }, door, origin: { kind: 'composer' }, uuid } as never)
    .catch(() => undefined)
