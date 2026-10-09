# İkiz

**Bir ajan ekibi yolunu çizer; sen öğrendiğini ikizine öğretirsin.**

İkiz, *Agentic AI in Education* için yapılmış bir öğrenme uygulaması. Öğrenmek istediğin konuyu yazarsın. On iki ajanlık bir ekip senin için hedef seçer, günlük yol haritası çizer, konuya özgü güvenilir kaynak bulur ve ilerlemeni izler. Öğrendiğini **ikizine** anlatırsın. Her konunun kendi ikizi vardır ve ikizin yalnızca senin anlattığını bilir. Ayrı ajanlar onu sınava sokar, hatalı cümleni gösterir ve seni kaynağın doğru bölümüne yönlendirir.

Gökyüzünde üç şey görürsün:

- **Sen (altın):** bitirdiğin her görev bir yıldız yakar.
- **Rota (kesikli):** planı aksatmasaydın bugün olacağın yer.
- **İkizlerin (mavi):** her konuya bir ikiz. Boş doğar, sen öğrettikçe parlar ve senden önde olamaz.

---

## Hızlı başlangıç

Python 3.10 ya da üstü gerekir.

```bash
git clone https://github.com/senemdeniz/KTU-AI---PLUS.git ikiz
cd ikiz
python3 -m pip install -r requirements.txt
python3 -m uvicorn server:app --port 8000
```

Tarayıcıda **http://127.0.0.1:8000** adresini aç. Ardından:

1. **Kayıt ol:** kullanıcı adı ve şifre seç.
2. Kendini tanıt: konu, süre, avatar. Ekip gökyüzünü canlı olarak kurar.
3. İstediğin kadar **takımyıldız** (konu) aç. Logoya tıklayınca hepsi görünür.
4. **Çıkış yap**, sonra aynı kullanıcı adı ve şifreyle **giriş yap**: kaldığın yerden devam edersin.

Kayıt olmadan denemek için ana sayfadaki **“Kayıt olmadan canlı demoyu izle”** bağlantısını kullan.

> **GitHub Codespaces:** Repo sayfasında **Code → Codespaces → Create codespace** seç. Kurulum kendiliğinden yapılır, sunucu başlar ve uygulama tarayıcıda açılır.

---

## Ajanları gerçek dil modeline bağlama

Model anahtarı yoksa uygulama **demo modunda** çalışır: içerik hazırdır, ama akış ve karar mantığı gerçektir. Gerçek modele bağlamak için:

```bash
cp .env.example .env
```

`.env` dosyasını aç ve `LLM_API_KEY=` satırına anahtarını yaz. Ücretsiz seçenekler:

| Sağlayıcı | Anahtar | `.env` |
|---|---|---|
| **Groq** (önerilen) | console.groq.com/keys | `LLM_BASE_URL=https://api.groq.com/openai/v1`<br>`LLM_MODEL=openai/gpt-oss-120b` |
| Google Gemini | aistudio.google.com/apikey | `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`<br>`LLM_MODEL=` güncel “flash” modeli |
| Anthropic Claude | console.anthropic.com | `ANTHROPIC_API_KEY=...` |

Ardından bağlantıyı dene ve sunucuyu başlat:

```bash
python3 llm_kontrol.py
python3 -m uvicorn server:app --port 8000
```

Sol alttaki rozet **“Demo modu”** yerine **“Canlı model: …”** gösterir.

- **`.env` GitHub'a gitmez** (`.gitignore`'da). Anahtarını koda, sohbete ya da ekran görüntüsüne koyma.
- **Codespaces'te:** anahtarı **Settings → Secrets and variables → Codespaces** altına `LLM_API_KEY`, `LLM_BASE_URL` ve `LLM_MODEL` olarak ekle.
- **Görüntü ve ses:**
  - Fotoğraftan öğretmek için `LLM_VISION_MODEL` değişkenine sağlayıcının görüntü modelini yaz.
  - Groq'ta sesli anlatım sunucudaki Whisper ile kendiliğinden açılır. Diğer sağlayıcılarda tarayıcının ses tanıması kullanılır.
- **Model yanıt vermezse ya da bozuk JSON döndürürse** ilgili ajan hazır içeriğe düşer ve bunu akışta söyler. Uygulama model yüzünden çökmez.

---

## Ajan ekibi

Her ajanın tek bir işi vardır. Uygulamada **Ekip** sekmesinde her ajanın kartı durur; karta dokununca o ajanın senin için ürettiği çıktı açılır.

| Ajan | Ne işe yarar | Ne zaman çalışır | Tür |
|---|---|---|---|
| Gözlemevi | Ekibin yöneticisi: isteğini doğru ajana iletir, büyük kararları önce sana sorar | Her adımda | Yapay zekâ + kural |
| Astronom | Konunu, seviyeni ve ayırabileceğin zamanı okuyup ekibe aktarır | Kayıtta, profil değişince | Yapay zekâ |
| Kutup Yıldızı | Olası hedefleri puanlar; seçtiğin sürede ulaşabileceğin en anlamlı tekini seçer | Yeni konu açınca | Yapay zekâ |
| Haritacı | Hedefi seçtiğin gün sayısına göre küçük günlük görevlere böler | Kurulumda, süre değişince | Yapay zekâ |
| Kaynak Avcısı | Konunun türüne göre güvenilir kaynak bulur, en uygun tekini gerekçesiyle seçer; bağlantı uydurmaz | Kurulumda, istediğinde | Yapay zekâ + kural |
| Gözcü | Bitirdiklerini rotanla karşılaştırıp riski ölçer (tahmin değil, hesap) | Her gün sonunda | Kural |
| Yörüngeci | Geride kalınca en hafif çözümü bulur; büyük değişikliği onayına sunar | Geride kalınca | Yapay zekâ |
| Rehber | Suçlamadan, bugün yapabileceğin tek net adımı söyler | Her gün, sorduğunda | Yapay zekâ |
| Konu Bekçisi | İkizine anlattığının konuyla ilgisini denetler; konu dışını ve kişisel bilgiyi geçirmez | Her anlatımda | Yapay zekâ + kural |
| Kaşif | Sınav soruları ve doğru cevapları hazırlar, cevapları ikizden saklar | Sınavda | Yapay zekâ |
| İkiz | Yalnızca senin cümlelerini bilir ve sınavda onlarla cevap verir | Öğrettiğinde | Yapay zekâ |
| Hakem | Cevapları bağımsız puanlar, hatalı cümleni gösterir, kaynağın doğru bölümüne yönlendirir | Sınavdan sonra | Yapay zekâ + kural |

**Neden çok ajan?** Bilgi ayrımı için:

- Kaşif doğru cevabı bilir, İkiz bilmez.
- Hakem, İkiz'den bağımsız değerlendirir.
- Gözcü'nün ölçümü kuraldır, modelin keyfine bırakılmaz.
- Plan değiştiren her karar kullanıcı onayından geçer.

### Konuya özgü kaynak stratejisi

Türk birine İspanyolca öğretmek ile bir öğrenciye veri yapıları öğretmek aynı iş değildir. Kaynak Avcısı önce konunun türünü belirler:

| Tür | Örnek | Strateji |
|---|---|---|
| Dil | İspanyolca, Almanca | 1) Türkçe açıklayan kaynak (Ankara Üni. açık ders)<br>2) İngilizce üzerinden köprü (Instituto Cervantes AVE)<br>3) A2'den sonra hedef dilde malzeme |
| Teknik | Veri Yapıları, programlama | Kalite önce gelir: uygulamalı İngilizce kaynak ana kaynaktır (Runestone). Türkçe ders destek olarak kalır. |
| Akademik | Türev, Olasılık | Çözümlü örnekli ders notu önce gelir. Dil ikincildir. |
| Beceri | Gitar | Adım adım video ders ve metronom gibi bir pratik aracı |

- Elle doğrulanmış kaynak listesi olmayan konularda genel web araması yapılmaz. Bunun yerine güvenilir platformların (MIT OCW, Khan Academy, Coursera, Ankara Üni. açık ders) konu sayfasına yönlendirilir.
- İngilizce platformlarda konu İngilizce karşılığıyla aranır ("İspanyolca" → "Spanish").

---

## Hesaplar ve güvenlik

- **Hesap:** Şifreler `scrypt` ile tuzlanıp saklanır; düz metin hiçbir yerde durmaz. Giriş, yalnızca sunucunun okuyabildiği bir çerezle tutulur (`HttpOnly`, `SameSite=Lax`; HTTPS'te `Secure`). Çerezin veritabanında yalnızca SHA-256 özeti durur.
- **Erişim:**
  - Bir hesabın gökyüzüne yalnızca sahibi erişir; oturum kimliğini bilmek yetmez.
  - Hatalı giriş denemeleri sınırlıdır.
  - Yazma istekleri başka bir siteden gelemez (CSRF koruması).
- **İkizine öğret:**
  - Kişisel veri (TC kimlik, telefon, e-posta, IBAN, kart) modele ulaşmaz.
  - Talimat enjeksiyonu ve benzer harf ya da gizli karakterle saklama denemeleri yakalanır.
  - Kullanıcı metni modele “güvenilmez veri” olarak verilir.
  - Hakem ipucunda cevabı söylemez.
- **Sunucu ve arayüz:**
  - IP başına hız ve gövde sınırı vardır; güvenlik başlıkları gönderilir (CSP, `nosniff`, `frame-ancestors 'none'`).
  - Arayüz metni yalnızca `textContent` ile yazar (XSS yok).
  - Kullanıcının eklediği bağlantılarda SSRF koruması vardır.
- **Görüntü ve ses saklanmaz:** Model yalnızca yazıya döker; metni sen düzeltip eklersin.
- **Ayarlar → Hesabımı ve verilerimi sil:** her şeyi kalıcı olarak siler.

---

## Proje yapısı

| Dosya | İçerik |
|---|---|
| `server.py` | FastAPI uç noktaları, hesap/erişim denetimi, güvenlik katmanı, web arayüzünü sunar |
| `hesap.py` | Kayıt, giriş, çerez belirteçleri |
| `gozlemevi.py` | Orkestratör: ajanların akışı, gökyüzü görünümü |
| `ikiz_ajan.py` | Model sağlayıcı katmanı (Groq/Gemini/OpenAI uyumlu, Claude, demo), istemler, ikiz/rota hesabı |
| `kaynak_avcisi.py` | Konuya özgü kaynak stratejisi, doğrulanmış kaynaklar, bağlantı denetimi |
| `ogret_ajani.py` | Kaşif, İkiz ve Hakem: kısıtlı bilgiyle sınav |
| `konu_bekcisi.py`, `guvenlik.py` | İçerik denetimi |
| `icerik.py` | Demo modunun elle yazılmış yol haritaları |
| `store.py` | SQLite kalıcılığı (`IKIZ_DB`, varsayılan `ikiz.db`) |
| `ayar.py` | `.env` yükleyici |
| `web/` | Arayüz (derleme gerektirmez: düz HTML, CSS, JavaScript modülleri) |

API sözleşmesi: [`docs/API.md`](docs/API.md). Jüri sunumu için adım adım akış: [`DEMO.md`](DEMO.md).

## Testler

```bash
python3 -m pip install -r requirements-dev.txt
python3 -m pytest -q
```

Testler şunları kapsar:

- Hesap akışı: kayıt, giriş, çıkış, başkasının gökyüzüne erişememe, CSRF.
- Ajan akışları ve güvenlik denetimleri.
- **Gerçek model yolunun uçtan uca testi (anahtar gerekmez):** `test_model_yolu.py`, yerel ve OpenAI uyumlu sahte bir model sunucusu açar.
  - Önce on iki ajanın hepsini gerçek HTTP yolundan geçirir.
  - Sonra modelin boş, bozuk, yanlış biçimli ya da hatalı yanıt verdiği durumlarda uygulamanın çökmediğini doğrular.

GitHub Actions her gönderimde testleri çalıştırır.

## Bilinen sınırlar

- Gerçek sağlayıcılarla (Groq, Gemini, Claude) yanıt kalitesi modele göre değişir. Hazır içeriğe düşme yolu test edildi; Türkçe kalite canlı modelle denenmelidir.
- Elle doğrulanmış kaynaklar şimdilik Veri Yapıları, Türev, Gitar ve İspanyolca için var.
- Kurallar ilk savunma hattıdır; üretimde bir moderasyon modeliyle desteklenmelidir. 18 yaş altı için veli onayı akışı yok.
- Şifre sıfırlama yok (e-posta toplanmıyor). Şifreni unutursan yeni hesap açman gerekir.

## Lisans

[LICENSE](LICENSE)
