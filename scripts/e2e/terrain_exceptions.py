"""Le consultant n'est jamais bloqué : DAB dans une ville hors liste avec une banque inconnue au sigle long,
puis relevé impossible terminé avec seulement un motif et une photo. Supabase simulé. Usage : python3 terrain_exceptions.py URL DOSSIER"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import parcours_commun as c

OUT = Path(sys.argv[2]); OUT.mkdir(exist_ok=True)
photo = str(Path(__file__).with_name("photo_test.jpg"))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 800, "height": 1280}, geolocation={"latitude": -1.0, "longitude": 16.9},
                        permissions=["geolocation"], locale="fr-FR", has_touch=True)
    ctx.route("**/*supabase.co/**", c.route)
    pg = ctx.new_page(); err = []; pg.on("pageerror", lambda e: err.append(str(e)))
    pg.goto(sys.argv[1]); pg.fill("input[type=email]", "t@test"); pg.fill("input[type=password]", "x"); pg.click("button.principal")
    pg.wait_for_selector("text=TEST-BZV-01")
    pg.click("button.bouton-nouveau"); pg.wait_for_selector("h1:has-text('Nouveau DAB')")
    pg.click("button:has-text('Autre banque')"); pg.fill("input >> nth=0", "Ecobank Congo")
    pg.click("button:has-text('Autre ville')"); pg.locator("label:has-text('Nom de la ville') input, label:has-text('Nom de la ville') + input").first.fill("mossaka") if pg.query_selector("label:has-text('Nom de la ville') input") else pg.locator("input").nth(1).fill("mossaka")
    pg.click("button:has-text('Saisir l’agence')"); pg.locator("input").nth(2).fill("Marché central")
    pg.wait_for_timeout(300)
    code = pg.inner_text(".code-calcule strong"); print("code calculé :", code)
    pg.screenshot(path=OUT / "1-nouveau-dab.png", full_page=True)
    pg.click("button:has-text('Créer et commencer')"); pg.click("button:has-text('Je suis arrivé')"); pg.wait_for_selector("text=Arrivée enregistrée")
    pg.click("button:has-text('Je ne peux pas faire le relevé de ce DAB')")
    pg.click("button:has-text('DAB retiré ou introuvable')")
    pg.locator("input[type=file]").first.set_input_files(photo); pg.wait_for_timeout(800)
    pg.screenshot(path=OUT / "2-releve-impossible.png", full_page=True)
    pg.click("button.pouce-terminer"); pg.wait_for_timeout(1500)
    sur_liste = pg.query_selector(".tournee") is not None
    ville_listee = pg.query_selector(".villes button:has-text('Mossaka')") is not None
    print("fiche terminée, retour liste :", sur_liste, "| ville Mossaka proposée dans la liste :", ville_listee)
    pg.wait_for_timeout(1500)
    print("envois :", sorted(set(c.envois)))
    print("erreurs JS :", err); b.close()
    assert code == "ECOBANKC-MOS-MARCHE-CENTRAL-1" and sur_liste and ville_listee and not err, "KO"
    print("OK")
