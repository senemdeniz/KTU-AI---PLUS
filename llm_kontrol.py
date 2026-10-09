"""Dil modeli bağlantısını doğrular.  Kullanım:  python3 llm_kontrol.py

Anahtarı .env dosyasından (bkz. .env.example) ya da ortam değişkeninden okur. Anahtar ekrana yazılmaz.
"""
import sys
import time

import ayar

ayar.yukle()

import ikiz_ajan as ia  # noqa: E402  (.env okunduktan sonra)

IPUCLARI = [
    ("HTTP 401", "Anahtar geçersiz ya da iptal edilmiş. Sağlayıcının sitesinden yeni anahtar oluşturup .env dosyasına yaz."),
    ("HTTP 402", "Hesapta kredi yok. Groq ya da Gemini'nin ücretsiz katmanını kullan (bkz. .env.example)."),
    ("HTTP 403", "Anahtarın bu modele erişim izni yok. LLM_MODEL değerini ya da anahtar izinlerini kontrol et."),
    ("HTTP 404", "Model adı bulunamadı. LLM_MODEL değerini sağlayıcının güncel model listesiyle karşılaştır."),
    ("HTTP 400", "İstek reddedildi; çoğunlukla model adı ya da LLM_BASE_URL yanlıştır."),
    ("HTTP 429", "Dakikalık sınıra takıldın; bir dakika bekleyip tekrar dene."),
    ("HTTP 413", "İstek sağlayıcının dakikalık token sınırını aşıyor. Bir dakika bekle ya da daha küçük bir model seç."),
    ("anthropic paketi", "Claude için paketi kur: python3 -m pip install anthropic"),
    ("finish_reason=length", "Model düşünmeye tüm token bütçesini harcadı. Tekrar dene; sürerse daha hızlı bir model seç."),
    ("HTTP 5", "Sağlayıcı tarafında geçici hata; biraz sonra tekrar dene."),
    ("CERTIFICATE", "SSL sertifika sorunu. macOS'ta 'Install Certificates.command' dosyasını çalıştır ya da 'pip3 install certifi' dene."),
    ("bağlantı hatası", "İnternet bağlantını ya da LLM_BASE_URL adresini kontrol et."),
]


def main() -> None:
    if ia.is_mock():
        sys.exit("Model anahtarı bulunamadı; uygulama demo modunda çalışır.\n"
                 "→ cp .env.example .env  komutuyla dosyayı oluştur, LLM_API_KEY satırına anahtarını yaz ve tekrar çalıştır.")
    print(f"Sağlayıcı: {ia.provider()}   Model: {ia.model_name()}")
    t0 = time.time()
    try:
        out = ia.llm_json('Türkçe ve kısa yanıt ver. Sadece şu JSON\'u döndür: {"cevap": str}',
                          {"soru": "Bağlı liste nedir? Tek cümleyle açıkla."}, max_tokens=300)
    except ia.LLMError as e:
        m = str(e)
        ipucu = next((t for k, t in IPUCLARI if k.upper() in m.upper()), "Model cevabı beklenen biçimde değil; farklı bir model dene.")
        sys.exit(f"HATA: {m}\n→ {ipucu}")
    print(f"Metin: çalışıyor ({time.time() - t0:.1f} sn) → {out.get('cevap', out)}")
    y = ia.yetenekler()
    print(f"Fotoğraftan öğretme: {'açık (' + str(y['gorsel_model']) + ')' if y['gorsel'] else 'kapalı (LLM_VISION_MODEL tanımla)'}")
    print(f"Sunucuda ses tanıma: {'açık (' + str(y['ses_model']) + ')' if y['ses'] else 'kapalı (tarayıcının ses tanıması kullanılır)'}")
    print("Hazır. Şimdi sunucuyu başlat: python3 -m uvicorn server:app --port 8000")


if __name__ == "__main__":
    main()
