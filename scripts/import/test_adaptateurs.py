from pathlib import Path
import csv
from openpyxl import Workbook
from adaptateurs import convertir_collecte, convertir_articles
from preparer_referentiel import preparer

def classeur_collecte(chemin: Path):
    wb = Workbook(); ws = wb.active; ws.title = 'DAB'
    ws.append(['Banque', 'Code DAB', 'Agence / site', 'Ville', 'Adresse', 'Latitude', 'Longitude', 'Marque', 'Modèle', 'N° de série', 'Date', 'Préventif', 'Statut', 'Remarques'])
    ws.append(['Choisir dans la liste.', 'aide'] + [''] * 12)
    ws.append(['BGFI', 'BGF-BZV-001', 'Agence Centre-ville', 'Brazzaville', '', -4.2634, 15.2429, 'Hyosung', 'MoniMax 5600', 'HY5600-12345', '', 'Mensuelle', 'En service', ''])
    ws.append(['BGFI', 'GAB N 2 SIEGE', 'Siege', 'Brazzaville', '', None, None, 'Wincor', 'ProCash', None, None, None, 'En service', ''])
    ws.append(['BPC', 'BPC-PNR-3', 'Agence Port', 'Pointe-Noire', '', None, None, 'Wincor', 'ProCash', ' wn 77 ', None, None, 'En service', ''])
    ws.append(['UBA', None, 'Plateau', 'Brazzaville', '', None, None, None, None, None, None, None, None, ''])
    ws.append(['UBA', None, 'Plateau', 'Brazzaville', '', None, None, None, None, None, None, None, None, ''])
    ws.append(['BGFI', 'GAB-RETIRE', 'Ancienne agence', 'Brazzaville', '', None, None, 'Wincor', 'ProCash', None, None, None, 'Retiré', ''])
    ws.append(['BPC', 'BPC-DOL-1', 'Dolisie', 'Dolisie', '', None, None, 'Wincor', 'ProCash', None, None, None, 'En service', ''])
    b = wb.create_sheet('Banques'); b.append(['Banque', 'Nom complet']); b.append(['aide', 'aide'])
    b.append(['BGFI', 'BGFIBank Congo']); b.append(['BPC', 'Banque Postale du Congo']); b.append(['UBA', 'UBA Congo'])
    wb.save(chemin)

def test_collecte_vers_referentiel(tmp_path):
    classeur_collecte(tmp_path / 'c.xlsx')
    n = convertir_collecte(tmp_path / 'c.xlsx', tmp_path / 'dab.csv')
    lignes = list(csv.DictReader(open(tmp_path / 'dab.csv', encoding='utf-8')))
    assert n == len(lignes) == 6  # en-tête d'aide et DAB retiré exclus ; le filtre Wincor/ville se fait ensuite
    assert {l['banque_nom'] for l in lignes if l['banque_code'] == 'BPC'} == {'Banque Postale du Congo'}
    uba = [l for l in lignes if l['banque_code'] == 'UBA']
    assert [l['code_dab'] for l in uba] == ['UBA-BZV-PLATEAU-1', 'UBA-BZV-PLATEAU-2']  # codes générés, uniques
    assert all(l['marque'] == '' for l in uba)
    (tmp_path / 'checklist.csv').write_text('ItemID,TypeIntervention,Ordre,Libelle,Obligatoire,Modele,Module,Consigne,PhotoRequise,CommentaireRequis,Actif\n', encoding='utf-8')
    r = preparer(tmp_path)
    codes = {d['code_dab']: d for d in r.dab}
    assert set(codes) == {'GAB N 2 SIEGE', 'BPC-PNR-3', 'UBA-BZV-PLATEAU-1', 'UBA-BZV-PLATEAU-2'}  # Hyosung et Dolisie exclus
    assert codes['UBA-BZV-PLATEAU-1']['modele'] == 'Marque à vérifier sur place'
    assert codes['BPC-PNR-3']['numero_serie'] == 'WN77'

def test_articles(tmp_path):
    wb = Workbook(); ws = wb.active; ws.title = 'Articles'
    ws.append(['Reference', 'Designation', 'Categorie']); ws.append(['01750003214', 'Spécial electronic III', 'Pièce']); ws.append([None, 'vide', ''])
    wb.save(tmp_path / 'a.xlsx')
    assert convertir_articles(tmp_path / 'a.xlsx', tmp_path / 'articles.csv') == 1

def test_articles_filtres_par_constructeur(tmp_path):
    wb = Workbook(); ws = wb.active; ws.title = 'Articles'
    ws.append(['Reference', 'Designation', 'Categorie', 'Reparable', 'Serialise', 'PrixUnitaire', 'SeuilAlerte', 'PhotoArticle', 'Famille', 'Constructeur'])
    ws.append(['W1', 'Courroie', '', '', '', '', '', '', '', 'Wincor Nixdorf'])
    ws.append(['N1', 'Carte', '', '', '', '', '', '', '', 'NCR'])
    ws.append(['D1', 'Module', '', '', '', '', '', '', '', 'Diebold Nixdorf (DN Series)'])
    wb.save(tmp_path / 'a.xlsx')
    assert convertir_articles(tmp_path / 'a.xlsx', tmp_path / 'articles.csv', constructeurs=('wincor', 'diebold nixdorf')) == 2
