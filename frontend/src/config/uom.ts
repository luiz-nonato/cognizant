/** PRD DEC-24 curated UoM set (P0). API codes stay English; UI labels are i18n. */
export const CURATED_UOMS = ['kg', 'g', 'L', 'ml', 'unit', 'pack'] as const

export type CuratedUom = (typeof CURATED_UOMS)[number]

export function isCuratedUom(value: string): value is CuratedUom {
  return (CURATED_UOMS as readonly string[]).includes(value)
}
