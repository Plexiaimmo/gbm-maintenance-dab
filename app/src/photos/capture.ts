import exifr from 'exifr';

const COTE_MAX = 1600;
const QUALITE = 0.7;

export function dimensionsCibles(l: number, h: number, max = COTE_MAX): { l: number; h: number } {
  const r = Math.min(1, max / Math.max(l, h));
  return { l: Math.round(l * r), h: Math.round(h * r) };
}

/** Heure de prise inscrite par l'appareil photo (EXIF), ou null. */
export async function lireHeurePrise(f: Blob): Promise<Date | null> {
  try {
    const t = await exifr.parse(f, ['DateTimeOriginal', 'CreateDate', 'ModifyDate']);
    const d = t?.DateTimeOriginal ?? t?.CreateDate ?? t?.ModifyDate;
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

/** Redimensionne et compresse en JPEG dans le navigateur. */
export async function compresserNavigateur(f: Blob): Promise<Blob> {
  const img = await createImageBitmap(f, { imageOrientation: 'from-image' });
  const { l, h } = dimensionsCibles(img.width, img.height);
  const c = document.createElement('canvas');
  c.width = l; c.height = h;
  c.getContext('2d')!.drawImage(img, 0, 0, l, h);
  img.close();
  return new Promise((ok, ko) => c.toBlob((b) => (b ? ok(b) : ko(new Error('Compression impossible'))), 'image/jpeg', QUALITE));
}

export async function preparerPhoto(
  fichier: Blob, maintenant: Date,
  outils: { lireHeure?: (f: Blob) => Promise<Date | null>; compresser?: (f: Blob) => Promise<Blob> } = {},
): Promise<{ blob: Blob; prise_at: Date | null; prise_tablette_at: Date }> {
  const prise_at = await (outils.lireHeure ?? lireHeurePrise)(fichier); // avant compression : l'EXIF disparaît ensuite
  const blob = await (outils.compresser ?? compresserNavigateur)(fichier);
  return { blob, prise_at, prise_tablette_at: maintenant };
}
