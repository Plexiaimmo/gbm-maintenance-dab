import type { Etat } from './types';

/** Couleur d'un état de module : vert = bon, jaune = usé (à surveiller), rouge = à remplacer, noir = absent. */
export const tonEtat = (e: Etat): 'ok' | 'attention' | 'nok' | '' =>
  e === 'Bon' ? 'ok' : e === 'Use' ? 'attention' : e === 'A_remplacer' ? 'nok' : '';

/** Classes de la carte du module : neutre tant qu'il n'y a pas de réponse. */
export const classeCarte = (e?: Etat) => (e ? `repondu ${tonEtat(e)}`.trim() : '');
