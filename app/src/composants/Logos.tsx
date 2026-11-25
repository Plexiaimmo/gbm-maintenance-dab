import bgfi from '../assets/logos/bgfi.png';
import bpc from '../assets/logos/bpc.png';
import uba from '../assets/logos/uba.png';
import bch from '../assets/logos/bch.png';
import gbmMarque from '../assets/logos/gbm-marque.png';
import gbmComplet from '../assets/logos/gbm-complet.png';

const BANQUES: Record<string, { src: string; nom: string }> = {
  BGFI: { src: bgfi, nom: 'BGFIBank' }, BPC: { src: bpc, nom: 'Banque Postale du Congo' },
  UBA: { src: uba, nom: 'UBA' }, BCH: { src: bch, nom: "Banque Congolaise de l'Habitat" },
};

/** Logo de la banque dans une pastille ronde ; à défaut, son sigle. */
export function LogoBanque({ code, taille = 52, className = '' }: { code?: string; taille?: number; className?: string }) {
  const b = code ? BANQUES[code.toUpperCase()] : undefined;
  return (
    <span className={`logo-banque ${className}`} style={{ width: taille, height: taille }} title={b?.nom ?? code}>
      {b ? <img src={b.src} alt={b.nom} /> : <span className="logo-sigle" aria-label={code || 'Banque inconnue'}>{code || '?'}</span>}
    </span>
  );
}

export const LogoGbm = ({ complet = false, hauteur = 32 }: { complet?: boolean; hauteur?: number }) => (
  <img className="logo-gbm" src={complet ? gbmComplet : gbmMarque} alt="GBM" style={{ height: hauteur }} />
);
