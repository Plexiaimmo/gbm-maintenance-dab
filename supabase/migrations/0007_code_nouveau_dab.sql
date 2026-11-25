-- DAB ajoutés sur le terrain : code calculé BANQUE-VILLE-AGENCE-N obligatoire ; code de la banque à part.
alter table dab add column code_banque text;
alter table dab add constraint dab_code_nouveau_format check (
  origine <> 'nouveau_a_verifier' or code ~ '^[A-Z0-9]{2,8}-(BZV|PNR)-[A-Z0-9]+(-[A-Z0-9]+)*-[0-9]+$');
