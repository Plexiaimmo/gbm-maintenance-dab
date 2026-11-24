export interface Arrivee {
  at: string; lat?: number; lng?: number; precision?: number; gps_at?: string; gps_motif?: 'indisponible' | 'refuse';
}

/** Enregistre l'arrivée : l'heure toujours, la position si le GPS répond dans le délai. Ne bloque jamais. */
export async function enregistrerArrivee(
  pos: () => Promise<GeolocationPosition>, maintenant: () => Date, delaiMs = 30000,
): Promise<Arrivee> {
  const at = maintenant().toISOString();
  const delai = new Promise<never>((_, rej) => setTimeout(() => rej({ code: 3 }), delaiMs));
  try {
    const p = await Promise.race([pos(), delai]);
    return { at, lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy,
      gps_at: new Date(p.timestamp).toISOString() };
  } catch (e) {
    return { at, gps_motif: (e as { code?: number })?.code === 1 ? 'refuse' : 'indisponible' };
  }
}

/** Lecture GPS du navigateur, haute précision. */
export const positionNavigateur = () => new Promise<GeolocationPosition>((ok, ko) =>
  navigator.geolocation.getCurrentPosition(ok, ko, { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }));
