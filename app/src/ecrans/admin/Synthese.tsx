import { useEffect, useState } from 'react';
import { chargerExport } from '../../admin/donnees';
import { synthese, type DabRef, type Synthese as Resume } from '../../admin/synthese';

function Puces({ dabs, ton = '', ouvrir }: { dabs: DabRef[]; ton?: string; ouvrir: (ficheId: string) => void }) {
  return <div className="puces-dab">{dabs.map((d) => <button key={d.ficheId} type="button" className={`puce-dab ${ton}`} onClick={() => ouvrir(d.ficheId)}>{d.code}</button>)}</div>;
}

/** Tout ce qu'il y a à signaler sur l'ensemble des DAB rendus, sans ouvrir les fiches une par une. */
export function Synthese({ ouvrir, retour }: { ouvrir: (ficheId: string) => void; retour: () => void }) {
  const [s, setS] = useState<Resume>();
  const [erreur, setErreur] = useState('');
  const charger = () => chargerExport().then((d) => setS(synthese(d as never))).catch((e) => setErreur(e.message));
  useEffect(() => { void charger(); }, []);
  if (erreur) return <p className="page erreur">{erreur}</p>;
  if (!s) return <p className="page">Chargement…</p>;
  const rien = !s.ecarts.length && !s.pieces.length && !s.pasOk.length && !s.modules.length;

  return (
    <div className="page large synthese">
      <div className="entete"><button className="petit" onClick={retour}>← Suivi</button><h1>À signaler</h1><button className="petit" onClick={charger}>Actualiser</button></div>
      <p className="consigne">Dernière fiche rendue (à valider ou validée) de chaque DAB : {s.nbFiches} fiche{s.nbFiches > 1 ? 's' : ''}. Touchez un DAB pour ouvrir sa fiche.</p>
      {rien && <p className="aucun">Rien à signaler pour l'instant.</p>}

      {s.ecarts.length > 0 && <>
        <h2>Écarts avec la base et exceptions ({s.ecarts.length} DAB)</h2>
        <p className="consigne">Ce que le terrain contredit, ajoute ou n'a pas pu relever. Ouvrez la fiche puis « Valider et mettre à jour le DAB » pour corriger la base.</p>
        <div className="cartes-synthese">{s.ecarts.map((e) => (
          <article key={e.dab.ficheId} className={e.doublon ? 'carte-synthese doublon' : 'carte-synthese'}>
            <div className="carte-tete"><span><b>{e.dab.code}</b>{e.nouveau && <small>nouveau, à vérifier</small>}</span></div>
            <ul className="lignes-ecart">{e.lignes.map((l) => <li key={l}>{l}</li>)}</ul>
            <Puces dabs={[{ ...e.dab, code: 'Ouvrir la fiche' }]} ouvrir={ouvrir} />
          </article>
        ))}</div>
      </>}

      {s.pieces.length > 0 && <>
        <h2>Pièces à prévoir</h2>
        <div className="cartes-synthese">{s.pieces.map((p) => (
          <article key={p.cle} className="carte-synthese">
            <div className="carte-tete"><span><b>{p.designation}</b>{p.pn && <small>{p.pn}</small>}{!p.pn && <small>hors catalogue</small>}</span>
              <span className="gros-nombre">× {p.quantite}<small>{p.dabs.length} DAB</small></span></div>
            <Puces dabs={p.dabs} ouvrir={ouvrir} />
          </article>
        ))}</div>
      </>}

      {s.pasOk.length > 0 && <>
        <h2>Points pas OK au préventif</h2>
        <div className="cartes-synthese">{s.pasOk.map((p) => (
          <article key={p.itemId} className="carte-synthese">
            <div className="carte-tete"><span><b>{p.libelle}</b></span><span className="gros-nombre">{p.dabs.length}<small>DAB</small></span></div>
            <Puces dabs={p.dabs} ton="nok" ouvrir={ouvrir} />
          </article>
        ))}</div>
      </>}

      {s.modules.length > 0 && <>
        <h2>Modules abîmés ou absents</h2>
        <div className="cartes-synthese">{s.modules.map((m) => (
          <article key={m.module} className="carte-synthese">
            <div className="carte-tete"><span><b>{m.module}</b></span></div>
            {m.aRemplacer.length > 0 && <><p className="etat-ligne nok">À remplacer · {m.aRemplacer.length}</p><Puces dabs={m.aRemplacer} ton="nok" ouvrir={ouvrir} /></>}
            {m.use.length > 0 && <><p className="etat-ligne attention">Usé · {m.use.length}</p><Puces dabs={m.use} ton="attention" ouvrir={ouvrir} /></>}
            {m.absent.length > 0 && <><p className="etat-ligne">Absent · {m.absent.length}</p><Puces dabs={m.absent} ouvrir={ouvrir} /></>}
          </article>
        ))}</div>
      </>}
    </div>
  );
}
