// Color math for Chat Bubbles: hex parsing, mixing, gradients and WCAG
// contrast. Pure functions, no engine access, so they are easy to test.

export type Rgb = readonly [number, number, number]

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** `#rgb`, `#rrggbb`, with or without `#`, any case → `#rrggbb`; else null. */
export const normalizeHex = (raw: string): string | null => {
  const s = raw.trim().replace(/^#/, '').toLowerCase()
  if (/^[0-9a-f]{6}$/.test(s)) return `#${s}`
  if (/^[0-9a-f]{3}$/.test(s)) return `#${[...s].map(c => c + c).join('')}`
  return null
}

export const isHex = (value: unknown): value is string =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)

export const toRgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1, 7), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const toHex = ([r, g, b]: Rgb): string =>
  `#${[r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`

/** Linear blend from `from` (t = 0) to `to` (t = 1). */
export const mix = (from: string, to: string, t: number): string => {
  const a = toRgb(from)
  const b = toRgb(to)
  const k = clamp(t, 0, 1)
  return toHex([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k])
}

/** WCAG 2.x relative luminance, 0 (black) to 1 (white). */
const channel = (v: number) => {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export const luminance = (hex: string): number => {
  const [r, g, b] = toRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio, 1 to 21. */
export const contrast = (a: string, b: string): number => {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Black or white, whichever reads better on `bg`. */
export const inkOn = (bg: string): string => (contrast('#000000', bg) >= contrast('#ffffff', bg) ? '#111111' : '#ffffff')

/**
 * `fg` nudged toward black or white (whichever side `bg` is not on) just far
 * enough to reach `min` contrast against `bg`, keeping as much hue as it can.
 */
export const ensureContrast = (fg: string, bg: string, min = 4.5): string => {
  if (contrast(fg, bg) >= min) return fg
  const target = luminance(bg) > 0.5 ? '#000000' : '#ffffff'
  // Binary search for the smallest blend that clears the bar.
  let lo = 0
  let hi = 1
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    if (contrast(mix(fg, target, mid), bg) >= min) hi = mid
    else lo = mid
  }
  return mix(fg, target, hi)
}

/** Hue in degrees, 0 to 360; 0 for greys. */
export const hueOf = (hex: string): number => {
  const [r, g, b] = toRgb(hex).map(v => v / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  if (d === 0) return 0
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

/** Cool hues (yellow-green through violet) against warm ones (magenta through yellow). */
export const isCool = (hex: string): boolean => {
  const h = hueOf(hex)
  return h >= 75 && h < 285
}

export const hslToHex =(h: number, s: number, l: number): string => {
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255])
}

/** `steps` colors per segment through `stops`, looping back to the first. */
export const loopGradient = (stops: readonly string[], steps = 4): string[] => {
  const out: string[] = []
  stops.forEach((from, i) => {
    const to = stops[(i + 1) % stops.length] ?? from
    for (let s = 0; s < steps; s++) out.push(mix(from, to, s / steps))
  })
  return out
}
