# Conception — Nouvelle plateforme GBM Maintenance DAB, livrable 1 : relevé terrain Wincor

Date : 24 novembre 2026 — Propriétaire : Diginia inc. (Yousri) — Client utilisateur : GBM Congo

## 1. Pourquoi

Le système AppSheet (Google Sheets + Apps Script, 44 tables, 123 vues, 149 actions) n'a jamais pu être mis en service : chaque réglage devait être fait à la main par Yousri, seul sur le projet, 2 h par jour. Le pilote prévu le 28/10/2026 n'a pas démarré ; les automatisations Apps Script échouent toutes depuis fin octobre.

**Décision :** on garde le besoin et toute la réflexion métier (voir `00_RECAP_PROJET_MAINTENANCE_DAB.md`), on change d'outil. Nouvelle plateforme en code, avec une vraie base de données, que Claude construit, teste et maintient lui-même. Yousri n'intervient que pour ce que lui seul peut faire : comptes, paiements, décisions, essais terrain.

**Occasion immédiate :** le **1er décembre 2026**, un consultant externe fait la tournée de **tous les DAB Wincor de Pointe-Noire et Brazzaville** (toutes banques) : **préventif complet + état des lieux mécanique et système**. Objectifs de Yousri :
1. alimenter la base avec des données réelles (numéros de série, emplacement GPS, état, photos) — aujourd'hui il manque les SN des DAB BGFI et les GPS de BGFI et BPC ;
2. **contrôler le travail du consultant**. « Mal fait » = **manque d'information** ou **manque de vérification**.

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs du livrable 1 (avant le 1er décembre)**
- Le consultant remplit, sur tablette Android, une fiche complète par DAB Wincor, **même pendant une coupure de réseau de quelques heures** ; tout remonte à la base dès que le réseau revient.
- Une fiche ne peut pas être terminée si une information obligatoire ou une preuve manque.
- Yousri voit sur un écran de suivi, pour chaque DAB Wincor du périmètre : visité / non visité / douteux, et ouvre chaque fiche avec ses photos.
- Les données recueillies enrichissent la base (SN, GPS, modèle exact corrigés sur le DAB après validation).

**Non-objectifs du livrable 1** (viendront ensuite, chacun brainstormé à son tour) : appels et curatif, pièces posées/retirées et retour du défectueux, magasin (réceptions, sorties par scan, atelier), planning préventif par période, facturation, e-mails aux banques, autres équipements que les DAB.

**Anti-objectifs (échec même si « ça marche »)**
- Le consultant est bloqué sur site par l'absence de réseau ou par l'application.
- Une fiche ou une photo saisie hors ligne est perdue.
- On peut terminer une fiche « à blanc » en 10 minutes sans que cela se voie.
- Yousri doit configurer des écrans à la main pour que ça marche.

## 3. Contraintes

- **Délai (décision de Yousri, 24/11)** : seul le **côté tablette** (fiche, photos, GPS, signature, envoi vers la base) doit être prêt et testé sur la vraie tablette pour le **1er décembre** ; **essai et décision Go / No-Go le 29 novembre au soir**. L'écran de suivi, le signal « douteux », la validation et l'export Excel arrivent **entre le 2 et le 5 décembre** (les données seront déjà dans la base).
- **Plan B si No-Go le 29/11** : fiche papier structurée (mêmes 5 parties) remplie et photographiée par le consultant, ressaisie ensuite ; préparée seulement si nécessaire.
- **Hors ligne léger (décision de Yousri, 24/11)** : la tablette est presque toujours connectée ; l'application doit seulement **tenir quelques heures sans réseau** sans rien perdre (fiche et photos gardées sur la tablette jusqu'à l'envoi). Ce n'est pas une contrainte de conception majeure.
- **Matériel** : **1 consultant, 1 tablette** Android avec carte SIM 5G et Chrome (pas d'application à publier sur le Play Store).
- **Volume** : nombre de DAB Wincor à établir à partir des données existantes (ordre de grandeur : quelques dizaines à une centaine) ; ≈ 15 à 25 photos par DAB.
- **Utilisateurs peu habitués aux applications** : boutons, choix, photos ; le moins de texte libre possible.
- **Propriété** : Diginia crée les comptes et paie les abonnements. GBM accepte l'hébergement cloud des données des banques.
- **Yousri** : 2 h/jour maximum ; il fait les actions de compte, pas la configuration.

## 4. Approches envisagées

| Approche | Pour | Contre | Décision |
|---|---|---|---|
| **1. Application web installable (PWA) hors ligne + PostgreSQL géré (Supabase)** | Claude écrit, déploie et teste tout ; hors ligne conçu exprès ; règles dans la base ; code standard repris par tout développeur | Le hors ligne est à construire soigneusement ; test sur vraie tablette indispensable | **Retenue** (proposée par Claude, Yousri a poursuivi sur cette base) |
| 2. Générateur Lovable + Supabase | Écrans très rapides | Mauvais en hors ligne, moins de contrôle | Écartée : crédits en plus, contrôle moindre du code et du hors ligne |
| 3. Application Android native | Hors ligne le plus robuste | Plus long, installation et mises à jour lourdes, Claude teste moins | Écartée pour le démarrage |
| 4. Garder AppSheet simplifié | Existant | C'est l'outil qui a bloqué | Écartée |
| 5. KoBoToolbox pour la tournée, puis plateforme en code | Gratuit, prêt en un jour, hors ligne éprouvé | Travail fait deux fois (formulaire, import, contrôle), deux outils | Écartée par Yousri (24/11) : **une seule base, une seule interface** |

Autres outils étudiés le 24/11 et écartés (coût en crédits imprévisible, pilotage impossible par Claude ou configuration manuelle) : Bolt, v0, Replit, Base44, Glide, Fulcrum, Google AI Studio, Firebase Studio (fermé aux nouveaux espaces depuis juin 2026).

## 5. Ce qui est décidé

### 5.1 Plateforme (choix de Claude, non contesté par Yousri)
- **Base** : PostgreSQL géré sur **Supabase** (authentification, stockage des photos, règles d'accès par rôle dans la base). Nouveau projet dans le compte Supabase existant de Yousri (Plexia), région Europe ; abonnement payé par Diginia si une offre payante est nécessaire.
- **Application** : une seule application web installable (PWA), en français, pensée d'abord pour tablette ; les écrans de suivi s'utilisent aussi sur ordinateur.
- **Hors ligne** : données de référence (DAB du périmètre, catalogue de checklist, articles/PN) téléchargées sur la tablette à la connexion ; fiches, réponses, photos et signature enregistrées localement à chaque saisie, puis envoyées par une file d'attente dès que le réseau revient ; la tablette garde la fiche tant que le serveur n'a pas confirmé la réception.
- **Connexion** : l'utilisateur se connecte une fois avec réseau ; une coupure de quelques heures ne le déconnecte pas et ne fait rien perdre.

### 5.2 Rôles du livrable 1
- **Admin** (Yousri) : tout, y compris la validation des données recueillies.
- **Superviseur** (Berty, King) : lecture du suivi et des fiches.
- **Consultant** : voit la liste des DAB du périmètre et **ses** fiches seulement ; ne voit ni les autres utilisateurs ni les prix.

### 5.3 Périmètre de données
- DAB **Wincor** de **Pointe-Noire** et **Brazzaville**, toutes banques, préchargés depuis les données existantes (Google Sheet `02_base_maintenance_dab_appsheet` et inventaires BGFI/BPC déjà nettoyés).
- Le consultant peut **ajouter un DAB absent de la liste** ; il est marqué « nouveau — à vérifier » (choix de Claude).
- Référentiel repris : articles (PN, désignation, photo de référence), catalogue `ChecklistItems_catalogue_v7.csv` (33 points actifs préventifs, dont 4 Wincor), banques, sites.

### 5.4 La fiche d'un DAB (validée par Yousri le 24/11)
Une fiche par DAB visité, en 5 parties, enregistrée automatiquement à chaque réponse (brouillon) :

1. **Identification** — banque, agence, identifiant DAB, modèle exact (préremplis, à confirmer ou corriger) ; **numéro de série : photo de la plaque obligatoire + saisie** ; GPS et heure captés **automatiquement** à l'arrivée (bouton « Je suis arrivé ») et au départ (fin de fiche).
2. **Préventif** — les 33 points actifs du catalogue (filtrés Tous + Wincor), groupés par module, dans l'ordre du catalogue ; réponse **OK / NOK / N/A** ; consigne affichée sous chaque point ; règles reprises du catalogue : NOK ⇒ commentaire + photo ; N/A interdit sur point obligatoire ; `PhotoRequise=OUI` ⇒ photo ; `CommentaireRequis=OUI` ⇒ commentaire (ex. tensions mesurées, nom du gestionnaire).
3. **État mécanique par module** — lecteur de carte, EPP, écran, distributeur, cassettes, imprimantes, PC, portes/serrures, onduleur : état **Bon / Usé / À remplacer / Absent** ; si « Usé » ou « À remplacer » : commentaire + photo + **pièces à prévoir** (PN choisi dans les articles, ou saisi si introuvable, quantité).
4. **État système** — version Windows, logiciel applicatif et version, date/heure système correcte (oui/non), espace disque libre, erreurs récentes (**photo de l'écran du journal obligatoire**), résultat du test interne par module, présence d'un dispositif anti-skimming (oui/non + photo si oui).
5. **Clôture** — photo du ticket test ; tensions phase-neutre et neutre-terre (valeurs numériques + photo du multimètre) ; nom et **signature** du gestionnaire de l'agence ; bouton « Terminer ».

**Terminer est impossible** tant qu'un élément obligatoire manque ; l'écran liste ce qui manque et y emmène d'un toucher.

**Gestionnaire absent ou refus de signer (décision de Yousri, 24/11)** : le consultant choisit « Gestionnaire absent / refus », saisit un motif et prend une photo du site ; il peut alors terminer. La fiche porte la mention « **sans signature** », visible sur l'écran de suivi et dans les compteurs.

### 5.4 bis Cycle de vie d'une fiche (choix de Claude)
`Brouillon → Terminée → Validée` ou `Terminée → Renvoyée` (motif saisi par l'admin) `→ Brouillon`.
- Le consultant peut rouvrir sa fiche tant qu'elle n'est pas validée ; chaque modification après « Terminer » est historisée (qui, quand, quoi).
- L'admin valide ou renvoie avec un motif ; « Douteux » est un **signal calculé** affiché à côté du statut, pas un statut.
- Une fiche = une visite. Un DAB peut avoir plusieurs fiches (seconde visite) ; c'est la dernière fiche **validée** qui alimente les données du DAB.

### 5.5 Contrôle du consultant
- **Preuves non saisissables** : heures et GPS pris par la tablette ; photos **prises avec l'appareil photo dans l'application**, pas importées de la galerie (dans la limite de ce que permet le navigateur — voir §6).
- **Statut de chaque DAB sur l'écran de suivi** : *Non visité*, ou le statut de sa dernière fiche (*Brouillon*, *Terminée*, *Validée*, *Renvoyée*), avec deux signaux possibles à côté : **⚠ Douteux** et **sans signature**.
- **Une fiche est « douteuse »** si au moins une règle est vraie (seuils modifiables par l'admin) :
  - durée arrivée → fin **< 60 min** (un préventif sérieux dure environ 2 h) ;
  - GPS d'arrivée à **plus de 300 m** des coordonnées connues du site (si le site n'a pas de coordonnées, la fiche les fournit et le cas est signalé « GPS non comparable ») ;
  - visites du même consultant qui se chevauchent dans le temps ;
  - photos dont l'heure de prise est hors de la plage de la visite, quand cette heure est disponible.
- La raison de chaque « douteux » est affichée en clair.

### 5.6 Ce que Yousri obtient
- **Écran de suivi** : liste des DAB du périmètre (filtres banque, ville, statut), compteurs (visités / restants / douteux), accès à chaque fiche complète avec photos.
- **Validation des données terrain** : l'admin accepte ou rejette les corrections (SN, modèle, GPS) avant qu'elles remplacent les données du DAB.
- **Export Excel** de toutes les fiches (une ligne par DAB, plus un onglet par partie) et de la **liste consolidée des pièces à prévoir** par PN.

## 6. Points d'attention connus
- **Heure de la tablette** modifiable par l'utilisateur : enregistrer aussi l'heure du GPS et l'heure de réception par le serveur.
- **Photos « galerie »** : le navigateur peut parfois proposer la galerie malgré l'ouverture directe de l'appareil photo ; à vérifier sur la tablette cible, et lire l'heure de prise de la photo quand elle existe.
- **Stockage local** : demander au navigateur un stockage persistant ; photos compressées sur la tablette avant stockage et envoi.
- **Gros volume de photos** (≈ 15 à 25 par DAB) : envoi progressif, reprise après coupure, aucune perte si l'envoi échoue.
- Tous les numéros de série saisis sont normalisés (sans espaces, majuscules), comme dans l'ancien système.

## 7. Ce que Yousri doit faire (seulement lui)
1. **Supabase : fait par Claude** (décision de Yousri, 24/11 — accès donné par connecteur). Organisation PLEXIA (offre gratuite, 1 projet existant `plexia-prod`) ; Claude crée un 2e projet gratuit, région Europe. Passage à l'offre payante (Pro, 25 $/mois) seulement si le stockage des photos ou la mise en pause d'un projet gratuit inactif deviennent un problème — Claude le signale avec le coût avant, Yousri paie.
2. Donner le nom et l'adresse e-mail du consultant, et confirmer la tablette qu'il utilisera.
3. Faire l’essai sur la tablette le 29/11 (fiche complète, coupure de réseau, envoi) et décider Go / No-Go (≈ 45 min).

## 8. Laissé au constructeur
- Framework front, bibliothèque de stockage local, hébergement de l'application statique.
- Schéma détaillé des tables, migrations, règles d'accès, méthode d'import des données existantes.
- Compression et format des photos, format de l'export Excel.
- Ergonomie détaillée, dans le respect de §5.4 (gros boutons, une question par ligne, progression visible).

## 9. Suite prévue (hors livrable 1, à brainstormer une par une)
Livrable 2 : appels et curatif + pièces posées/retirées + confirmation du retour du défectueux par le magasin. Puis : magasin complet, préventif planifié par période civile, rapports PDF aux banques, facturation. Toutes les règles métier du récapitulatif s'appliquent, avec les décisions du journal du 23/11 (retour en retard = avertissement sans blocage, SN saisissable à la main, plusieurs visites par appel, signature obligatoire).
