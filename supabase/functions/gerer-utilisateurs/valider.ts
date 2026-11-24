export type Corps = { email?: string; nom?: string; role?: string; mot_de_passe?: string };
export const ROLES = ['admin', 'superviseur', 'consultant'];

/** Renvoie un message d'erreur, ou null si le corps est valide. */
export function valider(c: Corps): string | null {
  if (!c.nom || !c.nom.trim()) return 'Le nom est obligatoire.';
  if (!c.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) return 'Adresse e-mail invalide.';
  if (!c.role || !ROLES.includes(c.role)) return 'Le rôle doit être admin, superviseur ou consultant.';
  if (!c.mot_de_passe || c.mot_de_passe.length < 10) return 'Le mot de passe doit faire au moins 10 caractères.';
  return null;
}
