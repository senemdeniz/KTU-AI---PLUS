"""İkiz API (v2): Gözlemevi çok-ajanlı sistemi için HTTP katmanı.

Çalıştır:  python3 -m uvicorn server:app --port 8000
Model anahtarı .env dosyasından okunur (bkz. .env.example); anahtar yoksa ajanlar demo içerikle çalışır.
Sözleşme: docs/API.md
"""
from __future__ import annotations

import asyncio
import datetime as dt
import json
import os
import re
import time

import ayar

ayar.yukle()   # .env, model sağlayıcısı seçilmeden önce okunmalı

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

import gozlemevi as g
import guvenlik as gv
import hesap
import ikiz_ajan as ia
import store

app = FastAPI(title="İkiz API", version="2.0")
# Arayüz aynı kökenden sunulur; başka kökenlere çerez gönderilmez (allow_credentials kapalı).
_IZIN = [o for o in os.environ.get("IKIZ_CORS", "").split(",") if o]
if _IZIN:
    app.add_middleware(CORSMiddleware, allow_origins=_IZIN, allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["Content-Type"])
CEREZ = "ikiz_giris"
_SID_YOLU = re.compile(r"^/v2/sessions/([0-9a-f]{32})(/|$)")

_CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
_SINIR: dict[str, list[float]] = {}
GENEL_LIMIT = int(os.environ.get("IKIZ_GENEL_LIMIT", 600))     # dakikada API isteği (istemci başına)
YAZMA_LIMIT = int(os.environ.get("IKIZ_YAZMA_LIMIT", 60))      # dakikada yazma isteği
GOVDE_LIMIT = 20_000                                            # en büyük gövde (bayt)
# Codespaces, Render gibi bir proxy arkasında herkes aynı IP'den görünür; IKIZ_PROXY=1 ise gerçek istemci
# adresi X-Forwarded-For başlığının ilk değerinden okunur. Proxy yokken bu başlığa güvenilmez (sahtelenebilir).
PROXY_ARKASINDA = os.environ.get("IKIZ_PROXY") == "1"


def istemci(request: Request) -> str:
    if PROXY_ARKASINDA and (xff := request.headers.get("x-forwarded-for")):
        return xff.split(",")[0].strip()[:64]
    return request.client.host if request.client else "?"


def _sinir_asildi(anahtar: str, limit: int, simdi: float) -> bool:
    k = [x for x in _SINIR.get(anahtar, []) if simdi - x < 60]
    if len(k) >= limit:
        _SINIR[anahtar] = k
        return True
    k.append(simdi)
    _SINIR[anahtar] = k
    if len(_SINIR) > 20_000:                                    # bellek sınırı: eski kayıtları at
        for a in [a for a, v in _SINIR.items() if not v or simdi - v[-1] > 60]:
            _SINIR.pop(a, None)
    return False


def _sahip_kontrolu(sid: str, cerez: str | None) -> bool:
    s = store.get(sid)
    return not (s and s.get("sahip") and s["sahip"] != hesap.kim(cerez))


@app.middleware("http")
async def koruma(request: Request, call_next):
    ip = istemci(request)
    simdi = time.time()
    yazma = request.method in ("POST", "PATCH", "DELETE")
    if request.url.path.startswith("/v2/"):                     # statik dosyalar (arayüz) sınıra sayılmaz
        if _sinir_asildi(ip + ":g", GENEL_LIMIT, simdi) or (yazma and _sinir_asildi(ip + ":w", YAZMA_LIMIT, simdi)):
            return JSONResponse({"detail": "Çok fazla istek. Biraz bekle."}, status_code=429, headers={"Retry-After": "30"})
    # CSRF: çerez SameSite=Lax; ek olarak yazma istekleri arayüzün eklediği özel başlığı taşımalı. Başka bir site
    # bu başlığı CORS ön onayı olmadan ekleyemez. Proxy (Codespaces, Render) arkasında da çalışır.
    if yazma and request.url.path.startswith("/v2/") and (
            request.headers.get("x-ikiz") != "1" or request.headers.get("sec-fetch-site") == "cross-site"):
        return JSONResponse({"detail": "Bu istek başka bir siteden geldiği için reddedildi."}, status_code=403)
    # Hesaba bağlı bir gökyüzüne yalnızca sahibi erişir (misafir/demo gökyüzleri hariç).
    if (m := _SID_YOLU.match(request.url.path)):
        # Veritabanı işi olay döngüsünü bekletmesin diye iş parçacığında yapılır.
        if not await asyncio.to_thread(_sahip_kontrolu, m.group(1), request.cookies.get(CEREZ)):
            return JSONResponse({"detail": "Oturum bulunamadı"}, status_code=404)
    sinir = 6_000_000 if request.url.path.endswith("/teach/image") else 10_000_000 if request.url.path.endswith("/teach/audio") else GOVDE_LIMIT
    if int(request.headers.get("content-length") or 0) > sinir:
        return JSONResponse({"detail": "İstek çok büyük."}, status_code=413)
    resp = await call_next(request)
    resp.headers.update({"X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer",
                         "Content-Security-Policy": _CSP, "Permissions-Policy": "microphone=(self), camera=(), geolocation=()",
                         "Cache-Control": resp.headers.get("Cache-Control", "no-store")})
    return resp


class SonTarih(BaseModel):
    baslik: str = Field(max_length=80)
    tarih: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")

    @field_validator("tarih")
    @classmethod
    def gercek_tarih(cls, v: str) -> str:
        try:
            dt.date.fromisoformat(v)
        except ValueError as e:
            raise ValueError("Geçerli bir tarih değil") from e
        return v


def _ad_temizle(v: str | None) -> str | None:
    if v is None:
        return v
    v = v.strip()
    if not v:
        raise ValueError("Ad boş olamaz")
    return v


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
    avatar: int = Field(default=0, ge=0, le=3)
    misafir: bool = False   # giriş yapmadan izlenen canlı demo

    @field_validator("ad")
    @classmethod
    def ad_bos_olamaz(cls, v: str | None) -> str | None:
        return _ad_temizle(v)


class GunIstek(BaseModel):
    gun: int = Field(default=1, ge=1, le=21)
    tutarlilik: float = Field(default=0.4, ge=0, le=1)


class MetinIstek(BaseModel):
    metin: str = Field(max_length=1600)
    alan: str | None = Field(default=None, max_length=20)   # yoksa o an öğretilen takımyıldız


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
    return {"ok": True, "surum": "2.0", "demo": ia.is_mock(), "saglayici": ia.provider(), "model": ia.model_name(), "modeller": ia.modeller(), "yetenekler": ia.yetenekler()}


# ------------------------------------------------------------------ hesaplar
class HesapIstek(BaseModel):
    kullanici: str = Field(min_length=1, max_length=40)
    sifre: str = Field(min_length=1, max_length=200)


_GIRIS_DENEME: dict[str, list[float]] = {}
GIRIS_LIMIT = int(os.environ.get("IKIZ_GIRIS_LIMIT", 8))      # 15 dakikada hatalı giriş sayısı (IP ve kullanıcı başına)
KAYIT_LIMIT = int(os.environ.get("IKIZ_KAYIT_LIMIT", 30))     # 15 dakikada yeni hesap sayısı (IP başına)


def _deneme_asildi(*anahtarlar: str, limit: int | None = None) -> bool:
    simdi = time.time()
    for a in anahtarlar:
        _GIRIS_DENEME[a] = [t for t in _GIRIS_DENEME.get(a, []) if simdi - t < 900]
        if len(_GIRIS_DENEME[a]) >= (limit or GIRIS_LIMIT):
            return True
    return False


def _cerez_ver(request: Request, response: Response, kullanici: str) -> None:
    guvenli = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"
    response.set_cookie(CEREZ, hesap.giris_ac(kullanici), max_age=hesap.GIRIS_SURESI, httponly=True, samesite="lax", secure=guvenli, path="/")


def _ben(request: Request) -> dict:
    k = hesap.kim(request.cookies.get(CEREZ))
    return {"kullanici": k, "session_id": hesap.gokyuzu(k) if k else None}


@app.post("/v2/auth/register")
def kayit_ol(r: HesapIstek, request: Request, response: Response):
    ip = istemci(request)
    if _deneme_asildi("kayit:" + ip, limit=KAYIT_LIMIT):
        raise HTTPException(429, "Çok fazla deneme. 15 dakika sonra tekrar dene.")
    ok, sonuc = hesap.kayit(r.kullanici, r.sifre)
    if not ok:
        raise HTTPException(409 if "alınmış" in sonuc else 422, sonuc)
    _GIRIS_DENEME.setdefault("kayit:" + ip, []).append(time.time())   # yalnızca açılan hesaplar sayılır
    _cerez_ver(request, response, sonuc)
    return {"kullanici": sonuc, "session_id": None}


@app.post("/v2/auth/login")
def giris_yap(r: HesapIstek, request: Request, response: Response):
    ip = istemci(request)
    k = hesap.normalize(r.kullanici)
    if _deneme_asildi("ip:" + ip, "k:" + k):
        raise HTTPException(429, "Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.")
    kullanici = hesap.dogrula(r.kullanici, r.sifre)
    if not kullanici:
        for a in ("ip:" + ip, "k:" + k):
            _GIRIS_DENEME.setdefault(a, []).append(time.time())
        raise HTTPException(401, "Kullanıcı adı ya da şifre yanlış.")
    _cerez_ver(request, response, kullanici)
    return {"kullanici": kullanici, "session_id": hesap.gokyuzu(kullanici)}


@app.post("/v2/auth/logout")
def cikis_yap(request: Request, response: Response):
    hesap.giris_kapat(request.cookies.get(CEREZ))
    response.delete_cookie(CEREZ, path="/")
    return {"ok": True}


@app.get("/v2/auth/me")
def ben(request: Request):
    return _ben(request)


@app.delete("/v2/auth/account")
def hesabi_sil(request: Request, response: Response):
    k = hesap.kim(request.cookies.get(CEREZ))
    if not k:
        raise HTTPException(401, "Giriş yapmadın.")
    hesap.hesap_sil(k)
    response.delete_cookie(CEREZ, path="/")
    return {"ok": True}


# ------------------------------------------------------------------ gökyüzü
@app.post("/v2/sessions")
def oturum_ac(r: OturumIstek, request: Request):
    kullanici = None if r.misafir else hesap.kim(request.cookies.get(CEREZ))   # canlı demo hesaba yazılmaz
    if not kullanici and not r.misafir:
        raise HTTPException(401, "Gökyüzünü kaydetmek için önce kayıt ol ya da giriş yap.")
    if not r.akademik and not r.hobi:
        raise HTTPException(422, "En az bir alan seç: akademik veya hobi")
    for alan_metni in (r.ad, r.akademik or "", r.hobi or "", r.hedef_notu, *[d.baslik for d in r.son_tarihler]):
        d = gv.alan_denetle(alan_metni) if alan_metni.strip() else None
        if d and not d.izin:
            raise HTTPException(422, d.mesaj or "Bu alan kabul edilmedi")
    if not kullanici:
        store.eski_misafirleri_sil()
        sid = g.yeni_oturum(r.ad, r.akademik, r.hobi, r.dakika, r.zaman, [d.model_dump() for d in r.son_tarihler], r.seviye,
                            r.hedef_notu, r.sure, r.avatar)
    else:
        with hesap.kullanici_kilidi(kullanici):                   # çift tıklama iki gökyüzü açmasın
            if hesap.gokyuzu(kullanici):
                raise HTTPException(409, "Zaten bir gökyüzün var. Yeni konu için takımyıldız ekle.")
            sid = g.yeni_oturum(r.ad, r.akademik, r.hobi, r.dakika, r.zaman, [d.model_dump() for d in r.son_tarihler], r.seviye,
                                r.hedef_notu, r.sure, r.avatar, sahip=kullanici)
            hesap.gokyuzu_bagla(kullanici, sid)
    g._calistir(g.kurulum, sid)
    return {"session_id": sid}


@app.get("/v2/sessions/{sid}")
def oturum(sid: str):
    _var(sid)
    return g.gorunum(sid)


@app.delete("/v2/sessions/{sid}")
def oturum_sil(sid: str):
    s = _var(sid)
    if s.get("sahip"):
        hesap.gokyuzu_bagla(s["sahip"], None)
    store.delete(sid)
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
    p = g.oneriyi_karara_bagla(sid, pid, True)
    if p is None:
        raise HTTPException(404, "Öneri bulunamadı")
    if p["durum"] == "eskidi":
        raise HTTPException(409, "Bu öneri hazırlandıktan sonra planın değişti; uygulanmadı. İstersen ekipten yeniden iste.")
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
    avatar: int | None = Field(default=None, ge=0, le=3)

    @field_validator("ad")
    @classmethod
    def ad_bos_olamaz(cls, v: str | None) -> str | None:
        return _ad_temizle(v)


@app.patch("/v2/sessions/{sid}/profile")
def profil(sid: str, r: ProfilIstek):
    _var(sid)
    for metin in (r.ad or "", r.hedef_notu or "", *[d.baslik for d in (r.son_tarihler or [])]):
        d = gv.alan_denetle(metin) if metin.strip() else None
        if d and not d.izin:
            raise HTTPException(422, d.mesaj or "Bu alan kabul edilmedi")
    out = g.profil_guncelle(sid, {"ad": r.ad, "dakika": r.dakika, "zaman": r.zaman, "seviye": r.seviye, "not_": r.hedef_notu, "sure": r.sure, "avatar": r.avatar,
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
    d = gv.alan_denetle(r.konu)
    if not d.izin:
        raise HTTPException(422, d.mesaj or "Bu konu kabul edilmedi")
    out = g.takimyildiz_ekle(sid, r.tur, r.konu.strip())
    if not out["ok"]:
        raise HTTPException(409, out["mesaj"])
    return out


class IkizAdIstek(BaseModel):
    ad: str = Field(min_length=2, max_length=20)


@app.patch("/v2/sessions/{sid}/tracks/{alan}/twin")
def ikiz_adlandir(sid: str, alan: str, r: IkizAdIstek):
    _var(sid)
    ad = gv.temizle(r.ad).strip()
    if not re.fullmatch(r"[A-Za-zÇĞİÖŞÜçğıöşü][A-Za-zÇĞİÖŞÜçğıöşü' -]{1,19}", ad):
        raise HTTPException(422, "İkiz adı yalnızca harflerden oluşmalı (2–20 karakter).")
    d = gv.alan_denetle(ad)
    if not d.izin:
        raise HTTPException(422, d.mesaj or "Bu ad kabul edilmedi")
    out = g.ikiz_adlandir(sid, alan, ad)
    if not out["ok"]:
        raise HTTPException(409, out["mesaj"])
    return g.gorunum(sid)


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



class SecIstek(BaseModel):
    alan: str = Field(max_length=20)
    kavram: str | None = Field(default=None, max_length=40)


@app.post("/v2/sessions/{sid}/teach/select")
def ogret_sec(sid: str, r: SecIstek):
    _var(sid)
    out = g.ogret_sec(sid, r.alan, r.kavram)
    if not out["ok"]:
        raise HTTPException(404, out["mesaj"])
    return g.gorunum(sid)


class KaynakIstek(BaseModel):
    alan: str = Field(max_length=20)
    baslik: str = Field(min_length=2, max_length=120)
    url: str | None = Field(default=None, max_length=500)
    tur: str = Field(default="Diğer", max_length=30)
    not_: str = Field(default="", max_length=200, alias="not")
    model_config = {"populate_by_name": True}


@app.post("/v2/sessions/{sid}/sources")
def kaynak_ekle(sid: str, r: KaynakIstek):
    _var(sid)
    out = g.kaynak_ekle(sid, r.alan, r.baslik, (r.url or "").strip() or None, r.tur, r.not_)
    if not out["ok"]:
        raise HTTPException(422, out["mesaj"])
    return out


@app.delete("/v2/sessions/{sid}/sources/{alan}/{kid}")
def kaynak_sil(sid: str, alan: str, kid: str):
    _var(sid)
    if not g.kaynak_sil(sid, alan, kid)["ok"]:
        raise HTTPException(404, "Kaynak bulunamadı")
    return {"ok": True}


class BirincilIstek(BaseModel):
    alan: str = Field(max_length=20)
    kaynak_id: str | None = Field(default=None, max_length=20)


@app.post("/v2/sessions/{sid}/sources/primary")
def kaynak_birincil(sid: str, r: BirincilIstek):
    _var(sid)
    if not g.kaynak_birincil(sid, r.alan, r.kaynak_id)["ok"]:
        raise HTTPException(404, "Kaynak bulunamadı")
    return {"ok": True}


class KontrolIstek(BaseModel):
    alan: str = Field(max_length=20)


@app.post("/v2/sessions/{sid}/sources/check")
def kaynak_kontrol(sid: str, r: KontrolIstek):
    _var(sid)
    out = g.kaynak_kontrol(sid, r.alan)
    if not out["ok"]:
        raise HTTPException(404, out["mesaj"])
    return out



_GORSEL_IMZA = {"image/jpeg": b"\xff\xd8\xff", "image/png": b"\x89PNG", "image/webp": b"RIFF"}


class GorselIstek(BaseModel):
    alan: str = Field(max_length=20)
    mime: str = Field(pattern="^image/(jpeg|png|webp)$")
    veri: str = Field(max_length=5_600_000)


@app.post("/v2/sessions/{sid}/teach/image")
def ogret_gorsel(sid: str, r: GorselIstek):
    _var(sid)
    import base64, binascii
    try:
        ham = base64.b64decode(r.veri, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, "Görüntü okunamadı.")
    if not ham.startswith(_GORSEL_IMZA[r.mime]) or len(ham) > 4_000_000:
        raise HTTPException(422, "Geçerli bir JPEG/PNG/WebP görüntü yükle (en fazla 4 MB).")
    out = g.gorselden_cumleler(sid, r.alan, r.veri, r.mime)
    if not out["ok"]:
        raise HTTPException(409, out["mesaj"])
    return out


class SesIstek(BaseModel):
    mime: str = Field(pattern="^audio/(webm|ogg|mp4|mpeg|wav|x-wav)(;.*)?$", max_length=60)
    veri: str = Field(max_length=9_500_000)


@app.post("/v2/sessions/{sid}/teach/audio")
def ogret_ses(sid: str, r: SesIstek):
    _var(sid)
    import base64, binascii
    try:
        ham = base64.b64decode(r.veri, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, "Ses kaydı okunamadı.")
    if len(ham) > 7_000_000 or len(ham) < 1000:
        raise HTTPException(422, "Ses kaydı çok uzun ya da çok kısa.")
    out = g.sesten_metin(sid, ham, r.mime)
    if not out["ok"]:
        raise HTTPException(409, out["mesaj"])
    return out


# Web arayüzü (aynı kökenden servis edilir; API ile aynı sunucu)
_WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
if os.path.isdir(_WEB):
    app.mount("/", StaticFiles(directory=_WEB, html=True), name="web")
