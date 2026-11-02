/**
 * Termin festlegen — 4-Schritt-Wizard.
 * Steps: 1) Offene Umfrage wählen → 2) Antworten je Terminvorschlag ansehen → 3) Gewinnertermin wählen → 4) Prüfen & abschließen.
 * Reads: umfragen, terminvorschlaege, antworten. Writes: umfragen (gewaehlter_termin, status = abgeschlossen) via useTerminFestlegenFlow.
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldDate, fieldLookup, fieldRef, fieldText, refFilter } from '@/lib/journey';
import type { JourneyRecord } from '@/lib/journey';
import { useTerminFestlegenFlow } from '@/lib/journey/flows/TerminFestlegen';
import { dateFnsLocale, tx } from '@/i18n';

interface Tally {
  ja: number;
  vielleicht: number;
  nein: number;
}

export default function TerminFestlegenPage() {
  const [step, setStep] = useState(1);
  const [vorschlaege, setVorschlaege] = useState<JourneyRecord[]>([]);
  const [tallies, setTallies] = useState<Record<string, Tally>>({});
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answersError, setAnswersError] = useState<string | null>(null);

  const flow = useTerminFestlegenFlow({
    steps: { umfragen: 1, gewaehlter_termin: 3 },
    items: {
      umfragen: r => ({ id: r.id, title: fieldText(r, 'titel') }),
    },
  });

  const umfrageId = flow.pick('umfragen').selectedId ?? null;
  const port = flow.port;

  const fmt = (iso: string | null) =>
    iso ? format(parseISO(iso), 'PPpp', { locale: dateFnsLocale() }) : '—';

  useEffect(() => {
    if (!umfrageId) {
      setVorschlaege([]);
      setTallies({});
      return;
    }
    let cancelled = false;
    setLoadingAnswers(true);
    setAnswersError(null);
    (async () => {
      try {
        const vs = await port.list('terminvorschlaege', {
          filter: refFilter('umfrage', umfrageId),
          orderby: ['r.v_termin asc'],
        });
        const ids = new Set(vs.map(v => v.id));
        const all = await port.list('antworten', { limit: 1000 });
        const next: Record<string, Tally> = {};
        vs.forEach(v => { next[v.id] = { ja: 0, vielleicht: 0, nein: 0 }; });
        all.forEach(a => {
          const vid = fieldRef(a, 'terminvorschlag');
          const key = fieldLookup(a, 'antwort')?.key;
          if (vid && ids.has(vid) && (key === 'ja' || key === 'vielleicht' || key === 'nein')) {
            next[vid][key] += 1;
          }
        });
        if (!cancelled) {
          setVorschlaege(vs);
          setTallies(next);
        }
      } catch (e) {
        if (!cancelled) setAnswersError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoadingAnswers(false);
      }
    })();
    return () => { cancelled = true; };
  }, [umfrageId, port]);

  const bestId = useMemo(() => {
    let best: string | null = null;
    let score = -1;
    vorschlaege.forEach(v => {
      const t = tallies[v.id];
      if (!t) return;
      const s = t.ja * 2 + t.vielleicht;
      if (s > score) { score = s; best = v.id; }
    });
    return score > 0 ? best : null;
  }, [vorschlaege, tallies]);

  const terminSelect = flow.picks.gewaehlter_termin.select;
  const terminItems = useMemo(() => {
    const allowed = new Set(vorschlaege.map(v => v.id));
    return terminSelect.items
      .filter(i => allowed.has(i.id))
      .map(i => {
        const t = tallies[i.id];
        return {
          id: i.id,
          title: i.title,
          subtitle: i.id === bestId ? tx('Beste Übereinstimmung') : undefined,
          stats: t
            ? [
                { label: tx('Ja'), value: t.ja },
                { label: tx('Vielleicht'), value: t.vielleicht },
                { label: tx('Nein'), value: t.nein },
              ]
            : undefined,
        };
      });
  }, [terminSelect.items, vorschlaege, tallies, bestId]);

  const maxTotal = Math.max(1, ...Object.values(tallies).map(t => t.ja + t.vielleicht + t.nein));

  return (
    <IntentWizardShell
      title={tx('Termin festlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Antworten vergleichen, Gewinnertermin wählen und die Umfrage abschließen.'),
        needs: [tx('Eine offene Umfrage mit Antworten')],
      }}
    >
      <WizardStep label={tx('Umfrage')} description={tx('Welche Umfrage möchtest du abschließen?')}>
        <EntitySelectStep
          {...flow.picks.umfragen.select}
          {...flow.pick('umfragen')}
          searchPlaceholder={tx('Titel der Umfrage …')}
          avatar="none"
        />
      </WizardStep>

      <WizardStep
        label={tx('Antworten')}
        description={tx('So haben die Teilnehmer je Terminvorschlag geantwortet.')}
        needs={['umfragen']}
      >
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl bg-secondary p-4">
            <p className="text-xs text-muted-foreground">{tx('Gewählte Umfrage')}</p>
            <p className="truncate font-medium">{(umfrageId && flow.picks.umfragen.labelOf(umfrageId)) || '—'}</p>
          </div>
          {loadingAnswers && <p className="text-sm text-muted-foreground">{tx('Antworten werden geladen …')}</p>}
          {answersError && <p className="text-sm text-destructive">{answersError}</p>}
          {!loadingAnswers && !answersError && vorschlaege.length === 0 && (
            <p className="text-sm text-muted-foreground">{tx('Diese Umfrage hat noch keine Terminvorschläge.')}</p>
          )}
          <div className="space-y-3">
            {vorschlaege.map(v => {
              const t = tallies[v.id] ?? { ja: 0, vielleicht: 0, nein: 0 };
              const total = t.ja + t.vielleicht + t.nein;
              return (
                <div key={v.id} className="overflow-hidden rounded-2xl border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{fmt(fieldDate(v, 'termin'))}</span>
                    {v.id === bestId && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {tx('Beste Übereinstimmung')}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-secondary" style={{ width: `${Math.max(8, (total / maxTotal) * 100)}%` }}>
                    {total > 0 && (
                      <>
                        <div className="bg-emerald-500" style={{ width: `${(t.ja / total) * 100}%` }} />
                        <div className="bg-amber-400" style={{ width: `${(t.vielleicht / total) * 100}%` }} />
                        <div className="bg-rose-500" style={{ width: `${(t.nein / total) * 100}%` }} />
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {tx`${t.ja} Ja · ${t.vielleicht} Vielleicht · ${t.nein} Nein`}
                  </p>
                </div>
              );
            })}
          </div>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextStepLabel={tx('Termin wählen')}
            nextDisabled={loadingAnswers || vorschlaege.length === 0}
          />
        </div>
      </WizardStep>

      <WizardStep
        label={tx('Gewinnertermin')}
        description={tx('Welcher Termin soll gelten?')}
        needs={['umfragen']}
      >
        <EntitySelectStep
          {...terminSelect}
          items={terminItems}
          onSearch={undefined}
          onSelect={flow.pick('gewaehlter_termin').onSelect}
          selectedId={flow.pick('gewaehlter_termin').selectedId}
          avatar="none"
          create={false}
          emptyText={tx('Zu dieser Umfrage gibt es keine Terminvorschläge.')}
        />
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'status', label: tx('Status'), value: tx('Abgeschlossen') }]}
            whatHappensNext={tx('Die Umfrage wird mit dem gewählten Termin abgeschlossen.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          actions={{ copy: false, print: false }}
          next={[
            { label: tx('Teilnehmer einladen'), href: '#/intents/teilnehmer-einladen' },
            { label: tx('Neue Umfrage anlegen'), href: '#/intents/umfrage-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
