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
export function frameGradient(types: readonly TypeName[]): string {
  if (types.length === 0) return 'linear-gradient(135deg, #444, #222)'
  const first = types[0] as TypeName
  if (types.length === 1) {
    return `linear-gradient(135deg, ${typeColor(first)}, ${typeColor(first)}cc)`
  }
  const second = types[1] as TypeName
  return `linear-gradient(135deg, ${typeColor(first)}, ${typeColor(second)})`
}
