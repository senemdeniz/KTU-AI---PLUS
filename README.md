# İkiz — seninle birlikte gelişen öğrenme ikizi

> **Agentic AI in Education** hackathon projesi. İki alan: **Akademik** (üniversite dersleri) ve **Hobiler**.

İkiz, hedefin için bir **dijital ikiz** kurar: *Gerçek Sen* yalnızca gerçekten bitirdiklerinle ilerler, *İstikrarlı Sen* planı her gün uygulasaydın olacağın yerdedir. Aradaki fark bir **yıldız** farkıdır (her tamamlanan görev bir yıldız). Bir **ajan ekibi (Gözlemevi)** bu farkı izler, plan tutmuyorsa planı kendisi değiştirir ve yaptığı her şeyi canlı bir akışta gösterir.

## Çok-ajanlı sistem (neden çok ajan?)

Çok ajan burada süs değil; **bilgi ayrımı, bağımsız doğrulama ve denetlenebilirlik** için var.

| Ajan | Tür | Görev |
|---|---|---|
| Gözlemevi | LLM + kod | Orkestratör; görevleri dağıtır, büyük kararları kullanıcı onayına sunar |
| Astronom → Kutup Yıldızı → Haritacı | LLM | Kurulum hattı: profil, tek ideal hedef, 21 günlük harita |
| Gözcü | **kod** | İkizi ve riski deterministik hesaplar (`ikiz_ajan.py`) |
| Yörüngeci | LLM | Plan gerideyse en hafif müdahaleyi seçer; küçüğü uygular, büyüğünü onaya sunar |
| Rehber | LLM | Suçlamadan tek net adım önerir |
| Konu Bekçisi | LLM + kod | Anlattığının seçilen konuyla bağını denetler; konu dışıysa İkiz'e ulaştırmaz, model yanıt vermezse kapalı kalır |
| Kaşif · İkiz · Hakem | LLM | *İkizine öğret*: Kaşif referans cevabı saklar, İkiz yalnızca kullanıcının cümlelerini bilir, Hakem bağımsız doğrular |

Üç akış: (1) kurulum hattı, (2) Ajan Akışı: Gözcü → Gözlemevi kararı → Yörüngeci → Rehber, (3) *İkizine öğret*: kısıtlı bilgi ile sınav.

## Canlı demo özellikleri

- **Tek konuyla hızlı başlangıç:** konuyu yaz, ekip 21 günlük yol haritasını çıkarır (Gökyüzü → Yol haritan).
- **Ajan sahnesi:** Ekip sekmesinde avatarlar, konuşan ajan parlaması, "yazıyor…" göstergesi, balonlu akış, devir/karar/koruma etiketleri.
- **İlerlemeyi sen belirlersin:** Bugün sekmesinde görevleri işaretle ve "Günü bitir"; ya da İkizin → *Canlı demo kontrolü* ile "N gün geçti, planın %X'ini yaptım".
- **Ajanlarla sohbet:** Ekip → Sohbet: bir ajan seç (Rehber, Yörüngeci, Gözcü…) ya da "Otomatik" bırak; ajan oturumunun gerçek verilerine (ilerleme, yıldızlar, hedef) dayanarak yanıtlar.
- **Sesli anlatım:** İkizine öğret ekranında 🎙️ (web: Chrome/Safari, tr-TR). Konuşma metne çevrilir, düzenlenir, sonra yazılı metinle aynı güvenlik + Konu Bekçisi denetiminden geçer.

## Güvenlik ve etik (`guvenlik.py`)

Kişisel veri (TC kimlik, telefon, e-posta, IBAN, kart) engellenir; prompt injection ve zararlı içerik denetlenir; kullanıcı metni modele "güvenilmez veri" olarak verilir; ödev yaptırma reddedilir (ekip anlamana yardım eder, ödevi yapmaz); boyut ve hız sınırı vardır; İkiz'in yapay zekâ olduğu belirtilir; "Verilerimi sil" tüm oturumu siler. Bu kural tabanlı **ilk savunma hattıdır**; üretimde bir moderasyon modeliyle desteklenmelidir.

## Çalıştırma

Gerçek model bağlantısını önce tek komutla dene: `python3 llm_kontrol.py` (hata olursa nedenini söyler).

```bash
pip install -r requirements.txt
uvicorn server:app --port 8000          # API (demo modunda anahtarsız çalışır)

cd mobile && npm install
EXPO_PUBLIC_API_URL=http://localhost:8000 npx expo start --web   # ya da telefonda Expo Go
```

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

Testler: `python -m pytest -q` (19 test). API sözleşmesi: [`docs/API.md`](docs/API.md). Jüri anlatımı: [`DEMO.md`](DEMO.md).

## Bilinen sınırlar

- LLM yolu (Claude / Hugging Face) gerçek servislere karşı henüz denenmedi; yalnızca demo modu ve sahte uç nokta test edildi. Hugging Face'te JSON çıktı güvenilirliği ve Türkçe kalite modele göre denenmelidir. Ücretsiz HF hesaplarında aylık kredi yoktur (PRO: aylık 2$).
- *Görev ver* yönlendirmesi anahtar kelimelidir; `kaynak` yalnızca kaynak türü önerir, bağlantı uydurmaz.
- Eski Streamlit demosu (`app.py`) ve `examples_yks_ayt_matematik/` örnek içerik paketi olarak duruyor; ana ürün değildir.
- 18 yaş altı için veli onayı akışı yok; destek hattı numaraları (112, ALO 183) yayından önce doğrulanmalı.
