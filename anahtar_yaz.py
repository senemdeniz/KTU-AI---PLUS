"""baslat.sh / baslat.bat yardımcısı: .env yoksa .env.example'dan oluşturur ve verilen anahtarı LLM_API_KEY satırına yazar.
Anahtar komut satırından değil ortam değişkeninden (IKIZ_ANAHTAR) okunur; ekrana ve geçmişe yazılmaz."""
import os
import shutil
from pathlib import Path

kok = Path(__file__).resolve().parent
env, ornek = kok / ".env", kok / ".env.example"
if not env.exists():
    shutil.copy(ornek, env)
anahtar = os.environ.get("IKIZ_ANAHTAR", "").strip()
if anahtar:
    satirlar = env.read_text(encoding="utf-8").splitlines()
    for i, s in enumerate(satirlar):
        if s.strip().startswith("LLM_API_KEY="):          # yorum satırları (#) değil, etkin satır
            satirlar[i] = f"LLM_API_KEY={anahtar}"
            break
    else:
        satirlar.append(f"LLM_API_KEY={anahtar}")
    env.write_text("\n".join(satirlar) + "\n", encoding="utf-8")
    print("Anahtar .env dosyasına yazıldı (.env GitHub'a gitmez).")
