#!/usr/bin/env bash
# İkiz'i tek komutla çalıştırır (macOS / Linux):  ./baslat.sh
# İlk çalıştırmada sanal ortam kurar, paketleri yükler ve Groq anahtarını sorar. Sonraki çalıştırmalarda doğrudan açılır.
set -e
cd "$(dirname "$0")"

PY=""
for aday in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$aday" >/dev/null 2>&1 && "$aday" -c 'import sys; sys.exit(sys.version_info < (3, 10))' 2>/dev/null; then PY="$aday"; break; fi
done
if [ -z "$PY" ]; then
  echo "Python 3.10 ya da üstü bulunamadı. https://www.python.org/downloads/ adresinden kurup tekrar çalıştır."; exit 1
fi

if [ ! -x .venv/bin/python ]; then
  echo "→ Sanal ortam kuruluyor ($PY)…"
  "$PY" -m venv .venv
fi
echo "→ Paketler kontrol ediliyor…"
.venv/bin/python -m pip install -q --disable-pip-version-check -r requirements.txt

if [ ! -f .env ] || ! grep -qE '^LLM_API_KEY=.+|^ANTHROPIC_API_KEY=.+' .env; then
  echo ""
  echo "Ajanların gerçek dil modeliyle çalışması için ücretsiz bir Groq anahtarı gerekir: https://console.groq.com/keys"
  read -rsp "Anahtarı yapıştır ve Enter'a bas (boş bırakırsan demo modunda açılır): " IKIZ_ANAHTAR; echo ""
  IKIZ_ANAHTAR="$IKIZ_ANAHTAR" .venv/bin/python anahtar_yaz.py
fi

echo "→ Model bağlantısı sınanıyor…"
.venv/bin/python llm_kontrol.py || echo "  (Model bağlantısı kurulamadı; uygulama yine açılır, ajanlar hazır içeriğe düşer. Yukarıdaki ipucuna bak.)"

PORT="${PORT:-8000}"
URL="http://127.0.0.1:$PORT"
echo ""
echo "İkiz açılıyor: $URL   (kapatmak için Ctrl+C)"
( sleep 2; (command -v open >/dev/null && open "$URL") || (command -v xdg-open >/dev/null && xdg-open "$URL") || true ) >/dev/null 2>&1 &
exec .venv/bin/python -m uvicorn server:app --port "$PORT"
