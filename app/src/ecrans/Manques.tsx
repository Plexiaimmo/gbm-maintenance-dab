import type { Manque } from '../domaine/completude';

const NOMS = ['', 'Identification', 'Préventif', 'Mécanique', 'Système', 'Clôture'];

export function Manques({ manques, allerA, fermer }: { manques: Manque[]; allerA: (m: Manque) => void; fermer: () => void }) {
  return (
    <div className="page">
      <h1>Ce qui manque ({manques.length})</h1>
      <p className="info">La fiche ne peut pas être terminée tant que ces éléments manquent. Touchez une ligne pour y aller.</p>
      <ul className="liste">
        {manques.map((m) => (
          <li key={`${m.partie}-${m.cle}`}><button className="carte" onClick={() => allerA(m)}>
            <span className="discret">{m.partie}. {NOMS[m.partie]}</span> {m.message}
          </button></li>
        ))}
      </ul>
      <button onClick={fermer}>Retour à la fiche</button>
    </div>
  );
}
