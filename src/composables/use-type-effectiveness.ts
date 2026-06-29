// useTypeEffectiveness — display helper for a Pokémon's weakness/resistance buckets (AC-4 display).
// The opponent-move-vs-active matchup is explicitly OUT OF SCOPE this version (spec § Out of Scope).
// Pure presentation over the already-computed TypeEffectiveness; no fetch.

import type { TypeEffectiveness, TypeName } from '@/types/battle'

export interface EffectivenessRow {
  label: string
  multiplier: string
  types: TypeName[]
}

/** Flatten the buckets into display rows, omitting empty buckets, strongest-first. */
export function useTypeEffectiveness() {
  function toRows(effectiveness: TypeEffectiveness): EffectivenessRow[] {
    const rows: EffectivenessRow[] = [
      { label: 'Débil x4', multiplier: '×4', types: effectiveness.quadrupleWeak },
      { label: 'Débil x2', multiplier: '×2', types: effectiveness.weak },
      { label: 'Resiste x½', multiplier: '×½', types: effectiveness.resist },
      { label: 'Resiste x¼', multiplier: '×¼', types: effectiveness.quarterResist },
      { label: 'Inmune', multiplier: '×0', types: effectiveness.immune },
    ]
    return rows.filter((row) => row.types.length > 0)
  }

  return { toRows }
}
