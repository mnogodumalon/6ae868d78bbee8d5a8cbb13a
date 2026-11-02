import { useMemo, useState } from 'react';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { IconAlertTriangle, IconCheck, IconPlus, IconQuestionMark, IconTrophy, IconX } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor } from '@/config/plan';
import { extractRecordId } from '@/services/livingAppsService';
import { lookupKey } from '@/lib/formatters';
import { lookupOption } from '@/types/app';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';

const SOON_DAYS = 3;

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { umfragen, terminvorschlaege, teilnehmer, antworten } = data;
  const clock = useClock();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [soonOnly, setSoonOnly] = useState(false);

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type !== 'umfragen') return undefined;
      if (lookupKey(top.record.fields.status) === 'abgeschlossen') return undefined;
      const go = flowActionFor('umfragen', 'status', top.record.record_id, 'abgeschlossen');
      return go ? { label: tx('Termin festlegen'), onClick: go } : undefined;
    },
  });

  const fmtTermin = (s?: string) =>
    s ? format(parseISO(s), 'EEE dd.MM. HH:mm', { locale: dateFnsLocale() }) : '—';
  const fmtFrist = (s?: string) =>
    s ? format(parseISO(s), 'dd.MM. HH:mm', { locale: dateFnsLocale() }) : '—';
  const personName = (t: { fields: { vorname?: string; nachname?: string } }) =>
    `${t.fields.vorname ?? ''} ${t.fields.nachname ?? ''}`.trim();

  const model = useMemo(() => {
    const termsBy = new Map<string, typeof terminvorschlaege>();
    for (const t of terminvorschlaege) {
      const id = extractRecordId(t.fields.umfrage);
      if (!id) continue;
      termsBy.set(id, [...(termsBy.get(id) ?? []), t]);
    }
    for (const [k, v] of termsBy) {
      termsBy.set(k, [...v].sort((a, b) => (a.fields.termin ?? '').localeCompare(b.fields.termin ?? '')));
    }
    const peopleBy = new Map<string, typeof teilnehmer>();
    for (const p of teilnehmer) {
      const id = extractRecordId(p.fields.umfrage);
      if (!id) continue;
      peopleBy.set(id, [...(peopleBy.get(id) ?? []), p]);
    }
    const answerBy = new Map<string, (typeof antworten)[number]>();
    for (const a of antworten) {
      const p = extractRecordId(a.fields.teilnehmer);
      const t = extractRecordId(a.fields.terminvorschlag);
      if (p && t) answerBy.set(`${p}:${t}`, a);
    }
    return { termsBy, peopleBy, answerBy };
  }, [terminvorschlaege, teilnehmer, antworten]);

  const isOpen = (u: (typeof umfragen)[number]) => lookupKey(u.fields.status) !== 'abgeschlossen';
  const daysLeft = (u: (typeof umfragen)[number]) =>
    u.fields.antwortfrist ? differenceInCalendarDays(parseISO(u.fields.antwortfrist), clock) : null;

  const open = useMemo(
    () => umfragen.filter(isOpen).sort((a, b) => (a.fields.antwortfrist ?? '9').localeCompare(b.fields.antwortfrist ?? '9')),
    [umfragen],
  );
  const closed = useMemo(
    () => umfragen.filter(u => !isOpen(u)).sort((a, b) => (b.updatedat ?? b.createdat).localeCompare(a.updatedat ?? a.createdat)),
    [umfragen],
  );

  const overdue = open.filter(u => { const d = daysLeft(u); return d !== null && d < 0; });
  const soon = open.filter(u => { const d = daysLeft(u); return d !== null && d >= 0 && d <= SOON_DAYS; });

  const goClose = (id: string) => flowActionFor('umfragen', 'status', id, 'abgeschlossen');
  const heroGo = overdue[0] ? goClose(overdue[0].record_id) : null;
  const heroShown = overdue.length > 0 && !!heroGo;

  // participants who still owe answers in open polls
  const pending = useMemo(() => {
    const out: { p: (typeof teilnehmer)[number]; u: (typeof umfragen)[number]; missing: number; total: number }[] = [];
    for (const u of open) {
      const terms = model.termsBy.get(u.record_id) ?? [];
      if (terms.length === 0) continue;
      for (const p of model.peopleBy.get(u.record_id) ?? []) {
        const given = terms.filter(t => model.answerBy.has(`${p.record_id}:${t.record_id}`)).length;
        if (given < terms.length) out.push({ p, u, missing: terms.length - given, total: terms.length });
      }
    }
    return out;
  }, [open, model]);
  const silent = pending.filter(x => x.missing === x.total);
  const totalInvited = open.reduce((n, u) => n + (model.peopleBy.get(u.record_id)?.length ?? 0), 0);
  const quote = totalInvited > 0 ? Math.round(((totalInvited - silent.length) / totalInvited) * 100) : 0;

  const chips = (soonOnly ? soon : [...open, ...closed]);
  const current = umfragen.find(u => u.record_id === selectedId) ?? open[0] ?? closed[0];

  const answerIcon = (key?: string) => {
    if (key === 'ja') return <IconCheck size={16} className="text-emerald-600" />;
    if (key === 'vielleicht') return <IconQuestionMark size={16} className="text-amber-600" />;
    if (key === 'nein') return <IconX size={16} className="text-rose-500" />;
    return <span className="text-muted-foreground">·</span>;
  };
  const answerBg = (key?: string) =>
    key === 'ja' ? 'bg-emerald-500/10' : key === 'vielleicht' ? 'bg-amber-500/10' : key === 'nein' ? 'bg-rose-500/10' : '';

  const matrix = (() => {
    if (!current) return null;
    const terms = model.termsBy.get(current.record_id) ?? [];
    const people = model.peopleBy.get(current.record_id) ?? [];
    const chosenId = extractRecordId(current.fields.gewaehlter_termin);
    const stats = terms.map(t => {
      let ja = 0, vi = 0, ne = 0;
      for (const p of people) {
        const k = lookupKey(model.answerBy.get(`${p.record_id}:${t.record_id}`)?.fields.antwort);
        if (k === 'ja') ja++; else if (k === 'vielleicht') vi++; else if (k === 'nein') ne++;
      }
      return { t, ja, vi, ne };
    });
    const best = stats.filter(s => s.ja + s.vi > 0).sort((a, b) => b.ja - a.ja || b.vi - a.vi)[0];
    return { terms, people, chosenId, stats, bestId: best?.t.record_id };
  })();

  const gruessung = gruss(clock);
  const context = (() => {
    if (umfragen.length === 0) return tx('Lege deine erste Umfrage an und finde einen Termin für alle.');
    if (overdue.length > 0) return tx`${namen(overdue.map(u => u.fields.titel ?? ''))} — Antwortfrist abgelaufen, Termin festlegen.`;
    if (soon.length > 0) return tx`${namen(soon.map(u => u.fields.titel ?? ''))} — Frist läuft bald ab.`;
    if (silent.length > 0) return tx`${namen(silent.map(x => x.p.fields.vorname ?? ''))} haben noch nicht geantwortet.`;
    if (open.length > 0) return tx`${namen(open.map(u => u.fields.titel ?? ''))} — alle Antworten im Zeitplan.`;
    return tx`${namen(closed.map(u => u.fields.titel ?? ''))} — alles abgeschlossen.`;
  })();

  const dayLabel = (u: (typeof umfragen)[number]) => {
    const d = daysLeft(u);
    if (d === null) return tx('ohne Frist');
    if (d < 0) return tx`seit ${-d} Tagen überfällig`;
    if (d === 0) return tx('heute fällig');
    if (d === 1) return tx('morgen fällig');
    return tx`in ${d} Tagen fällig`;
  };

  const fristItems = (heroShown ? open.filter(u => !overdue.includes(u)) : open)
    .filter(u => u.fields.antwortfrist)
    .map(u => {
      const d = daysLeft(u);
      const go = goClose(u.record_id);
      return {
        id: u.record_id,
        title: u.fields.titel ?? '—',
        secondLine: (
          <>
            <span className={d !== null && d <= SOON_DAYS ? 'font-medium text-amber-600' : 'text-muted-foreground'}>{dayLabel(u)}</span>
            <span className="text-muted-foreground"> · {fmtFrist(u.fields.antwortfrist)}</span>
          </>
        ),
        action: go ? { label: tx('Abschließen'), onClick: go } : undefined,
      };
    });

  const pendingItems = [...pending]
    .sort((a, b) => b.missing / b.total - a.missing / a.total)
    .map(x => ({
      id: `${x.u.record_id}|${x.p.record_id}`,
      title: personName(x.p),
      secondLine: (
        <>
          <span className="font-medium text-amber-600">
            {x.missing === x.total ? tx('Noch keine Antwort') : tx`${x.missing} von ${x.total} offen`}
          </span>
          <span className="text-muted-foreground"> · {x.u.fields.titel}</span>
        </>
      ),
    }));

  const closedItems = closed.map(u => {
    const t = terminvorschlaege.find(x => x.record_id === extractRecordId(u.fields.gewaehlter_termin));
    return {
      id: u.record_id,
      title: u.fields.titel ?? '—',
      secondLine: t
        ? <span className="font-medium text-emerald-600">{fmtTermin(t.fields.termin)}</span>
        : <span className="text-muted-foreground">{tx('Kein Termin gewählt')}</span>,
    };
  });

  const openUmfrage = (id: string) => {
    const u = umfragen.find(x => x.record_id === id);
    if (u) crud.umfragen.openDetail(u);
  };

  if (umfragen.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{gruessung}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        <div className="rounded-[27px] bg-card shadow-sm p-10 flex flex-col items-center text-center gap-3">
          <IconTrophy size={48} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground max-w-sm">
            {tx('Schlage mehrere Termine vor, lade Teilnehmer ein und wähle am Ende den besten Termin.')}
          </p>
          {crud.umfragen.canWrite && (
            <Button onClick={() => crud.umfragen.openCreate({ status: 'offen' })}>
              <IconPlus size={16} className="mr-1" />{tx('Erste Umfrage anlegen')}
            </Button>
          )}
        </div>
        {crud.surfaces}
      </div>
    );
  }

  const cur = current;
  const curGo = cur && isOpen(cur) ? goClose(cur.record_id) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruessung}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        {crud.umfragen.canWrite && (
          <Button onClick={() => crud.umfragen.openCreate({ status: 'offen' })}>
            <IconPlus size={16} className="mr-1" />{tx('Neue Umfrage')}
          </Button>
        )}
      </div>

      <DashboardGrid
        variant="wide"
        hero={heroShown && heroGo ? (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{ label: tx('Termin festlegen'), onClick: heroGo }}
          >
            <b>{namen(overdue.map(u => u.fields.titel ?? ''))}</b> {tx('— Antwortfrist abgelaufen. Zeit, einen Termin zu wählen.')}
          </HeroBanner>
        ) : undefined}
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx`Frist ≤ ${SOON_DAYS} Tage`}
              value={soon.length}
              icon={<IconAlertTriangle size={16} />}
              tone={soon.length > 0 ? 'warning' : 'default'}
              onClick={() => setSoonOnly(v => !v)}
              active={soonOnly}
            />
            <StatStripItem
              title={tx('Ohne Antwort')}
              value={silent.length}
              icon={<IconQuestionMark size={16} />}
              tone={silent.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title={tx('Antwortquote')}
              value={`${quote} %`}
              icon={<IconCheck size={16} />}
              tone={quote === 100 && totalInvited > 0 ? 'success' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <div className="rounded-[27px] bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b flex flex-wrap gap-2">
              {chips.length === 0 && <span className="text-sm text-muted-foreground">{tx('Keine Umfrage mit baldiger Frist.')}</span>}
              {chips.map(u => (
                <button
                  key={u.record_id}
                  type="button"
                  onClick={() => setSelectedId(u.record_id)}
                  className={`rounded-full border px-3 py-1 text-sm min-w-0 max-w-full truncate transition-colors ${
                    cur?.record_id === u.record_id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                  } ${isOpen(u) ? '' : 'opacity-70'}`}
                >
                  {u.fields.titel ?? '—'}
                </button>
              ))}
            </div>
            {cur && matrix && (
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <button type="button" className="text-lg font-semibold hover:underline text-left truncate max-w-full" onClick={() => crud.umfragen.openDetail(cur)}>
                      {cur.fields.titel}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {isOpen(cur) ? `${dayLabel(cur)} · ${fmtFrist(cur.fields.antwortfrist)}` : tx('Abgeschlossen')}
                      {cur.fields.ort ? ` · ${cur.fields.ort}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {crud.terminvorschlaege.canWrite && isOpen(cur) && (
                      <Button variant="outline" size="sm" onClick={() => crud.terminvorschlaege.openCreate({ umfrage: cur.record_id })}>
                        <IconPlus size={14} className="mr-1" />{tx('Terminvorschlag')}
                      </Button>
                    )}
                    {crud.teilnehmer.canWrite && isOpen(cur) && (
                      <Button variant="outline" size="sm" onClick={() => crud.teilnehmer.openCreate({ umfrage: cur.record_id })}>
                        <IconPlus size={14} className="mr-1" />{appLabel('teilnehmer')}
                      </Button>
                    )}
                    {curGo && (
                      <Button size="sm" onClick={curGo}>
                        <IconTrophy size={14} className="mr-1" />{tx('Termin festlegen')}
                      </Button>
                    )}
                  </div>
                </div>

                {matrix.terms.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">{tx('Noch keine Terminvorschläge.')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="sticky left-0 bg-card text-left font-medium text-muted-foreground p-2 min-w-[120px]">{appLabel('teilnehmer')}</th>
                          {matrix.stats.map(s => {
                            const chosen = matrix.chosenId === s.t.record_id;
                            const best = !matrix.chosenId && matrix.bestId === s.t.record_id;
                            return (
                              <th
                                key={s.t.record_id}
                                className={`p-2 text-center font-medium min-w-[96px] cursor-pointer hover:bg-muted/50 ${chosen ? 'bg-emerald-500/15' : best ? 'bg-primary/10' : ''}`}
                                onClick={() => crud.terminvorschlaege.openDetail(s.t)}
                              >
                                <div>{fmtTermin(s.t.fields.termin)}</div>
                                <div className="text-xs font-normal text-muted-foreground">
                                  {s.ja} ✓ · {s.vi} ? · {s.ne} ✗
                                </div>
                                {chosen && <div className="text-xs text-emerald-600">{tx('Gewählt')}</div>}
                                {best && <div className="text-xs text-primary">{tx('Beste Option')}</div>}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {matrix.people.length === 0 && (
                          <tr><td colSpan={matrix.terms.length + 1} className="p-4 text-center text-muted-foreground">{tx('Noch keine Teilnehmer eingeladen.')}</td></tr>
                        )}
                        {matrix.people.map(p => (
                          <tr key={p.record_id}>
                            <td className="sticky left-0 bg-card border-t p-2">
                              <button type="button" className="hover:underline text-left truncate max-w-[160px]" onClick={() => crud.teilnehmer.openDetail(p)}>
                                {personName(p)}
                              </button>
                            </td>
                            {matrix.terms.map(t => {
                              const a = model.answerBy.get(`${p.record_id}:${t.record_id}`);
                              const key = lookupKey(a?.fields.antwort) ?? undefined;
                              return (
                                <td key={t.record_id} className={`border-t p-0 text-center ${answerBg(key)}`}>
                                  <button
                                    type="button"
                                    className="w-full h-10 flex items-center justify-center hover:bg-muted/40"
                                    aria-label={key ? lookupOption('antworten', 'antwort', key).label : tx('Keine Antwort')}
                                    onClick={() => {
                                      if (a) crud.antworten.openDetail(a);
                                      else if (crud.antworten.canWrite) crud.antworten.openCreate({ teilnehmer: p.record_id, terminvorschlag: t.record_id });
                                    }}
                                  >
                                    {answerIcon(key)}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        }
        aside={
          <>
            <WorkList
              title={tx('Antwortfrist')}
              items={fristItems}
              max={5}
              onItemClick={openUmfrage}
              empty={{ text: tx('Keine offene Umfrage mit Antwortfrist.') }}
            />
            <WorkList
              title={tx('Ohne Antwort')}
              items={pendingItems}
              max={5}
              onItemClick={(id) => {
                const p = teilnehmer.find(x => x.record_id === id.split('|')[1]);
                if (p) crud.teilnehmer.openDetail(p);
              }}
              empty={{ text: tx('Alle Teilnehmer haben geantwortet.') }}
            />
            <WorkList
              title={tx('Abgeschlossen')}
              items={closedItems}
              max={5}
              onItemClick={openUmfrage}
              empty={{ text: tx('Noch keine Umfrage abgeschlossen.') }}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
