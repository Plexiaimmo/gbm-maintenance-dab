/** Icônes au trait, même épaisseur partout. Décoratives : le texte voisin ou un aria-label porte le sens. */
const TRACES = {
  coche: 'M20 6 9 17l-5-5',
  croix: 'M18 6 6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  retour: 'm15 6-6 6 6 6',
  chevron: 'm9 6 6 6-6 6',
  recherche: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-3.5-3.5',
  menu: 'M12 6h.01M12 12h.01M12 18h.01',
  envoi: 'M4 12l16-8-6 16-2-6z',
  horsLigne: 'M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-2.2-1.7M12 20h.01',
} as const;

export type NomIcone = keyof typeof TRACES;

export const Icone = ({ nom, taille = 22 }: { nom: NomIcone; taille?: number }) => (
  <svg className="icone" viewBox="0 0 24 24" width={taille} height={taille} aria-hidden="true"
    style={nom === 'menu' ? { strokeWidth: 3.2 } : undefined}><path d={TRACES[nom]} /></svg>
);
