"""İkiz API (v2): Gözlemevi çok-ajanlı sistemi için HTTP katmanı.

Çalıştır:  uvicorn server:app --host 0.0.0.0 --port 8000
Ortam: ANTHROPIC_API_KEY | HF_TOKEN (+LLM_MODEL) | LLM_API_KEY+LLM_BASE_URL; yoksa demo modu. IKIZ_DB=kalıcı SQLite yolu.
Sözleşme: docs/API.md
"""
from __future__ import annotations

import asyncio
import json
import os
import re
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import gozlemevi as g
import guvenlik as gv
import ikiz_ajan as ia
import store

app = FastAPI(title="İkiz API", version="2.0")
# Kimlik bilgisi (cookie) kullanılmaz; oturum kimliği 128 bitlik gizli bir değerdir. Üretimde IKIZ_CORS ile kısıtla.
_IZIN = [o for o in os.environ.get("IKIZ_CORS", "*").split(",") if o]
app.add_middleware(CORSMiddleware, allow_origins=_IZIN, allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Content-Type"])

_CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
_SINIR: dict[str, list[float]] = {}
GENEL_LIMIT = int(os.environ.get("IKIZ_GENEL_LIMIT", 240))
YAZMA_LIMIT = int(os.environ.get("IKIZ_YAZMA_LIMIT", 45))
GOVDE_LIMIT = 20_000   # dakikada istek (IP başına) ve en büyük gövde (bayt)


@app.middleware("http")
async def koruma(request: Request, call_next):
    ip = request.client.host if request.client else "?"
    simdi = time.time()
    yazma = request.method in ("POST", "PATCH", "DELETE")
    for anahtar, limit in ((ip + ":g", GENEL_LIMIT), (ip + ":w", YAZMA_LIMIT)):
        if anahtar.endswith(":w") and not yazma:
            continue
        k = [x for x in _SINIR.get(anahtar, []) if simdi - x < 60]
        if len(k) >= limit:
            _SINIR[anahtar] = k
            return JSONResponse({"detail": "Çok fazla istek. Biraz bekle."}, status_code=429, headers={"Retry-After": "30"})
        k.append(simdi)
        _SINIR[anahtar] = k
    if int(request.headers.get("content-length") or 0) > GOVDE_LIMIT:
        return JSONResponse({"detail": "İstek çok büyük."}, status_code=413)
    resp = await call_next(request)
    resp.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer",
                         "Content-Security-Policy": _CSP, "Permissions-Policy": "microphone=(self), camera=(), geolocation=()",
                         "Cache-Control": resp.headers.get("Cache-Control", "no-store")})
    return resp


class SonTarih(BaseModel):
    baslik: str = Field(max_length=80)
    tarih: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")


class OturumIstek(BaseModel):
    ad: str = Field(default="Elif", max_length=40)
    akademik: str | None = Field(default=None, max_length=80)
    hobi: str | None = Field(default=None, max_length=80)
    dakika: int = Field(default=30, ge=10, le=240)
    zaman: str = Field(default="aksam", pattern="^(sabah|ogle|aksam)$")
    son_tarihler: list[SonTarih] = Field(default_factory=list, max_length=5)
    seviye: str = Field(default="baslangic", pattern="^(baslangic|orta|ileri)$")
    hedef_notu: str = Field(default="", max_length=200)
    sure: int = Field(default=21, ge=7, le=90)


class GunIstek(BaseModel):
    gun: int = Field(default=1, ge=1, le=21)
    tutarlilik: float = Field(default=0.4, ge=0, le=1)


class MetinIstek(BaseModel):
    metin: str = Field(max_length=1600)
    alan: str = "akademik"


class SohbetIstek(BaseModel):
    metin: str = Field(min_length=1, max_length=400)
    ajan: str | None = None
    alan: str | None = None


class KararIstek(BaseModel):
    pass


_SID = re.compile(r"^[0-9a-f]{32}$")


def _var(sid: str) -> dict:
    s = store.get(sid) if _SID.match(sid) else None
    if not s:
        raise HTTPException(404, "Oturum bulunamadı")
    return s


@app.get("/health")
def health():
    return {"ok": True, "surum": "2.0", "demo": ia.is_mock(), "saglayici": ia.provider(), "model": ia.model_name()}


@app.post("/v2/sessions")
def oturum_ac(r: OturumIstek):
    if not r.akademik and not r.hobi:
        raise HTTPException(422, "En az bir alan seç: akademik veya hobi")
    for alan_metni in (r.ad, r.akademik or "", r.hobi or "", r.hedef_notu, *[d.baslik for d in r.son_tarihler]):
        d = gv.denetle(alan_metni) if alan_metni.strip() else None
        if d and not d.izin:
            raise HTTPException(422, d.mesaj or "Bu alan kabul edilmedi")
    sid = g.yeni_oturum(r.ad, r.akademik, r.hobi, r.dakika, r.zaman, [d.model_dump() for d in r.son_tarihler], r.seviye, r.hedef_notu, r.sure)
    g._calistir(g.kurulum, sid)
    return {"session_id": sid}


@app.get("/v2/sessions/{sid}")
def oturum(sid: str):
    _var(sid)
    return g.gorunum(sid)


@app.delete("/v2/sessions/{sid}")
def oturum_sil(sid: str):
    if not _SID.match(sid) or not store.delete(sid):
        raise HTTPException(404, "Oturum bulunamadı")
    return {"ok": True}


@app.get("/v2/sessions/{sid}/events")
def olaylar(sid: str, after: int = 0):
    _var(sid)
    return g.olaylar(sid, after)


@app.get("/v2/sessions/{sid}/stream")
async def akis(sid: str, after: int = 0):
    _var(sid)

    async def gen():
        son = after
        bos = 0
        while True:
            o = g.olaylar(sid, son)
            if o is None:
                break
            for e in o["olaylar"]:
                son = e["id"]
                yield f"id: {e['id']}\nevent: olay\ndata: {json.dumps(e, ensure_ascii=False)}\n\n"
            if o["olaylar"]:
                bos = 0
            else:
                bos += 1
                yield ": ping\n\n"
                if o["durum"] == "hazir" and bos > 20:
                    break
            await asyncio.sleep(0.5)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@app.post("/v2/sessions/{sid}/tasks/{task_id}/complete")
def gorev_tamamla(sid: str, task_id: str, yapildi: bool = True):
    _var(sid)
    r = g.gorev_tamamla(sid, task_id, yapildi)
    if not r["ok"]:
        raise HTTPException(409, r["mesaj"])
    return g.gorunum(sid)


@app.post("/v2/sessions/{sid}/day/close")
def gun_kapat(sid: str):
    _var(sid)
    g._calistir(g.gun_kapat, sid, "gercek")
    return {"ok": True}


@app.post("/v2/sessions/{sid}/demo/skip")
def demo_atla(sid: str, r: GunIstek):
    _var(sid)
    g._calistir(g.gun_kapat, sid, "demo", r.gun, r.tutarlilik)
    return {"ok": True}


@app.post("/v2/sessions/{sid}/assign")
def gorev_ver(sid: str, r: MetinIstek):
    _var(sid)
    out = g.gorev_denetle_ve_planla(sid, r.metin)
    if not out["ok"]:
        return {"ok": False, "engel": out["engel"], "mesaj": out["mesaj"]}
    return out


@app.post("/v2/sessions/{sid}/proposals/{pid}/approve")
def onayla(sid: str, pid: str):
    _var(sid)
    if g.oneriyi_karara_bagla(sid, pid, True) is None:
        raise HTTPException(404, "Öneri bulunamadı")
    return g.gorunum(sid)


@app.post("/v2/sessions/{sid}/proposals/{pid}/reject")
def reddet(sid: str, pid: str):
    _var(sid)
    if g.oneriyi_karara_bagla(sid, pid, False) is None:
        raise HTTPException(404, "Öneri bulunamadı")
    return g.gorunum(sid)


@app.post("/v2/sessions/{sid}/teach/add")
def ogret_ekle(sid: str, r: MetinIstek):
    _var(sid)
    return g.ogret_ekle(sid, r.metin, r.alan)


@app.delete("/v2/sessions/{sid}/teach")
def ogret_sil(sid: str):
    _var(sid)
    g.ogret_sil(sid)
    return {"ok": True}


class SinavIstek(BaseModel):
    gorev_id: str | None = Field(default=None, max_length=40)


@app.post("/v2/sessions/{sid}/teach/exam")
def ogret_sinav(sid: str, r: SinavIstek | None = None):
    _var(sid)
    return g.ogret_sinav(sid, r.gorev_id if r else None)


@app.post("/v2/sessions/{sid}/chat")
def sohbet(sid: str, r: SohbetIstek):
    _var(sid)
    return g.sohbet(sid, r.metin, r.ajan, r.alan)


class ProfilIstek(BaseModel):
    ad: str | None = Field(default=None, min_length=1, max_length=40)
    dakika: int | None = Field(default=None, ge=10, le=240)
    zaman: str | None = Field(default=None, pattern="^(sabah|ogle|aksam)$")
    seviye: str | None = Field(default=None, pattern="^(baslangic|orta|ileri)$")
    hedef_notu: str | None = Field(default=None, max_length=200)
    sure: int | None = Field(default=None, ge=7, le=90)
    son_tarihler: list[SonTarih] | None = Field(default=None, max_length=5)


@app.patch("/v2/sessions/{sid}/profile")
def profil(sid: str, r: ProfilIstek):
    _var(sid)
    for metin in (r.ad or "", r.hedef_notu or "", *[d.baslik for d in (r.son_tarihler or [])]):
        d = gv.denetle(metin) if metin.strip() else None
        if d and not d.izin:
            raise HTTPException(422, d.mesaj or "Bu alan kabul edilmedi")
    out = g.profil_guncelle(sid, {"ad": r.ad, "dakika": r.dakika, "zaman": r.zaman, "seviye": r.seviye, "not_": r.hedef_notu, "sure": r.sure,
                                  "son_tarihler": [d.model_dump() for d in r.son_tarihler] if r.son_tarihler is not None else None})
    if not out["ok"]:
        raise HTTPException(409, out["mesaj"])
    return g.gorunum(sid)


class TakimyildizIstek(BaseModel):
    tur: str = Field(pattern="^(akademik|hobi)$")
    konu: str = Field(min_length=2, max_length=80)


@app.post("/v2/sessions/{sid}/tracks")
def takimyildiz(sid: str, r: TakimyildizIstek):
    _var(sid)
    d = gv.denetle(r.konu)
    if not d.izin:
        raise HTTPException(422, d.mesaj or "Bu konu kabul edilmedi")
    out = g.takimyildiz_ekle(sid, r.tur, r.konu.strip())
    if not out["ok"]:
        raise HTTPException(409, out["mesaj"])
    return out


class PratikIstek(BaseModel):
    alan: str = Field(max_length=20)
    beceri: str = Field(min_length=1, max_length=60)
    bpm: int | None = Field(default=None, ge=20, le=300)
    dakika: int = Field(default=10, ge=1, le=240)
    not_: str = Field(default="", max_length=200, alias="not")
    model_config = {"populate_by_name": True}


@app.post("/v2/sessions/{sid}/practice")
def pratik(sid: str, r: PratikIstek):
    _var(sid)
    out = g.pratik_ekle(sid, r.alan, r.beceri, r.bpm, r.dakika, r.not_)
    if not out["ok"]:
        raise HTTPException(422, out["mesaj"])
    return out


@app.get("/v2/sessions/{sid}/agents/{ajan}/output")
def ajan_ciktisi(sid: str, ajan: str):
    _var(sid)
    if ajan not in {a["ad"] for a in g.AJANLAR}:
        raise HTTPException(404, "Ajan bulunamadı")
    return g.ajan_ciktisi(sid, ajan)



@app.delete("/v2/sessions/{sid}/teach/sentences/{no}")
def ogret_cumle_sil(sid: str, no: int):
    _var(sid)
    out = g.ogret_cumle_sil(sid, no)
    if not out["ok"]:
        raise HTTPException(404, "Cümle bulunamadı")
    return out


# Web arayüzü (aynı kökenden servis edilir; API ile aynı sunucu)
_WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
if os.path.isdir(_WEB):
    app.mount("/", StaticFiles(directory=_WEB, html=True), name="web")
