# Jüri demosu (4–5 dakika)

**En hızlı yol:** karşılama sayfasında **Canlı demoyu izle**. Uygulama öğretme akışını gerçek API çağrılarıyla kendi kendine oynatır (~40 sn); sen konuşurken ekranda adımlar ilerler. Aşağıdaki el ile akış, soru gelirse derine inmek için.

Çalıştır: `python3 -m uvicorn server:app --port 8000` → tarayıcıda `http://127.0.0.1:8000`. Akış okunabilir hızda aksın diye `AJAN_GECIKME=0.7` (varsayılan). Persona: **Elif**, Veri Yapıları.

1. **Profil (30 sn).** "İkizini oluştur" → konu: Veri Yapıları, seviye: Yeni başlıyorum, 30 dk. Onay kutusu: ajanlar ve ikiz yapay zekâdır, veriler silinebilir.
2. **Gökyüzün kuruluyor (30 sn).** Astronom → Kutup Yıldızı → Haritacı → Kaynak Avcısı → Gözcü → Rehber sırayla çalışır; her adım ekranda akar. *"Her ajanın tek işi var, hepsi kayıt altında."*
3. **Yol haritası ve kaynak (30 sn).** 21 günlük plan; Kaynak Avcısı 6 kaynağı seviye, süre ve ücrete göre puanlayıp tek birincil kaynak seçer. Bağlantıları model değil kod verir (elle doğrulanmış liste).
4. **Rota ve otonom döngü (60 sn).** Bugün → "Canlı demo kontrolü": 5 gün, %25. Gözcü seni **rotanla** karşılaştırır → Gözlemevi "hatırlatma yetmez" der → Yörüngeci planı hafifletir → Rehber tek adım önerir. *Küçük değişiklik otomatik, büyüğü onaya.*
5. **Ekibe görev ver (45 sn).** "Gelecek hafta vizem var, planı ona göre ayarla" → iki ajana bölünür, onay kartı çıkar, Onayla. Sonra **"Ödevimi yap"** → reddedilir.
6. **İkizin (75 sn).** İkizin sekmesi: ikiz **%0**'dan başlar; rota ilerlese de ikiz sen öğretmeden büyümez, senden önde olamaz. İkizine öğret → kavram: bağlı liste → anlat (sesle de olur) → "İkizini sınava sok". İkiz yalnızca senin cümlelerini bilir; Hakem cevabı söylemez, ipucu verir. İkizin gökyüzünde ilk yıldız yanar.
7. **Güvenlik (20 sn).** Konu dışı bir cümle ("dün film izledim") → Konu Bekçisi durdurur. Telefon numarası → engellenir. "Hepsini sil".

**Neden çok ajan?** Kaşif'in referans cevabı İkiz'den *saklanır* (bilgi ayrımı), Hakem İkiz'den *bağımsız* doğrular, Konu Bekçisi anlatımı ayrıca denetler, her karar akışta *denetlenebilir*. Tek bir model aynı anda hem cevabı bilip hem bilmiyormuş gibi davranamaz.

**Dürüst notlar:** demo modunda metinler hazır, akış ve karar mantığı gerçek. Canlı model için `LLM_API_KEY` + `LLM_BASE_URL` (örn. Groq) ya da `HF_TOKEN`; önce `python3 llm_kontrol.py`.
