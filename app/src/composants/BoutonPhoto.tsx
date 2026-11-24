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
    if (!photo?.blob) { setUrl(undefined); return; }
    const u = URL.createObjectURL(photo.blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photo?.blob]);

  async function choisi(f: File | undefined) {
    if (!f) return;
    setEncours(true); setErreur('');
    try { await enregistrerPhoto(ficheId, cible, f); onAjout?.(); }
    catch { setErreur("La photo n'a pas pu être enregistrée, réessayez."); }
    finally { setEncours(false); if (entree.current) entree.current.value = ''; }
  }

  return (
    <div className="photo">
      <input ref={entree} type="file" accept="image/*" capture="environment" hidden onChange={(e) => choisi(e.target.files?.[0])} />
      {photo && (url ? <img src={url} alt="" className="vignette" /> : <span className="ok">✓ Photo envoyée</span>)}
      <button type="button" disabled={encours} onClick={() => entree.current?.click()}>
        📷 {encours ? 'Enregistrement…' : photo ? 'Reprendre la photo' : libelle}
      </button>
      {erreur && <p className="erreur">{erreur}</p>}
    </div>
  );
}
