/** Choix multiples avec une case « Autre » : tout est rangé dans une seule chaîne « Courroie, Capteur, texte libre ». */
export function lireChoix(valeur: string | undefined, options: string[]): { choisis: string[]; autre: string } {
  const morceaux = (valeur ?? '').split(', ').filter((m) => m.trim());
  return {
    choisis: options.filter((o) => morceaux.includes(o)),
    autre: morceaux.filter((m) => !options.includes(m)).join(', '),
  };
}

export function ecrireChoix(choisis: string[], autre: string, options: string[]): string {
  const dansLOrdre = options.filter((o) => choisis.includes(o));
  return [...dansLOrdre, ...(autre.trim() ? [autre.trim()] : [])].join(', ');
}

/** Saisie d'un nombre : chiffres et un seul séparateur décimal (la virgule devient un point). */
export function nettoyerNombre(texte: string): string {
  const propre = texte.replace(',', '.').replace(/[^0-9.]/g, '');
  const i = propre.indexOf('.');
  return i < 0 ? propre : propre.slice(0, i + 1) + propre.slice(i + 1).replace(/\./g, '');
}
