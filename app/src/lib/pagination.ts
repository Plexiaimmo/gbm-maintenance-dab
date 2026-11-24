const PAGE = 1000; // plafond par défaut du serveur (PostgREST)

/** Lit toutes les lignes, page par page, au-delà du plafond de 1000 lignes par requête. */
export async function toutLire<T>(page: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const tout: T[] = [];
  for (let de = 0; ; de += PAGE) {
    const { data, error } = await page(de, de + PAGE - 1);
    if (error) throw new Error(error.message);
    tout.push(...(data ?? []));
    if (!data || data.length < PAGE) return tout;
  }
}
