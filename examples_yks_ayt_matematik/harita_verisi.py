"""AYT Matematik eyalet haritası: konu ağırlıkları, önkoşullar, stratejik sıralama.

Ağırlıklar 2018-2025 AYT dağılımlarına dayanan üç kamuya açık özetin ortalamasından
yuvarlanmış YAKLAŞIK değerlerdir (kaynaklar türev/integral/limit için birbirini tutmuyor).
Kesin karar için ÖSYM soru kitapçıkları esas alınmalıdır. 'maliyet_saat' tahminidir.
"""
import json

# id, ad, kısa ad, bölge, ort soru/yıl, (min,max), önkoşul, zorluk(1-5), tahmini saat, veri güveni
E = [
 ("tk",   "Temel Kavramlar",            "Temel",   "Temel Ovası",       4.6, (3,7), [],            2, 14, "orta"),
 ("mk",   "Mantık ve Kümeler",          "Mantık",  "Temel Ovası",       2.2, (1,4), [],            2,  6, "orta"),
 ("fon",  "Fonksiyonlar",               "Fonksiyon","Cebir Vadisi",     2.3, (2,4), ["mk"],        3, 12, "yüksek"),
 ("pol",  "Polinomlar",                 "Polinom", "Cebir Vadisi",      1.2, (0,3), ["tk"],        3,  8, "orta"),
 ("iki",  "2. Derece, Parabol, Eşitsizlik","2.Derece","Cebir Vadisi",   2.2, (1,4), ["pol"],       3, 10, "orta"),
 ("kmp",  "Karmaşık Sayılar",           "Karmaşık","Cebir Vadisi",      0.5, (0,2), ["iki"],       3,  4, "orta"),
 ("komb", "Permütasyon, Kombinasyon, Olasılık","Olasılık","Sayma Adaları",2.4,(2,3), ["tk"],       3, 12, "yüksek"),
 ("binom","Binom Açılımı",              "Binom",   "Sayma Adaları",     0.8, (0,1), ["komb"],      3,  4, "orta"),
 ("log",  "Üslü ve Logaritma",          "Logaritma","Üstel Dağlar",     2.2, (1,4), ["tk"],        3, 10, "yüksek"),
 ("dizi", "Diziler",                    "Diziler", "Üstel Dağlar",      1.3, (1,2), ["fon"],       3,  7, "yüksek"),
 ("trig1","Trigonometri I (birim çember, temel)","Trig I","Trigonometri Körfezi",2.0,(1,3),["fon"],  3, 10, "orta"),
 ("trig2","Trigonometri II (toplam-fark, denklem)","Trig II","Trigonometri Körfezi",2.3,(2,3),["trig1","iki"],4,12,"orta"),
 ("lim",  "Limit ve Süreklilik",        "Limit",   "Kalkülüs Dağları",  1.4, (0,2), ["fon"],       3,  8, "düşük"),
 ("tur",  "Türev",                      "Türev",   "Kalkülüs Dağları",  2.8, (0,6), ["lim","pol"], 4, 18, "düşük"),
 ("int",  "İntegral",                   "İntegral","Kalkülüs Dağları",  3.0, (0,6), ["tur"],       4, 16, "düşük"),
 ("ucg",  "Üçgen ve Çokgenler",         "Üçgen",   "Geometri Çölü",     2.8, (1,6), [],            3, 14, "orta"),
 ("cem",  "Çember ve Daire",            "Çember",  "Geometri Çölü",     2.0, (1,3), ["ucg"],       3, 10, "yüksek"),
 ("kati", "Katı Cisimler",              "Katı",    "Geometri Çölü",     1.1, (1,2), ["ucg"],       3,  8, "yüksek"),
 ("dog",  "Doğrunun ve Noktanın Analitiği","Doğru","Analitik Yaylalar", 2.3, (0,5), [],            3,  8, "orta"),
 ("can",  "Çemberin Analitiği",         "Çember A.","Analitik Yaylalar",0.8, (0,2), ["dog","cem"], 3,  6, "orta"),
 ("don",  "Dönüşüm Geometrisi",         "Dönüşüm", "Analitik Yaylalar", 0.8, (0,1), ["dog"],       2,  4, "orta"),
]
KEYS = ["id","ad","kisa","bolge","ort","aralik","onkosul","zorluk","saat","guven"]
P = {r[0]: dict(zip(KEYS, r)) for r in E}

def torunlar(i, seen=None):
    seen = seen if seen is not None else set()
    for k, v in P.items():
        if i in v["onkosul"] and k not in seen:
            seen.add(k); torunlar(k, seen)
    return seen

TOPLAM = sum(v["ort"] for v in P.values())
for i, v in P.items():
    t = torunlar(i)
    v["acar"] = sorted(t)
    v["acilan_ort"] = round(sum(P[x]["ort"] for x in t), 1)
    v["pay"] = round(100 * v["ort"] / TOPLAM, 1)
    v["verim"] = round(10 * v["ort"] / v["saat"], 2)            # 10 saatte beklenen soru
    v["oncelik"] = round((v["ort"] + 0.35 * v["acilan_ort"]) / v["saat"] * 10, 2)

def sefer_sirasi():
    bitti, sira = set(), []
    while len(bitti) < len(P):
        acik = [v for v in P.values() if v["id"] not in bitti and all(o in bitti for o in v["onkosul"])]
        s = max(acik, key=lambda v: v["oncelik"])
        sira.append(s["id"]); bitti.add(s["id"])
    return sira

SIRA = sefer_sirasi()

def egri():
    h = q = 0; out = []
    for i in SIRA:
        h += P[i]["saat"]; q += P[i]["ort"]
        out.append((i, h, round(q, 1)))
    return out

if __name__ == "__main__":
    print("Toplam ağırlık:", round(TOPLAM, 1))
    for n, i in enumerate(SIRA, 1):
        v = P[i]; print(f"{n:2d}. {v['kisa']:10s} ort={v['ort']:<4} saat={v['saat']:<3} öncelik={v['oncelik']:<5} açar={v['acilan_ort']}")
    print(egri())
    json.dump({"eyaletler": P, "sira": SIRA}, open("/home/claude/repo/examples_yks_ayt_matematik/harita.json","w"), ensure_ascii=False, indent=1)
