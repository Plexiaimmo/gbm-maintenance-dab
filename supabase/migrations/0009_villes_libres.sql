-- Toute ville (code de 3 lettres) est acceptée pour un DAB ajouté sur le terrain.
alter table dab drop constraint dab_code_nouveau_format;
alter table dab add constraint dab_code_nouveau_format check (
  origine <> 'nouveau_a_verifier' or code ~ '^[A-Z0-9]{2,8}-[A-Z]{3}-[A-Z0-9]+(-[A-Z0-9]+)*-[0-9]+$');
