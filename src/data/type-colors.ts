// Canonical per-type colours for card frames and move chips (AC-16). Reference data, not inline in
// components (project-standards § Architecture). Recorded as a visual convention in design-decisions.md.

import type { TypeName } from '@/types/battle'

export const TYPE_COLORS: Record<TypeName, string> = {
  normal: '#9fa19f',
  fire: '#e62829',
  water: '#2980ef',
  electric: '#fac000',
  grass: '#3fa129',
  ice: '#3dcef3',
  fighting: '#ff8000',
  poison: '#9141cb',
  ground: '#915121',
  flying: '#81b9ef',
  psychic: '#ef4179',
  bug: '#91a119',
  rock: '#afa981',
  ghost: '#704170',
  dragon: '#5060e1',
  dark: '#50413f',
  steel: '#60a1b8',
  fairy: '#ef70ef',
}

export function typeColor(type: TypeName): string {
  return TYPE_COLORS[type]
}

/**
 * A CSS `linear-gradient` for a card frame, from the Pokémon's type(s).
 * Single type → solid-ish gradient; dual type → blend of both type colours.
 */
/** Darken a `#rrggbb` colour toward black so a same-type badge/chip stands out against the frame. */
function darken(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * factor)
  const g = Math.round(((n >> 8) & 255) * factor)
  const b = Math.round((n & 255) * factor)
  const toHex = (v: number): string => v.toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function frameGradient(types: readonly TypeName[]): string {
  // Darkened type tint: keeps the type identity but lets full-brightness type badges/move chips
  // and the text stand out (a same-type chip on a bright frame would otherwise blend in).
  if (types.length === 0) return 'linear-gradient(135deg, #2a2d36, #1a1c22)'
  const first = types[0] as TypeName
  if (types.length === 1) {
    return `linear-gradient(135deg, ${darken(typeColor(first), 0.5)}, ${darken(typeColor(first), 0.34)})`
  }
  const second = types[1] as TypeName
  return `linear-gradient(135deg, ${darken(typeColor(first), 0.5)}, ${darken(typeColor(second), 0.5)})`
}
