import type { Article } from './types';

const simplifier = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** Propose des pièces du catalogue à partir de quelques caractères du PN ou du nom. */
export function chercherArticles(articles: Article[], texte: string, max = 6): Article[] {
  const q = simplifier(texte.trim());
  if (q.length < 2) return [];
  return articles.filter((a) => simplifier(`${a.pn} ${a.designation ?? ''}`).includes(q)).slice(0, max);
}
