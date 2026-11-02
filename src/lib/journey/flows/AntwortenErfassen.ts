/**
 * useAntwortenErfassenFlow — the plumbing of the flow « Antworten erfassen », generated from the plan.
 *
 * Writes `antworten`: asks `antwort`, `teilnehmer`, `terminvorschlag`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 4)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useAntwortenErfassenFlow({
 *     steps: { teilnehmer: 1, terminvorschlag: 2, antwort: 3 },
 *     items: { teilnehmer: r => ({ id: r.id, title: fieldText(r, 'vorname') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.teilnehmer.select} {...flow.pick('teilnehmer')} />
 *     <EntitySelectStep {...flow.picks.terminvorschlag.select} {...flow.pick('terminvorschlag')} />
 *     <Bound form={flow.forms.antworten} name="antwort" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type AntwortenErfassenFieldKey = 'antwort' | 'teilnehmer' | 'terminvorschlag';

export interface AntwortenErfassenForms {
  antworten: StepForm<'antworten'>;
}

// Alias so the option generics stay readable.
type Key = AntwortenErfassenFieldKey;

export interface AntwortenErfassenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    teilnehmer?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
    terminvorschlag?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"antwort": 3, "teilnehmer": 1, "terminvorschlag": 2};
export const ANTWORTENERFASSEN_REVIEW_STEP = 4;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useAntwortenErfassenFlow(options: AntwortenErfassenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const antworten = useStepForm('antworten', {
    fields: ["antwort", "teilnehmer", "terminvorschlag"],
    steps: only(steps, ["antwort", "teilnehmer", "terminvorschlag"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["antwort", "teilnehmer", "terminvorschlag"]),
    messages: only(options.messages as Record<string, string> | undefined, ["antwort", "teilnehmer", "terminvorschlag"]),
  });
  const forms: AntwortenErfassenForms = { antworten };
  // the editor of a list is not a record of its own: the review and the success
  // page read the entries (PlanStep.review), never the half-filled editor
  const formList: StepForm[] = [antworten];
  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    teilnehmer: useRecordSearch(servicePort, 'teilnehmer', withPickPolicy('teilnehmer', {
      searchFields: ["vorname", "nachname"] as never,
      toItem: options.items?.teilnehmer as never,
    })),
    terminvorschlag: useRecordSearch(servicePort, 'terminvorschlaege', withPickPolicy('terminvorschlag', {
      searchFields: [] as never,
      toItem: options.items?.terminvorschlag as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:antworten-erfassen:read:${entity}`);
  const picks = {
    teilnehmer: { ...searches.teilnehmer, select: { ...searches.teilnehmer.select, create: false as boolean, hint: hintFor('teilnehmer', 'teilnehmer', null as PickWhere | null) } },
    terminvorschlag: { ...searches.terminvorschlag, select: { ...searches.terminvorschlag.select, create: false as boolean, hint: hintFor('terminvorschlag', 'terminvorschlaege', null as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'antworten', entity: 'antworten', form: antworten, primary: true,    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'antworten-erfassen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: AntwortenErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: AntwortenErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'antworten-erfassen' as const,
    draftKey: 'antworten-erfassen' as const,
    entity: 'antworten' as const,
    form: antworten,
    forms, formList, picks, submit, steps,    reviewStep: ANTWORTENERFASSEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type AntwortenErfassenFlow = ReturnType<typeof useAntwortenErfassenFlow>;
