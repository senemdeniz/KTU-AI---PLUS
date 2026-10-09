"""Yapılandırma: proje klasöründeki .env dosyasını ortam değişkenlerine yükler (ek paket gerekmez).

Zaten tanımlı bir ortam değişkeninin üzerine yazılmaz; böylece terminalde verdiğin `export` her zaman önceliklidir.
"""
from __future__ import annotations

import os
from pathlib import Path


def yukle(yol: str | os.PathLike | None = None) -> list[str]:
    dosya = Path(yol) if yol else Path(__file__).with_name(".env")
    if not dosya.is_file():
        return []
    yuklenen = []
    for satir in dosya.read_text(encoding="utf-8").splitlines():
        satir = satir.strip()
        if not satir or satir.startswith("#") or "=" not in satir:
            continue
        anahtar, deger = satir.split("=", 1)
        anahtar = anahtar.removeprefix("export ").strip()
        deger = deger.strip()
        if len(deger) >= 2 and deger[0] == deger[-1] and deger[0] in "'\"":
            deger = deger[1:-1]
        elif " #" in deger:
            deger = deger.split(" #", 1)[0].rstrip()
        if anahtar and deger and anahtar not in os.environ:
            os.environ[anahtar] = deger
            yuklenen.append(anahtar)
    return yuklenen
