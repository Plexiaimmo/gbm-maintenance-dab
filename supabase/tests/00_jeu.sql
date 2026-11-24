-- Jeu commun aux tests : à inclure en tête de chaque test (dans la même transaction)
insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-0000000000a1','a@test.local'),
 ('00000000-0000-0000-0000-0000000000b1','b@test.local'),
 ('00000000-0000-0000-0000-0000000000c1','sup@test.local'),
 ('00000000-0000-0000-0000-0000000000d1','adm@test.local');
insert into profils (id, nom, role) values
 ('00000000-0000-0000-0000-0000000000a1','Consultant A','consultant'),
 ('00000000-0000-0000-0000-0000000000b1','Consultant B','consultant'),
 ('00000000-0000-0000-0000-0000000000c1','Superviseur','superviseur'),
 ('00000000-0000-0000-0000-0000000000d1','Admin','admin');
insert into banques (id, code, nom) values ('10000000-0000-0000-0000-000000000001','TST','Banque test');
insert into sites (id, banque_id, nom, ville, lat, lng) values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Agence test','Brazzaville',-4.27,15.28);
insert into dab (id, code, site_id, marque, modele, ville, origine) values ('30000000-0000-0000-0000-000000000001','TST-001','20000000-0000-0000-0000-000000000001','Wincor','ProCash 2050xe','Brazzaville','reference');
insert into fiches (id, dab_id, consultant_id, statut, arrivee_at) values
 ('40000000-0000-0000-0000-0000000000a1','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','brouillon', now()),
 ('40000000-0000-0000-0000-0000000000b1','30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000b1','brouillon', now());
insert into checklist_items (id, ordre, libelle, module, obligatoire, modele, photo_requise, commentaire_requis, actif) values ('CHK-T1',1,'Test','PC',true,'Tous',false,false,true);
