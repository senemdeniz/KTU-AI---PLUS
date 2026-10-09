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
    ipucu = ("Hesapta kredi yok ya da ödeme gerekiyor (Hugging Face ücretsiz hesapta aylık kredi yok: PRO ya da ödeme yöntemi ekle)." if "HTTP 402" in m else
             "Token geçersiz ya da iptal edilmiş. Yeni token oluşturup tekrar export et." if "HTTP 401" in m else
             "Token'da 'Make calls to Inference Providers' izni yok. Token ayarlarından bu izni aç ya da yeni token oluştur." if "HTTP 403" in m else
             "Model bulunamadı ya da bu sağlayıcıda yok. LLM_MODEL değerini değiştir (örn. openai/gpt-oss-120b:cheapest)." if ("HTTP 404" in m or "HTTP 400" in m) else
             "Çok fazla istek; biraz bekleyip tekrar dene." if "HTTP 429" in m else
             "Sağlayıcı tarafında geçici hata; biraz sonra tekrar dene." if "HTTP 5" in m else
             "SSL sertifika sorunu: macOS'ta 'pip3 install certifi' sonra tekrar dene; olmazsa çıktıyı gönder." if "CERTIFICATE" in m.upper() else
             "İnternet bağlantını kontrol et." if "bağlantı hatası" in m else
             "Model cevabı JSON değil; çıktıyı bana gönder.")
    sys.exit(f"HATA: {m}\n→ {ipucu}")
print(f"Başarılı ({time.time() - t0:.1f} sn). Model yanıtı:")
print(out)
