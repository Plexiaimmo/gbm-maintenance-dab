import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../local/db';
import { enregistrerPhoto } from '../photos/stockage';

export function BoutonPhoto({ ficheId, cible, libelle = 'Prendre la photo', onAjout }: {
  ficheId: string; cible: string; libelle?: string; onAjout?: () => void;
}) {
  const entree = useRef<HTMLInputElement>(null);
  const [encours, setEncours] = useState(false);
  const [erreur, setErreur] = useState('');
  const photo = useLiveQuery(() => db.photos.where({ fiche_id: ficheId, cible }).first(), [ficheId, cible]);
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!photo?.donnees) { setUrl(undefined); return; }
    const u = URL.createObjectURL(new Blob([photo.donnees], { type: photo.type }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photo?.donnees, photo?.type]);

  async function choisi(f: File | undefined) {
    if (!f) return;
    setEncours(true); setErreur('');
    try { await enregistrerPhoto(ficheId, cible, f); onAjout?.(); }
    catch { setErreur("La photo n'a pas pu être enregistrée, réessayez."); }
    finally { setEncours(false); if (entree.current) entree.current.value = ''; }
  }

  return (
    <div className={`tuile-photo ${photo ? 'faite' : 'a-faire'}`}>
      <input ref={entree} type="file" accept="image/*" capture="environment" hidden onChange={(e) => choisi(e.target.files?.[0])} />
      <button type="button" className="tuile-bouton" disabled={encours} onClick={() => entree.current?.click()}>
        {photo
          ? (url ? <img src={url} alt="" className="tuile-image" /> : <span className="tuile-icone" aria-hidden>✓</span>)
          : <svg className="tuile-icone" viewBox="0 0 24 24" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>}
        <span className="tuile-texte">{encours ? 'Enregistrement…' : photo ? (url ? 'Reprendre la photo' : 'Photo envoyée — reprendre') : libelle}</span>
      </button>
      {erreur && <p className="erreur">{erreur}</p>}
    </div>
  );
}
