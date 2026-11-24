"""Captures tablette 800×1280 et mesure des zones tactiles. Usage : python3 ux.py URL DOSSIER"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import parcours_commun as c

OUT = Path(sys.argv[2]); OUT.mkdir(exist_ok=True)
AUDIT = """() => [...document.querySelectorAll('button, input, select, textarea, [role=radio]')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]'); })
  .map(e => { const r = e.getBoundingClientRect(); return { t: (e.innerText || e.placeholder || e.tagName).trim().slice(0, 30), h: Math.round(r.height), w: Math.round(r.width) }; })
  .filter(x => x.h < 48 || x.w < 48)"""
petits = {}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 800, "height": 1280}, device_scale_factor=1, has_touch=True, is_mobile=True,
                        geolocation={"latitude": -4.2635, "longitude": 15.243}, permissions=["geolocation"], locale="fr-FR")
    ctx.route("**/*supabase.co/**", c.route)
    pg = ctx.new_page(); err = []; pg.on("pageerror", lambda e: err.append(str(e)))
    pg.goto(sys.argv[1]); petits["connexion"] = pg.evaluate(AUDIT); pg.screenshot(path=OUT / "u0-connexion.png")
    pg.fill("input[type=email]", "t@test"); pg.fill("input[type=password]", "x"); pg.click("button.principal")
    pg.wait_for_selector("text=TEST-BZV-01"); petits["liste"] = pg.evaluate(AUDIT); pg.screenshot(path=OUT / "u1-liste.png")
    pg.click("text=TEST-BZV-01"); pg.click("button:has-text('Je suis arrivé')"); pg.wait_for_selector("text=Arrivée enregistrée")
    petits["identification"] = pg.evaluate(AUDIT); pg.screenshot(path=OUT / "u2-identification.png")
    pg.click(".rail >> text=Préventif"); pg.click("#item-CHK-P101 .rep.ok"); pg.wait_for_timeout(600)
    pg.click("#item-CHK-P102 .rep.nok"); pg.wait_for_timeout(300); pg.click("#item-CHK-P102 >> text=+ Usé")
    pg.locator("#item-CHK-P102").scroll_into_view_if_needed(); pg.evaluate("window.scrollBy(0, -150)")
    petits["preventif"] = pg.evaluate(AUDIT); pg.screenshot(path=OUT / "u3-preventif.png")
    pg.click(".rail >> text=Mécanique"); pg.click("[id='module-Distributeur'] >> text=Usé"); pg.wait_for_timeout(300)
    pg.locator("[id='module-Distributeur']").scroll_into_view_if_needed()
    petits["mecanique"] = pg.evaluate(AUDIT); pg.screenshot(path=OUT / "u4-mecanique.png")
    pg.click(".rail >> text=Système"); pg.click("text=Windows 10 IoT LTSC"); pg.click("text=ProTopas")
    petits["systeme"] = pg.evaluate(AUDIT); pg.screenshot(path=OUT / "u5-systeme.png")
    pg.click(".rail >> text=Clôture"); petits["cloture"] = pg.evaluate(AUDIT); pg.screenshot(path=OUT / "u6-cloture.png")
    for k, v in petits.items(): print(f"{k:15s} zones < 48 px : {v}")
    print("erreurs JS :", err); b.close()
