import type { Umfragen, Terminvorschlaege, Teilnehmer } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface UmfragenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Umfragen;
  /** N:1-Ziel „Terminvorschlaege": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  terminvorschlaegeList: Terminvorschlaege[];
  /** Klick auf die Terminvorschlaege-Relation → overlay.push auf dessen Detail. */
  onOpenTerminvorschlaege?: (record: Terminvorschlaege) => void;
  /** 1:N „Terminvorschläge" (umfrage): VOLLE Liste — der Block filtert auf diesen Record. */
  terminvorschlaegeUmfrageList: Terminvorschlaege[];
  /** Zeilen-Klick → overlay.push auf das Terminvorschlaege-Detail (nie der Edit-Dialog). */
  onOpenTerminvorschlaegeUmfrage: (record: Terminvorschlaege) => void;
  /** Kontextuelles „+": öffnet den Terminvorschlaege-Dialog mit diesem Record vorgesetzt. */
  onAddTerminvorschlaegeUmfrage?: () => void;
  /** 1:N „Teilnehmer" (umfrage): VOLLE Liste — der Block filtert auf diesen Record. */
  teilnehmerList: Teilnehmer[];
  /** Zeilen-Klick → overlay.push auf das Teilnehmer-Detail (nie der Edit-Dialog). */
  onOpenTeilnehmer: (record: Teilnehmer) => void;
  /** Kontextuelles „+": öffnet den Teilnehmer-Dialog mit diesem Record vorgesetzt. */
  onAddTeilnehmer?: () => void;
}

export function UmfragenDetails({
  record,
  terminvorschlaegeList,
  onOpenTerminvorschlaege,
  terminvorschlaegeUmfrageList,
  onOpenTerminvorschlaegeUmfrage,
  onAddTerminvorschlaegeUmfrage,
  teilnehmerList,
  onOpenTeilnehmer,
  onAddTeilnehmer,
}: UmfragenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const gewaehlter_terminTarget = terminvorschlaegeList.find(r => r.record_id === extractRecordId(record.fields.gewaehlter_termin));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('umfragen', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('umfragen', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('umfragen', 'status')} value={record.fields.status} format="pill" />
        <RecordField label={fieldLabel('umfragen', 'antwortfrist')} value={record.fields.antwortfrist} format="datetime" />
        <RecordField label={fieldLabel('umfragen', 'dauer_minuten')} value={record.fields.dauer_minuten} format="text" />
        <RecordField label={fieldLabel('umfragen', 'ort')} value={record.fields.ort} format="text" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('umfragen', 'gewaehlter_termin')}
          name={gewaehlter_terminTarget?.fields.umfrage ?? '—'}
          meta={undefined}
          onClick={gewaehlter_terminTarget && onOpenTerminvorschlaege ? () => onOpenTerminvorschlaege!(gewaehlter_terminTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={`${appLabel('terminvorschlaege')} · ${fieldLabel('terminvorschlaege', 'umfrage')}`}
        items={terminvorschlaegeUmfrageList.filter(r => extractRecordId(r.fields.umfrage) === record.record_id)}
        map={r => ({ name: appLabel('terminvorschlaege'), meta: r.fields.termin })}
        onOpen={onOpenTerminvorschlaegeUmfrage}
        onAdd={onAddTerminvorschlaegeUmfrage}
        getKey={r => r.record_id}
      />

      <SatelliteSection
        title={appLabel('teilnehmer')}
        items={teilnehmerList.filter(r => extractRecordId(r.fields.umfrage) === record.record_id)}
        map={r => ({ name: r.fields.vorname ?? appLabel('teilnehmer'), meta: r.fields.eingeladen_am })}
        onOpen={onOpenTeilnehmer}
        onAdd={onAddTeilnehmer}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.UMFRAGEN} recordId={record.record_id} readOnly={!perms.canWrite('umfragen')} />
    </>
  );
}
