import type { Teilnehmer, Umfragen, Antworten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface TeilnehmerDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Teilnehmer;
  /** N:1-Ziel „Umfragen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  umfragenList: Umfragen[];
  /** Klick auf die Umfragen-Relation → overlay.push auf dessen Detail. */
  onOpenUmfragen?: (record: Umfragen) => void;
  /** 1:N „Antworten" (teilnehmer): VOLLE Liste — der Block filtert auf diesen Record. */
  antwortenList: Antworten[];
  /** Zeilen-Klick → overlay.push auf das Antworten-Detail (nie der Edit-Dialog). */
  onOpenAntworten: (record: Antworten) => void;
  /** Kontextuelles „+": öffnet den Antworten-Dialog mit diesem Record vorgesetzt. */
  onAddAntworten?: () => void;
}

export function TeilnehmerDetails({
  record,
  umfragenList,
  onOpenUmfragen,
  antwortenList,
  onOpenAntworten,
  onAddAntworten,
}: TeilnehmerDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const umfrageTarget = umfragenList.find(r => r.record_id === extractRecordId(record.fields.umfrage));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('teilnehmer', 'vorname')} value={record.fields.vorname} format="text" />
        <RecordField label={fieldLabel('teilnehmer', 'nachname')} value={record.fields.nachname} format="text" />
        <RecordField label={fieldLabel('teilnehmer', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('teilnehmer', 'hinweis')} value={record.fields.hinweis} format="text" />
        <RecordField label={fieldLabel('teilnehmer', 'eingeladen_am')} value={record.fields.eingeladen_am} format="datetime" />
        <RecordField label={fieldLabel('teilnehmer', 'letzte_erinnerung')} value={record.fields.letzte_erinnerung} format="datetime" />
        <RecordField label={fieldLabel('teilnehmer', 'persoenlicher_token')} value={record.fields.persoenlicher_token} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('teilnehmer', 'umfrage')}
          name={umfrageTarget?.fields.titel ?? '—'}
          meta={[umfrageTarget?.fields.ort].filter(Boolean).join(' · ') || undefined}
          onClick={umfrageTarget && onOpenUmfragen ? () => onOpenUmfragen!(umfrageTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('antworten')}
        items={antwortenList.filter(r => extractRecordId(r.fields.teilnehmer) === record.record_id)}
        map={() => ({ name: appLabel('antworten'), meta: undefined })}
        onOpen={onOpenAntworten}
        onAdd={onAddAntworten}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.TEILNEHMER} recordId={record.record_id} readOnly={!perms.canWrite('teilnehmer')} />
    </>
  );
}
