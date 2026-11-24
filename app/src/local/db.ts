import Dexie, { type Table } from 'dexie';
import type { Article, Banque, ChecklistItem, Dab, EtatModule, Fiche, Parametre, Photo, Piece, Reponse, Site } from '../domaine/types';

export class BaseLocale extends Dexie {
  dab!: Table<Dab, string>;
  sites!: Table<Site, string>;
  banques!: Table<Banque, string>;
  checklist!: Table<ChecklistItem, string>;
  articles!: Table<Article, string>;
  parametres!: Table<Parametre, string>;
  fiches!: Table<Fiche, string>;
  reponses!: Table<Reponse, [string, string]>;
  etats!: Table<EtatModule, [string, string]>;
  pieces!: Table<Piece, string>;
  photos!: Table<Photo, string>;

  constructor() {
    super('gbm-releve');
    this.version(1).stores({
      dab: 'id, code, ville, sync', sites: 'id', banques: 'id', checklist: 'id, ordre', articles: 'pn',
      parametres: 'cle',
      fiches: 'id, dab_id, statut, sync', reponses: '[fiche_id+item_id], fiche_id, sync',
      etats: '[fiche_id+module], fiche_id, sync', pieces: 'id, fiche_id, sync', photos: 'id, fiche_id, cible, sync, [fiche_id+cible]',
    });
  }
}

export const db = new BaseLocale();
