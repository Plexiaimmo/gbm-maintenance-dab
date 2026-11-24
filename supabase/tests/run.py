# Assemble un test (remplace \i par le contenu du fichier) pour l'envoyer via execute_sql
import sys, pathlib
d = pathlib.Path(__file__).parent
t = (d / sys.argv[1]).read_text()
print(t.replace("\\i 00_jeu.sql", (d / "00_jeu.sql").read_text()))
