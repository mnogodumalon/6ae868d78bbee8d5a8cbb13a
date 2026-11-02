/**
 * Antworten erfassen — 4-Schritt-Wizard.
 * Steps: 1) Teilnehmer wählen (Umfrage steht auf der Karte) → 2) Terminvorschlag wählen → 3) Ja/Vielleicht/Nein → 4) Prüfen & speichern.
 * Reads: umfragen (Titel über die Teilnehmerkarte), teilnehmer, terminvorschlaege. Writes: antworten (createAntwortenEntry via Flow-Hook).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldDate, fieldText, refFilter, combineFilters } from '@/lib/journey';
import { useAntwortenErfassenFlow } from '@/lib/journey/flows/AntwortenErfassen';
import { dateFnsLocale, tx } from '@/i18n';

export default function AntwortenErfassenPage() {
  const [step, setStep] = useState(1);
  const flow = useAntwortenErfassenFlow({
    steps: { teilnehmer: 1, terminvorschlag: 2, antwort: 3 },
    items: {
      teilnehmer: (r, ctx) => ({
        id: r.id,
        title: `${fieldText(r, 'vorname')} ${fieldText(r, 'nachname')}`.trim(),
        subtitle: ctx.ref('umfrage'),
      }),
      terminvorschlag: (r, ctx) => {
        const iso = fieldDate(r, 'termin');
        return {
          id: r.id,
          title: iso ? format(parseISO(iso), 'EEEE, dd.MM.yyyy · HH:mm', { locale: dateFnsLocale() }) : tx('Ohne Termin'),
          subtitle: ctx.ref('umfrage'),
        };
      },
    },
  });
  const f = flow.forms.antworten;

  // Block the write when this participant already answered this date.
  const checkUnique = async (): Promise<boolean | string> => {
    if (!flow.validateStep(3)) return false;
    const teilnehmerId = f.get('teilnehmer') as string | null;
    const terminId = f.get('terminvorschlag') as string | null;
    if (!teilnehmerId || !terminId) return true;
    const existing = await flow.port.list('antworten', {
      limit: 1,
      filter: combineFilters(refFilter('teilnehmer', teilnehmerId), refFilter('terminvorschlag', terminId)),
    });
    return existing.length > 0 ? tx('Dieser Teilnehmer hat für diesen Terminvorschlag schon geantwortet.') : true;
  };

  return (
    <IntentWizardShell
      title={tx('Antworten erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Für einen Teilnehmer Ja, Vielleicht oder Nein zu einem Terminvorschlag eintragen.'),
        needs: [tx('Name des Teilnehmers'), tx('Die Antworten des Teilnehmers')],
      }}
    >
      <WizardStep label={tx('Teilnehmer')} description={tx('Wähle den Teilnehmer — die Umfrage steht auf der Karte.')}>
        <EntitySelectStep
          {...flow.picks.teilnehmer.select}
          {...flow.pick('teilnehmer')}
          avatar="initials"
          searchPlaceholder={tx('Vor- oder Nachname …')}
        />
      </WizardStep>
      <WizardStep label={tx('Terminvorschlag')} description={tx('Zu welchem Terminvorschlag möchtest du eine Antwort eintragen?')} needs={['teilnehmer']}>
        <EntitySelectStep {...flow.picks.terminvorschlag.select} {...flow.pick('terminvorschlag')} />
      </WizardStep>
      <WizardStep label={tx('Antwort')} description={tx('Passt der Termin? Ja, Vielleicht oder Nein.')} needs={['teilnehmer', 'terminvorschlag']}>
        <div className="space-y-4">
          <Bound form={f} name="antwort" />
          <StepNav onBack={() => setStep(2)} onNext={checkUnique} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Antwort wird gespeichert. Für weitere Termine startest du den Ablauf einfach noch einmal.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          restartLabel={tx('Weitere Antwort erfassen')}
          next={[
            { label: tx('Weitere Antwort erfassen'), onClick: () => { flow.reset(); setStep(1); } },
            { label: tx('Termin festlegen und abschließen'), href: '#/intents/termin-festlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
