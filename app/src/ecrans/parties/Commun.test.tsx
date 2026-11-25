import { describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { ChoixMultiple, ChoixOuAutre } from './Commun';

afterEach(cleanup);
const OPT = ['Windows 10', 'Windows 11'];

describe('ChoixOuAutre : on touche, on ne tape pas', () => {
  it("n'offre aucun champ de saisie tant qu'on n'a pas touché « Autre »", () => {
    render(<ChoixOuAutre libelle="Windows" options={OPT} enregistrer={() => undefined} />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('button', { name: 'Windows 10' })).toBeTruthy();
  });
  it('toucher un choix le sélectionne, le retoucher le retire', () => {
    const enregistrer = vi.fn();
    const { rerender } = render(<ChoixOuAutre libelle="Windows" options={OPT} enregistrer={enregistrer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Windows 11' }));
    expect(enregistrer).toHaveBeenLastCalledWith('Windows 11');
    rerender(<ChoixOuAutre libelle="Windows" options={OPT} valeur="Windows 11" enregistrer={enregistrer} />);
    expect(screen.getByRole('button', { name: 'Windows 11' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Windows 11' }));
    expect(enregistrer).toHaveBeenLastCalledWith('');
  });
  it("« Autre » ouvre un champ, et seulement lui accepte du texte", () => {
    const enregistrer = vi.fn();
    render(<ChoixOuAutre libelle="Windows" options={OPT} enregistrer={enregistrer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Autre' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Windows XP' } });
    expect(enregistrer).toHaveBeenLastCalledWith('Windows XP');
  });
  it("une valeur hors liste déjà saisie rouvre « Autre » avec son texte", () => {
    render(<ChoixOuAutre libelle="Windows" options={OPT} valeur="Windows XP" enregistrer={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Autre' }).getAttribute('aria-pressed')).toBe('true');
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Windows XP');
  });
});

describe('ChoixMultiple : plusieurs choix à toucher', () => {
  const PIECES = ['Courroie', 'Rouleaux', 'Capteur'];
  it("n'offre aucun champ libre au départ", () => {
    render(<ChoixMultiple libelle="Ce qui est usé" options={PIECES} enregistrer={() => undefined} />);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('coche et décoche, dans l\'ordre de la liste', () => {
    const enregistrer = vi.fn();
    const { rerender } = render(<ChoixMultiple libelle="Ce qui est usé" options={PIECES} valeur="Capteur" enregistrer={enregistrer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Courroie' }));
    expect(enregistrer).toHaveBeenLastCalledWith('Courroie, Capteur');
    rerender(<ChoixMultiple libelle="Ce qui est usé" options={PIECES} valeur="Courroie, Capteur" enregistrer={enregistrer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Capteur' }));
    expect(enregistrer).toHaveBeenLastCalledWith('Courroie');
  });
  it("« Autre » ajoute un texte après les choix", () => {
    const enregistrer = vi.fn();
    render(<ChoixMultiple libelle="Ce qui est usé" options={PIECES} valeur="Courroie" enregistrer={enregistrer} />);
    fireEvent.click(screen.getByRole('button', { name: 'Autre' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'vis' } });
    expect(enregistrer).toHaveBeenLastCalledWith('Courroie, vis');
  });
});
