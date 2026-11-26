"""Écrans admin en tablette (800 px) et téléphone (390 px) : pas de débordement, zones tactiles >= 48 px. Usage : python3 admin_responsive.py URL DOSSIER"""
import json, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
import parcours_commun as c

OUT = Path(sys.argv[2]); OUT.mkdir(exist_ok=True)
F = {"id": "f1", "dab_id": "d1", "consultant_id": "u", "statut": "terminee", "arrivee_at": "2026-12-01T08:00:00Z",
     "depart_at": "2026-12-01T08:40:00Z", "arrivee_lat": -4.2655, "arrivee_lng": 15.2429, "arrivee_precision": 8, "gps_motif": None,
     "identification": {"numero_serie": "SN-RELEVE", "modele": "ProCash 2050xe"}, "systeme": {"version_windows": "10", "logiciel": "ProTopas",
     "logiciel_version": "5.2", "heure_correcte": True, "espace_disque_go": "40", "test_interne": "tous OK", "antiskimming": False},
     "cloture": {"tension_phase_neutre": "229", "tension_neutre_terre": "0.4", "gestionnaire_nom": "M. Ngoma"}, "sans_signature": False}
c.DATA.update({
    "profils": [{"role": "admin"}], "fiches": [F],
    "v_fiches_signaux": [{"fiche_id": "f1", "douteux": True, "raisons": ["Visite de moins de 60 min", "GPS à 230 m du site"], "sans_signature": False}],
    "reponses_checklist": [{"fiche_id": "f1", "item_id": "CHK-P101", "valeur": "OK"}, {"fiche_id": "f1", "item_id": "CHK-P102", "valeur": "NOK", "commentaire": "Ventilateur bruyant"}],
    "etats_modules": [{"fiche_id": "f1", "module": "Distributeur", "etat": "Use", "commentaire": "courroie"}],
    "pieces_a_prevoir": [{"id": "p", "fiche_id": "f1", "module": "Distributeur", "pn": "01750000000", "quantite": 2}],
    "photos": [], "historique_fiches": [{"id": 1, "at": "2026-12-01T08:40:00Z", "action": "statut", "details": {"apres": "terminee"}}],
})
DAB_DETAIL = {**c.DATA["dab"][0], "sites": {"nom": "Agence test Centre", "lat": -4.2634, "lng": 15.2429}}

def route(r):
    u = r.request.url
    if "/rest/v1/" in u and r.request.method == "GET":
        t = u.split("/rest/v1/")[1].split("?")[0]
        rows = c.DATA.get(t, [])
        if t == "dab" and "sites" in u: rows = [DAB_DETAIL]
        if "vnd.pgrst.object" in (r.request.headers.get("accept") or ""):
            return r.fulfill(json=rows[0] if rows else None)
        return r.fulfill(json=rows)
    if "/storage/v1/object/sign" in u: return r.fulfill(json=[])
    return c.route(r)


MESURE = """() => {
  const deb = document.documentElement.scrollWidth - window.innerWidth;
  const petits = [...document.querySelectorAll('button, a, select, input, .puce-dab')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 47.5 || r.width < 47.5) && getComputedStyle(e).visibility !== 'hidden'; })
    .map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height) + ' ' + (e.textContent || '').trim().slice(0, 20));
  return { debordement: deb, petits };
}"""
mauvais = 0
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for nom, w, h in [("tablette", 800, 1280), ("telephone", 390, 844)]:
        ctx = b.new_context(viewport={"width": w, "height": h}, has_touch=True, locale="fr-FR")
        pg = ctx.new_page(); err = []; pg.on("pageerror", lambda e: err.append(str(e)))
        ctx.route("**/*supabase.co/**", route)
        pg.goto(sys.argv[1]); pg.fill("input[type=email]", "a@test"); pg.fill("input[type=password]", "x"); pg.click("button.principal")
        pg.wait_for_selector("text=Suivi du relevé Wincor"); pg.wait_for_timeout(500)
        etapes = [("suivi", None)]
        pg.screenshot(path=OUT / f"{nom}-1-suivi.png", full_page=True); m = pg.evaluate(MESURE); print([x for x in pg.evaluate("[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1).slice(0,6).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right))")] if m["debordement"] else ""); print(nom, "suivi", m)
        mauvais += (m["debordement"] > 0) + len(m["petits"])
        pg.click("button:has-text('À signaler')"); pg.wait_for_selector("h1:has-text('À signaler')"); pg.wait_for_timeout(400)
        pg.screenshot(path=OUT / f"{nom}-2-synthese.png", full_page=True); m = pg.evaluate(MESURE); print(nom, "synthèse", m)
        mauvais += (m["debordement"] > 0) + len(m["petits"])
        pg.click(".puce-dab >> nth=0"); pg.wait_for_selector("text=Identification — base / relevé"); pg.wait_for_timeout(400)
        pg.screenshot(path=OUT / f"{nom}-3-detail.png", full_page=True); m = pg.evaluate(MESURE); print(nom, "détail", m)
        mauvais += (m["debordement"] > 0) + len(m["petits"])
        pg.click("button:has-text('← À signaler')"); pg.wait_for_selector("h1:has-text('À signaler')")
        print(nom, "erreurs JS :", err); mauvais += len(err); ctx.close()
    b.close()
print("PROBLÈMES :", mauvais); sys.exit(1 if mauvais else 0)
