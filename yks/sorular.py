"""Özgün, YKS tarzı AYT matematik soruları (ÖSYM sorularının kopyası DEĞİLDİR).

Her soru: eyalet, kalıp (ÖSYM'de sık görülen soru tipi), 5 şık, doğru şık ve
yanlış şık başına hata türü. Hata türleri:
  bilgi_eksigi | dikkat_hatasi | kavram_yanilgisi | islem_hatasi
Her cevap sympy ile soru metninden bağımsız hesaplanıp doğrulanır:  python3 sorular.py
"""
import json
from sympy import (symbols, Rational as R, sqrt, pi, oo, I, log, simplify, solve, solveset,
                   Interval, sin, cos, integrate, diff, expand, Poly, binomial, Eq, S, N, Symbol)

x, a, m = symbols("x a m", real=True)
SORULAR = []


def q(eyalet, zor, kalip, soru, secenek, hesap, tuzak, cozum):
    SORULAR.append(dict(eyalet=eyalet, zorluk=zor, kalip=kalip, soru=soru,
                        secenek=secenek, hesap=hesap, tuzak=tuzak, cozum=cozum))


H_B, H_D, H_K, H_I = "bilgi_eksigi", "dikkat_hatasi", "kavram_yanilgisi", "islem_hatasi"

# ---------------------------------------------------------------- Temel Ovası
q("tk", 3, "Rakam bulma + bölünebilme",
  "a ve b birer rakam olmak üzere, beş basamaklı 2a73b sayısı 45 ile tam bölünebilmektedir.\n"
  "Buna göre, a'nın alabileceği değerlerin toplamı kaçtır?",
  [("1", 1), ("6", 6), ("7", 7), ("8", 8), ("9", 9)],
  lambda: sum({aa for aa in range(10) for bb in range(10) if int(f"2{aa}73{bb}") % 45 == 0}),
  {0: (H_D, "Yalnızca b = 5 durumunu buldun; b = 0 durumunu atladın."),
   1: (H_D, "Yalnızca b = 0 durumunu buldun; b = 5 durumunu atladın."),
   3: (H_B, "45 = 5·9 ayrımını kullanmadan 9 kuralını tek başına uyguladın."),
   4: (H_B, "Son basamak koşulunu (0 ya da 5) hiç kullanmadın.")},
  "45 = 5·9. 5 için b ∈ {0, 5}. 9 için 2+a+7+3+b = 12+a+b, 9'un katı olmalı. "
  "b = 0 → a = 6; b = 5 → a = 1. Toplam 1 + 6 = 7.")

q("mk", 2, "Küme eleman sayısı",
  "A ve B sonlu kümeleri için s(A) = 12, s(B) = 9 ve s(A ∪ B) = 16'dır.\n"
  "Buna göre, s(A \\ B) + s(B \\ A) toplamı kaçtır?",
  [("4", 4), ("5", 5), ("7", 7), ("11", 11), ("16", 16)],
  lambda: (12 - (12 + 9 - 16)) + (9 - (12 + 9 - 16)),
  {0: (H_I, "s(B \\ A) değerini buldun, ikisini toplamayı unuttun."),
   1: (H_K, "Bulduğun s(A ∩ B) değerini sonuç sandın."),
   2: (H_I, "Yalnızca s(A \\ B) değerini buldun."),
   4: (H_K, "s(A ∪ B)'yi sonuç sandın; kesişimi çıkarmadın.")},
  "s(A ∩ B) = 12 + 9 − 16 = 5. s(A \\ B) = 7 ve s(B \\ A) = 4. Toplam 11.")

# --------------------------------------------------------------- Cebir Vadisi
q("fon", 3, "Bileşke fonksiyon",
  "f(x) = 3x − 2 ve (f∘g)(x) = 6x + 7 olduğuna göre, g(2) kaçtır?",
  [("4", 4), ("7", 7), ("9", 9), ("11", 11), ("19", 19)],
  lambda: (lambda g: g.subs(x, 2))(solve(Eq(3 * Symbol("g") - 2, 6 * x + 7), Symbol("g"))[0]),
  {0: (H_K, "f(2) değerini hesapladın; g(2) istenmişti."),
   2: (H_I, "Bölme ya da işaret hatası: 3g − 2 = 6x + 7 çözümünde sapma."),
   3: (H_K, "Sırayı karıştırdın: g(f(2)) hesapladın."),
   4: (H_K, "(f∘g)(2) değerini buldun; g(2) istenmişti.")},
  "3g(x) − 2 = 6x + 7 ⇒ g(x) = 2x + 3. g(2) = 7.")

q("fon", 3, "Fonksiyonda yerine koyma",
  "Her x gerçek sayısı için f(x + 1) = x² + 3x olduğuna göre, f(3) kaçtır?",
  [("4", 4), ("6", 6), ("10", 10), ("12", 12), ("18", 18)],
  lambda: (lambda f: f.subs(x, 3))(expand(((x - 1) ** 2 + 3 * (x - 1)))),
  {0: (H_K, "x + 1 = 3 yerine x = 3 − 2 aldın (f(2) buldun)."),
   1: (H_I, "x = 2 için 4 + 6 işleminde toplama sapması."),
   3: (H_I, "3² + 3 hesabıyla yanlış ifade."),
   4: (H_K, "f(3)'ü bulmak için x yerine 3 yazdın; f(x+1) ifadesini f(x)'e çevirmedin.")},
  "x + 1 = 3 ⇒ x = 2. f(3) = 2² + 3·2 = 10.")

q("pol", 3, "Kalan teoremi",
  "P(x) polinomunun x − 2 ile bölümünden kalan 5, x + 1 ile bölümünden kalan −1'dir.\n"
  "Buna göre, P(x) polinomunun x² − x − 2 ile bölümünden kalan aşağıdakilerden hangisidir?",
  [("x + 3", x + 3), ("2x + 1", 2 * x + 1), ("3x − 1", 3 * x - 1), ("2x − 3", 2 * x - 3), ("x + 4", x + 4)],
  lambda: (lambda sol: sol[a] * x + sol[Symbol("b")])(
      solve([2 * a + Symbol("b") - 5, -a + Symbol("b") + 1], [a, Symbol("b")])),
  {0: (H_I, "Denklem sisteminde sapma: a = 1 buldun."),
   2: (H_I, "İşaret hatası: P(−1) = −1 yerine P(−1) = 1 kullandın."),
   3: (H_I, "b değerini hatalı buldun."),
   4: (H_B, "Kalanı doğrusal tahmin ettin, sistemi kurmadın.")},
  "x² − x − 2 = (x − 2)(x + 1). Kalan ax + b: 2a + b = 5, −a + b = −1 ⇒ a = 2, b = 1.")

q("iki", 3, "Diskriminant ve parametre",
  "x² − mx + m + 3 = 0 denkleminin birbirine eşit iki reel kökü olduğuna göre, m'nin "
  "alabileceği değerlerin çarpımı kaçtır?",
  [("−12", -12), ("−4", -4), ("4", 4), ("6", 6), ("12", 12)],
  lambda: (lambda sol: sol[0] * sol[1])(solve(Eq(m ** 2 - 4 * (m + 3), 0), m)),
  {1: (H_K, "Kökler toplamını (m'lerin toplamı = 4) çarpım sandın, işaretle."),
   2: (H_K, "Kökler toplamı 4'ü çarpım olarak yazdın."),
   3: (H_D, "Yalnızca pozitif kökü (m = 6) aldın."),
   4: (H_I, "İşaret hatası: çarpımı pozitif buldun.")},
  "Δ = m² − 4(m + 3) = 0 ⇒ m² − 4m − 12 = 0 ⇒ m = 6 veya m = −2. Çarpım −12.")

q("kmp", 3, "Karmaşık sayının kuvveti",
  "z = 1 + i olduğuna göre, z⁶ ifadesinin değeri aşağıdakilerden hangisidir?",
  [("8", 8), ("−8", -8), ("8i", 8 * I), ("−8i", -8 * I), ("16", 16)],
  lambda: expand((1 + I) ** 6),
  {0: (H_K, "|z|⁶ değerini yazdın; z⁶ bir karmaşık sayıdır."),
   1: (H_I, "i³ = −i yerine i³ = −1 aldın."),
   2: (H_I, "i³ = i aldın."),
   4: (H_I, "z⁸ ya da |z|⁸ ile karıştırdın.")},
  "z² = 2i. z⁶ = (2i)³ = 8·i³ = −8i.")

# ------------------------------------------------------------- Sayma Adaları
q("komb", 3, "Olasılık (tümleyen)",
  "Bir rafta 5 matematik ve 3 fizik kitabı vardır. Raftan rastgele 3 kitap alınıyor.\n"
  "Alınan kitaplar arasında en az bir fizik kitabı bulunma olasılığı kaçtır?",
  [("5/28", R(5, 28)), ("15/28", R(15, 28)), ("3/8", R(3, 8)), ("23/28", R(23, 28)), ("25/28", R(25, 28))],
  lambda: 1 - binomial(5, 3) / binomial(8, 3),
  {0: (H_K, "Hiç fizik kitabı gelmeme olasılığını buldun, 1'den çıkarmadın."),
   1: (H_I, "Tek fizik kitabı durumunu hesapladın."),
   2: (H_B, "Seçimleri sıralı saymadan oran kurdun."),
   4: (H_I, "Tümleyeni yanlış sayıp 1'den çıkardın.")},
  "Tümleyen: hiç fizik yok = C(5,3)/C(8,3) = 10/56 = 5/28. İstenen 1 − 5/28 = 23/28.")

q("binom", 3, "Binom açılımında sabit terim",
  "(x + 2/x)⁶ açılımındaki sabit terim kaçtır?",
  [("20", 20), ("64", 64), ("120", 120), ("160", 160), ("240", 240)],
  lambda: binomial(6, 3) * 2 ** 3,
  {0: (H_B, "C(6,3) buldun, 2³ çarpanını unuttun."),
   1: (H_K, "2⁶ aldın; hangi terimin sabit olduğunu bulmadın."),
   2: (H_I, "C(6,2)·2³ hesapladın; kuvvet toplamı 0 değil."),
   4: (H_I, "C(6,4)·2⁴ hesapladın; bu x⁻² terimidir, sabit değil.")},
  "T = C(6,k)·x^(6−k)·(2/x)^k = C(6,k)·2^k·x^(6−2k). Sabit için k = 3: 20·8 = 160.")

# -------------------------------------------------------------- Üstel Dağlar
q("log", 4, "Logaritmik denklem + tanım kümesi",
  "log₂x + log₂(x − 2) = 3 denklemini sağlayan x değerlerinin toplamı kaçtır?",
  [("1", 1), ("2", 2), ("3", 3), ("4", 4), ("6", 6)],
  lambda: sum(s for s in solve(Eq(x * (x - 2), 8), x) if s > 2),
  {1: (H_D, "x = −2 kökünü tanım kümesine bakmadan dahil ettin."),
   0: (H_I, "x(x−2) = 8 yerine 6 kurdun."),
   2: (H_I, "Kökleri yanlış çarptın."),
   4: (H_I, "2³ yerine 2·3 ile devam ettin.")},
  "x > 2 olmalı. log₂[x(x−2)] = 3 ⇒ x² − 2x − 8 = 0 ⇒ x = 4 veya x = −2. Yalnız x = 4 uygundur.")

q("log", 3, "Taban değiştirme",
  "log₃2 = a olduğuna göre, log₉12 ifadesinin a türünden eşiti aşağıdakilerden hangisidir?",
  [("2a + 1", 2 * a + 1), ("a + 2", a + 2), ("(a + 1)/2", (a + 1) / 2), ("a + 1/2", a + R(1, 2)), ("2a", 2 * a)],
  lambda: (log(12) / log(9)),
  {0: (H_K, "log₃12'yi buldun; tabanın 9 olduğunu yarıya bölmeyi unuttun."),
   1: (H_I, "log₃4 yerine 2 yazdın."),
   2: (H_I, "log₃12 = a + 1 aldın; log₃4 = 2a olmalı."),
   4: (H_B, "log₉12'yi log₃4 ile karıştırdın.")},
  "log₉12 = log₃12 / 2 = (log₃4 + log₃3) / 2 = (2a + 1)/2 = a + 1/2.")

q("dizi", 3, "Aritmetik dizi",
  "Bir aritmetik dizide a₃ + a₉ = 30 olduğuna göre, bu dizinin ilk 11 teriminin toplamı kaçtır?",
  [("90", 90), ("150", 150), ("165", 165), ("180", 180), ("330", 330)],
  lambda: 11 * R(30, 2),
  {0: (H_I, "3·30 gibi sabit bir çarpanla ilerledin."),
   1: (H_K, "a₆ = 15'i toplam sandın; 11 ile çarpmadın."),
   3: (H_I, "11·a₆ yerine 12·a₆ aldın."),
   4: (H_D, "a₃ + a₉ = 30'u a₆ sanıp 11 ile çarptın.")},
  "a₃ + a₉ = 2a₆ = 30 ⇒ a₆ = 15. S₁₁ = 11·a₆ = 165.")

# ------------------------------------------------------ Trigonometri Körfezi
q("trig1", 3, "Trigonometrik özdeşlik",
  "sin x + cos x = 1/2 olduğuna göre, sin 2x değeri kaçtır?",
  [("−3/4", R(-3, 4)), ("−1/4", R(-1, 4)), ("1/4", R(1, 4)), ("1/2", R(1, 2)), ("3/4", R(3, 4))],
  lambda: ((R(1, 2)) ** 2 - 1),
  {1: (H_I, "Kareyi aldın ama 1 yerine 1/2 çıkardın."),
   2: (H_K, "Kare açılımında sin 2x'in işaretini ters aldın."),
   3: (H_K, "Verilen değeri doğrudan sonuç sandın."),
   4: (H_D, "(1/4) − 1 işleminde işaret hatası.")},
  "(sin x + cos x)² = 1 + 2 sin x cos x = 1 + sin 2x = 1/4 ⇒ sin 2x = −3/4.")

q("trig1", 2, "Birim: radyan ve derece",
  "0 < x < π olmak üzere, cos x = −1/2 denkleminin radyan cinsinden çözümü aşağıdakilerden hangisidir?",
  [("π/3", pi / 3), ("π/2", pi / 2), ("2π/3", 2 * pi / 3), ("3π/4", 3 * pi / 4), ("120", 120)],
  lambda: solveset(Eq(cos(x), R(-1, 2)), x, Interval.open(0, pi)).args[0],
  {0: (H_K, "Referans açıyı buldun; ikinci bölgeye taşımadın."),
   1: (H_B, "cos(π/2) = 0 olduğunu atladın."),
   3: (H_B, "Özel açı değerini karıştırdın."),
   4: (H_K, "120° buldun ama radyan istenmişti.")},
  "cos x = −1/2 ve 0 < x < π ⇒ x = π − π/3 = 2π/3.")

q("trig2", 4, "Trigonometrik denklem",
  "0 ≤ x ≤ 2π aralığında 2sin²x − sin x − 1 = 0 denkleminin çözüm kümesindeki elemanların "
  "toplamı kaçtır?",
  [("π/2", pi / 2), ("3π", 3 * pi), ("7π/2", 7 * pi / 2), ("4π", 4 * pi), ("9π/2", 9 * pi / 2)],
  lambda: sum(sum(solveset(Eq(sin(x), t), x, Interval(0, 2 * pi))) for t in solve(2 * Symbol('t') ** 2 - Symbol('t') - 1, Symbol('t'))),
  {0: (H_D, "Yalnızca sin x = 1 kökünü aldın."),
   1: (H_I, "sin x = −1/2 için yalnız bir açıyı aldın."),
   3: (H_I, "Açıları toplarken sapma yaptın."),
   4: (H_I, "sin x = −1 çözümünü de eklediğini sandın.")},
  "(2 sin x + 1)(sin x − 1) = 0. sin x = 1 ⇒ π/2; sin x = −1/2 ⇒ 7π/6, 11π/6. Toplam 7π/2.")

# ----------------------------------------------------------- Kalkülüs Dağları
q("lim", 3, "0/0 belirsizliği",
  "lim(x→2) (x² − 4)/(x² − 3x + 2) limitinin değeri kaçtır?",
  [("0", 0), ("1", 1), ("2", 2), ("4", 4), ("Limit yoktur", None)],
  lambda: ((x + 2) / (x - 1)).subs(x, 2),
  {0: (H_K, "0/0 görünce sonucu 0 sandın."),
   1: (H_I, "Sadeleştirme sonrası ifadeyi yanlış yazdın."),
   2: (H_I, "Sadeleştirdikten sonra paydadaki (x − 1)'i x gibi aldın."),
   4: (H_K, "0/0 belirsizliğini limit yok sandın.")},
  "(x−2)(x+2)/[(x−2)(x−1)] = (x+2)/(x−1) → 4.")

q("lim", 2, "Sonsuzda limit",
  "lim(x→∞) (3x² + x)/(2x² − 5) limitinin değeri kaçtır?",
  [("0", 0), ("1", 1), ("3/2", R(3, 2)), ("3", 3), ("∞", oo)],
  lambda: R(3, 2),
  {0: (H_K, "Payın derecesi paydadan büyük/eşit olduğunu görmedin."),
   1: (H_I, "Katsayıları yanlış oranladın."),
   3: (H_D, "Yalnızca pay katsayısını aldın."),
   4: (H_K, "Dereceler eşit, limit sonlu.")},
  "Dereceler eşit ⇒ başkatsayıların oranı: 3/2.")

q("tur", 3, "Yerel ekstremum",
  "f(x) = x³ − 6x² + 9x + 1 fonksiyonunun yerel maksimum değeri kaçtır?",
  [("1", 1), ("3", 3), ("5", 5), ("6", 6), ("9", 9)],
  lambda: (lambda f: f.subs(x, 1))(x ** 3 - 6 * x ** 2 + 9 * x + 1),
  {0: (H_K, "Yerel minimum değerini (f(3) = 1) buldun."),
   1: (H_K, "Maksimumun yerini değil, minimum noktasını aldın."),
   3: (H_I, "f(1) hesabında sapma."),
   4: (H_D, "f'(0) = 9 değerini sonuç sandın.")},
  "f'(x) = 3(x−1)(x−3). x = 1'de f' işareti +'dan −'ye geçer ⇒ yerel max. f(1) = 5.")

q("tur", 3, "Teğet denklemi",
  "f(x) = x³ − 2x eğrisinin x = 1 noktasındaki teğetinin y eksenini kestiği nokta aşağıdakilerden "
  "hangisidir?",
  [("(0, −2)", -2), ("(0, −1)", -1), ("(0, 1)", 1), ("(0, 2)", 2), ("(0, 3)", 3)],
  lambda: (lambda f: (f.subs(x, 1) - diff(f, x).subs(x, 1) * 1))(x ** 3 - 2 * x),
  {1: (H_K, "f(1) = −1 değerini y-kesişimi sandın."),
   2: (H_K, "Eğimi (f'(1) = 1) kesişim sandın."),
   3: (H_I, "İşaret hatası."),
   4: (H_I, "f'(1) = 3·1² − 2'yi yanlış hesapladın.")},
  "f(1) = −1, f'(1) = 3 − 2 = 1. Teğet: y + 1 = 1·(x − 1) ⇒ y = x − 2. Kesişim (0, −2).")

q("int", 3, "İntegralle alan",
  "y = x² − 4 eğrisi ile x ekseni arasında kalan sınırlı bölgenin alanı kaç birimkaredir?",
  [("−32/3", R(-32, 3)), ("16/3", R(16, 3)), ("8", 8), ("32/3", R(32, 3)), ("16", 16)],
  lambda: abs(integrate(x ** 2 - 4, (x, -2, 2))),
  {0: (H_K, "Belirli integralin işaretini alan sandın; alan negatif olamaz."),
   1: (H_D, "Yalnızca [0, 2] aralığını aldın."),
   2: (H_I, "Sınırları (−2, 2) yerine yanlış aldın."),
   4: (H_I, "Orantı hatası.")},
  "Alan = |∫₋₂² (x² − 4)dx| = |[x³/3 − 4x]₋₂²| = |−32/3| = 32/3.")

q("int", 3, "Değişken değiştirme",
  "∫₀¹ 2x(x² + 1)³ dx integralinin değeri kaçtır?",
  [("3/4", R(3, 4)), ("4", 4), ("15/4", R(15, 4)), ("15", 15), ("16", 16)],
  lambda: integrate(2 * x * (x ** 2 + 1) ** 3, (x, 0, 1)),
  {0: (H_I, "Sınır değerlerinde sapma."),
   1: (H_D, "Alt sınır 0 için (u = 1) değerini hesaba katmadın."),
   3: (H_B, "Bölmeyi (1/4) unuttun."),
   4: (H_K, "Yalnızca üst sınır değerini aldın.")},
  "u = x² + 1, du = 2x dx. ∫₁² u³ du = [u⁴/4]₁² = (16 − 1)/4 = 15/4.")

# -------------------------------------------------------------- Geometri Çölü
q("ucg", 3, "Dik üçgende yükseklik",
  "A köşesindeki açısı 90° olan ABC üçgeninde |AB| = 6 cm ve |AC| = 8 cm'dir.\n"
  "A köşesinden [BC] kenarına indirilen dikmenin uzunluğu kaç cm'dir?",
  [("4", 4), ("24/5", R(24, 5)), ("5", 5), ("6", 6), ("10", 10)],
  lambda: R(6 * 8, 10),
  {0: (H_I, "Alan eşitliğinde 10 yerine 12 ile böldün."),
   2: (H_K, "Kenarortay uzunluğunu (|BC|/2 = 5) buldun."),
   3: (H_K, "Kenar uzunluğunu (|AB| = 6) yazdın."),
   4: (H_K, "Hipotenüsü yükseklik sandın.")},
  "|BC| = 10. Alan = 6·8/2 = 24 = 10·h/2 ⇒ h = 24/5.")

q("ucg", 3, "Düzgün çokgen",
  "Bir iç açısı 140° olan düzgün çokgenin köşegen sayısı kaçtır?",
  [("9", 9), ("18", 18), ("27", 27), ("36", 36), ("54", 54)],
  lambda: (lambda n: n * (n - 3) / 2)(solve(Eq(180 * (Symbol("n") - 2) / Symbol("n"), 140), Symbol("n"))[0]),
  {0: (H_K, "Kenar sayısını (9) köşegen sayısı sandın."),
   1: (H_I, "n(n−3)/2 yerine n(n−3)/3 aldın."),
   3: (H_K, "C(9,2) buldun; kenarları da köşegen saydın."),
   4: (H_B, "n(n−3) formülünde 2'ye bölmeyi unuttun.")},
  "180(n−2)/n = 140 ⇒ n = 9. Köşegen sayısı n(n−3)/2 = 27.")

q("cem", 4, "Çemberde paralel kirişler",
  "Yarıçapı 13 cm olan bir çemberde, uzunlukları 24 cm ve 10 cm olan iki paralel kiriş merkezin "
  "farklı taraflarındadır.\nBu iki kiriş arasındaki uzaklık kaç cm'dir?",
  [("7", 7), ("13", 13), ("15", 15), ("17", 17), ("22", 22)],
  lambda: sqrt(13 ** 2 - 12 ** 2) + sqrt(13 ** 2 - 5 ** 2),
  {0: (H_D, "Kirişler aynı tarafta olsaydı bulunacak farkı (12 − 5) buldun."),
   1: (H_K, "Yarıçapı uzaklık sandın."),
   2: (H_I, "Pisagor'da sapma."),
   4: (H_I, "Kiriş uzunluklarını yarılamadan kullandın.")},
  "Merkezden uzaklıklar: √(13²−12²) = 5 ve √(13²−5²) = 12. Zıt taraflarda: 5 + 12 = 17.")

q("kati", 3, "Koninin toplam alanı",
  "Taban yarıçapı 3 cm, yüksekliği 4 cm olan dik dairesel koninin toplam yüzey alanı kaç π cm²'dir?",
  [("9π", 9 * pi), ("15π", 15 * pi), ("24π", 24 * pi), ("30π", 30 * pi), ("36π", 36 * pi)],
  lambda: pi * 3 * (3 + sqrt(3 ** 2 + 4 ** 2)),
  {0: (H_D, "Yalnızca taban alanını buldun."),
   1: (H_D, "Yalnızca yanal alanı buldun."),
   3: (H_I, "Yanal alanı iki kez saydın."),
   4: (H_K, "Yüksekliği (4) ana doğru yerine kullandın.")},
  "Ana doğru l = 5. Toplam alan = πr(r + l) = π·3·8 = 24π.")

# ----------------------------------------------------------- Analitik Yaylalar
q("dog", 2, "Noktanın doğruya uzaklığı",
  "A(1, 2) noktasının 3x + 4y + 10 = 0 doğrusuna uzaklığı kaç birimdir?",
  [("11/5", R(11, 5)), ("21/5", R(21, 5)), ("4", 4), ("5", 5), ("21", 21)],
  lambda: R(abs(3 * 1 + 4 * 2 + 10), 5),
  {0: (H_B, "Sabit terimi (10) payda hiç hesaba katmadın."),
   2: (H_B, "Formülü ezberden yanlış yazdın."),
   3: (H_K, "√(3²+4²) = 5'i sonuç sandın."),
   4: (H_B, "Paydadaki √(a²+b²) değerini unuttun.")},
  "d = |3·1 + 4·2 + 10| / √(3² + 4²) = 21/5.")

q("can", 4, "Çemberin analitiği",
  "x² + y² − 6x + 8y − 11 = 0 çemberi üzerindeki noktalardan orijine en yakın olanın orijine "
  "uzaklığı kaç birimdir?",
  [("1", 1), ("5", 5), ("6", 6), ("11", 11), ("√11", sqrt(11))],
  lambda: 6 - 5,
  {1: (H_K, "Orijinin merkeze uzaklığını (5) sonuç sandın."),
   2: (H_K, "Yarıçapı sonuç sandın."),
   3: (H_K, "En uzak noktayı (r + d) buldun."),
   4: (H_B, "Sabit terimi yarıçap hesabında doğrudan kök aldın.")},
  "(x−3)² + (y+4)² = 36: merkez (3, −4), r = 6. |OM| = 5 < 6 ⇒ orijin çemberin içinde. "
  "En yakın nokta uzaklığı r − |OM| = 1.")

q("don", 2, "Ardışık dönüşümler",
  "A(2, −3) noktası önce y = x doğrusuna göre yansıtılıyor, elde edilen nokta orijin etrafında "
  "180° döndürülüyor.\nSon durumda nokta aşağıdakilerden hangisidir?",
  [("(−3, 2)", (-3, 2)), ("(3, −2)", (3, -2)), ("(−2, 3)", (-2, 3)), ("(2, 3)", (2, 3)), ("(3, 2)", (3, 2))],
  lambda: (lambda p: (-p[0], -p[1]))((-3, 2)),
  {0: (H_D, "Yalnızca birinci dönüşümü uyguladın."),
   2: (H_K, "Yansımayı atlayıp yalnızca 180° döndürdün."),
   3: (H_K, "Yansıma yerine x eksenine göre yansıma aldın."),
   4: (H_I, "Döndürmede yalnızca bir koordinatın işaretini değiştirdin.")},
  "y = x yansıması: (x, y) → (y, x) = (−3, 2). 180° dönüş: (x, y) → (−x, −y) = (3, −2).")


# ------------------------------------------------------------------ doğrulama
def _esit(a_, b_):
    if b_ is None:
        return False
    if isinstance(a_, tuple) or isinstance(b_, tuple):
        return tuple(a_) == tuple(b_)
    if a_ == oo or b_ == oo:
        return a_ == b_
    if a in getattr(b_, "free_symbols", set()):
        v = {a: N(log(2) / log(3))}
        return abs(N(b_.subs(v)) - N(a_)) < 1e-9
    return simplify(S(a_) - S(b_)) == 0


def dogrula():
    sorun = 0
    for k, s in enumerate(SORULAR):
        gercek = s["hesap"]()
        esl = [i for i, (_, v) in enumerate(s["secenek"]) if _esit(gercek, v)]
        ok = len(esl) == 1
        s["dogru"] = esl[0] if ok else None
        eksik = [i for i in range(5) if i != s["dogru"] and i not in s["tuzak"]]
        if not ok or eksik:
            sorun += 1
            print(f"✗ #{k} {s['eyalet']}: eşleşen şıklar={esl}, hesap={gercek}, tuzaksız={eksik}")
    return sorun


if __name__ == "__main__":
    n = dogrula()
    print(f"{len(SORULAR)} soru, {n} sorun")
    if n == 0:
        out = []
        for i, s in enumerate(SORULAR):
            out.append(dict(id=f"{s['eyalet']}-{i + 1:02d}", eyalet=s["eyalet"], zorluk=s["zorluk"],
                            kalip=s["kalip"], soru=s["soru"], secenek=[g for g, _ in s["secenek"]],
                            dogru="ABCDE"[s["dogru"]],
                            tuzak={"ABCDE"[j]: {"tur": t, "not": nt} for j, (t, nt) in s["tuzak"].items()},
                            cozum=s["cozum"]))
        json.dump(out, open("sorular.json", "w"), ensure_ascii=False, indent=1)
        print("sorular.json yazıldı")
