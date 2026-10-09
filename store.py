"""Oturum kalıcılığı: SQLite (tek dosya). Oturum JSON'a dönüştürülebilir bir sözlüktür.

Bellekte önbellek tutulur, her değişiklikte SQLite'a yazılır; sunucu yeniden başlarsa oturumlar geri gelir.
Yol: IKIZ_DB ortam değişkeni (varsayılan ikiz.db). Railway'de kalıcı bir volume'a bağlayın.
"""
from __future__ import annotations

import json
import os
import sqlite3
import threading
import time

_lock = threading.RLock()
_cache: dict[str, dict] = {}
_locks: dict[str, threading.RLock] = {}
_conn: sqlite3.Connection | None = None


def _db() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = sqlite3.connect(os.environ.get("IKIZ_DB", "ikiz.db"), check_same_thread=False)
        _conn.execute("CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated REAL NOT NULL)")
        _conn.commit()
    return _conn


def reset(db_path: str | None = None) -> None:
    """Testler için: bağlantıyı ve önbelleği sıfırlar."""
    global _conn
    with _lock:
        if _conn is not None:
            _conn.close()
        _conn = None
        _cache.clear()
        _locks.clear()
        if db_path:
            os.environ["IKIZ_DB"] = db_path


def lock(sid: str) -> threading.RLock:
    with _lock:
        return _locks.setdefault(sid, threading.RLock())


def get(sid: str) -> dict | None:
    with _lock:
        if sid in _cache:
            return _cache[sid]
        row = _db().execute("SELECT data FROM sessions WHERE id=?", (sid,)).fetchone()
        if not row:
            return None
        _cache[sid] = json.loads(row[0])
        return _cache[sid]


def save(s: dict) -> None:
    with _lock:
        _cache[s["id"]] = s
        _db().execute("INSERT OR REPLACE INTO sessions (id, data, updated) VALUES (?,?,?)",
                      (s["id"], json.dumps(s, ensure_ascii=False), time.time()))
        _db().commit()


def delete(sid: str) -> bool:
    with _lock:
        _cache.pop(sid, None)
        _locks.pop(sid, None)
        cur = _db().execute("DELETE FROM sessions WHERE id=?", (sid,))
        _db().commit()
        return cur.rowcount > 0
