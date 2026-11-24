import { useEffect } from 'react';

/** Petite vibration qui confirme une réponse (Android). */
export const vibrer = () => { try { navigator.vibrate?.(12); } catch { /* sans effet */ } };

/** Garde l'écran allumé pendant la fiche (≈ 2 h devant le DAB). */
export function useEcranAllume(actif: boolean) {
  useEffect(() => {
    if (!actif || !('wakeLock' in navigator)) return;
    let verrou: WakeLockSentinel | null = null;
    const prendre = () => navigator.wakeLock.request('screen').then((v) => { verrou = v; }).catch(() => undefined);
    void prendre();
    const retour = () => { if (document.visibilityState === 'visible') void prendre(); };
    document.addEventListener('visibilitychange', retour);
    return () => { document.removeEventListener('visibilitychange', retour); void verrou?.release(); };
  }, [actif]);
}

/** Fait défiler jusqu'à l'élément, centré, en douceur (sauf si l'utilisateur limite les animations). */
export function allerVers(id: string) {
  const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  document.getElementById(id)?.scrollIntoView({ block: 'center', behavior: reduit ? 'auto' : 'smooth' });
}
