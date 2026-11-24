from pathlib import Path
import re
from preparer_referentiel import preparer, normaliser_sn, est_wincor, normaliser_ville

FIX = Path(__file__).parent / "fixtures"


def test_filtre_wincor_villes():
    r = preparer(FIX)
    codes = {d["code_dab"] for d in r.dab}
    assert codes == {"BGFI-BZV-01", "BGFI-PNR-01", "UBA-BZV-02"}
    assert normaliser_ville("Pte-Noire") == "Pointe-Noire"
    assert normaliser_ville("PNR") == "Pointe-Noire"
    assert normaliser_ville("BZV") == "Brazzaville"
    assert est_wincor("Diebold Nixdorf", "ProCash 2050xe")
    assert not est_wincor("NCR", "SelfServ 22")


def test_sn_normalise():
    assert normaliser_sn(" ab 12-3 ") == "AB12-3"
    assert normaliser_sn("") is None
    assert normaliser_sn(None) is None
    r = preparer(FIX)
    d = next(x for x in r.dab if x["code_dab"] == "BGFI-BZV-01")
    assert d["numero_serie"] == "AB12-3"


def test_checklist_actifs():
    r = preparer(FIX)
    ids = {c["id"] for c in r.checklist}
    assert len(ids) == 33
    assert "CHK-C01" not in ids and "CHK-P01" not in ids
    assert "CHK-P115" in ids


def test_doublons_signales():
    r = preparer(FIX)
    assert sum(1 for d in r.dab if d["code_dab"] == "UBA-BZV-02") == 1
    assert any("UBA-BZV-02" in a and "double" in a for a in r.anomalies)


def test_sql_idempotent():
    r = preparer(FIX)
    for table in ("banques", "sites", "dab", "checklist_items", "articles"):
        assert re.search(rf"insert into {table} .*on conflict .* do update", r.sql, re.S), table
    assert "'AB12-3'" in r.sql
    assert "l''alcool" in r.sql  # apostrophes échappées


def test_compte():
    r = preparer(FIX)
    assert r.compte == {"Brazzaville": 2, "Pointe-Noire": 1}
