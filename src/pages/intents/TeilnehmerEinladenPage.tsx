/**
 * Teilnehmer einladen — 3-Schritt-Wizard.
 * Steps: 1) Offene Umfrage auswählen → 2) Teilnehmerdaten erfassen → 3) Prüfen & Einladung speichern.
 * Reads: umfragen (titel, antwortfrist, status). Writes: teilnehmer (via useTeilnehmerEinladenFlow).
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
import { fieldText, fieldDate, fieldLookup } from '@/lib/journey';
import { useTeilnehmerEinladenFlow } from '@/lib/journey/flows/TeilnehmerEinladen';
import { tx } from '@/i18n';

export default function TeilnehmerEinladenPage() {
  const [step, setStep] = useState(1);
  const flow = useTeilnehmerEinladenFlow({
    steps: { umfrage: 1, vorname: 2, nachname: 2, email: 2, hinweis: 2 },
    items: {
      umfrage: u => {
        const frist = fieldDate(u, 'antwortfrist');
        return {
          id: u.id,
          title: fieldText(u, 'titel'),
          subtitle: frist ? tx`Antwort bis ${format(parseISO(frist), 'dd.MM.yyyy HH:mm')}` : undefined,
          status: fieldLookup(u, 'status') ?? undefined,
        };
      },
    },
  });

  return (
    <IntentWizardShell
      title={tx('Teilnehmer einladen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Eine Umfrage wählen und einen Teilnehmer dazu einladen.'),
        needs: [tx('Name des Teilnehmers'), tx('E-Mail-Adresse')],
      }}
    >
      <WizardStep label={tx('Umfrage')} description={tx('Zu welcher Umfrage möchtest du einladen?')}>
        <EntitySelectStep
          {...flow.picks.umfrage.select}
          {...flow.pick('umfrage')}
          searchPlaceholder={tx('Titel der Umfrage …')}
          avatar="none"
        />
      </WizardStep>
      <WizardStep label={tx('Teilnehmer')} description={tx('Wen möchtest du einladen?')} needs={['umfrage']}>
        <div className="space-y-4">
          <Bound form={flow.forms.teilnehmer} name="vorname" />
          <Bound form={flow.forms.teilnehmer} name="nachname" />
          <Bound form={flow.forms.teilnehmer} name="email" />
          <Bound form={flow.forms.teilnehmer} name="hinweis" hint={tx('Eine kurze Notiz zur Einladung')} />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[{ key: 'eingeladen_am', label: tx('Eingeladen am'), value: format(new Date(), 'dd.MM.yyyy HH:mm') }]}
            whatHappensNext={tx('Der Teilnehmer wird zur Umfrage erfasst und kann danach antworten.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Antworten erfassen'), href: '#/intents/antworten-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
