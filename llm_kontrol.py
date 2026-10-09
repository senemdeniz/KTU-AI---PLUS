"""Gerçek model bağlantısını hızlıca doğrular.  Kullanım:  python3 llm_kontrol.py
Önce HF_TOKEN (ve isteğe bağlı LLM_MODEL) ya da ANTHROPIC_API_KEY ortam değişkenini ver. Anahtar ekrana yazılmaz."""
import sys
import time

import ikiz_ajan as ia

if ia.is_mock():
    sys.exit("Model anahtarı bulunamadı (demo modu). Önce:  export HF_TOKEN=hf_...  (ya da ANTHROPIC_API_KEY) ve aynı terminalde tekrar çalıştır.")

print(f"Sağlayıcı: {ia.provider()}  Model: {ia.model_name()}")
SISTEM = ("Sen bir öğretmensin. Türkçe, kısa yanıt ver. Sadece şu JSON'u döndür: "
          '{"cevap": str, "ornek": str}')
t0 = time.time()
try:
    out = ia.llm_json(SISTEM, {"soru": "Türev nedir? Tek cümleyle açıkla ve bir örnek ver."}, max_tokens=300)
except ia.LLMError as e:
    m = str(e)
    ipucu = ("Kredi/ödeme gerekiyor olabilir (Hugging Face ücretsiz hesapta kredi yok: PRO ya da ödeme yöntemi ekle)." if "402" in m else
             "Token geçersiz ya da 'Inference Providers' izni yok." if ("401" in m or "403" in m) else
             "Model adı yanlış olabilir; LLM_MODEL değerini değiştir." if "404" in m else
             "Ağ ya da zaman aşımı; bağlantını kontrol et." if ("timed out" in m or "urlopen" in m) else
             "JSON ayrıştırılamadı; model başka metin ekliyor olabilir. Çıktıyı bana gönder.")
    sys.exit(f"HATA: {m}\n→ {ipucu}")
print(f"Başarılı ({time.time() - t0:.1f} sn). Model yanıtı:")
print(out)
