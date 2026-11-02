import type { Antworten, Teilnehmer, Terminvorschlaege, Umfragen } from './app';

export type EnrichedUmfragen = Umfragen & {
  gewaehlter_terminName: string;
};

export type EnrichedTerminvorschlaege = Terminvorschlaege & {
  umfrageName: string;
};

export type EnrichedTeilnehmer = Teilnehmer & {
  umfrageName: string;
};

export type EnrichedAntworten = Antworten & {
  teilnehmerName: string;
  terminvorschlagName: string;
};
