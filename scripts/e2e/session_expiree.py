"""Jeton expiré + réouverture hors ligne : l'application reste utilisable. Usage : python3 session_expiree.py URL"""
import sys
from playwright.sync_api import sync_playwright
import parcours_commun as c

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 800, "height": 1280}, geolocation={"latitude": -4.2635, "longitude": 15.243},
                        permissions=["geolocation"], locale="fr-FR")
    etat = {"hors": False}
    def route(r):
        if etat["hors"]: return r.abort("internetdisconnected")
        return c.route(r)
    ctx.route("**/*supabase.co/**", route)
    pg = ctx.new_page(); err = []; pg.on("pageerror", lambda e: err.append(str(e)))
    pg.goto(sys.argv[1]); pg.fill("input[type=email]", "t@test"); pg.fill("input[type=password]", "x"); pg.click("button.principal")
    pg.wait_for_selector("text=TEST-BZV-01")
    pg.evaluate("""() => { for (const k of Object.keys(localStorage)) if (k.includes('auth-token')) {
        const s = JSON.parse(localStorage.getItem(k)); s.expires_at = 1; localStorage.setItem(k, JSON.stringify(s)); } }""")
    pg.close(); ctx.set_offline(True); etat["hors"] = True
    pg2 = ctx.new_page(); pg2.on("pageerror", lambda e: err.append(str(e)))
    pg2.goto(sys.argv[1]); pg2.wait_for_timeout(4000)
    corps = pg2.inner_text("body"); print("texte :", corps[:80].replace("\n", " | "))
    print("liste visible hors ligne :", "TEST-BZV-01" in corps, "| écran de connexion :", "Se connecter" in corps)
    print("bandeau :", pg2.inner_text(".etat-envoi") if pg2.query_selector(".etat-envoi") else None)
    print("erreurs JS :", err); b.close()
