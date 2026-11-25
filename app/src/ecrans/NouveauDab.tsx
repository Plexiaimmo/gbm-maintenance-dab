import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../local/db';
import { normaliserSN } from '../domaine/sn';

const MARQUES = ['Wincor Nixdorf', 'Diebold Nixdorf', 'NCR', 'Hyosung', 'GRG', 'Autre'];

export function NouveauDab({ codeInitial, consultantId, cree, annuler }: { codeInitial?: string; consultantId: string; cree: (id: string) => void; annuler: () => void }) {
  const banques = useLiveQuery(() => db.banques.toArray(), []) ?? [];
  const [v, setV] = useState({ code: (codeInitial ?? '').toUpperCase(), banque: '', agence: '', ville: 'Brazzaville', marque: 'Wincor Nixdorf', modele: '', sn: '' });
  const [erreur, setErreur] = useState('');
  const maj = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    const code = v.code.trim().toUpperCase();
    if (await db.dab.where('code').equals(code).count()) { setErreur('Ce code existe déjà dans la liste.'); return; }
    const id = crypto.randomUUID();
    await db.dab.put({ id, code, site_id: null, marque: v.marque, modele: v.modele.trim(), numero_serie: normaliserSN(v.sn),
      ville: v.ville, origine: 'nouveau_a_verifier', cree_par: consultantId, agence_saisie: `${v.banque} — ${v.agence.trim()}`, sync: 'a_envoyer' });
    cree(id);
  }

  return (
    <form className="page" onSubmit={envoyer}>
      <h1>Nouveau DAB</h1>
      <p className="info">Ce DAB sera marqué « nouveau, à vérifier ».</p>
      <label>Code ou identifiant du DAB<input value={v.code} onChange={maj('code')} required /></label>
      <label>Banque<select value={v.banque} onChange={maj('banque')} required>
        <option value="">— choisir —</option>{banques.map((b) => <option key={b.id} value={b.code}>{b.nom}</option>)}<option value="AUTRE">Autre</option>
      </select></label>
      <label>Agence<input value={v.agence} onChange={maj('agence')} required /></label>
      <label>Ville<select value={v.ville} onChange={maj('ville')}><option>Brazzaville</option><option>Pointe-Noire</option></select></label>
      <label>Marque<select value={v.marque} onChange={maj('marque')}>{MARQUES.map((m) => <option key={m}>{m}</option>)}</select></label>
      <label>Modèle<input value={v.modele} onChange={maj('modele')} placeholder="ProCash 2050xe" required /></label>
      <label>Numéro de série (si lisible)<input value={v.sn} onChange={maj('sn')} /></label>
      {erreur && <p className="erreur">{erreur}</p>}
      <div className="ligne"><button type="button" onClick={annuler}>Annuler</button><button className="principal">Créer et commencer</button></div>
    </form>
  );
}
