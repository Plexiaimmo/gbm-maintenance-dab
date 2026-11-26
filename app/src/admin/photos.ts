export interface PhotoAffichee { cible: string; url?: string }
export interface PhotoLegendee { cible: string; url: string; legende: string; rang: number }

const FIXES: Record<string, [string, number]> = {
  plaque: ['Plaque du numéro de série', 0],
  journal: ["Journal d'erreurs", 3_000_000],
  antiskimming: ['Anti-skimming', 3_000_001],
  ticket: ['Ticket test', 4_000_000],
  signature: ['Signature du gestionnaire', 4_000_001],
  site_absent: ['Site (gestionnaire absent)', 4_000_002],
  visite_impossible: ['Site (relevé impossible)', -1],
};

/** Les photos d'une fiche, légendées et rangées dans l'ordre de la fiche (celles sans lien d'accès sont ignorées). */
export function legendesPhotos(photos: PhotoAffichee[], items: { id: string; libelle: string; ordre: number }[]): PhotoLegendee[] {
  return photos.filter((p): p is PhotoAffichee & { url: string } => !!p.url).map((p) => {
    const fixe = FIXES[p.cible];
    if (fixe) return { cible: p.cible, url: p.url, legende: fixe[0], rang: fixe[1] };
    if (p.cible.startsWith('item:')) {
      const id = p.cible.slice(5); const it = items.find((i) => i.id === id);
      return { cible: p.cible, url: p.url, legende: it?.libelle ?? `Point ${id}`, rang: 1_000_000 + (it?.ordre ?? 999_999) };
    }
    if (p.cible.startsWith('module:')) return { cible: p.cible, url: p.url, legende: `Mécanique : ${p.cible.slice(7)}`, rang: 2_000_000 };
    return { cible: p.cible, url: p.url, legende: p.cible, rang: 5_000_000 };
  }).sort((a, b) => a.rang - b.rang || a.legende.localeCompare(b.legende, 'fr'));
}
