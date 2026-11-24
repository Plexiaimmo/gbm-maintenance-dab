export type Sync = 'a_envoyer' | 'envoye';
export type Statut = 'brouillon' | 'terminee' | 'validee' | 'renvoyee';
export type Valeur = 'OK' | 'NOK' | 'NA';
export type Etat = 'Bon' | 'Use' | 'A_remplacer' | 'Absent';

export const MODULES = ['Lecteur de carte', 'EPP', 'Écran', 'Distributeur', 'Cassettes', 'Imprimantes', 'PC',
  'Portes / serrures', 'Onduleur'] as const;
export type Module = (typeof MODULES)[number];

export interface Banque { id: string; code: string; nom: string }
export interface Site { id: string; banque_id: string; nom: string; ville: string | null; lat: number | null; lng: number | null }
export interface Dab {
  id: string; code: string; site_id: string | null; marque: string | null; modele: string | null;
  numero_serie: string | null; ville: string | null; origine: 'reference' | 'nouveau_a_verifier'; cree_par?: string | null;
  sync?: Sync;
}
export interface ChecklistItem {
  id: string; ordre: number; libelle: string; module: string | null; consigne: string | null;
  obligatoire: boolean; modele: string; photo_requise: boolean; commentaire_requis: boolean; actif: boolean;
}
export interface Article { pn: string; designation: string | null }
export interface Parametre { cle: string; valeur: string }

export interface Identification { modele?: string; numero_serie?: string; corrections?: string }
export interface Systeme {
  version_windows?: string; logiciel?: string; logiciel_version?: string; heure_correcte?: boolean;
  espace_disque_go?: string; test_interne?: string; antiskimming?: boolean;
}
export interface Cloture {
  tension_phase_neutre?: string; tension_neutre_terre?: string; gestionnaire_nom?: string;
  gestionnaire_absent?: boolean; motif_absence?: string;
}

export interface Fiche {
  id: string; dab_id: string; consultant_id: string; statut: Statut;
  arrivee_at: string; arrivee_lat?: number | null; arrivee_lng?: number | null; arrivee_precision?: number | null;
  arrivee_gps_at?: string | null; gps_motif?: 'indisponible' | 'refuse' | null;
  depart_at?: string | null; depart_lat?: number | null; depart_lng?: number | null;
  identification: Identification; systeme: Systeme; cloture: Cloture; sans_signature: boolean;
  motif_renvoi?: string | null; sync: Sync;
}
export interface Reponse { fiche_id: string; item_id: string; valeur: Valeur; commentaire?: string; sync: Sync }
export interface EtatModule { fiche_id: string; module: string; etat: Etat; commentaire?: string; sync: Sync }
export interface Piece { id: string; fiche_id: string; module: string; pn?: string | null; pn_libre?: string | null; quantite: number; sync: Sync; supprimee?: boolean }
export interface Photo {
  id: string; fiche_id: string; cible: string; blob?: Blob; prise_at: string | null; prise_tablette_at: string;
  sync: Sync; televersee?: boolean;
}

/** Tout ce qu'il faut pour juger une fiche complète. */
export interface FicheComplete {
  fiche: Fiche; reponses: Reponse[]; etats: EtatModule[]; pieces: Piece[]; photos: Pick<Photo, 'cible'>[];
  signature: boolean;
}
