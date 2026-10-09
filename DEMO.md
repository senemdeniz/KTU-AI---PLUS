# Jüri demosu (4–5 dakika)

Çalıştır: `python3 -m uvicorn server:app --port 8000`, sonra tarayıcıda `http://127.0.0.1:8000` adresini aç. Canlı model için önce `.env` dosyasını doldur (bkz. README).

**En hızlı yol:** Ana sayfada **“Kayıt olmadan canlı demoyu izle”** bağlantısına tıkla. Uygulama öğretme akışını gerçek API çağrılarıyla kendi kendine oynatır (yaklaşık 40 sn).

**Elle akış:**

1. **Kayıt (20 sn).** Ana sayfa tek cümle: *“Bir ajan ekibi yolunu çizer; sen öğrendiğini ikizine öğretirsin.”* Kullanıcı adı ve şifreyle kayıt ol.
2. **Profil (30 sn).** Ad, avatar, konu (Veri Yapıları), seviye, süre. Ekip gökyüzünü canlı kurar: Astronom → Kutup Yıldızı → Haritacı → Kaynak Avcısı → Gözcü → Rehber.
3. **Ekibini tanı (20 sn).** Tanıtım ekranındaki 12 ajan kartı: her birinin ne işe yaradığı ve ne zaman çalıştığı.
4. **Yol haritası ve kaynak (40 sn).** Kaynak Avcısı'nın stratejisi: Veri Yapıları teknik bir konu, bu yüzden ana kaynak uygulamalı İngilizce bir kitap ve Türkçe ders destek. Logo → **İspanyolca** takımyıldızını aç. Bu kez dil stratejisi çıkar: önce Türkçe açıklayan kaynak, sonra İngilizce köprü, sonra hedef dil. Yeni konu için yeni bir ikiz doğar.
5. **Otonom döngü (45 sn).** Bugün → demo kontrolü: 5 gün, %25. Gözcü seni rotanla karşılaştırır, Yörüngeci planı hafifletir, büyük değişiklik onay kartı olarak gelir.
6. **İkizine öğret (60 sn).** Kavram: bağlı liste. Bir doğru ve bir hatalı cümle anlat, sonra **İkizini sınava sok**. Hakem hatalı cümleyi gösterir ve kaynağın doğru bölümüne (VisuAlgo: Linked List) yönlendirir. Düzelt ve yeniden sınava sok: yıldız halkalanır.
7. **Ana ajan ve ekip (30 sn).** Ekip → Görev ver: "Bu hafta çok yoğunum, ayrıca kaynak öner". Gözlemevi kararını akışa yazar ("Kararım: görevi 2 işe böldüm…") ve işi Yörüngeci ile Kaynak Avcısı'na verir. Hakem kartına dokun: değerlendirme ve yönlendirme açılır. Kartların altında her ajanın modeli yazar.
8. **Çıkış ve giriş (20 sn).** Çıkış yap, aynı bilgilerle giriş yap: iki takımyıldız ve iki ikiz yerinde.

**Neden çok ajan?**

- Kaşif'in referans cevabı İkiz'den saklanır (bilgi ayrımı).
- Hakem, İkiz'den bağımsız doğrular.
- Konu Bekçisi anlatımı ayrıca denetler.
- Her karar akışta görünür.

Tek bir model aynı anda hem cevabı bilip hem bilmiyormuş gibi davranamaz.
