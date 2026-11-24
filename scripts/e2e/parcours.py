"""Parcours visuel de la fiche en taille tablette, Supabase simulé. Usage : python3 parcours.py URL DOSSIER_CAPTURES"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

URL, OUT = sys.argv[1], Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
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
        envois.append(("PHOTO", u.split("/object/")[-1][:60]))
        return r.fulfill(json={"Key": "ok"})
    return r.continue_()

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 800, "height": 1280}, geolocation={"latitude": -4.2635, "longitude": 15.2430},
                        permissions=["geolocation"], locale="fr-FR")
    pg = ctx.new_page(); erreurs = []
    pg.on("pageerror", lambda e: erreurs.append(str(e)))
    pg.route("**/*supabase.co/**", route)
    pg.goto(URL); pg.fill("input[type=email]", "t@test"); pg.fill("input[type=password]", "x"); pg.click("button.principal")
    pg.wait_for_selector("text=TEST-BZV-01"); pg.screenshot(path=OUT / "1-liste.png")
    pg.click("text=TEST-BZV-01"); pg.click("button:has-text('Je suis arrivé')"); pg.wait_for_selector("text=Arrivée enregistrée")
    pg.screenshot(path=OUT / "2-identification.png")
    pg.click("nav.onglets >> text=2. Préventif"); pg.click("#item-CHK-P101 >> text=OK"); pg.click("#item-CHK-P102 >> text=NOK")
    pg.screenshot(path=OUT / "3-preventif.png")
    pg.click("nav.onglets >> text=3. Mécanique"); pg.click("[id='module-Distributeur'] >> text=Usé")
    pg.screenshot(path=OUT / "4-mecanique.png")
    pg.click("nav.onglets >> text=4. Système"); pg.screenshot(path=OUT / "5-systeme.png")
    pg.click("nav.onglets >> text=5. Clôture"); pg.screenshot(path=OUT / "6-cloture.png", full_page=True)
    pg.click("button:has-text('Terminer la fiche')"); pg.wait_for_selector("text=Ce qui manque"); pg.screenshot(path=OUT / "7-manques.png")
    print("erreurs JS :", erreurs)
    print("envois :", envois[:10])
    b.close()
