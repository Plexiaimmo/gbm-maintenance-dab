import { useEffect, useRef, useState } from 'react';
import SignaturePad from 'signature_pad';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../local/db';

export function Signature({ ficheId }: { ficheId: string }) {
  const toile = useRef<HTMLCanvasElement>(null);
  const pad = useRef<SignaturePad>(null);
  const [vide, setVide] = useState(true);
  const existante = useLiveQuery(() => db.photos.where({ fiche_id: ficheId, cible: 'signature' }).first(), [ficheId]);

  useEffect(() => {
    const c = toile.current!;
    const r = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * r; c.height = c.offsetHeight * r;
    c.getContext('2d')!.scale(r, r);
    const p = new SignaturePad(c, { backgroundColor: '#fff' });
    p.addEventListener('endStroke', () => setVide(p.isEmpty()));
    pad.current = p;
    return () => p.off();
  }, []);

  async function valider() {
    const blob = await (await fetch(pad.current!.toDataURL('image/png'))).blob();
    await db.photos.put({
      id: existante?.id ?? crypto.randomUUID(), fiche_id: ficheId, cible: 'signature', donnees: await blob.arrayBuffer(), type: 'image/png',
      prise_at: null, prise_tablette_at: new Date().toISOString(), sync: 'a_envoyer', televersee: false,
    });
  }

  return (
    <div className="signature">
      {existante && <p className="ok">✓ Signature enregistrée{!vide && ' — validez pour la remplacer'}</p>}
      <canvas ref={toile} className="toile-signature" />
      <div className="ligne">
        <button type="button" onClick={() => { pad.current?.clear(); setVide(true); }}>Effacer</button>
        <button type="button" className="principal" disabled={vide} onClick={valider}>Valider la signature</button>
      </div>
    </div>
  );
}
