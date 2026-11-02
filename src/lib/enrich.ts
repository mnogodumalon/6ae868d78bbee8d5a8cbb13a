import type { EnrichedAntworten, EnrichedTeilnehmer, EnrichedTerminvorschlaege, EnrichedUmfragen } from '@/types/enriched';
import type { Antworten, Teilnehmer, Terminvorschlaege, Umfragen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface UmfragenMaps {
  terminvorschlaegeMap: Map<string, Terminvorschlaege>;
}

export function enrichUmfragen(
  umfragen: Umfragen[],
  maps: UmfragenMaps
): EnrichedUmfragen[] {
  return umfragen.map(r => ({
    ...r,
    gewaehlter_terminName: resolveDisplay(r.fields.gewaehlter_termin, maps.terminvorschlaegeMap, 'umfrage'),
  }));
}

interface TerminvorschlaegeMaps {
  umfragenMap: Map<string, Umfragen>;
}

export function enrichTerminvorschlaege(
  terminvorschlaege: Terminvorschlaege[],
  maps: TerminvorschlaegeMaps
): EnrichedTerminvorschlaege[] {
  return terminvorschlaege.map(r => ({
    ...r,
    umfrageName: resolveDisplay(r.fields.umfrage, maps.umfragenMap, 'titel'),
  }));
}

interface TeilnehmerMaps {
  umfragenMap: Map<string, Umfragen>;
}

export function enrichTeilnehmer(
  teilnehmer: Teilnehmer[],
  maps: TeilnehmerMaps
): EnrichedTeilnehmer[] {
  return teilnehmer.map(r => ({
    ...r,
    umfrageName: resolveDisplay(r.fields.umfrage, maps.umfragenMap, 'titel'),
  }));
}

interface AntwortenMaps {
  teilnehmerMap: Map<string, Teilnehmer>;
  terminvorschlaegeMap: Map<string, Terminvorschlaege>;
}

export function enrichAntworten(
  antworten: Antworten[],
  maps: AntwortenMaps
): EnrichedAntworten[] {
  return antworten.map(r => ({
    ...r,
    teilnehmerName: resolveDisplay(r.fields.teilnehmer, maps.teilnehmerMap, 'vorname', 'nachname'),
    terminvorschlagName: resolveDisplay(r.fields.terminvorschlag, maps.terminvorschlaegeMap, 'umfrage'),
  }));
}
