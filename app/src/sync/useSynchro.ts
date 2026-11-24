import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { supabase } from '../supabase';
import { restants, synchroniser, type Bilan } from './synchroniser';

/** Lance la synchronisation au démarrage, au retour du réseau, toutes les 60 s ; expose l'état pour l'écran. */
export function useSynchro(actif: boolean) {
  const [dernier, setDernier] = useState<Bilan | null>(null);
  const [enLigne, setEnLigne] = useState(navigator.onLine);
  const attente = useLiveQuery(() => restants(), []) ?? 0;

  const lancer = useCallback(async () => {
    if (!actif || !navigator.onLine) return;
    setDernier(await synchroniser(supabase));
  }, [actif]);

  useEffect(() => {
    if (!actif) return;
    navigator.storage?.persist?.().catch(() => undefined);
    void lancer();
    const enligne = () => { setEnLigne(true); void lancer(); };
    const horsligne = () => setEnLigne(false);
    window.addEventListener('online', enligne);
    window.addEventListener('offline', horsligne);
    const t = setInterval(() => void lancer(), 60000);
    return () => { window.removeEventListener('online', enligne); window.removeEventListener('offline', horsligne); clearInterval(t); };
  }, [actif, lancer]);

  return { attente, enLigne, dernier, lancer };
}
