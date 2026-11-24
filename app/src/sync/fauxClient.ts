// Faux client Supabase pour les tests de synchronisation.
type Res = { error: { message: string; code?: string } | null; status?: number; data?: unknown };

export class FauxClient {
  lignes: Record<string, Map<string, Record<string, unknown>>> = {};
  objets = new Map<string, number>();
  pannes: ((op: string, cible: string) => Res | null)[] = [];
  appelsRefresh = 0;
  refreshOk = true;
  serveurFiches: Record<string, unknown>[] = [];

  private panne(op: string, cible: string): Res | null {
    for (const p of this.pannes) { const r = p(op, cible); if (r) return r; }
    return null;
  }
  private table(t: string) { return (this.lignes[t] ??= new Map()); }

  from(t: string) {
    const self = this;
    return {
      async upsert(rows: Record<string, unknown>[], o?: { onConflict?: string }) {
        const p = self.panne('upsert', t); if (p) return p;
        for (const r of rows) self.table(t).set(o?.onConflict ? o.onConflict.split(',').map((k) => r[k]).join('|') : String(r.id), r);
        return { error: null, status: 201 };
      },
      async insert(rows: Record<string, unknown>[]) {
        const p = self.panne('insert', t); if (p) return p;
        for (const r of rows) {
          if (self.table(t).has(String(r.id)) || (t === 'dab' && [...self.table(t).values()].some((x) => x.code === r.code)))
            return { error: { message: 'duplicate', code: '23505' }, status: 409 };
          self.table(t).set(String(r.id), r);
        }
        return { error: null, status: 201 };
      },
      delete() {
        return { async in(_c: string, ids: string[]) { const p = self.panne('delete', t); if (p) return p; ids.forEach((i) => self.table(t).delete(i)); return { error: null }; } };
      },
      select() {
        return { async eq(col: string, val: unknown) {
          if (t === 'fiches') return { data: self.serveurFiches, error: null };
          return { data: [...self.table(t).values()].filter((r) => r[col] === val), error: null };
        } };
      },
    };
  }

  storage = {
    from: () => ({
      upload: async (chemin: string, corps: Blob) => {
        const p = this.panne('upload', chemin); if (p) return p;
        this.objets.set(chemin, corps.size);
        return { error: null };
      },
    }),
  };

  auth = {
    refreshSession: async () => { this.appelsRefresh++; return { error: this.refreshOk ? null : { message: 'refresh' } }; },
    getUser: async () => ({ data: { user: { id: 'c1' } } }),
  };
}
