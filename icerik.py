"""Demo modu içeriği (ANTHROPIC_API_KEY yokken).

Bilinen konular için elle yazılmış, tutarlı içerik; bilinmeyen konular için konu adından türetilen
genel bir şablon. Gerçek LLM modunda bu dosya kullanılmaz.
"""
from __future__ import annotations

import re


def _norm(s: str) -> str:
    tr = str.maketrans({"İ": "i", "I": "i", "ı": "i", "Ş": "s", "ş": "s", "Ğ": "g", "ğ": "g",
                        "Ü": "u", "ü": "u", "Ö": "o", "ö": "o", "Ç": "c", "ç": "c"})
    return s.translate(tr).lower()


def _tip(konu: str) -> str:
    n = _norm(konu)
    if "turev" in n or "kalkulus" in n:
        return "turev"
    if "gitar" in n:
        return "gitar"
    if "veri yap" in n or "data struct" in n or "veri-yap" in n:
        return "veri"
    return "genel"


# ------------------------------------------------------------------ profil
_BASLANGIC = {
    "turev": {"limit ve süreklilik": 1.0, "türev kuralları": 0.8, "uygulamalar": 0.5},
    "gitar": {"akorlar": 0.5, "ritim": 0.5, "geçişler": 0.3},
    "veri": {"karmaşıklık": 0.6, "doğrusal yapılar": 0.6, "ağaçlar ve graflar": 0.3},
}
_HEDEF_SEVIYE = {
    "turev": {"limit ve süreklilik": 2.0, "türev kuralları": 3.0, "uygulamalar": 2.5},
    "gitar": {"akorlar": 2.5, "ritim": 2.0, "geçişler": 2.5},
    "veri": {"karmaşıklık": 2.5, "doğrusal yapılar": 3.0, "ağaçlar ve graflar": 2.5},
}


def _genel_beceriler(konu: str) -> list[str]:
    return [f"{konu} temelleri", f"{konu} uygulama", f"{konu} anlatım"]


def profil(alan: str, konu: str, ad: str, dakika: int) -> dict:
    t = _tip(konu)
    beceri = _BASLANGIC.get(t) or {b: 0.8 for b in _genel_beceriler(konu)}
    return {"name": ad, "cv_summary": f"{ad}, {konu} üzerinde çalışmak istiyor ({'akademik' if alan == 'akademik' else 'hobi'}).",
            "skills": dict(beceri), "hobbies": [konu] if alan == "hobi" else [],
            "goals": [konu], "daily_minutes": dakika, "constraints": []}


# -------------------------------------------------------------------- hedef
def hedef(alan: str, konu: str, dakika: int, sure: int = 21) -> dict:
    t = _tip(konu)
    if t == "turev":
        return {"candidates": [
            {"title": "Vizeye kadar türev kurallarıyla ekstremum sorularını çözebilmek", "fit_score": 88,
             "reason": "Vizen yakın ve türev, sonraki konuların (integral) temeli."},
            {"title": "Limit ve süreklilikte boşluk kalmamak", "fit_score": 70,
             "reason": "Faydalı ama vizede türev daha ağır basıyor."},
            {"title": "İntegrale erkenden başlamak", "fit_score": 52,
             "reason": "Önce türev oturmadan verimsiz olur."}],
            "selected": "Vizeye kadar türev kurallarıyla ekstremum sorularını çözebilmek",
            "rationale": f"Vizen yakın ve günde {dakika} dakikan var. En çok soru getiren ve diğer konuların dayandığı konu türev; {sure} günde somut bir sonuca ulaşırsın.",
            "target_skills": _HEDEF_SEVIYE["turev"], "duration_days": sure,
            "success_metric": "Süreli 12 soruluk mini denemede en az 9 doğru"}
    if t == "gitar":
        return {"candidates": [
            {"title": "4 akorla bir şarkıyı baştan sona çalabilmek", "fit_score": 84,
             "reason": "Küçük, ölçülebilir ve motive edici."},
            {"title": "Ritim ve tırmalama kalıplarını oturtmak", "fit_score": 66, "reason": "Akorlar oturunca anlamlı."},
            {"title": "Nota okumaya başlamak", "fit_score": 45, "reason": "Şimdilik hobi motivasyonunu düşürebilir."}],
            "selected": "4 akorla bir şarkıyı baştan sona çalabilmek",
            "rationale": f"Günde {dakika} dakikayla en hızlı tatmin eden hedef bu: {sure} gün sonunda çalıp paylaşabileceğin bir şarkın olur.",
            "target_skills": _HEDEF_SEVIYE["gitar"], "duration_days": sure,
            "success_metric": "Seçtiğin şarkıyı 3 dakika boyunca duraksamadan çalmak"}
    if t == "veri":
        return {"candidates": [
            {"title": "Temel veri yapılarını seçip gerekçesiyle kullanabilmek (dizi, bağlı liste, yığın, kuyruk, hash, ağaç)", "fit_score": 90,
             "reason": "Hem mülakat hem ders sınavları için çekirdek; sonraki algoritma konularının temeli."},
            {"title": "Algoritma analizi ve sıralamada derinleşmek", "fit_score": 68, "reason": "Önce yapıları bilmek gerekir."},
            {"title": "Yarışmalı programlama problemlerine başlamak", "fit_score": 48, "reason": "Temel oturmadan hayal kırıklığı yaratır."}],
            "selected": "Temel veri yapılarını seçip gerekçesiyle kullanabilmek (dizi, bağlı liste, yığın, kuyruk, hash, ağaç)",
            "rationale": f"Günde {dakika} dakikayla {sure} günde en çok işe yarayan çekirdek: önce karmaşıklık, sonra doğrusal yapılar, hash, ağaçlar ve graflara giriş. Her yapıyı \"ne zaman seçerim?\" sorusuyla öğrenirsin.",
            "target_skills": _HEDEF_SEVIYE["veri"], "duration_days": sure,
            "success_metric": "Verilen 5 probleme uygun veri yapısını seçip nedenini anlatabilmek"}
    b = _genel_beceriler(konu)
    return {"candidates": [
        {"title": f"{konu} için {sure} günlük temel sprint", "fit_score": 80, "reason": "Küçük adımlarla istikrar kurar."},
        {"title": f"{konu} üzerinde küçük bir proje bitirmek", "fit_score": 64, "reason": "Önce temeller gerekir."},
        {"title": f"{konu} için ileri düzey kaynakları taramak", "fit_score": 40, "reason": "Başlangıç için erken."}],
        "selected": f"{konu} için {sure} günlük temel sprint",
        "rationale": f"{konu} için günde {dakika} dakikayla {sure} günde ölçülebilir bir temel kurmak en gerçekçi seçenek.",
        "target_skills": {x: 2.5 for x in b}, "duration_days": sure,
        "success_metric": f"{konu} hakkında 3 dakika kendi sözlerinle anlatım yapabilmek"}


# --------------------------------------------------------------- yol haritası
_TUREV = [
    ("learn", "limit ve süreklilik", "Türevin tanımını limitle yaz ve iki örnekle hesapla"),
    ("learn", "türev kuralları", "Kuvvet kuralı: xⁿ'in türevi, 6 örnek"),
    ("practice", "türev kuralları", "Kuvvet ve toplam kuralıyla 8 kısa soru çöz"),
    ("learn", "türev kuralları", "Çarpım kuralını türet ve 3 soruda uygula"),
    ("practice", "türev kuralları", "Çarpım ve bölüm kuralıyla 6 soru çöz"),
    ("learn", "türev kuralları", "Zincir kuralı: iç içe fonksiyonları ayırt etmeyi çalış"),
    ("reflect", "türev kuralları", "1. hafta: hangi kural seni en çok zorladı? 3 cümle yaz"),
    ("practice", "türev kuralları", "Zincir kuralıyla 6 soru çöz, hatalarını işaretle"),
    ("learn", "uygulamalar", "Teğet doğrusunun denklemini bir örnekle çıkar"),
    ("practice", "uygulamalar", "Teğet ve normal doğru: 5 soru"),
    ("learn", "uygulamalar", "Artan ve azalan fonksiyon: türevin işareti"),
    ("practice", "uygulamalar", "İşaret tablosu çiz: 4 fonksiyon"),
    ("learn", "uygulamalar", "Yerel ekstremum: birinci türev testi"),
    ("reflect", "uygulamalar", "2. hafta değerlendirmesi: neyi bitirdin, neyi eksik bıraktın?"),
    ("practice", "uygulamalar", "Ekstremum soruları: 5 soru"),
    ("learn", "uygulamalar", "İkinci türev ve konkavlık"),
    ("practice", "uygulamalar", "Optimizasyon: kutu hacmi problemi"),
    ("practice", "uygulamalar", "Süreli 10 soruluk mini deneme"),
    ("learn", "türev kuralları", "Yanlışlarının kök nedenini yaz"),
    ("practice", "uygulamalar", "Eksik kalan konudan 6 soru"),
    ("reflect", "uygulamalar", "Vize öncesi son değerlendirme ve tekrar planı"),
]
_TUREV_ANLAT = {4: "çarpım kuralı", 8: "türevin anlamı", 12: "artan ve azalan fonksiyon", 16: "ekstremum", 20: "zincir kuralı"}

_GITAR = [
    ("learn", "akorlar", "Am akorunu çal: parmak yerleşimini 5 kez tekrarla"),
    ("learn", "akorlar", "C akorunu çal ve tellerin temiz ses verdiğini kontrol et"),
    ("practice", "geçişler", "Am ↔ C geçişi: metronom 50'de 2 dakika"),
    ("learn", "akorlar", "G akorunu çal"),
    ("practice", "geçişler", "C ↔ G geçişi: metronom 50'de 2 dakika"),
    ("learn", "ritim", "Aşağı-yukarı tırmalama kalıbı: boş tellerde"),
    ("reflect", "geçişler", "1. hafta: hangi geçiş en çok takıldı? Kaydet ve dinle"),
    ("practice", "ritim", "Am-C-G ile tırmalama, metronom 60'ta"),
    ("learn", "akorlar", "Em akorunu çal"),
    ("practice", "geçişler", "G ↔ Em geçişi 2 dakika"),
    ("practice", "ritim", "4 akorla döngü: Am-C-G-Em"),
    ("learn", "ritim", "Şarkının ritim kalıbını dinleyerek çöz"),
    ("practice", "geçişler", "Şarkının nakaratını yavaş çal"),
    ("reflect", "ritim", "2. hafta: kendini kaydet, neyi düzelteceksin?"),
    ("practice", "ritim", "Şarkının kıtasını nakaratla birleştir"),
    ("practice", "geçişler", "Zor geçişlere 10 dakika odaklan"),
    ("practice", "ritim", "Şarkıyı metronomsuz çal"),
    ("practice", "ritim", "Şarkıyı baştan sona çal ve kaydet"),
    ("learn", "akorlar", "Kayıttaki hataları not et"),
    ("practice", "geçişler", "Hata notlarından seçtiğin yeri 15 dakika çalış"),
    ("reflect", "ritim", "Final kaydı: 3 dakika duraksamadan çal"),
]
_GITAR_ANLAT = {4: "G akoru", 8: "tırmalama kalıbı", 12: "akor geçişleri", 16: "şarkının yapısı", 20: "ritim ve tempo"}


_VERI = [
    ("learn", "karmaşıklık", "Big-O nedir? O(1), O(n), O(n²) farkını üç küçük koddan çıkar"),
    ("learn", "doğrusal yapılar", "Dizi (array): indeksle erişim neden O(1)? Ekleme ve silme maliyeti"),
    ("practice", "doğrusal yapılar", "Dizi problemleri: ters çevir, en büyük elemanı bul, iki işaretçi (5 soru)"),
    ("learn", "doğrusal yapılar", "Bağlı liste: düğüm ve işaretçi mantığı; diziyle karşılaştır"),
    ("practice", "doğrusal yapılar", "Bağlı listede ekleme, silme ve ters çevirme: kendi kodunu yaz"),
    ("learn", "doğrusal yapılar", "Yığın (stack): LIFO; parantez eşleştirme örneği"),
    ("reflect", "karmaşıklık", "1. hafta: dizi mi bağlı liste mi? Hangisini ne zaman seçersin? 3 cümle yaz"),
    ("learn", "doğrusal yapılar", "Kuyruk (queue) ve deque: FIFO; liste yerine deque neden?"),
    ("practice", "doğrusal yapılar", "Yığın ve kuyrukla 5 soru (geçerli parantez, kuyruktan yığın yap)"),
    ("learn", "doğrusal yapılar", "Hash tablosu: hash fonksiyonu, çakışma, ortalama O(1) arama"),
    ("practice", "doğrusal yapılar", "Sözlük ve küme ile 6 soru (frekans sayma, tekrar bulma, iki toplam)"),
    ("learn", "ağaçlar ve graflar", "Ağaç terimleri: kök, yaprak, derinlik, yükseklik; ikili ağaç"),
    ("practice", "ağaçlar ve graflar", "İkili ağaçta gezinti: inorder, preorder, postorder (özyinelemeyle)"),
    ("reflect", "doğrusal yapılar", "2. hafta: hash tablosunu bir arkadaşına nasıl anlatırdın? Yaz"),
    ("learn", "ağaçlar ve graflar", "İkili arama ağacı (BST): arama, ekleme; dengesizlik sorunu"),
    ("practice", "ağaçlar ve graflar", "BST problemleri: doğrula, en küçük ortak ata (4 soru)"),
    ("learn", "ağaçlar ve graflar", "Yığın (heap) ve öncelik kuyruğu: en küçük eleman O(log n)"),
    ("learn", "ağaçlar ve graflar", "Graflara giriş: komşuluk listesi; BFS ve DFS fikri"),
    ("practice", "ağaçlar ve graflar", "BFS ve DFS ile küçük bir labirent ya da ada sayma problemi"),
    ("practice", "karmaşıklık", "Karışık 6 problem: her birinde veri yapısını seç ve nedenini yaz"),
    ("reflect", "karmaşıklık", "Final değerlendirme: tablo çiz: yapı, erişim, arama, ekleme maliyetleri"),
]
_VERI_ANLAT = {4: "bağlı liste", 8: "yığın ve kuyruk", 12: "hash tablosu", 16: "ikili arama ağacı", 20: "BFS ve DFS"}


def yol(alan: str, konu: str, dakika: int) -> dict:
    t = _tip(konu)
    banka, anlat = ((_TUREV, _TUREV_ANLAT) if t == "turev" else (_GITAR, _GITAR_ANLAT) if t == "gitar"
                    else (_VERI, _VERI_ANLAT) if t == "veri" else (None, None))
    gun_dk = 25 if alan == "akademik" else 15
    gun_dk = min(gun_dk, max(10, dakika))
    if banka is None:
        b = _genel_beceriler(konu)
        sabit = [("learn", b[0], f"{konu}: temel kavramları öğren ve 3 not çıkar"),
                 ("learn", b[0], f"{konu}: bir örneği baştan sona incele"),
                 ("practice", b[1], f"{konu}: küçük bir alıştırma yap")]
        banka = []
        for d in range(1, 22):
            tip = "reflect" if d % 7 == 0 else "practice" if d % 2 == 0 else "learn"
            s = b[(d - 1) % 3]
            ad = {"reflect": f"{d // 7}. hafta: neyi bitirdin, seni ne zorladı?", "practice": f"{konu}: {s} için uygulama yap",
                  "learn": f"{konu}: {s} için bir kaynak çalış ve 3 not çıkar"}[tip]
            banka.append((tip, s, ad))
        anlat = {4: f"{konu} temelleri", 8: f"{konu} örnek", 12: f"{konu} uygulama", 16: f"{konu} özet", 20: f"{konu} genel"}
    tasks = []
    for d, (tip, beceri, baslik) in enumerate(banka, 1):
        tasks.append({"id": f"{alan[0]}{d}", "day": d, "title": baslik, "minutes": 15 if tip == "reflect" else gun_dk,
                      "skill": beceri, "difficulty": 1 if d <= 3 else 2 if d <= 14 else 3, "type": tip, "done": False})
        if d in anlat:
            tasks.append({"id": f"{alan[0]}{d}t", "day": d, "title": f"Anlat: {anlat[d]}", "minutes": 10, "skill": beceri,
                          "difficulty": 2, "type": "teach", "done": False})
    return {"weeks": [{"week": 1, "theme": "Temeller", "milestone": "Temel kavramları kendi sözlerinle anlatabilmek"},
                      {"week": 2, "theme": "Uygulama", "milestone": "Orta düzey alıştırmaları hatasız yapabilmek"},
                      {"week": 3, "theme": "Pekiştirme", "milestone": "Hedef çıktıyı ortaya koymak"}],
            "tasks": tasks}


def hatirlatma_gorevi(konu: str) -> str:
    return f"5 dakikalık mini görev: {konu} notlarına göz at"


def konu_adi(konu: str) -> str:
    return re.sub(r"\s+", " ", konu).strip()
