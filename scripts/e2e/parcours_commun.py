"""Éléments communs aux parcours (Supabase simulé)."""
import json, time
from pathlib import Path
UID = "00000000-0000-0000-0000-0000000000a1"
CHECK = json.loads(Path(__file__).with_name("checklist.json").read_text())
DATA = {
    "dab": [{"id": "d1", "code": "TEST-BZV-01", "site_id": "s1", "marque": "Wincor Nixdorf", "modele": "ProCash 2050xe",
             "numero_serie": "TESTSN001", "ville": "Brazzaville", "origine": "reference"}],
    "sites": [{"id": "s1", "banque_id": "b1", "nom": "Agence test Centre", "ville": "Brazzaville", "lat": -4.2634, "lng": 15.2429}],
    "banques": [{"id": "b1", "code": "TEST", "nom": "Banque de test"}],
    "checklist_items": CHECK, "articles": [{"pn": "01750000000", "designation": "Courroie"}],
    "parametres": [{"cle": "duree_min_minutes", "valeur": "60"}],
    "profils": [{"role": "consultant"}],
}
envois = []
objets = {}

def route(r):
    u = r.request.url
    if "/auth/v1/token" in u:
        exp = int(time.time()) + 3600
        return r.fulfill(json={"access_token": "x.y.z", "token_type": "bearer", "expires_in": 3600, "expires_at": exp,
                               "refresh_token": "r", "user": {"id": UID, "aud": "authenticated", "email": "t@test"}})
    if "/rest/v1/" in u:
        t = u.split("/rest/v1/")[1].split("?")[0]
        if r.request.method == "GET":
            rows = DATA.get(t, [])
            if "vnd.pgrst.object" in (r.request.headers.get("accept") or ""):
                return r.fulfill(json=rows[0] if rows else None)
            return r.fulfill(json=rows)
        envois.append((r.request.method, t))
        return r.fulfill(status=201, json=[])
    if "/storage/v1/" in u:
        objets[u.split("/object/photos/")[-1]] = len(r.request.post_data_buffer or b"")
        return r.fulfill(json={"Key": "ok"})
    return r.continue_()


def connexion_et_arrivee(pg, url):
    pg.goto(url); pg.fill("input[type=email]", "t@test"); pg.fill("input[type=password]", "x"); pg.click("button.principal")
    pg.wait_for_selector("text=TEST-BZV-01"); pg.click("text=TEST-BZV-01")
    pg.click("button:has-text('Je suis arrivé')"); pg.wait_for_selector("text=Arrivée enregistrée")
