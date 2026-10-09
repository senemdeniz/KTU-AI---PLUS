"""Kalıcılık: SQLite (tek dosya). Oturum ("gökyüzü") JSON'a dönüştürülebilir bir sözlüktür.

- Bellekte önbellek tutulur, her değişiklik SQLite'a yazılır; sunucu yeniden başlarsa veriler geri gelir.
- Tek bir bağlantı birden çok iş parçacığından kullanılır (FastAPI iş havuzu + ajan iş parçacıkları). SQLite bağlantısı
  eşzamanlı kullanıma dayanıklı olmadığı için bağlantıya yapılan HER erişim `_lock` altında olmalıdır: diğer
  modüller bunun için yalnızca `sorgu()` ve `yaz()` kullanır.
- Silinen bir gökyüzü, o sırada çalışan bir ajan iş parçacığı tarafından yeniden yazılamaz (`_silinen`).

Yol: IKIZ_DB ortam değişkeni (varsayılan: proje klasöründeki ikiz.db).
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from pathlib import Path

_lock = threading.RLock()
_cache: dict[str, dict] = {}
_locks: dict[str, threading.RLock] = {}
_silinen: set[str] = set()
_conn: sqlite3.Connection | None = None

_SEMA = (
    "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated REAL NOT NULL)",
    "CREATE TABLE IF NOT EXISTS hesaplar (kullanici TEXT PRIMARY KEY, tuz BLOB NOT NULL, ozet BLOB NOT NULL, "
    "sid TEXT, olusturma REAL NOT NULL)",
    "CREATE TABLE IF NOT EXISTS girisler (belirtec TEXT PRIMARY KEY, kullanici TEXT NOT NULL, bitis REAL NOT NULL)",
)


def _yol() -> str:
    return os.environ.get("IKIZ_DB") or str(Path(__file__).with_name("ikiz.db"))


def _db() -> sqlite3.Connection:
    """Bağlantıyı açar. Yalnızca `_lock` tutulurken çağrılmalıdır."""
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(_yol(), check_same_thread=False)
        for komut in _SEMA:
            _conn.execute(komut)
        _conn.commit()
    return _conn


def sorgu(sql: str, args: tuple = ()) -> list[tuple]:
    with _lock:
        return _db().execute(sql, args).fetchall()


def yaz(sql: str, args: tuple = ()) -> int:
    """Tek bir yazma komutu; etkilenen satır sayısını döndürür."""
    with _lock:
        cur = _db().execute(sql, args)
        _db().commit()
        return cur.rowcount


def reset(db_path: str | None = None) -> None:
    """Testler için: bağlantıyı ve önbelleği sıfırlar."""
    global _conn
    with _lock:
        if _conn is not None:
            _conn.close()
        _conn = None
        _cache.clear()
        _locks.clear()
        _silinen.clear()
        if db_path:
            os.environ["IKIZ_DB"] = db_path


def lock(sid: str) -> threading.RLock:
    with _lock:
        return _locks.setdefault(sid, threading.RLock())


def get(sid: str) -> dict | None:
    with _lock:
        if sid in _silinen:
            return None
        if sid in _cache:
            return _cache[sid]
        row = _db().execute("SELECT data FROM sessions WHERE id=?", (sid,)).fetchone()
        if not row:
            return None
        _cache[sid] = json.loads(row[0])
        return _cache[sid]


def save(s: dict) -> None:
    with _lock:
        if s["id"] in _silinen:
            return                      # silinmiş bir gökyüzünü geride kalan bir ajan işi geri getiremez
        _cache[s["id"]] = s
        veri = json.dumps(s, ensure_ascii=False)
        _db().execute("INSERT OR REPLACE INTO sessions (id, data, updated) VALUES (?,?,?)", (s["id"], veri, time.time()))
        _db().commit()


def delete(sid: str) -> bool:
    with _lock:
        _cache.pop(sid, None)
        _silinen.add(sid)              # kilit (_locks) bırakılmaz: o an çalışan bir iş onu tutuyor olabilir
        cur = _db().execute("DELETE FROM sessions WHERE id=?", (sid,))
        _db().commit()
        return cur.rowcount > 0


def eski_misafirleri_sil(saat: float = 24) -> int:
    """Giriş yapmadan açılan demo gökyüzlerini bir gün sonra temizler."""
    with _lock:
        sinir = time.time() - saat * 3600
        rows = _db().execute("SELECT id FROM sessions WHERE json_extract(data, '$.misafir') = 1 AND updated < ?",
                             (sinir,)).fetchall()
        for (sid,) in rows:
            _cache.pop(sid, None)
            _silinen.add(sid)
        _db().execute("DELETE FROM sessions WHERE json_extract(data, '$.misafir') = 1 AND updated < ?", (sinir,))
        _db().commit()
        return len(rows)
