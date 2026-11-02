/**
 * Umfrage anlegen — 3-Schritt-Wizard.
 * Steps: 1) Titel, Beschreibung, Ort, Dauer, Antwortfrist → 2) Terminvorschlag erfassen → 3) Prüfen & anlegen.
 * Reads: — (keine Auswahl nötig). Writes: umfragen (status = offen), terminvorschlaege (verknüpft mit der neuen Umfrage).
 * Composes: IntentWizardShell, Bound, StepNav, SummaryStep, SuccessStep (Hook: useUmfrageAnlegenFlow).
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { useUmfrageAnlegenFlow } from '@/lib/journey/flows/UmfrageAnlegen';
import { optionsOf } from '@/lib/journey';
import { tx } from '@/i18n';

export default function UmfrageAnlegenPage() {
  const [step, setStep] = useState(1);
  const flow = useUmfrageAnlegenFlow({
    steps: { titel: 1, beschreibung: 1, ort: 1, dauer_minuten: 1, antwortfrist: 1, termin: 2 },
  });
  const statusLabel = optionsOf('umfragen', 'status').find(o => o.key === 'offen')?.label ?? 'offen';

  return (
    <IntentWizardShell
      title={tx('Umfrage anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine neue Terminumfrage mit Terminvorschlag in einem Zug anlegen.'),
        needs: [tx('Titel der Umfrage'), tx('Mögliche Termine')],
      }}
    >
      <WizardStep label={tx('Umfrage')} description={tx('Worum geht es, wo und wie lange?')}>
        <div className="space-y-4">
          <Bound form={flow.forms.umfragen} name="titel" />
          <Bound form={flow.forms.umfragen} name="beschreibung" />
          <Bound form={flow.forms.umfragen} name="ort" />
          <Bound form={flow.forms.umfragen} name="dauer_minuten" />
          <Bound form={flow.forms.umfragen} name="antwortfrist" />
          <StepNav hideBack onNext={() => flow.validateStep(1)} nextStepLabel={tx('Termine')} />
        </div>
      </WizardStep>
      <WizardStep label={tx('Termine')} description={tx('Wann könnte der Termin stattfinden? Datum und Uhrzeit wählen.')}>
        <div className="space-y-4">
          <Bound form={flow.forms.terminvorschlaege} name="termin" />
          <StepNav onBack={() => setStep(1)} onNext={() => flow.validateStep(2)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'status', label: tx('Status'), value: statusLabel }]}
            whatHappensNext={tx('Die Umfrage wird offen angelegt. Danach kannst du Teilnehmer einladen.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Teilnehmer einladen'), href: '#/intents/teilnehmer-einladen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
          whatHappensNext={tx('Lade jetzt Teilnehmer ein, damit sie ihre Antworten geben können.')}
        />
      )}
    </IntentWizardShell>
  );
}
