# Relevé terrain Wincor — Plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** une application web installable sur tablette avec laquelle le consultant (Chaker) remplit une fiche complète de préventif + état des lieux par DAB Wincor, envoyée dans une base PostgreSQL, puis un écran de suivi et de contrôle pour Yousri.

**Architecture :** une seule PWA (React) parle directement à Supabase (Auth, PostgreSQL avec règles d'accès RLS, Storage pour les photos). Sur la tablette, chaque saisie est d'abord écrite dans IndexedDB (Dexie) puis poussée par une boucle de synchronisation idempotente (identifiants générés sur la tablette, `upsert`). Les règles de complétude vivent dans un module TypeScript pur, testé ; les signaux « douteux » sont calculés en SQL.

**Tech Stack :** Vite + React 18 + TypeScript, vite-plugin-pwa, Dexie, @supabase/supabase-js v2, exifr, signature_pad, xlsx (SheetJS) ; Vitest + fake-indexeddb ; Python 3 + pytest pour la préparation des données ; Supabase (projet gratuit, org PLEXIA, région Europe) ; Edge Function Deno pour la création des comptes.

**Spec :** `docs/superpowers/specs/2026-11-24-releve-terrain-wincor-design.md`

## Global Constraints

- Interface entièrement en **français** ; gros boutons ; une question par ligne ; progression visible.
- **Phase A (tâches 1 à 9) prête pour l'essai du 29/11 au soir** ; Phase B (tâches 10 à 12) entre le 2 et le 5 décembre.
- La fiche ne perd **rien** pendant une coupure réseau de quelques heures (ni réponse, ni photo, ni signature), même si l'application est fermée puis rouverte.
- Réponses checklist : **OK / NOK / N/A** ; NOK ⇒ commentaire + photo ; N/A interdit si `obligatoire` ; `photo_requise` ⇒ photo ; `commentaire_requis` ⇒ commentaire.
- États mécaniques : **Bon / Usé / À remplacer / Absent** ; Usé ou À remplacer ⇒ commentaire + photo + au moins une pièce à prévoir (PN du catalogue ou PN libre, quantité ≥ 1).
- Modules mécaniques (ordre fixe) : Lecteur de carte, EPP, Écran, Distributeur, Cassettes, Imprimantes, PC, Portes / serrures, Onduleur.
- Statuts de fiche : `brouillon`, `terminee`, `validee`, `renvoyee`. « Douteux » et « sans signature » sont des **signaux**, pas des statuts.
- Seuils par défaut (table `parametres`, modifiables) : `duree_min_minutes = 60`, `distance_max_metres = 300`.
- Numéros de série normalisés : sans espaces, en majuscules.
- Photos : prises par l'appareil photo (`capture="environment"`), heure de prise EXIF lue **avant** compression, JPEG ≤ 1600 px de côté.
- Le consultant ne voit que **ses** fiches et la liste des DAB ; ni prix ni autres utilisateurs.
- Aucun secret dans le code client (seule la clé publique `anon`/publishable).

## Review Focus

1. **GPS indisponible ou refusé à l'intérieur d'une agence** → « Je suis arrivé » ne bloque jamais : l'heure est enregistrée, la position reste vide avec `gps_motif = 'indisponible'` ou `'refuse'`, et le signal douteux « GPS absent » apparaît (tests tâches 5 et 10).
2. **Application fermée pendant l'envoi d'une photo** → à la réouverture, l'envoi reprend, aucune photo perdue ni en double (test tâche 8).
3. **Session expirée après quelques heures sans réseau** → la synchronisation rafraîchit la session avant d'envoyer ; en cas d'échec, les données restent en attente et l'écran l'indique (test tâche 8).
4. **Heure de la tablette fausse** → `recu_at` serveur et horodatage GPS enregistrés à côté de l'heure tablette (test tâche 1).
5. **Espace de stockage de la tablette** → photos compressées, stockage persistant demandé, photo locale supprimée seulement après confirmation du serveur (test tâche 8).

---

## Phase A — tablette (essai le 29/11)

### Task 1 : Projet Supabase, schéma et règles d'accès

**Files :**
- Create : `supabase/migrations/0001_schema.sql`, `supabase/migrations/0002_rls.sql`, `supabase/migrations/0003_storage.sql`
- Test : `supabase/tests/01_schema.sql`, `supabase/tests/02_rls.sql`
- Create : `docs/exploitation.md` (identifiants du projet, URL, procédure)

**Interfaces :**
- Produces (tables) :
  - `profils(id uuid pk → auth.users, nom text, role text check in ('admin','superviseur','consultant'), actif bool default true)`
  - `banques(id uuid pk, code text unique, nom text)`
  - `sites(id uuid pk, banque_id uuid, nom text, ville text, lat float8 null, lng float8 null)`
  - `dab(id uuid pk, code text unique, site_id uuid, marque text, modele text, numero_serie text null, ville text, origine text check in ('reference','nouveau_a_verifier'), cree_par uuid null)`
  - `checklist_items(id text pk, ordre int, libelle text, module text, consigne text, obligatoire bool, modele text, photo_requise bool, commentaire_requis bool, actif bool)`
  - `articles(pn text pk, designation text)`
  - `fiches(id uuid pk, dab_id uuid, consultant_id uuid, statut text, arrivee_at timestamptz, arrivee_lat/lng/precision float8 null, arrivee_gps_at timestamptz null, gps_motif text null, depart_at timestamptz null, depart_lat/lng float8 null, identification jsonb, systeme jsonb, cloture jsonb, sans_signature bool default false, motif_renvoi text null, recu_at timestamptz default now(), maj_at timestamptz)`
  - `reponses_checklist(fiche_id uuid, item_id text, valeur text check in ('OK','NOK','NA'), commentaire text null, pk(fiche_id,item_id))`
  - `etats_modules(fiche_id uuid, module text, etat text check in ('Bon','Use','A_remplacer','Absent'), commentaire text null, pk(fiche_id,module))`
  - `pieces_a_prevoir(id uuid pk, fiche_id uuid, module text, pn text null, pn_libre text null, quantite int check > 0)`
  - `photos(id uuid pk, fiche_id uuid, cible text, storage_path text, prise_at timestamptz null, prise_tablette_at timestamptz, recu_at timestamptz default now())`
  - `historique_fiches(id bigserial, fiche_id uuid, at timestamptz default now(), par uuid, action text, details jsonb)`
  - `parametres(cle text pk, valeur text)` avec `duree_min_minutes=60`, `distance_max_metres=300`
  - fonction `role_courant() returns text` (lit `profils.role` de `auth.uid()`)
  - trigger : toute mise à jour de `fiches` met `maj_at = now()` et écrit une ligne `historique_fiches` quand le statut change ou qu'une fiche `terminee` est modifiée.
  - bucket Storage privé `photos`, chemin `fiches/{fiche_id}/{photo_id}.jpg`.
- Valeurs de `photos.cible` : `plaque`, `item:{item_id}`, `module:{module}`, `journal`, `antiskimming`, `ticket`, `multimetre`, `signature`, `site_absent`.

- [ ] **Step 1 : Créer le projet** `gbm-maintenance-dab` dans l'org PLEXIA (région `eu-west-3` ou la plus proche d'Europe proposée), en vérifiant le coût affiché (doit être 0 $) ; noter `project_ref` et l'URL dans `docs/exploitation.md`.
- [ ] **Step 2 : Écrire les tests SQL** (chacun dans `BEGIN … ROLLBACK`, `RAISE EXCEPTION` si l'attendu n'est pas obtenu) :
  - `01_schema.sql` : insertion d'une `reponses_checklist` avec `valeur='KO'` échoue ; `pieces_a_prevoir.quantite = 0` échoue ; mise à jour du statut d'une fiche crée 1 ligne `historique_fiches` ; `recu_at` est rempli par le serveur même si le client envoie une autre valeur.
  - `02_rls.sql` : en se faisant passer pour le consultant A (`set local role authenticated; set local request.jwt.claims = '{"sub":"<A>"}'`) : `select count(*) from fiches` ne renvoie pas la fiche de B ; `select * from profils` ne renvoie que sa propre ligne ; insertion d'une fiche avec `consultant_id = B` refusée ; superviseur : lecture de toutes les fiches OK, écriture refusée ; admin : tout.
- [ ] **Step 3 : Lancer les tests** via `execute_sql` → attendu : erreur « relation fiches does not exist ».
- [ ] **Step 4 : Appliquer les 3 migrations** (`apply_migration`). RLS : consultant = lecture du référentiel, CRUD sur ses fiches et leurs lignes filles tant que `statut in ('brouillon','terminee','renvoyee')` ; superviseur = lecture de tout ; admin = tout. Storage : consultant écrit/lit seulement sous `fiches/{id}` d'une fiche à lui ; superviseur/admin lisent tout. `recu_at` forcé par trigger `before insert or update`.
- [ ] **Step 5 : Relancer les tests** → attendu : aucune exception. Lancer `get_advisors` (sécurité) → aucun avertissement « RLS disabled ».
- [ ] **Step 6 : Commit** `feat(db): schéma, RLS et stockage du relevé terrain`.

### Task 2 : Référentiel (DAB Wincor, sites, banques, checklist, articles)

**Files :**
- Create : `scripts/import/preparer_referentiel.py`, `scripts/import/test_preparer_referentiel.py`, `scripts/import/fixtures/` (petit jeu CSV)
- Create : `data/source/` (exports CSV du Google Sheet `02_base_maintenance_dab_appsheet` : Clients, Sites, Machines, Articles ; `ChecklistItems_catalogue_v7.csv`) — **non commité** si données bancaires (ajouter à `.gitignore`)
- Output : `data/seed/referentiel.sql`

**Interfaces :**
- Consumes : tables de la tâche 1.
- Produces : `preparer(dossier_source: Path) -> Rapport` où `Rapport = {sql: str, anomalies: list[str], compte: dict[str,int]}` ; CLI `python3 scripts/import/preparer_referentiel.py data/source data/seed/referentiel.sql`.

- [ ] **Step 1 : Récupérer les sources** avec le connecteur Google Drive (lecture du Sheet par onglet, export CSV) et `project_read` du catalogue ; si l'accès échoue, le signaler à Yousri (un export .xlsx suffit).
- [ ] **Step 2 : Écrire les tests pytest** sur les fixtures :
  - `test_filtre_wincor_villes` : ne garde que marque Wincor (insensible à la casse, inclut « Wincor Nixdorf », « Diebold Nixdorf » avec modèle ProCash) **et** ville Pointe-Noire ou Brazzaville (variantes « Pte-Noire », « PNR », « BZV » normalisées).
  - `test_sn_normalise` : `" ab 12-3 "` → `"AB12-3"` ; SN vide → `NULL`.
  - `test_checklist_actifs` : seuls les items `Actif=OUI` et `Modele in (Tous, Wincor)` sont gardés ; 33 préventifs attendus avec le vrai catalogue ; `CHK-C01` exclu (curatif).
  - `test_doublons_signales` : deux DAB avec le même code → une anomalie, un seul gardé.
  - `test_sql_idempotent` : le SQL produit utilise `insert … on conflict do update` (re-jouable).
- [ ] **Step 3 : Lancer** `pytest scripts/import -q` → FAIL (module absent).
- [ ] **Step 4 : Implémenter `preparer`** ; écrire le rapport d'anomalies dans `data/seed/anomalies.txt`.
- [ ] **Step 5 : Relancer** → PASS. Générer le seed réel, afficher `compte` (nombre de DAB Wincor par ville et par banque) et les anomalies.
- [ ] **Step 6 : Appliquer** `referentiel.sql` via `execute_sql` ; vérifier `select ville, count(*) from dab group by ville` = compte du rapport ; insérer `parametres`.
- [ ] **Step 7 : Commit** `feat(data): préparation et chargement du référentiel Wincor`.

### Task 3 : Comptes utilisateurs

**Files :**
- Create : `supabase/functions/gerer-utilisateurs/index.ts`
- Test : `supabase/functions/gerer-utilisateurs/index.test.ts` (Deno, logique de validation isolée)

**Interfaces :**
- Produces : `POST /functions/v1/gerer-utilisateurs` corps `{email, nom, role, mot_de_passe}` ; autorisé si JWT d'un admin **ou** en-tête `x-jeton-installation` = secret `JETON_INSTALLATION` ; crée l'utilisateur (`email_confirm: true`) et sa ligne `profils`. Réponse `{id}` ou `{erreur}` (400 rôle inconnu, 403 non autorisé, 409 e-mail existant).

- [ ] **Step 1 : Tests** de `valider(corps)` : rôle hors liste → erreur ; e-mail mal formé → erreur ; mot de passe < 10 caractères → erreur.
- [ ] **Step 2 : Lancer** (`deno test` si Deno installable, sinon tests de la fonction pure via Vitest) → FAIL.
- [ ] **Step 3 : Implémenter**, créer le secret `JETON_INSTALLATION` (aléatoire), déployer (`deploy_edge_function`).
- [ ] **Step 4 : Créer les comptes** : Yousri (admin), Berty et King (superviseur), un compte de test consultant `test.consultant` (alias de yosri.miled@gmail.com) ; Chaker dès réception de son e-mail. Mots de passe générés, remis à Yousri dans la conversation (jamais dans le dépôt).
- [ ] **Step 5 : Vérifier** : appel sans jeton → 403 ; `select role from profils` = 4 lignes attendues.
- [ ] **Step 6 : Commit** `feat(auth): création des comptes par fonction serveur`.

### Task 4 : Squelette de l'application, connexion et référentiel local

**Files :**
- Create : `app/` (Vite React TS), `app/src/supabase.ts`, `app/src/local/db.ts`, `app/src/local/referentiel.ts`, `app/src/ecrans/Connexion.tsx`, `app/src/App.tsx`, `app/.env.example`
- Test : `app/src/local/referentiel.test.ts`

**Interfaces :**
- Produces :
  - `db` (Dexie) avec tables `dab, sites, banques, checklist, articles, parametres` (référentiel) et `fiches, reponses, etats, pieces, photos` (saisies, chacune avec `sync: 'a_envoyer' | 'envoye'`), `photos.blob: Blob` local.
  - `chargerReferentiel(client: SupabaseClient): Promise<{dab:number}>` — remplace le référentiel local, ne touche jamais aux saisies.
  - `useSession()` hook ; session Supabase persistée (`persistSession: true`, `autoRefreshToken: true`).

- [ ] **Step 1 : Initialiser** Vite React TS, vite-plugin-pwa (manifest `GBM Relevé DAB`, `display: standalone`, précache de l'application), Vitest + fake-indexeddb.
- [ ] **Step 2 : Test** `chargerReferentiel` avec un client simulé : après chargement, `db.dab.count()` = 3 ; une fiche locale existante est toujours là ; un 2e chargement ne duplique rien.
- [ ] **Step 3 : Lancer** `npm test` → FAIL.
- [ ] **Step 4 : Implémenter** ; écran Connexion (e-mail + mot de passe), puis chargement du référentiel avec message « Liste des DAB chargée : N ».
- [ ] **Step 5 : Relancer** → PASS ; `npm run build` sans erreur TypeScript.
- [ ] **Step 6 : Commit** `feat(app): squelette PWA, connexion et référentiel local`.

### Task 5 : Règles métier de la fiche (module pur)

**Files :**
- Create : `app/src/domaine/types.ts`, `app/src/domaine/completude.ts`, `app/src/domaine/sn.ts`, `app/src/domaine/arrivee.ts`
- Test : `app/src/domaine/completude.test.ts`, `app/src/domaine/sn.test.ts`, `app/src/domaine/arrivee.test.ts`

**Interfaces :**
- Produces :
  - `normaliserSN(s: string): string | null`
  - `type Manque = { partie: 1|2|3|4|5; cle: string; message: string }`
  - `elementsManquants(f: FicheComplete, items: ChecklistItem[]): Manque[]` — vide ⇔ « Terminer » autorisé.
  - `enregistrerArrivee(pos: () => Promise<GeolocationPosition>, maintenant: () => Date): Promise<Arrivee>` où `Arrivee = {at, lat?, lng?, precision?, gps_at?, gps_motif?: 'indisponible'|'refuse'}` ; délai GPS 30 s.
- [ ] **Step 1 : Tests** (`completude.test.ts`), chacun sur une fiche complète de référence modifiée d'un seul élément :
  - fiche complète → `[]` ;
  - plaque sans photo → manque partie 1 `plaque` ; SN vide → manque partie 1 ;
  - item obligatoire sans réponse → manque partie 2 ; `NA` sur item obligatoire → manque ; `NOK` sans commentaire → manque ; `NOK` sans photo → manque ; `CHK-P127` (photo_requise + commentaire_requis) `OK` sans photo → manque ;
  - module `Use` sans pièce → manque partie 3 ; module `Bon` sans commentaire → pas de manque ;
  - système : photo `journal` absente → manque partie 4 ; anti-skimming `oui` sans photo → manque ;
  - clôture : tension phase-neutre non numérique → manque ; ni signature ni « gestionnaire absent » → manque ; « absent » sans motif ou sans photo `site_absent` → manque ; « absent » complet → `[]` et `sans_signature = true` calculé.
- [ ] **Step 2 : Tests** `sn.test.ts` (`" ab 12 "`→`"AB12"`, `""`→`null`) et `arrivee.test.ts` (position OK → lat/lng remplis ; erreur `PERMISSION_DENIED` → `gps_motif='refuse'`, `at` rempli ; délai dépassé → `gps_motif='indisponible'`).
- [ ] **Step 3 : Lancer** → FAIL. **Step 4 : Implémenter.** **Step 5 : Relancer** → PASS.
- [ ] **Step 6 : Commit** `feat(domaine): règles de complétude, SN et arrivée`.

### Task 6 : Photos et signature

**Files :**
- Create : `app/src/photos/capture.ts`, `app/src/composants/BoutonPhoto.tsx`, `app/src/composants/Signature.tsx`
- Test : `app/src/photos/capture.test.ts`

**Interfaces :**
- Produces :
  - `preparerPhoto(fichier: File, maintenant: Date): Promise<{blob: Blob; prise_at: Date | null; prise_tablette_at: Date}>` — lit `DateTimeOriginal` (exifr) avant compression ; redimensionne ≤ 1600 px, JPEG qualité 0,7.
  - `<BoutonPhoto ficheId cible onAjout />` : `<input type="file" accept="image/*" capture="environment">`, écrit dans `db.photos` (`sync:'a_envoyer'`), affiche la vignette et un bouton « Reprendre ».
  - `<Signature ficheId />` : signature_pad → PNG enregistré comme photo `cible='signature'`.
- [ ] **Step 1 : Tests** : image de test 4000×3000 avec EXIF → `prise_at` = date EXIF et plus grand côté = 1600 ; image sans EXIF → `prise_at = null`.
- [ ] **Step 2 : Lancer** → FAIL. **Step 3 : Implémenter.** **Step 4 : Relancer** → PASS.
- [ ] **Step 5 : Commit** `feat(photos): capture, compression, heure EXIF et signature`.

### Task 7 : Écrans de la fiche

**Files :**
- Create : `app/src/ecrans/ListeDab.tsx`, `app/src/ecrans/NouveauDab.tsx`, `app/src/ecrans/Fiche.tsx`, `app/src/ecrans/parties/{Identification,Preventif,Mecanique,Systeme,Cloture}.tsx`, `app/src/ecrans/Manques.tsx`, `app/src/local/fiches.ts`
- Test : `app/src/local/fiches.test.ts`

**Interfaces :**
- Consumes : `db`, `elementsManquants`, `enregistrerArrivee`, `BoutonPhoto`, `Signature`, `normaliserSN`.
- Produces : `creerFiche(dabId: string, consultantId: string, arrivee: Arrivee): Promise<string>` ; `enregistrer(partie, données)` qui écrit immédiatement dans Dexie (`sync:'a_envoyer'`) ; `terminerFiche(id): Promise<Manque[]>` qui refuse si la liste n'est pas vide, sinon pose `statut='terminee'`, `depart_at` et la position de départ.
- [ ] **Step 1 : Tests** `fiches.test.ts` : `creerFiche` crée un brouillon avec l'heure d'arrivée ; `terminerFiche` sur fiche incomplète renvoie les manques et laisse `brouillon` ; sur fiche complète passe `terminee` avec `depart_at` ; une modification après `terminee` repasse la fiche en `a_envoyer` sans changer le statut.
- [ ] **Step 2 : Lancer** → FAIL. **Step 3 : Implémenter** les fonctions puis les écrans :
  - Liste des DAB : recherche par code, agence, banque ; filtre ville ; pastille de statut de la fiche locale ; bouton « DAB absent de la liste » (crée un `dab` `origine='nouveau_a_verifier'`).
  - Fiche : bouton « Je suis arrivé » obligatoire avant tout ; 5 onglets avec compteur `x/y` ; préventif groupé par module dans l'ordre du catalogue, consigne sous chaque point, trois gros boutons OK / NOK / N/A (N/A masqué si obligatoire) ; écran « Ce qui manque » avec lien vers chaque élément ; « Gestionnaire absent / refus » dans la clôture.
- [ ] **Step 4 : Relancer** → PASS ; `npm run build` OK.
- [ ] **Step 5 : Vérification visuelle** dans le navigateur intégré (taille tablette 800×1280) : parcourir une fiche complète avec le compte de test ; capture d'écran de chaque partie.
- [ ] **Step 6 : Commit** `feat(app): écrans de la fiche terrain`.

### Task 8 : Synchronisation

**Files :**
- Create : `app/src/sync/synchroniser.ts`, `app/src/composants/EtatEnvoi.tsx`
- Test : `app/src/sync/synchroniser.test.ts`

**Interfaces :**
- Consumes : `db`, client Supabase.
- Produces : `synchroniser(client): Promise<{envoyes: number; restants: number; erreur?: string}>` — ordre : fiches → réponses / états / pièces → photos (upload Storage `upsert: true` puis ligne `photos`) ; marque `envoye` seulement après succès ; supprime le `blob` local d'une photo uniquement après insertion confirmée de sa ligne. Déclenchée au démarrage, sur l'événement `online`, toutes les 60 s et à chaque « Terminer ». Appelle `navigator.storage.persist()` au premier lancement.
- `<EtatEnvoi />` : « Tout est envoyé » / « N éléments en attente d'envoi » / « Pas de réseau — vos saisies sont gardées sur la tablette ».
- [ ] **Step 1 : Tests** (client Supabase simulé) :
  - envoi nominal : tout passe `envoye`, `restants = 0` ;
  - échec réseau sur la 3e photo : les 2 premières `envoye`, la 3e garde son blob, `restants = 1` ; nouvel appel → envoyée, aucune ligne en double (même `id`) ;
  - interruption simulée entre l'upload Storage et l'insertion de la ligne : au relancement, upload refait sans erreur (`upsert`) et ligne insérée une seule fois ;
  - session expirée (erreur 401) : `refreshSession` appelé puis nouvel essai ; si le rafraîchissement échoue, `erreur = 'session'` et rien n'est marqué envoyé ;
  - deux appels simultanés : un seul envoi effectif (verrou).
- [ ] **Step 2 : Lancer** → FAIL. **Step 3 : Implémenter.** **Step 4 : Relancer** → PASS.
- [ ] **Step 5 : Vérification de bout en bout** avec le compte de test sur la base réelle : remplir une fiche, couper le réseau dans le navigateur (DevTools hors ligne), ajouter 3 photos, fermer l'onglet, rouvrir, rétablir le réseau → la base contient la fiche, les réponses et 3 photos, sans doublon (`select count(*)`).
- [ ] **Step 6 : Commit** `feat(sync): envoi idempotent avec reprise`.

### Task 9 : Mise en ligne et essai du 29/11

**Files :**
- Create : `docs/essai-29-novembre.md` (1 page pour Yousri), `docs/guide-consultant.md` (1 page pour Chaker, avec captures)
- Modify : `docs/exploitation.md`

**Interfaces :**
- Produces : URL publique HTTPS de l'application installable.
- [ ] **Step 1 : Héberger** l'application statique (hébergeur décidé avec Yousri avant cette tâche : Cloudflare Pages avec dépôt privé, ou GitHub Pages) ; variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- [ ] **Step 2 : Vérifier** sur l'URL publique : installation proposée (manifest valide), connexion, liste des DAB, fiche complète envoyée.
- [ ] **Step 3 : Écrire** l'essai du 29/11 : installer sur la tablette, se connecter avec le compte de Chaker, faire une fiche complète sur un DAB réel ou de test, passer en mode avion au milieu, fermer et rouvrir, revenir en ligne, vérifier « Tout est envoyé » ; critères Go : 0 perte, fiche complète en ≤ 2 h 30, aucun blocage. Sinon No-Go → plan B papier.
- [ ] **Step 4 : Écrire** le guide consultant (gestes : arriver, remplir, photographier, terminer, vérifier l'envoi).
- [ ] **Step 5 : Commit** `docs: essai du 29/11 et guide consultant`.

## Phase B — contrôle (2 au 5 décembre)

### Task 10 : Signaux « douteux »

**Files :**
- Create : `supabase/migrations/0004_signaux.sql`
- Test : `supabase/tests/03_signaux.sql`

**Interfaces :**
- Produces : `distance_metres(lat1,lng1,lat2,lng2) returns float8` (haversine) ; vue `v_fiches_signaux(fiche_id, douteux bool, raisons text[], sans_signature bool)` avec raisons exactes : `'Visite de moins de N min'`, `'GPS à X m du site'`, `'GPS absent'`, `'GPS non comparable (site sans coordonnées)'`, `'Chevauche la visite du DAB <code>'`, `'Photo prise hors de la visite'`.
- [ ] **Step 1 : Tests** : fiche de 45 min → raison durée ; 59 min avec seuil 60 → raison ; 61 min → aucune ; GPS à 500 m → raison ; site sans coordonnées → « non comparable » mais `douteux = false` pour cette seule raison ; deux fiches du même consultant qui se chevauchent → raison sur les deux ; photo EXIF 3 h avant l'arrivée → raison ; `gps_motif='refuse'` → « GPS absent » ; seuil modifié dans `parametres` pris en compte.
- [ ] **Step 2 : Lancer** → FAIL. **Step 3 : Implémenter.** **Step 4 : Relancer** → PASS.
- [ ] **Step 5 : Commit** `feat(db): signaux de contrôle du consultant`.

### Task 11 : Écran de suivi, fiche détaillée, validation

**Files :**
- Create : `app/src/ecrans/admin/Suivi.tsx`, `app/src/ecrans/admin/FicheDetail.tsx`, `app/src/admin/validation.ts`
- Create : `supabase/migrations/0005_validation.sql` (fonction `valider_fiche(id uuid, appliquer_corrections bool)`, `renvoyer_fiche(id uuid, motif text)`, réservées admin)
- Test : `supabase/tests/04_validation.sql`

**Interfaces :**
- Consumes : `v_fiches_signaux`.
- Produces : routes `/suivi` et `/suivi/:ficheId` (admin et superviseur ; boutons de validation visibles pour l'admin seulement).
- [ ] **Step 1 : Tests SQL** : `valider_fiche(..., true)` recopie SN normalisé, modèle et GPS d'arrivée sur `dab`/`sites` et pose `validee` ; avec `false`, `dab` inchangé ; `renvoyer_fiche` sans motif échoue ; consultant appelant `valider_fiche` → refusé ; chaque action écrit dans `historique_fiches`.
- [ ] **Step 2 : Lancer** → FAIL. **Step 3 : Implémenter** fonctions puis écrans : compteurs (visités / restants / douteux / sans signature), filtres banque, ville, statut ; détail avec photos en grand (URL signées), raisons des signaux, historique, comparaison « base / relevé » pour SN, modèle, GPS.
- [ ] **Step 4 : Relancer** → PASS ; vérification visuelle sur ordinateur.
- [ ] **Step 5 : Commit** `feat(admin): suivi, détail et validation des fiches`.

### Task 12 : Export Excel

**Files :**
- Create : `app/src/admin/export.ts`
- Test : `app/src/admin/export.test.ts`

**Interfaces :**
- Produces : `construireClasseur(donnees: ExportDonnees): XLSX.WorkBook` avec onglets `Fiches` (une ligne par fiche : DAB, banque, ville, statut, signaux, arrivée, départ, durée, SN relevé), `Preventif`, `Mecanique`, `Systeme`, `Cloture`, `Pieces_a_prevoir` (consolidé par PN : PN, désignation, quantité totale, nombre de DAB).
- [ ] **Step 1 : Tests** : 2 fiches avec la même pièce (2 et 1) → une ligne PN quantité 3, 2 DAB ; noms des 6 onglets exacts ; dates en format date Excel.
- [ ] **Step 2 : Lancer** → FAIL. **Step 3 : Implémenter** + bouton « Exporter Excel » sur `/suivi`. **Step 4 : Relancer** → PASS.
- [ ] **Step 5 : Commit** `feat(admin): export Excel et pièces à prévoir`.
