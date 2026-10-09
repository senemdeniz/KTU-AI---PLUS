# İkiz — seninle birlikte gelişen öğrenme ikizi

> **Agentic AI in Education** hackathon projesi. İki alan: **Akademik** (üniversite dersleri) ve **Hobiler**.

İkiz'de gökyüzünde üç şey vardır:

- **Sen:** bitirdiğin her görev bir yıldız yakar.
- **Rota:** planı hiç aksatmasaydın bugün olacağın yer (kesikli çizgi). Aradaki fark "rotanın kaç yıldız gerisindesin" sorusunun cevabıdır.
- **İkizin:** boş doğar ve **yalnızca senin öğrettiklerini bilir**. Plandaki her "anlat" kavramı ikizinin bir yıldızıdır: öğretmediysen sönük, kısmen doğruysa parlak, tamamen doğruysa halkalı. İkizin hiçbir zaman senden önde olamaz; sen öğrettikçe büyür.

Bir **ajan ekibi (Gözlemevi)** seni rotanla karşılaştırır, plan tutmuyorsa planı kendisi değiştirir ve yaptığı her şeyi canlı bir akışta gösterir.

## Çok-ajanlı sistem (neden çok ajan?)

Çok ajan burada süs değil; **bilgi ayrımı, bağımsız doğrulama ve denetlenebilirlik** için var.

| Ajan | Tür | Görev |
|---|---|---|
| Gözlemevi | LLM + kod | Orkestratör; görevleri dağıtır, büyük kararları kullanıcı onayına sunar |
| Astronom → Kutup Yıldızı → Haritacı | LLM | Kurulum hattı: profil, tek ideal hedef, 21 günlük harita |
| Gözcü | **kod** | İkizi ve riski deterministik hesaplar (`ikiz_ajan.py`) |
| Yörüngeci | LLM | Plan gerideyse en hafif müdahaleyi seçer; küçüğü uygular, büyüğünü onaya sunar |
| Rehber | LLM | Suçlamadan tek net adım önerir |
| Kaynak Avcısı | LLM + kod | Konu için kaynakları puanlar, sana en uygun tekini gerekçesiyle seçer. Bağlantıyı model değil kod verir: elle doğrulanmış liste (şimdilik Veri Yapıları) ya da arama bağlantısı |
| Konu Bekçisi | LLM + kod | Anlattığının seçilen konuyla bağını denetler; konu dışıysa İkiz'e ulaştırmaz, model yanıt vermezse kapalı kalır |
| Kaşif · İkiz · Hakem | LLM | *İkizine öğret*: Kaşif referans cevabı saklar, İkiz yalnızca kullanıcının cümlelerini bilir, Hakem bağımsız doğrular |

Üç akış: (1) kurulum hattı, (2) Ajan Akışı: Gözcü → Gözlemevi kararı → Yörüngeci → Rehber, (3) *İkizine öğret*: kısıtlı bilgi ile sınav.

## Canlı demo özellikleri

- **Süreyi sen seçersin:** hedefe kaç günde ulaşmak istediğini (7–90 gün) profilde seçersin; Haritacı planı o güne yayar. Sonradan değiştirirsen geçmiş günlerin korunur, kalan görevler yeni takvime dağıtılır.
- **Profil sayfası:** ad, günlük süre, saat, seviye, hedef, sınav tarihi güncellenir; ekip planı anında ayarlar.
- **Takımyıldızların:** birden çok konu açabilirsin; "Gökyüzüme dön" açtığın tüm takımyıldızları gösterir.
- **Ekip zihin haritası:** Gözlemevi merkezde, üç akış (kurulum, otonom döngü, ikizine öğret) renkli; çalışan ajan ve devir çizgisi canlı. Bir ajana dokununca ürettiği çıktı anında gelir (kopyala / .md indir).
- **Hakem anında yönlendirir:** sınavdan sonra hatalı ya da eksik cümleni işaretler, "Düzelt" ile cümleyi yazı alanına geri alır ve seni kaynağın o kavramı anlatan bölümüne götürür (örn. VisuAlgo: Linked List). Cevabı söylemez.
- **Parlaklık = ikizinin başarısı:** hedefin parlaklığı, öğrettiğin kavramlarda ikizinin sınav başarısıdır.
- **Beceri konuları (gitar):** ikizine nasıl çaldığını anlatırsın (parmak yerleşimi, geçiş, tempo); ilerlemen "Pratik kaydı" ile görünür olur: temiz çalabildiğin en yüksek tempo (BPM) kaydedilir, Gözcü bir öncekiyle karşılaştırır ve tempo eğrisi çizilir.

- **Tek konuyla hızlı başlangıç:** konuyu yaz, ekip 21 günlük yol haritasını çıkarır (Gökyüzü → Yol haritan).
- **Ajan sahnesi:** Ekip sekmesinde avatarlar, konuşan ajan parlaması, "yazıyor…" göstergesi, balonlu akış, devir/karar/koruma etiketleri.
- **İlerlemeyi sen belirlersin:** Bugün sekmesinde görevleri işaretle ve "Günü bitir"; ya da İkizin → *Canlı demo kontrolü* ile "N gün geçti, planın %X'ini yaptım".
- **Ajanlarla sohbet:** Ekip → Sohbet: bir ajan seç (Rehber, Yörüngeci, Gözcü…) ya da "Otomatik" bırak; ajan oturumunun gerçek verilerine (ilerleme, yıldızlar, hedef) dayanarak yanıtlar.
- **Sesli anlatım:** İkizine öğret ekranında 🎙️ (web: Chrome/Safari, tr-TR). Konuşma metne çevrilir, düzenlenir, sonra yazılı metinle aynı güvenlik + Konu Bekçisi denetiminden geçer.

## Güvenlik ve etik (`guvenlik.py`)

Kişisel veri (TC kimlik, telefon, e-posta, IBAN, kart) engellenir; prompt injection ve zararlı içerik denetlenir; kullanıcı metni modele "güvenilmez veri" olarak verilir; ödev yaptırma reddedilir (ekip anlamana yardım eder, ödevi yapmaz); boyut ve hız sınırı vardır; İkiz'in yapay zekâ olduğu belirtilir; "Verilerimi sil" tüm oturumu siler. Bu kural tabanlı **ilk savunma hattıdır**; üretimde bir moderasyon modeliyle desteklenmelidir.

## Çalıştırma

```bash
pip install -r requirements.txt
python3 llm_kontrol.py                  # (isteğe bağlı) gerçek model bağlantısını dene
python3 -m uvicorn server:app --port 8000
```

Sonra tarayıcıda **http://127.0.0.1:8000** adresini aç: tam web arayüzü sunucudan gelir (`web/`, derleme gerektirmez). Akış: karşılama → profil → ikizin oluşuyor (ajanlar canlı) → ekibin neler yapabileceği → uygulama (Gökyüzü, Yol haritası + kaynaklar, Bugün, Ekip, İkizin, İkizine öğret, Veriler ve güvenlik).

Mobil uygulama (Expo) aynı API'yi kullanır: `cd mobile && npm install && EXPO_PUBLIC_API_URL=http://127.0.0.1:8000 npx expo start --web`.

**Model sağlayıcısı** (yalnızca sunucu ortam değişkeni; anahtarı asla sohbete/koda yazma):

| Değişken | Anlamı |
|---|---|
| `ANTHROPIC_API_KEY` | Claude |
| `HF_TOKEN` (+ `LLM_MODEL`) | Hugging Face router (OpenAI uyumlu, `https://router.huggingface.co/v1`) |
| `LLM_API_KEY` + `LLM_BASE_URL` | Herhangi bir OpenAI uyumlu uç nokta |
| `LLM_PROVIDER=mock` | Demo modunu zorla |
| `IKIZ_DB` | Kalıcı SQLite yolu (Railway'de volume'a bağla) |
| `AJAN_GECIKME` | Akıştaki adım gecikmesi, sn (varsayılan 0.7) |

Hiçbiri yoksa **demo modu** çalışır: içerik elle yazılmış (Türev ve Gitar için özel), akış ve karar mantığı gerçektir.

Testler: `python -m pytest -q` (27 test). API sözleşmesi: [`docs/API.md`](docs/API.md). Jüri anlatımı: [`DEMO.md`](DEMO.md).

## Güvenlik önlemleri (özet)

Unicode normalleştirme (tam genişlik rakam, sıfır genişlikli karakter, Kiril/Yunan benzer harf), kişisel veri ve talimat enjeksiyonu denetimi, Konu Bekçisi, Hakem ipucu sızıntı koruması, 128 bitlik oturum kimliği, IP başına hız sınırı, 20 KB gövde sınırı, güvenlik başlıkları (CSP, nosniff, frame-ancestors none), arayüzde yalnızca `textContent` (XSS yok), dış bağlantılar `noopener noreferrer`. Üretimde `IKIZ_CORS` ile izinli kökenleri kısıtla ve HTTPS arkasında çalıştır.

## Bilinen sınırlar

- LLM yolu (Claude / Hugging Face) gerçek servislere karşı henüz denenmedi; yalnızca demo modu ve sahte uç nokta test edildi. Hugging Face'te JSON çıktı güvenilirliği ve Türkçe kalite modele göre denenmelidir. Ücretsiz HF hesaplarında aylık kredi yoktur (PRO: aylık 2$).
- Elle doğrulanmış kaynak ve kavram bölümleri şimdilik Veri Yapıları, Türev ve Gitar için var; diğer konularda genel web araması yerine güvenilir platformların (MIT OCW, Khan Academy, Coursera, Vikipedi) konu sayfasına yönlendirilir. JustinGuitar'ın ücret bilgisi doğrulanmadı. Rakamla yazılmış telefon ("sıfır beş yüz…") ve kodlanmış (base64) kişisel veri yakalanmaz.
- *Görev ver* yönlendirmesi anahtar kelimelidir; `kaynak` yalnızca kaynak türü önerir, bağlantı uydurmaz.
- Eski Streamlit demosu (`app.py`) ve `examples_yks_ayt_matematik/` örnek içerik paketi olarak duruyor; ana ürün değildir.
- 18 yaş altı için veli onayı akışı yok; destek hattı numaraları (112, ALO 183) yayından önce doğrulanmalı.
