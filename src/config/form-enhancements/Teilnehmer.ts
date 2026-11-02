// Auto-generated. Per-entity form-enhancements config for "Teilnehmer".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["umfrage", {"row": ["vorname", "nachname"]}, "email", {"row": ["eingeladen_am", "letzte_erinnerung"], "cols": "1fr 1fr"}, "persoenlicher_token", "hinweis"],
  defaults: {
    'eingeladen_am': { kind: 'today', withTime: true },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
