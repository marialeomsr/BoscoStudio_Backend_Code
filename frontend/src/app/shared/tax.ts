import { TaxLine, TaxSplit } from '../core/models/studio.models';

/** The form values both pricing editors (order form, invoice editor) share. */
export interface TaxFields {
  taxSplit: TaxSplit;
  taxPercent: number | null;
  cgstPercent: number | null;
  sgstPercent: number | null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** The total tax rate sent to the API: CGST + SGST when split, else the single rate. */
export function totalTaxPercent(v: TaxFields): number {
  return v.taxSplit === 'CGST+SGST' ? round2((v.cgstPercent ?? 0) + (v.sgstPercent ?? 0)) : (v.taxPercent ?? 0);
}

/** CGST / SGST rates of a saved order or document (equal halves when none were recorded, i.e. a single tax line). */
export function ratesFromLines(lines: TaxLine[], totalPercent: number): { cgstPercent: number; sgstPercent: number } {
  const cgst = lines.find((l) => l.label === 'CGST')?.percent;
  const sgst = lines.find((l) => l.label === 'SGST')?.percent;
  return cgst !== undefined && sgst !== undefined
    ? { cgstPercent: cgst, sgstPercent: sgst }
    : { cgstPercent: round2(totalPercent / 2), sgstPercent: round2(totalPercent / 2) };
}
