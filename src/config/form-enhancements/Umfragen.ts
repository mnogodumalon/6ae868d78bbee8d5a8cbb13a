// Auto-generated. Per-entity form-enhancements config for "Umfragen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["titel", "status", {"row": ["antwortfrist", "dauer_minuten"], "cols": "2fr 1fr"}, "ort", "gewaehlter_termin", "beschreibung"],
  defaults: {
    'status': { kind: 'lookup', key: 'offen', label: 'Offen' },
    'antwortfrist': { kind: 'todayOffset', days: 14, withTime: true },
    'dauer_minuten': { kind: 'literal', value: 60 },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
