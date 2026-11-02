/**
 * intents.ts — registry of intent workflow pages (Phase 2).
 *
 * The intents orchestrator REGISTERS every page it creates here; the sidebar
 * section (IntentsNav) renders automatically from this list — no Layout edit
 * needed. Keep `path` identical to the route added in App.tsx's
 * `<custom:routes>` block.
 *
 * ONLY write inside the marker blocks — everything outside is scaffold and is
 * overwritten on the next /build/update.
 *
 *   <custom:intent-imports>
 *   import { IconCalendarPlus } from '@tabler/icons-react';
 *   </custom:intent-imports>
 *   …
 *   <custom:intents>
 *   { path: '/intents/neue-buchung', label: { de: 'Neue Buchung', en: 'New booking' }, icon: IconCalendarPlus, description: { de: 'Buchung in 3 Schritten anlegen', en: 'Create a booking in 3 steps' } },
 *   </custom:intents>
 */
import type { ComponentType } from 'react';

// <custom:intent-imports>
import { IconCalendarPlus, IconUserPlus, IconListCheck, IconCalendarCheck } from '@tabler/icons-react';
// </custom:intent-imports>

export interface IntentLink {
  /** Route path as wired in App.tsx (HashRouter), e.g. '/intents/neue-buchung'. */
  path: string;
  /**
   * Short sidebar label (1–3 words). Preferred: both UI languages
   * ({ de, en } — the runtime switcher picks the active one; cs stays
   * readable for legacy entries). A plain string stays valid and renders as-is.
   */
  label: string | { de?: string; en?: string; cs?: string };
  /** Tabler icon COMPONENT reference (not rendered JSX), e.g. IconCalendarPlus. */
  icon?: ComponentType<{ size?: number | string; className?: string; stroke?: number | string }>;
  /**
   * One-line purpose. Same shape as `label`: prefer both UI languages so a
   * language switch reaches it; a plain string stays valid.
   */
  description?: string | { de?: string; en?: string; cs?: string };
}

export const INTENTS: IntentLink[] = [
  // <custom:intents>
  { path: '/intents/umfrage-anlegen', label: { de: 'Umfrage mit Terminen anlegen', en: 'Create poll with dates' }, icon: IconCalendarPlus, description: { de: 'Eine neue Umfrage mit mehreren Terminvorschlägen in einem Zug anlegen.', en: 'Create a new poll with multiple proposed dates in one step.' } },
  { path: '/intents/teilnehmer-einladen', label: { de: 'Teilnehmer einladen', en: 'Invite participants' }, icon: IconUserPlus, description: { de: 'Eine offene Umfrage wählen und mehrere Teilnehmer dazu erfassen.', en: 'Select an open poll and add multiple participants to it.' } },
  { path: '/intents/antworten-erfassen', label: { de: 'Antworten erfassen', en: 'Record answers' }, icon: IconListCheck, description: { de: 'Für einen Teilnehmer zu jedem Terminvorschlag der Umfrage Ja, Vielleicht oder Nein eintragen.', en: 'For a participant, enter Yes, Maybe, or No for each proposed date in the poll.' } },
  { path: '/intents/termin-festlegen', label: { de: 'Termin festlegen und abschließen', en: 'Choose date and close' }, icon: IconCalendarCheck, description: { de: 'Ergebnisse je Terminvorschlag vergleichen, den Termin wählen und die Umfrage abschließen.', en: 'Compare results per proposed date, select the date, and close the poll.' } },
  // </custom:intents>
];

/**
 * True only in the Phase-1 deploy bundle (the service flips it): the sidebar
 * then shows ghost rows ("werden erstellt…") until Phase 2 registers the real
 * pages and sets this back to false. Lives OUTSIDE the custom markers on
 * purpose — a scaffold update resets it to false (self-healing if Phase 2
 * never ran).
 */
export const INTENTS_PENDING = false;

/**
 * When the Phase-1 bundle was deployed (ISO, set by the service together with
 * INTENTS_PENDING). The sidebar stops showing the ghost row PENDING_MAX_MINUTES
 * later on its own: a Phase 2 that ended red (or never ran) used to leave a
 * pulsing "werden erstellt …" in every deployed Phase-1 bundle forever — no
 * code path redeploys Phase 1 without the flag (live 03.09.2026).
 */
export const INTENTS_PENDING_SINCE: string | null = null;
export const PENDING_MAX_MINUTES = 30;
