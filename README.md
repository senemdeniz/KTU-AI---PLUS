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
| **Groq** (önerilen) | console.groq.com/keys | `.env.example`'daki satırlar hazır; yalnızca anahtarı yaz |
| Google Gemini | aistudio.google.com/apikey | `.env.example`'daki Gemini satırlarını aç |
| Anthropic Claude | console.anthropic.com | `ANTHROPIC_API_KEY=...` |

**Hangi ajan hangi modeli kullanır?** Modeller bu projenin boyutuna göre seçildi ve bilgisayarında değil, Groq'un sunucusunda çalışır. Bilgisayarın (ör. bir MacBook Air) yalnızca uygulamayı çalıştırır.

| Katman | Groq modeli | Ajanlar | Neden |
|---|---|---|---|
| Büyük | `openai/gpt-oss-120b` (`LLM_MODEL`) | Haritacı, Kutup Yıldızı, Yörüngeci, Kaşif, Hakem | Plan çizmek ve doğru değerlendirmek kalite ister; bu ajanlar seyrek çağrılır |
| Hızlı | `openai/gpt-oss-20b` (`LLM_MODEL_HIZLI`) | Gözlemevi, Konu Bekçisi, Rehber, İkiz, Astronom, Kaynak Avcısı, sohbet | Kısa ve sık işler; hızlı cevap verir, dakikalık sınırı yormaz |
| Görüntü | `qwen/qwen3.8-27b` (`LLM_VISION_MODEL`, önizleme) | Fotoğraftan öğretme | Groq'ta görüntü okuyan tek model |
| Ses | `whisper-large-v3-turbo` (kendiliğinden) | Sesli anlatım | |
| Yok | — | Gözcü | İlerleme ölçümü kuraldır |

Groq'un ücretsiz katmanında bu iki metin modelinin her biri için sınır dakikada 30 istek ve 8 bin token. `LLM_MODEL_HIZLI` boş bırakılırsa bütün ajanlar `LLM_MODEL`'i kullanır.

Ardından bağlantıyı dene ve sunucuyu başlat:

```bash
python3 llm_kontrol.py
python3 -m uvicorn server:app --port 8000
```

Sol alttaki rozet **“Demo modu”** yerine **“Canlı: gpt-oss-120b + gpt-oss-20b”** gösterir; Ekip sekmesindeki her ajan kartında o ajanın modeli yazar.

- **`.env` GitHub'a gitmez** (`.gitignore`'da). Anahtarını koda, sohbete ya da ekran görüntüsüne koyma.
- **Codespaces'te:** anahtarı **Settings → Secrets and variables → Codespaces** altına `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` ve `LLM_MODEL_HIZLI` olarak ekle.
- **Görüntü ve ses:**
  - Fotoğraftan öğretmek için `LLM_VISION_MODEL` değişkenine sağlayıcının görüntü modelini yaz.
  - Groq'ta sesli anlatım sunucudaki Whisper ile kendiliğinden açılır. Diğer sağlayıcılarda tarayıcının ses tanıması kullanılır.
- **Model yanıt vermezse ya da bozuk JSON döndürürse** ilgili ajan hazır içeriğe düşer ve bunu akışta söyler. Uygulama model yüzünden çökmez.
- **Hız sınırına takılırsa** (ücretsiz katmanlarda dakikalık sınır var), istek kısa bir beklemeyle iki kez yeniden denenir. Neden başarısız olduğu sunucu terminaline yazılır.
- **Proxy arkasında yayınlarken** (Render, Railway gibi) `IKIZ_PROXY=1` ver; hız sınırları kullanıcı başına uygulanır. Codespaces yapılandırması bunu kendisi yapar.

---

## Ajan ekibi

Her ajanın tek bir işi vardır. Uygulamada **Ekip** sekmesinde her ajanın kartı durur; karta dokununca o ajanın senin için ürettiği çıktı açılır.

| Ajan | Ne işe yarar | Ne zaman çalışır | Tür |
|---|---|---|---|
| **Gözlemevi** (ana ajan) | Görevini ve sorunu okur, hangi ajanın ne yapacağına modelle kendisi karar verir ve kararını gerekçesiyle söyler; büyük kararları önce sana sorar | Her görevde ve soruda | Yapay zekâ + kural |
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

**Ana ajan nasıl karar verir?** Gözlemevi ekibe verdiğin görevi okur.
- **Seçim:** Dört işten (sınav planı, mini sınav, kaynak, planı hafifletme) uygun olanları ve hangi takımyıldızda yapılacağını seçer. Kararını akışa "Kararım: …" diye gerekçesiyle yazar.
- **Sorular:** Sorulara hangi ajanın cevap vereceğine de o karar verir.
- **Sınırlar:** Model yalnızca bu listeden seçebilir, yeni iş uyduramaz. Model cevap vermezse ya da bozuk cevap verirse anahtar kelime kurallarına döner ve bunu söyler.

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
  - Veritabanına tüm erişim tek bir kilitten geçer; aynı anda gelen isteklerde hesaplar karışmaz. Silinen bir gökyüzü, arka planda çalışan bir ajan işiyle geri gelmez.
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
- `test_hatalar.py`: kapsamlı bir taramada bulunan her hatanın regresyon testi (eşzamanlı erişim, eski öneri, tekil görev kimlikleri, model çıktısı ayrıştırma, hız sınırında yeniden deneme…).
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
