"""İkiz API (v2): Gözlemevi çok-ajanlı sistemi için HTTP katmanı.

Çalıştır:  uvicorn server:app --host 0.0.0.0 --port 8000
Ortam: ANTHROPIC_API_KEY | HF_TOKEN (+LLM_MODEL) | LLM_API_KEY+LLM_BASE_URL; yoksa demo modu. IKIZ_DB=kalıcı SQLite yolu.
Sözleşme: docs/API.md
"""
from __future__ import annotations

import asyncio
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import gozlemevi as g
import ikiz_ajan as ia
import store

app = FastAPI(title="İkiz API", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


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


class GunIstek(BaseModel):
    gun: int = Field(default=1, ge=1, le=21)
    tutarlilik: float = Field(default=0.4, ge=0, le=1)


class MetinIstek(BaseModel):
    metin: str = Field(max_length=1600)
    alan: str = "akademik"


class KararIstek(BaseModel):
    pass


def _var(sid: str) -> dict:
    s = store.get(sid)
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
    sid = g.yeni_oturum(r.ad, r.akademik, r.hobi, r.dakika, r.zaman, [d.model_dump() for d in r.son_tarihler])
    g._calistir(g.kurulum, sid)
    return {"session_id": sid}


@app.get("/v2/sessions/{sid}")
def oturum(sid: str):
    _var(sid)
    return g.gorunum(sid)


@app.delete("/v2/sessions/{sid}")
def oturum_sil(sid: str):
    if not store.delete(sid):
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


@app.post("/v2/sessions/{sid}/teach/exam")
def ogret_sinav(sid: str):
    _var(sid)
    return g.ogret_sinav(sid)
