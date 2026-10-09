"""Hesaplar: kullanıcı adı + şifre ile kayıt ve giriş.

- Şifreler scrypt ile tuzlanıp özetlenir; düz metin hiçbir yerde saklanmaz.
- Giriş, rastgele bir belirteçle (HttpOnly çerez) tutulur; veritabanında yalnızca belirtecin SHA-256 özeti durur.
- Her hesabın tek bir gökyüzü (oturum) vardır; takımyıldızlar bu gökyüzünün içindedir.
"""
from __future__ import annotations

import hashlib
import hmac
import re
import secrets
import time

import store

GIRIS_SURESI = 30 * 24 * 3600          # 30 gün
KULLANICI_DESENI = re.compile(r"^[a-z0-9_.]{3,24}$")
_SCRYPT = {"n": 2 ** 14, "r": 8, "p": 1, "dklen": 32}
_SAHTE_TUZ = secrets.token_bytes(16)    # var olmayan kullanıcıda da aynı süreyi harcamak için


def _tablolar() -> None:
    db = store._db()
    db.execute("CREATE TABLE IF NOT EXISTS hesaplar (kullanici TEXT PRIMARY KEY, tuz BLOB NOT NULL, ozet BLOB NOT NULL, "
               "sid TEXT, olusturma REAL NOT NULL)")
    db.execute("CREATE TABLE IF NOT EXISTS girisler (belirtec TEXT PRIMARY KEY, kullanici TEXT NOT NULL, bitis REAL NOT NULL)")
    db.commit()


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
    _tablolar()
    tuz = secrets.token_bytes(16)
    with store._lock:
        db = store._db()
        if db.execute("SELECT 1 FROM hesaplar WHERE kullanici=?", (k,)).fetchone():
            return False, "Bu kullanıcı adı alınmış."
        db.execute("INSERT INTO hesaplar (kullanici, tuz, ozet, sid, olusturma) VALUES (?,?,?,?,?)",
                   (k, tuz, _ozet(sifre, tuz), None, time.time()))
        db.commit()
    return True, k


def dogrula(kullanici: str, sifre: str) -> str | None:
    """Doğruysa normalize kullanıcı adını döndürür. Yanlış ad ile yanlış şifre aynı süreyi harcar."""
    _tablolar()
    k = normalize(kullanici)
    satir = store._db().execute("SELECT tuz, ozet FROM hesaplar WHERE kullanici=?", (k,)).fetchone()
    if not satir:
        _ozet(sifre[:128], _SAHTE_TUZ)
        return None
    return k if hmac.compare_digest(_ozet(sifre[:128], satir[0]), satir[1]) else None


def giris_ac(kullanici: str) -> str:
    _tablolar()
    belirtec = secrets.token_urlsafe(32)
    with store._lock:
        db = store._db()
        db.execute("DELETE FROM girisler WHERE bitis < ?", (time.time(),))
        db.execute("INSERT INTO girisler (belirtec, kullanici, bitis) VALUES (?,?,?)",
                   (_belirtec_ozeti(belirtec), kullanici, time.time() + GIRIS_SURESI))
        db.commit()
    return belirtec


def kim(belirtec: str | None) -> str | None:
    if not belirtec or len(belirtec) > 100:
        return None
    _tablolar()
    satir = store._db().execute("SELECT kullanici, bitis FROM girisler WHERE belirtec=?", (_belirtec_ozeti(belirtec),)).fetchone()
    return satir[0] if satir and satir[1] > time.time() else None


def giris_kapat(belirtec: str | None) -> None:
    if not belirtec:
        return
    _tablolar()
    with store._lock:
        store._db().execute("DELETE FROM girisler WHERE belirtec=?", (_belirtec_ozeti(belirtec),))
        store._db().commit()


def gokyuzu(kullanici: str) -> str | None:
    _tablolar()
    satir = store._db().execute("SELECT sid FROM hesaplar WHERE kullanici=?", (kullanici,)).fetchone()
    if not satir or not satir[0] or not store.get(satir[0]):
        return None
    return satir[0]


def gokyuzu_bagla(kullanici: str, sid: str | None) -> None:
    _tablolar()
    with store._lock:
        store._db().execute("UPDATE hesaplar SET sid=? WHERE kullanici=?", (sid, kullanici))
        store._db().commit()


def hesap_sil(kullanici: str) -> None:
    sid = gokyuzu(kullanici)
    if sid:
        store.delete(sid)
    with store._lock:
        db = store._db()
        db.execute("DELETE FROM girisler WHERE kullanici=?", (kullanici,))
        db.execute("DELETE FROM hesaplar WHERE kullanici=?", (kullanici,))
        db.commit()
