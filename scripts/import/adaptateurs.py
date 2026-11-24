"""Convertit les classeurs reçus vers les CSV normalisés lus par preparer_referentiel.

- convertir_collecte : classeur « Collecte PILOTE » (onglets DAB et Banques) → dab.csv
- convertir_articles : base AppSheet (onglet Articles) → articles.csv
Usage : python3 adaptateurs.py COLLECTE.xlsx BASE_APPSHEET.xlsx DOSSIER_SORTIE
"""
from __future__ import annotations

import csv
import re
import sys
import unicodedata
from pathlib import Path

from openpyxl import load_workbook

COLONNES = ['banque_code', 'banque_nom', 'agence', 'ville', 'code_dab', 'marque', 'modele', 'numero_serie', 'lat', 'lng']
ABREV = {'brazzaville': 'BZV', 'pointe-noire': 'PNR'}


def _t(v) -> str:
    return '' if v is None else str(v).strip()


def _slug(s: str) -> str:
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^A-Z0-9]+', '-', s.upper()).strip('-') or 'SITE'


def convertir_collecte(classeur: Path, sortie: Path) -> int:
    wb = load_workbook(classeur, read_only=True, data_only=True)
    noms = {}
    if 'Banques' in wb.sheetnames:
        for r in wb['Banques'].iter_rows(min_row=3, values_only=True):
            if _t(r[0]) and _t(r[1]):
                noms.setdefault(_t(r[0]).upper(), _t(r[1]))
    lignes, vus = [], {}
    for r in wb['DAB'].iter_rows(min_row=3, values_only=True):
        r = list(r) + [None] * 14
        banque, code, agence, ville = _t(r[0]).upper(), _t(r[1]), _t(r[2]), _t(r[3])
        if not banque or not (code or agence) or _t(r[12]).lower().startswith('retir'):
            continue
        if not code:  # DAB sans code : code stable généré à partir de la banque, de la ville et de l'agence
            base = f"{banque}-{ABREV.get(ville.lower(), _slug(ville)[:3])}-{_slug(agence)}"
            vus[base] = vus.get(base, 0) + 1
            code = f"{base}-{vus[base]}"
        lignes.append({'banque_code': banque, 'banque_nom': noms.get(banque, banque), 'agence': agence, 'ville': ville,
                       'code_dab': code, 'marque': _t(r[7]), 'modele': _t(r[8]), 'numero_serie': _t(r[9]),
                       'lat': _t(r[5]), 'lng': _t(r[6])})
    with open(sortie, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=COLONNES); w.writeheader(); w.writerows(lignes)
    return len(lignes)


def convertir_articles(classeur: Path, sortie: Path, constructeurs: tuple[str, ...] = ()) -> int:
    """constructeurs : garder seulement les articles dont le constructeur (colonne J) contient l'un de ces mots."""
    wb = load_workbook(classeur, read_only=True, data_only=True)
    def garder(r) -> bool:
        c = _t(r[9]).lower() if len(r) > 9 else ''
        return not constructeurs or any(x in c for x in constructeurs)
    lignes = [{'pn': _t(r[0]), 'designation': _t(r[1])} for r in wb['Articles'].iter_rows(min_row=2, values_only=True) if _t(r[0]) and garder(r)]
    with open(sortie, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['pn', 'designation']); w.writeheader(); w.writerows(lignes)
    return len(lignes)


if __name__ == '__main__':
    d = Path(sys.argv[3]); d.mkdir(parents=True, exist_ok=True)
    print('DAB :', convertir_collecte(Path(sys.argv[1]), d / 'dab.csv'), '| articles :', convertir_articles(Path(sys.argv[2]), d / 'articles.csv', ('wincor', 'diebold nixdorf')))
