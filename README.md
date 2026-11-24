# GBM — Relevé DAB

Application tablette (installable depuis Chrome) pour le relevé préventif et l'état des lieux des DAB Wincor, avec écran de suivi pour l'administrateur. Base de données : Supabase.

- `app/` : application (React, TypeScript, Vite). `npm ci && npm test && npm run build`.
- `supabase/` : migrations, tests SQL, fonction serveur.
- `scripts/` : préparation des données et parcours de test automatiques.
- `docs/` : conception, plan, exploitation, essai du 29/11, guide du consultant.

Publication : à chaque envoi sur `main`, GitHub Actions construit l'application et la publie sur GitHub Pages.
