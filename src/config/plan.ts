// The orchestrator's plan, as far as the running app needs it
// (docs/orchestrator/SPEC.md). Generated — do not edit; regenerated on every
// build and update from the stored plan. Without a plan every map is empty.
//
//   SYSTEM_ASSIGNED entity → fields a tool fills when a record is CREATED — the
//                   value does not exist before; dialogs hide these on create and
//                   the form-polish sets no default on them. A scheduled or
//                   update-triggered tool owns its field but is NOT in here.
//   PLAN_SENTENCES  slug → the plan in the owner's words (flows' field page)
//
// The runtime write guard (FLOW_WRITES/OWNERSHIP, planGuard.ts) left on
// 23.09.2026: a flow page composes against its generated hook, whose submit
// plan IS the Schreibliste — there is no way to spell a write outside it.

import { INTENTS } from '@/config/intents';

export const SYSTEM_ASSIGNED: Record<string, string[]> = {
  "teilnehmer": [
    "persoenlicher_token"
  ]
};

export const PLAN_SENTENCES: Record<string, string[]> = {
  "umfrage-anlegen": [
    "Legt an: terminvorschlaege, umfragen",
    "Automatisch: status (fester Wert „offen“)"
  ],
  "teilnehmer-einladen": [
    "Legt an: teilnehmer",
    "Automatisch: eingeladen_am (aktueller Zeitpunkt, automatisch)"
  ],
  "antworten-erfassen": [
    "Legt an: antworten"
  ],
  "termin-festlegen": [
    "Ändert: umfragen",
    "Automatisch: status (fester Wert „abgeschlossen“)"
  ]
};

export const PLAN_SUMMARY = "Eine Terminabstimmung nach dem Vorbild von Doodle: Es wird eine Umfrage mit mehreren Terminvorschlägen angelegt, Teilnehmer werden eingeladen und antworten pro Termin mit Ja, Vielleicht oder Nein. Am Ende wird ein Termin gewählt und die Umfrage abgeschlossen.";

/** slug → the lists a flow writes (the plan's Schreibliste). The nav leaves a
 *  flow out for a user who may not write one of them (lib/permissions.ts). */
export const FLOW_ENTITIES: Record<string, string[]> = {
  "umfrage-anlegen": [
    "terminvorschlaege",
    "umfragen"
  ],
  "teilnehmer-einladen": [
    "teilnehmer"
  ],
  "antworten-erfassen": [
    "antworten"
  ],
  "termin-festlegen": [
    "umfragen"
  ]
};

/** A field an UPDATE flow writes, and the value it fixes (if it does). */
export interface FlowOwner { slug: string; value?: string }

/** entity → field → the update flows that change it. Such a change is the
 *  flow's job — it records who and when (a review, a decision) — so the
 *  dashboard never writes these fields itself; it opens the flow
 *  (check-dashboard gate 25). */
export const FLOW_OWNED: Record<string, Record<string, FlowOwner[]>> = {
  "umfragen": {
    "gewaehlter_termin": [
      {
        "slug": "termin-festlegen"
      }
    ],
    "status": [
      {
        "slug": "termin-festlegen",
        "value": "abgeschlossen"
      }
    ]
  }
};

/** The link that opens the flow owning `entity.field` with `recordId` already
 *  picked — `toValue` chooses between flows that fix different values (the
 *  approve flow vs the execute flow). null when no LIVE flow owns it (not
 *  built yet, or removed): the caller then offers no shortcut. */
export function flowLinkFor(entity: string, field: string, recordId: string, toValue?: string): string | null {
  const owners = (FLOW_OWNED[entity]?.[field] ?? []).filter(o => INTENTS.some(i => i.path === `/intents/${o.slug}`));
  const owner = (toValue !== undefined ? owners.find(o => o.value === toValue) : undefined)
    ?? owners.find(o => o.value === undefined)
    ?? owners[0];
  return owner ? `#/intents/${owner.slug}?record=${encodeURIComponent(recordId)}` : null;
}

/** flowLinkFor as a click handler — `action: go ? { label, onClick: go } : undefined`. */
export function flowActionFor(entity: string, field: string, recordId: string, toValue?: string): (() => void) | null {
  const href = flowLinkFor(entity, field, recordId, toValue);
  return href ? () => { window.location.hash = href.slice(1); } : null;
}
