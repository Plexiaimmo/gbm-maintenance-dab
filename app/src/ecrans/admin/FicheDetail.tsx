import { useEffect, useState } from 'react';
import { chargerDetail, renvoyer, valider } from '../../admin/donnees';
import { tonEtat } from '../../domaine/etatPiece';
const ETATS: Record<string, string> = { Bon: 'Bon', Use: 'Usé', A_remplacer: 'À remplacer', Absent: 'Absent' };

export function FicheDetail({ ficheId, retour, admin }: { ficheId: string; retour: () => void; admin: boolean }) {
  const [d, setD] = useState<Awaited<ReturnType<typeof chargerDetail>>>();
  const [erreur, setErreur] = useState('');
  const [motif, setMotif] = useState('');
  const [agrandie, setAgrandie] = useState<string>();
  const charger = () => chargerDetail(ficheId).then(setD).catch((e) => setErreur(e.message));
  useEffect(() => { void charger(); }, [ficheId]);
  if (erreur) return <p className="page erreur">{erreur} <button onClick={retour}>Retour</button></p>;
  if (!d) return <p className="page">Chargement…</p>;
  const { fiche: f, dab } = d;
  const photo = (cible: string) => d.photos.find((p: any) => p.cible === cible);
  const Vignette = ({ cible }: { cible: string }) => { const p = photo(cible); return p?.url ? <img className="vignette" src={p.url} alt={cible} onClick={() => setAgrandie(p.url)} /> : null; };
  const agir = async (f2: () => Promise<void>) => { try { await f2(); await charger(); } catch (e) { setErreur((e as Error).message); } };
  const duree = f.depart_at ? Math.round((Date.parse(f.depart_at) - Date.parse(f.arrivee_at)) / 60000) : null;

  return (
    <div className="page large detail">
      {agrandie && <div className="loupe" onClick={() => setAgrandie(undefined)}><img src={agrandie} alt="" /></div>}
      <div className="entete"><button className="petit" onClick={retour}>← Suivi</button><h1>{dab.code} — {dab.sites?.nom ?? dab.agence_saisie}</h1>{dab.origine === 'nouveau_a_verifier' && <span className="statut brouillon">Nouveau DAB, à vérifier</span>}</div>
      <p>Statut : <b>{({ brouillon: 'En cours', terminee: 'À valider', validee: 'Validée', renvoyee: 'Renvoyée' } as Record<string, string>)[f.statut]}</b> · Arrivée {new Date(f.arrivee_at).toLocaleString('fr-FR')} · {duree !== null ? `${duree} min sur place` : 'non terminée'}
        {f.sans_signature && <b className="alerte"> · sans signature</b>}</p>
      {d.signal?.raisons?.length > 0 && <p className={d.signal.douteux ? 'erreur' : 'info'}>{d.signal.douteux ? '⚠ ' : ''}{d.signal.raisons.join(' · ')}</p>}

      <h2>1. Identification — base / relevé</h2>
      <table className="tableau"><tbody>
        <tr><td>N° de série</td><td>{dab.numero_serie ?? '—'}</td><td><b>{f.identification.numero_serie}</b></td></tr>
        <tr><td>Modèle</td><td>{dab.modele ?? '—'}</td><td><b>{f.identification.modele}</b></td></tr>
        {dab.code_banque && <tr><td>Code de la banque</td><td colSpan={2}><b>{dab.code_banque}</b></td></tr>}
        <tr><td>Marque</td><td>{dab.marque ?? '—'}</td><td><b>{f.identification.marque}</b></td></tr>
        {f.identification.code_affiche && <tr><td>Code affiché (à vérifier)</td><td>{dab.code}</td><td><b>{f.identification.code_affiche}</b></td></tr>}
        {f.identification.banque && <tr><td>Banque (à vérifier)</td><td>{dab.agence_saisie?.split(' — ')[0] ?? '—'}</td><td><b>{f.identification.banque}</b></td></tr>}
        {f.identification.agence && <tr><td>Agence (à vérifier)</td><td>{dab.sites?.nom ?? dab.agence_saisie?.split(' — ')[1] ?? '—'}</td><td><b>{f.identification.agence}</b></td></tr>}
        <tr><td>GPS</td><td>{dab.sites?.lat ? `${dab.sites.lat}, ${dab.sites.lng}` : '—'}</td><td><b>{f.arrivee_lat ? `${f.arrivee_lat.toFixed(5)}, ${f.arrivee_lng.toFixed(5)} (±${Math.round(f.arrivee_precision ?? 0)} m)` : f.gps_motif}</b></td></tr>
      </tbody></table>
      <Vignette cible="plaque" /> {f.identification.corrections && <p>Corrections : {f.identification.corrections}</p>}

      <h2>2. Préventif</h2>
      <table className="tableau"><tbody>{d.items.map((it: any) => {
        const r = d.reponses.find((x: any) => x.item_id === it.id);
        return r ? <tr key={it.id} className={r.valeur === 'NOK' ? 'nok' : ''}><td>{it.libelle}</td><td><b>{r.valeur}</b></td><td>{r.commentaire}</td><td><Vignette cible={`item:${it.id}`} /></td></tr> : null;
      })}</tbody></table>

      <h2>3. État mécanique</h2>
      <table className="tableau"><tbody>{d.etats.map((e: any) => (
        <tr key={e.module} className={tonEtat(e.etat)}><td>{e.module}</td><td><b>{ETATS[e.etat]}</b></td><td>{e.commentaire}
          {d.pieces.filter((p: any) => p.module === e.module).map((p: any) => <div key={p.id}>→ {p.quantite} × {p.pn ?? p.pn_libre}</div>)}</td>
          <td><Vignette cible={`module:${e.module}`} /></td></tr>
      ))}</tbody></table>

      <h2>4. Système</h2>
      <p>Windows {f.systeme.version_windows} · {f.systeme.logiciel} {f.systeme.logiciel_version} · heure {f.systeme.heure_correcte ? 'correcte' : 'INCORRECTE'} · {f.systeme.espace_disque_go} Go libres · anti-skimming : {f.systeme.antiskimming ? 'oui' : 'non'}</p>
      <p>Test interne : {f.systeme.test_interne}</p>
      <Vignette cible="journal" /><Vignette cible="antiskimming" />

      <h2>5. Clôture</h2>
      <p>{f.cloture.gestionnaire_absent ? `Gestionnaire absent : ${f.cloture.motif_absence}` : `Gestionnaire : ${f.cloture.gestionnaire_nom}`}</p>
      <Vignette cible="ticket" /><Vignette cible="signature" /><Vignette cible="site_absent" />

      <h2>Historique</h2>
      <ul>{d.historique.map((h: any) => <li key={h.id}>{new Date(h.at).toLocaleString('fr-FR')} — {h.action}{h.details?.apres ? ` → ${h.details.apres}` : ''}{h.details?.motif ? ` (${h.details.motif})` : ''}</li>)}</ul>

      {admin && f.statut === 'terminee' && (
        <div className="actions">
          <button className="principal" onClick={() => agir(() => valider(ficheId, true))}>Valider et mettre à jour le DAB (SN, modèle, marque, GPS)</button>
          <button onClick={() => agir(() => valider(ficheId, false))}>Valider sans modifier le DAB</button>
          <label>Motif du renvoi au consultant<textarea value={motif} onChange={(e) => setMotif(e.target.value)} /></label>
          <button disabled={!motif.trim()} onClick={() => agir(() => renvoyer(ficheId, motif))}>Renvoyer la fiche</button>
        </div>
      )}
    </div>
  );
}
