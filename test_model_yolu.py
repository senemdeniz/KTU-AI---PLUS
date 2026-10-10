"""Gerçek model yolunun uçtan uca testi (anahtar gerekmez).

Yerel, OpenAI uyumlu sahte bir model sunucusu açılır. "akilli" modda her ajanın istemini tanıyıp beklediği yapıda
cevap verir; diğer modlarda bozuk, boş, yanlış biçimli ya da hatalı yanıt döner. Böylece HTTP isteği, istemler,
JSON ayrıştırma, doğrulama ve yedek içeriğe düşme yolu, gerçek bir sağlayıcıya bağlanmadan sınanır.
"""
import collections
import json
import os
import tempfile
import threading
import uuid
from dataclasses import asdict
from http.server import BaseHTTPRequestHandler, HTTPServer

os.environ.update(AJAN_SENKRON="1", AJAN_GECIKME="0", IKIZ_AG_KAPALI="1", IKIZ_GIRIS_LIMIT="100000",
                  IKIZ_YAZMA_LIMIT="100000", IKIZ_GENEL_LIMIT="100000")
os.environ.setdefault("IKIZ_DB", os.path.join(tempfile.mkdtemp(), "t.db"))

import pytest
from fastapi.testclient import TestClient

import gozlemevi as g  # noqa: F401  (istemler yüklensin)
import ikiz_ajan as ia
import kaynak_avcisi as ka
import konu_bekcisi as kb
import ogret_ajani as oa
import server

SAYAC: collections.Counter = collections.Counter()


def _akilli(system: str, payload: dict) -> dict:
    ia_istemleri = {ia.PROFILE_EXTRACTOR: "Astronom", ia.GOAL_SELECTOR: "Kutup Yıldızı", ia.ROADMAP_PLANNER: "Haritacı",
                    ia.FEEDBACK_COACH: "Rehber", ia.TWIN_VOICE: "İkiz", ia.REPLANNER: "Yörüngeci",
                    ia.PLAN_OPTIMIZER: "Yörüngeci"}
    for istem, ajan in ia_istemleri.items():
        if system == istem:
            SAYAC[ajan] += 1
            return ia._mock(istem, payload)
    if system == oa.KASIF_ANLATIM:                           # sorular kullanıcının cümlelerine dayanır
        SAYAC["Kaşif"] += 1
        assert payload["anlatim"], "Kaşif kullanıcının cümlelerini almalı"
        return {"questions": [{**asdict(q), "hedef": [1]} for q in (oa._demo_kavram_sinavi(payload["kavram"]) or oa._demo_exam(payload["topic"]))]}
    if system == oa.KASIF_SINAV:
        SAYAC["Kaşif"] += 1
        return {"questions": [asdict(q) for q in (oa._demo_kavram_sinavi(payload["task"]) or oa._demo_exam(payload["topic"]))]}
    if system == oa.IKIZ_SINAV:
        SAYAC["İkiz"] += 1
        return {"answers": [{"question_id": q["id"], "answer": payload["anlatim"]["1"], "cited": [1]} for q in payload["sorular"]]}
    if system == oa.HAKEM:
        SAYAC["Hakem"] += 1
        return {"verdicts": [{"question_id": q["id"], "result": "dogru" if i == 0 else "eksik", "hint": None if i == 0 else "Bir örnek ekler misin?"}
                             for i, q in enumerate(payload["sorular"])]}
    if system == kb.BEKCI:
        SAYAC["Konu Bekçisi"] += 1
        return {"ilgili": True, "neden": "Anlatım konuyla ilgili."}
    if system == ka._PROMPT:
        SAYAC["Kaynak Avcısı"] += 1
        return {"yaklasim": "Önce temel kavramlar.", "oneriler": [{"baslik": "Ders notları", "tur": "ders", "neden": "Sistemli.", "sorgu": "lecture notes"}]}
    if system == g.GOZLEMEVI_PROMPT:
        SAYAC["Gözlemevi"] += 1
        m = payload["message"].lower()
        isler = [i for i, k in (("sinav_plani", "vize"), ("mini_sinav", "mini"), ("kaynak", "kaynak"), ("hafiflet", "yoğun"), ("optimize", "optimize")) if k in m]
        return {"isler": isler, "alan": None, "gerekce": "Görevi okudum ve uygun ajanlara verdim."}
    if system == g.SOHBET_YONLENDIR_PROMPT:
        SAYAC["Gözlemevi"] += 1
        return {"ajan": "Gözcü", "neden": "İlerleme sorusu."}
    if '{"cevap": str}' in system:
        SAYAC["sohbet"] += 1
        return {"cevap": "Planın iyi gidiyor; bugün tek görevini bitir."}
    SAYAC["bilinmeyen"] += 1
    return {}


def _sunucu(mod: str) -> HTTPServer:
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            assert self.headers["Authorization"] == "Bearer test-anahtari"
            istek = json.loads(self.rfile.read(int(self.headers["content-length"])))
            if mod == "hata":
                self.send_response(500); self.end_headers(); self.wfile.write(b"sunucu hatasi"); return
            system, payload = istek["messages"][0]["content"], json.loads(istek["messages"][1]["content"])
            icerik = {"akilli": lambda: "```json\n" + json.dumps(_akilli(system, payload), ensure_ascii=False) + "\n```",
                      "bos": lambda: "{}", "bozuk": lambda: "bu bir JSON değil",
                      "yanlis_bicim": lambda: json.dumps({"x": 1, "candidates": "yok", "tasks": 5, "questions": [{"a": 1}]})}[mod]()
            govde = json.dumps({"choices": [{"message": {"content": icerik}}]}).encode()
            self.send_response(200); self.send_header("content-type", "application/json"); self.end_headers(); self.wfile.write(govde)

    s = HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


def _tam_akis(c: TestClient) -> list[dict]:
    c.post("/v2/auth/register", json={"kullanici": "m" + uuid.uuid4().hex[:10], "sifre": "gizli-sifre-1"})
    sid = c.post("/v2/sessions", json={"ad": "Ada", "akademik": "Veri Yapıları", "hobi": "İspanyolca"}).json()["session_id"]
    v = c.get(f"/v2/sessions/{sid}").json()
    assert v["durum"] == "hazir" and all(a["hazir"] for a in v["alanlar"])
    assert c.post(f"/v2/sessions/{sid}/tracks", json={"tur": "akademik", "konu": "Olasılık"}).status_code == 200
    assert c.post(f"/v2/sessions/{sid}/demo/skip", json={"gun": 4, "tutarlilik": 0.2}).status_code == 200
    for metin in ("Bu hafta yoğunum, planı hafiflet", "Mini sınav hazırla", "Kaynak öner", "Planımı ilerlememe göre yeniden optimize et"):
        assert c.post(f"/v2/sessions/{sid}/assign", json={"metin": metin}).status_code == 200
    for p in c.get(f"/v2/sessions/{sid}").json()["oneriler"]:          # optimizasyon önerisi onaylanabilir
        assert c.post(f"/v2/sessions/{sid}/proposals/{p['id']}/approve").status_code == 200
    assert c.post(f"/v2/sessions/{sid}/chat", json={"metin": "Planım nasıl gidiyor?"}).status_code == 200
    a = c.get(f"/v2/sessions/{sid}").json()["alanlar"][0]
    k = next(y for y in a["ikiz"]["yildizlar"] if y["acik"])
    assert c.post(f"/v2/sessions/{sid}/teach/select", json={"alan": a["alan"], "kavram": k["id"]}).status_code == 200
    assert c.post(f"/v2/sessions/{sid}/teach/add", json={"alan": a["alan"],
                  "metin": "Bağlı listede her düğüm bir sonraki düğümü işaret eder. İndeksle doğrudan erişim yoktur."}).status_code == 200
    assert c.post(f"/v2/sessions/{sid}/teach/exam", json={"gorev_id": k["id"]}).status_code == 200
    for ajan in [x["ad"] for x in v["ajanlar"]]:
        assert c.get(f"/v2/sessions/{sid}/agents/{ajan}/output").status_code == 200
    assert c.patch(f"/v2/sessions/{sid}/profile", json={"sure": 30, "seviye": "orta"}).status_code == 200
    assert c.post(f"/v2/sessions/{sid}/day/close").status_code == 200
    return c.get(f"/v2/sessions/{sid}/events?after=0").json()["olaylar"]


@pytest.fixture
def model(monkeypatch):
    def ac(mod: str):
        s = _sunucu(mod)
        monkeypatch.delenv("LLM_PROVIDER", raising=False)
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        monkeypatch.delenv("HF_TOKEN", raising=False)
        monkeypatch.setenv("LLM_API_KEY", "test-anahtari")
        monkeypatch.setenv("LLM_BASE_URL", f"http://127.0.0.1:{s.server_port}/v1")
        monkeypatch.setenv("LLM_MODEL", "test-modeli")
        monkeypatch.setenv("LLM_YENIDEN_DENEME", "0")            # "hata" modunda testi bekletmesin
        return s
    return ac


def test_tum_ajanlar_gercek_model_yolundan_calisir(model):
    s = model("akilli")
    SAYAC.clear()
    c = TestClient(server.app, headers={"X-Ikiz": "1"})
    assert c.get("/health").json()["demo"] is False
    olaylar = _tam_akis(c)
    s.shutdown()
    assert [e["mesaj"] for e in olaylar if e["tur"] == "error"] == []
    assert set(SAYAC) >= {"Gözlemevi", "Astronom", "Kutup Yıldızı", "Haritacı", "Kaynak Avcısı", "Rehber", "Yörüngeci",
                          "Kaşif", "İkiz", "Hakem", "Konu Bekçisi", "sohbet"}
    assert SAYAC["bilinmeyen"] == 0


@pytest.mark.parametrize("mod", ["bos", "bozuk", "yanlis_bicim", "hata"])
def test_model_bozuk_yanit_verse_de_uygulama_cokmez(model, mod):
    s = model(mod)
    c = TestClient(server.app, headers={"X-Ikiz": "1"}, raise_server_exceptions=True)
    olaylar = _tam_akis(c)
    s.shutdown()
    assert any(e["tur"] == "error" for e in olaylar)   # kullanıcıya hazır içeriğe düşüldüğü söylenir
