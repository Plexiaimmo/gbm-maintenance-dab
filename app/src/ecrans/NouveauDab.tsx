import { useMemo, useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../local/db';
import { normaliserSN } from '../domaine/sn';
import { codeDab, normaliserAgence } from '../domaine/codeDab';
import { Champ, Choix } from './parties/Commun';
import { vibrer } from '../lib/tactile';
import { LogoBanque } from '../composants/Logos';

const MARQUES = ['Wincor Nixdorf', 'Diebold Nixdorf', 'NCR', 'Hyosung', 'GRG'];
const MODELES = ['ProCash 280', 'ProCash 2050xe', 'ProCash 2100xe', 'ProCash 2250xe', 'ProCash 285', 'CINEO C4060'];
const AUTRE = '__autre__';

/** Ajout d'un DAB absent de la liste : tout se fait au doigt, le code est calculé (BANQUE-VILLE-AGENCE-N). */
export function NouveauDab({ codeInitial, consultantId, cree, annuler }: { codeInitial?: string; consultantId: string; cree: (id: string) => void; annuler: () => void }) {
  const banques = useLiveQuery(() => db.banques.toArray(), []) ?? [];
  const sites = useLiveQuery(() => db.sites.toArray(), []) ?? [];
  const dabs = useLiveQuery(() => db.dab.toArray(), []) ?? [];
  const [banque, setBanque] = useState('');
  const [banqueAutre, setBanqueAutre] = useState('');
  const [ville, setVille] = useState('Brazzaville');
  const [agence, setAgence] = useState('');
  const [agenceAutre, setAgenceAutre] = useState('');
  const [v, setV] = useState({ marque: 'Wincor Nixdorf', modele: '', sn: '', codeBanque: (codeInitial ?? '').toUpperCase() });
  const [erreur, setErreur] = useState('');

  const codeBq = banque === AUTRE ? normaliserAgence(banqueAutre).replace(/-/g, '') : banque;
  const banqueId = banques.find((b) => b.code === banque)?.id;
  // Agences connues pour cette banque et cette ville : celles de la liste, puis celles déjà saisies sur le terrain.
  const agences = useMemo(() => {
    const connues = sites.filter((s) => s.banque_id === banqueId && s.ville === ville).map((s) => ({ nom: s.nom, siteId: s.id as string | null }));
    for (const d of dabs) {
      const [bq, ag] = (d.agence_saisie ?? '').split(' — ');
      if (bq === codeBq && d.ville === ville && ag && !connues.some((c) => normaliserAgence(c.nom) === normaliserAgence(ag))) connues.push({ nom: ag, siteId: null });
    }
    return connues.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [sites, dabs, banqueId, codeBq, ville]);
  const nomAgence = agence === AUTRE ? agenceAutre.trim() : agence;
  const site = agences.find((a) => a.nom === agence);
  const code = codeDab(codeBq, ville, nomAgence, dabs.map((d) => d.code));

  async function envoyer(e: FormEvent) {
    e.preventDefault();
    if (!code) { setErreur('Choisissez la banque, la ville et l’agence : le code se calcule tout seul.'); return; }
    if (!v.modele.trim()) { setErreur('Indiquez le modèle.'); return; }
    const id = crypto.randomUUID();
    await db.dab.put({ id, code, site_id: site?.siteId ?? null, marque: v.marque, modele: v.modele.trim(), numero_serie: normaliserSN(v.sn),
      ville, origine: 'nouveau_a_verifier', cree_par: consultantId, agence_saisie: `${codeBq} — ${nomAgence}`,
      code_banque: v.codeBanque.trim().toUpperCase() || null, sync: 'a_envoyer' });
    cree(id);
  }

  const pastille = (actif: boolean, texte: string, choisir: () => void, logo?: string) => (
    <button key={texte} type="button" className={actif ? 'pastille-choix actif' : 'pastille-choix'} onClick={() => { vibrer(); setErreur(''); choisir(); }}>
      {logo && <LogoBanque code={logo} taille={30} />}{texte}</button>
  );

  return (
    <form className="page" onSubmit={envoyer}>
      <h1>Nouveau DAB</h1>
      <p className="consigne">Touchez vos choix : le code du DAB est calculé automatiquement. Il sera marqué « nouveau, à vérifier ».</p>

      <div className="champ">
        <p className="champ-libelle">Banque</p>
        <div className="pastilles" role="radiogroup" aria-label="Banque">
          {banques.filter((b) => b.code !== 'TEST').map((b) => pastille(banque === b.code, b.code, () => { setBanque(b.code); setAgence(''); }, b.code))}
          {pastille(banque === AUTRE, 'Autre banque', () => { setBanque(AUTRE); setAgence(''); })}
        </div>
        {banque === AUTRE && <Champ libelle="Sigle de la banque" aide="2 à 8 lettres, par exemple LCB" clavier="sn" valeur={banqueAutre} enregistrer={setBanqueAutre} />}
      </div>

      <Choix libelle="Ville" options={[['Brazzaville', 'Brazzaville'], ['Pointe-Noire', 'Pointe-Noire']]} valeur={ville}
        choisir={(x) => { setVille(x); setAgence(''); }} />

      {codeBq && (
        <div className="champ">
          <p className="champ-libelle">Agence</p>
          <div className="pastilles" role="radiogroup" aria-label="Agence">
            {agences.map((a) => pastille(agence === a.nom, a.nom, () => setAgence(a.nom)))}
            {pastille(agence === AUTRE, agences.length ? 'Autre agence' : 'Saisir l’agence', () => setAgence(AUTRE))}
          </div>
          {agence === AUTRE && <Champ libelle="Nom de l’agence ou du lieu" aide="Par exemple Poto-Poto, Aéroport, Total Mpila" valeur={agenceAutre} enregistrer={setAgenceAutre} />}
        </div>
      )}

      <div className={code ? 'code-calcule' : 'code-calcule vide'} aria-live="polite">
        <small>Code attribué</small>
        <strong>{code || 'Choisissez la banque, la ville et l’agence'}</strong>
      </div>

      <Champ libelle="Marque" valeur={v.marque} suggestions={MARQUES} enregistrer={(x) => setV({ ...v, marque: x })} />
      <Champ libelle="Modèle" valeur={v.modele} suggestions={MODELES} enregistrer={(x) => setV({ ...v, modele: x })} />
      <Champ libelle="Numéro de série" aide="si la plaque est lisible" clavier="sn" valeur={v.sn} enregistrer={(x) => setV({ ...v, sn: x })} />
      <Champ libelle="Code de la banque" aide="facultatif : tel qu’il est collé sur le DAB, s’il y en a un" clavier="sn" valeur={v.codeBanque}
        enregistrer={(x) => setV({ ...v, codeBanque: x })} />

      {erreur && <p className="erreur">{erreur}</p>}
      <div className="ligne"><button type="button" onClick={annuler}>Annuler</button><button className="principal" disabled={!code}>Créer et commencer</button></div>
    </form>
  );
}
