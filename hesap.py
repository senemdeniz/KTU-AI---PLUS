"""Hesaplar: kullanıcı adı + şifre ile kayıt ve giriş.

- Şifreler scrypt ile tuzlanıp özetlenir; düz metin hiçbir yerde saklanmaz.
- Giriş, rastgele bir belirteçle (HttpOnly çerez) tutulur; veritabanında yalnızca belirtecin SHA-256 özeti durur.
- Her hesabın tek bir gökyüzü (oturum) vardır; takımyıldızlar bu gökyüzünün içindedir.
- Veritabanına yalnızca store.sorgu / store.yaz ile erişilir (kilitli; bkz. store.py).
"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import sqlite3
import threading
import time

import store

GIRIS_SURESI = 30 * 24 * 3600          # 30 gün
KULLANICI_DESENI = re.compile(r"^[a-z0-9_.]{3,24}$")
_SCRYPT = {"n": 2 ** 14, "r": 8, "p": 1, "dklen": 32}
_SAHTE_TUZ = secrets.token_bytes(16)    # var olmayan kullanıcıda da aynı süreyi harcamak için
_kilitler: dict[str, threading.Lock] = {}
_kilitler_kilidi = threading.Lock()


def kullanici_kilidi(kullanici: str) -> threading.Lock:
    """Aynı hesap için eşzamanlı 'gökyüzü aç' isteklerini sıraya koyar."""
    with _kilitler_kilidi:
        return _kilitler.setdefault(kullanici, threading.Lock())


def _ozet(sifre: str, tuz: bytes) -> bytes:
    return hashlib.scrypt(sifre.encode("utf-8"), salt=tuz, **_SCRYPT)


def _belirtec_ozeti(belirtec: str) -> str:
    return hashlib.sha256(belirtec.encode()).hexdigest()


def normalize(kullanici: str) -> str:
    return kullanici.strip().lower()


def sifre_sorunu(sifre: str) -> str | None:
    if len(sifre) < 8:
        return "Şifre en az 8 karakter olmalı."
    if len(sifre) > 128:
        return "Şifre en fazla 128 karakter olabilir."
    if sifre.isdigit() or sifre.isalpha():
        return "Şifrede hem harf hem rakam (ya da işaret) olsun."
    return None


def kayit(kullanici: str, sifre: str) -> tuple[bool, str]:
    k = normalize(kullanici)
    if not KULLANICI_DESENI.match(k):
        return False, "Kullanıcı adı 3–24 karakter olmalı; yalnızca küçük harf, rakam, nokta ve alt çizgi."
    if (sorun := sifre_sorunu(sifre)):
        return False, sorun
    tuz = secrets.token_bytes(16)
    ozet = _ozet(sifre, tuz)                         # yavaş işlem kilidin dışında
    try:
        store.yaz("INSERT INTO hesaplar (kullanici, tuz, ozet, sid, olusturma) VALUES (?,?,?,?,?)",
                  (k, tuz, ozet, None, time.time()))
    except sqlite3.IntegrityError:
        return False, "Bu kullanıcı adı alınmış."
    return True, k


def dogrula(kullanici: str, sifre: str) -> str | None:
    """Doğruysa normalize kullanıcı adını döndürür. Yanlış ad ile yanlış şifre aynı süreyi harcar."""
    k = normalize(kullanici)
    satir = store.sorgu("SELECT tuz, ozet FROM hesaplar WHERE kullanici=?", (k,))
    if not satir:
        _ozet(sifre[:128], _SAHTE_TUZ)
        return None
    tuz, ozet = satir[0]
    return k if hmac.compare_digest(_ozet(sifre[:128], tuz), ozet) else None


def giris_ac(kullanici: str) -> str:
    belirtec = secrets.token_urlsafe(32)
    store.yaz("DELETE FROM girisler WHERE bitis < ?", (time.time(),))
    store.yaz("INSERT INTO girisler (belirtec, kullanici, bitis) VALUES (?,?,?)",
              (_belirtec_ozeti(belirtec), kullanici, time.time() + GIRIS_SURESI))
    return belirtec


def kim(belirtec: str | None) -> str | None:
    if not belirtec or len(belirtec) > 100:
        return None
    satir = store.sorgu("SELECT kullanici, bitis FROM girisler WHERE belirtec=?", (_belirtec_ozeti(belirtec),))
    return satir[0][0] if satir and satir[0][1] > time.time() else None


def giris_kapat(belirtec: str | None) -> None:
    if belirtec:
        store.yaz("DELETE FROM girisler WHERE belirtec=?", (_belirtec_ozeti(belirtec),))


def gokyuzu(kullanici: str) -> str | None:
    satir = store.sorgu("SELECT sid FROM hesaplar WHERE kullanici=?", (kullanici,))
    sid = satir[0][0] if satir else None
    return sid if sid and store.get(sid) else None


def gokyuzu_bagla(kullanici: str, sid: str | None) -> None:
    store.yaz("UPDATE hesaplar SET sid=? WHERE kullanici=?", (sid, kullanici))


def hesap_sil(kullanici: str) -> None:
    sid = gokyuzu(kullanici)
    if sid:
        store.delete(sid)
    store.yaz("DELETE FROM girisler WHERE kullanici=?", (kullanici,))
    store.yaz("DELETE FROM hesaplar WHERE kullanici=?", (kullanici,))
