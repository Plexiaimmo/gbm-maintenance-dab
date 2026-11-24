"""Prépare le référentiel du relevé terrain (DAB Wincor de Pointe-Noire et Brazzaville).

Entrée : un dossier contenant
  - dab.csv        : banque_code, banque_nom, agence, ville, code_dab, marque, modele, numero_serie, lat, lng
  - checklist.csv  : catalogue ChecklistItems v7
  - articles.csv   : pn, designation (facultatif)
Sortie : SQL rejouable (insert … on conflict … do update) + anomalies + compte par ville.

Usage : python3 preparer_referentiel.py DOSSIER_SOURCE FICHIER_SQL
"""
from __future__ import annotations

import csv
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import Path

ESPACE = uuid.UUID("6f1c2b52-1d1e-4c3f-9a51-2a1d8a0e7c11")  # identifiants stables
VILLES = {
    "pointe-noire": "Pointe-Noire", "pointe noire": "Pointe-Noire", "pte-noire": "Pointe-Noire",
    "pte noire": "Pointe-Noire", "pnr": "Pointe-Noire",
    "brazzaville": "Brazzaville", "bzv": "Brazzaville", "brazza": "Brazzaville",
}


@dataclass
class Rapport:
    sql: str = ""
    anomalies: list[str] = field(default_factory=list)
    compte: dict[str, int] = field(default_factory=dict)
    dab: list[dict] = field(default_factory=list)
    checklist: list[dict] = field(default_factory=list)


def normaliser_sn(s: str | None) -> str | None:
    if s is None:
        return None
    s = "".join(str(s).split()).upper()
    return s or None


def normaliser_ville(v: str | None) -> str | None:
    if not v:
        return None
    return VILLES.get(str(v).strip().lower(), str(v).strip())


def est_wincor(marque: str | None, modele: str | None) -> bool:
    t = f"{marque or ''} {modele or ''}".lower()
    return "wincor" in t or "procash" in t or ("nixdorf" in t and "diebold" not in t) or (
        "diebold nixdorf" in t and "procash" in t)


def _id(*parts: str) -> str:
    return str(uuid.uuid5(ESPACE, "|".join(parts)))


def _q(v) -> str:
    if v is None or v == "":
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    return "'" + str(v).replace("'", "''") + "'"


def _num(v):
    try:
        return float(str(v).replace(",", ".")) if str(v).strip() else None
    except ValueError:
        return None


def _upsert(table: str, cols: list[str], rows: list[list], conflit: str) -> str:
    if not rows:
        return ""
    maj = ", ".join(f"{c} = excluded.{c}" for c in cols if c != conflit)
    valeurs = ",\n".join("(" + ", ".join(_q(v) for v in r) + ")" for r in rows)
    return f"insert into {table} ({', '.join(cols)}) values\n{valeurs}\non conflict ({conflit}) do update set {maj};\n"


def _lire(chemin: Path) -> list[dict]:
    if not chemin.exists():
        return []
    with chemin.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def preparer(dossier: Path) -> Rapport:
    r = Rapport()
    banques, sites, dabs = {}, {}, {}
    for i, l in enumerate(_lire(Path(dossier) / "dab.csv"), start=2):
        ville = normaliser_ville(l.get("ville"))
        if ville not in ("Pointe-Noire", "Brazzaville") or not est_wincor(l.get("marque"), l.get("modele")):
            continue
        code = (l.get("code_dab") or "").strip()
        if not code:
            r.anomalies.append(f"ligne {i} : code DAB vide, ignorée")
            continue
        if code in dabs:
            r.anomalies.append(f"{code} : code DAB en double (ligne {i}), seule la 1re ligne est gardée")
            continue
        bc = (l.get("banque_code") or "").strip().upper()
        banques.setdefault(bc, [_id("banque", bc), bc, (l.get("banque_nom") or bc).strip()])
        agence = (l.get("agence") or "").strip() or "Agence inconnue"
        lat, lng = _num(l.get("lat")), _num(l.get("lng"))
        cle = (bc, agence.lower(), ville)
        if cle not in sites:
            sites[cle] = [_id("site", *cle), banques[bc][0], agence, ville, lat, lng]
        elif lat is not None and sites[cle][4] is None:
            sites[cle][4], sites[cle][5] = lat, lng
        sn = normaliser_sn(l.get("numero_serie"))
        if sn is None:
            r.anomalies.append(f"{code} : numéro de série absent (à relever sur le terrain)")
        if lat is None:
            r.anomalies.append(f"{code} : pas de GPS (sera fourni par la première visite)")
        d = {"id": _id("dab", code), "code_dab": code, "site_id": sites[cle][0],
             "marque": (l.get("marque") or "").strip(), "modele": (l.get("modele") or "").strip(),
             "numero_serie": sn, "ville": ville}
        dabs[code] = d
    r.dab = list(dabs.values())
    for d in r.dab:
        r.compte[d["ville"]] = r.compte.get(d["ville"], 0) + 1

    for l in _lire(Path(dossier) / "checklist.csv"):
        if l["Actif"] != "OUI" or l["TypeIntervention"] != "Préventive" or l["Modele"] not in ("Tous", "Wincor"):
            continue
        r.checklist.append({"id": l["ItemID"], "ordre": int(l["Ordre"]), "libelle": l["Libelle"],
                            "module": l["Module"], "consigne": l["Consigne"],
                            "obligatoire": l["Obligatoire"] == "OUI", "modele": l["Modele"],
                            "photo_requise": l["PhotoRequise"] == "OUI",
                            "commentaire_requis": l["CommentaireRequis"] == "OUI", "actif": True})
    articles = [[a["pn"].strip(), a.get("designation", "").strip()]
                for a in _lire(Path(dossier) / "articles.csv") if a.get("pn", "").strip()]

    r.sql = "".join([
        _upsert("banques", ["id", "code", "nom"], list(banques.values()), "code"),
        _upsert("sites", ["id", "banque_id", "nom", "ville", "lat", "lng"], list(sites.values()), "id"),
        _upsert("dab", ["id", "code", "site_id", "marque", "modele", "numero_serie", "ville"],
                [[d["id"], d["code_dab"], d["site_id"], d["marque"], d["modele"], d["numero_serie"], d["ville"]]
                 for d in r.dab], "code"),
        _upsert("checklist_items", list(r.checklist[0].keys()) if r.checklist else [],
                [list(c.values()) for c in r.checklist], "id"),
        _upsert("articles", ["pn", "designation"], articles, "pn"),
    ])
    return r


if __name__ == "__main__":
    rap = preparer(Path(sys.argv[1]))
    Path(sys.argv[2]).parent.mkdir(parents=True, exist_ok=True)
    Path(sys.argv[2]).write_text(rap.sql, encoding="utf-8")
    (Path(sys.argv[2]).parent / "anomalies.txt").write_text("\n".join(rap.anomalies), encoding="utf-8")
    print("DAB Wincor par ville :", rap.compte, "| points checklist :", len(rap.checklist),
          "| anomalies :", len(rap.anomalies))
