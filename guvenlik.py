"""İkizine öğret: giriş güvenliği.

Kullanıcının yazdığı cümleler ikizin tek bilgi kaynağıdır ve LLM'e gider. Bu yüzden:
  1. Kişisel veri (TC kimlik no, telefon, e-posta, IBAN, kart) modele ve loglara hiç ulaşmaz.
  2. Talimat enjeksiyonu ("önceki kuralları unut", "hepsini doğru say") ayıklanır.
  3. Kendine zarar / başkasına zarar içeren içerik işlenmez; destek mesajı gösterilir.
  4. Boyut sınırı ve oran sınırı vardır.
  5. İkizin cevabı, atıf yaptığı cümlelerle örtüşmüyorsa "anlatılmadı" sayılır (bilgi sızıntısı koruması).

Kural tabanlı bu katman İLK SAVUNMA hattıdır; üretimde bir moderasyon modeliyle desteklenmelidir.
"""
from __future__ import annotations
import re
import time
from dataclasses import dataclass, field

MAX_KARAKTER = 1500
MAX_CUMLE = 20
MAX_CUMLE_UZUNLUK = 300
SAATLIK_TUR = 12

DESTEK_MESAJI = ("Yazdıkların beni düşündürdü. Kendini kötü hissediyorsan yalnız değilsin: "
                 "acil bir durumdaysan 112'yi ara, konuşmak istersen ALO 183 Sosyal Destek Hattı'na "
                 "ulaşabilirsin. Bu konuyu öğrenme görevinin dışında tutuyorum.")


import unicodedata

_GORUNMEZ = re.compile("[\u200b-\u200f\u2028-\u202e\u2060-\u2064\u206a-\u206f\ufeff\u00ad\u180e]")
_KONTROL = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
# Latin harflere benzeyen Kiril/Yunan karakterleri (gizleme saldırıları için)
_BENZER = str.maketrans({"а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y", "і": "i", "ј": "j", "ѕ": "s",
                         "А": "A", "Е": "E", "О": "O", "Р": "P", "С": "C", "Х": "X", "Т": "T", "М": "M", "Н": "H", "К": "K", "В": "B",
                         "ο": "o", "ρ": "p", "ν": "v", "α": "a", "ε": "e", "Ι": "I", "Ο": "O", "Α": "A"})


def temizle(metin: str) -> str:
    """Denetimden önce: Unicode normalleştirme (tam genişlik rakam vb.), görünmez/kontrol karakterlerini silme, benzer harf eşleme."""
    m = unicodedata.normalize("NFKC", metin or "")
    m = _GORUNMEZ.sub("", m)
    m = _KONTROL.sub("", m)
    return m.translate(_BENZER)


def _norm(s: str) -> str:
    tr = str.maketrans({"İ": "i", "I": "i", "ı": "i", "Ş": "s", "ş": "s", "Ğ": "g", "ğ": "g",
                        "Ü": "u", "ü": "u", "Ö": "o", "ö": "o", "Ç": "c", "ç": "c"})
    return s.translate(tr).lower()


# ---------------------------------------------------------------- kişisel veri
def _tc_gecerli(d: str) -> bool:
    if len(d) != 11 or not d.isdigit() or d[0] == "0":
        return False
    n = [int(c) for c in d]
    if ((sum(n[0:9:2]) * 7) - sum(n[1:8:2])) % 10 != n[9]:
        return False
    return sum(n[:10]) % 10 == n[10]


def _luhn(d: str) -> bool:
    s, alt = 0, False
    for c in reversed(d):
        x = int(c)
        if alt:
            x *= 2
            x -= 9 if x > 9 else 0
        s += x
        alt = not alt
    return s % 10 == 0


RE_EPOSTA = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
RE_TELEFON = re.compile(r"(?<!\d)(?:\+?90[\s-]?|0)?\(?5\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)")
RE_IBAN = re.compile(r"\bTR\d{2}(?:[\s]?\d{4}){5}[\s]?\d{2}\b", re.I)
RE_SAYI_DIZISI = re.compile(r"(?<!\d)\d(?:[\s-]?\d){10,18}(?!\d)")


def kisisel_veri_bul(metin: str) -> list[dict]:
    """[{tur, span:(a,b)}]. Aralıklar çakışmaz."""
    bulunan: list[dict] = []
    for tur, rx in (("e-posta", RE_EPOSTA), ("IBAN", RE_IBAN), ("telefon", RE_TELEFON)):
        for m in rx.finditer(metin):
            bulunan.append({"tur": tur, "span": m.span()})
    for m in RE_SAYI_DIZISI.finditer(metin):
        d = re.sub(r"\D", "", m.group())
        tur = "TC kimlik no" if _tc_gecerli(d) else "kart numarası" if 13 <= len(d) <= 19 and _luhn(d) else None
        if tur:
            bulunan.append({"tur": tur, "span": m.span()})
    bulunan.sort(key=lambda x: x["span"])
    out, son = [], -1
    for b in bulunan:
        if b["span"][0] >= son:
            out.append(b)
            son = b["span"][1]
    return out


def maskele(metin: str) -> str:
    """Loglara yazmadan önce kullan."""
    for b in reversed(kisisel_veri_bul(metin)):
        metin = metin[:b["span"][0]] + f"[{b['tur']}]" + metin[b["span"][1]:]
    return metin


# --------------------------------------------------------------- enjeksiyon
_ENJEKSIYON = [
    r"onceki (talimat|kural|komut|mesaj)", r"yukaridaki (talimat|kural|komut)",
    r"(talimat|kural)(lari|lar)? (unut|yok say|gormezden|iptal)", r"gormezden gel",
    r"sistem (prompt|mesaj|talimat)", r"system prompt", r"ignore (all |the |any )?(previous|above|prior)",
    r"disregard", r"you are now", r"\bsen artik\b", r"\brol(un|u)?(u)? (degistir|unut)",
    r"hakem (ol|gibi davran)", r"(hepsini|butun cevaplari|tum cevaplari|her cevabi) dogru say",
    r"dogru (olarak )?isaretle", r"jailbreak", r"\bdan modu\b", r"(api|gizli) anahtar", r"referans cevab(i|lari)",
    r"</?\s*(system|assistant|user|sistem)\b", r"```", r"^\s*#{3,}",
]
_RE_ENJ = [re.compile(p) for p in _ENJEKSIYON]


def enjeksiyon_mu(cumle: str) -> bool:
    n = _norm(cumle)
    return any(rx.search(n) for rx in _RE_ENJ)


# ------------------------------------------------------------ hassas içerik
_KENDINE_ZARAR = [r"intihar", r"kendime zarar", r"kendimi (oldur|kes|asmak)", r"olmek istiyorum",
                  r"yasamak istemiyorum", r"kendimi bitir"]
_ZARAR_URETIM = [r"\b(bomba|patlayici|zehir|silah|uyusturucu)\w*\s+(nasil\s+)?(yap(ilir|imi|ma|ilis|mak)|uret|sentez|hazirla)",
                 r"\b(bomba|patlayici|zehir|silah|uyusturucu)\w*\s+(yap|uret|sentezle|hazirla)\b"]
_RE_KZ = [re.compile(p) for p in _KENDINE_ZARAR]
_RE_ZU = [re.compile(p) for p in _ZARAR_URETIM]


def hassas_icerik(metin: str) -> str | None:
    n = _norm(metin)
    if any(rx.search(n) for rx in _RE_KZ):
        return "kendine_zarar"
    if any(rx.search(n) for rx in _RE_ZU):
        return "zarar_uretimi"
    return None


# ------------------------------------------------------------------ denetim
@dataclass
class Denetim:
    izin: bool                                    # ikize gönderilebilir mi
    cumleler: list[str] = field(default_factory=list)
    uyarilar: list[dict] = field(default_factory=list)   # [{kod, mesaj, cumle_no?}]
    engel: str | None = None                      # izin False ise sebep kodu
    mesaj: str | None = None                      # kullanıcıya gösterilecek metin


def cumlelere_bol(metin: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", metin.strip())
    return [p.strip() for p in parts if len(p.strip()) > 2]


_son_turlar: dict[str, list[float]] = {}


def hiz_siniri_asildi(oturum: str, simdi: float | None = None) -> bool:
    simdi = simdi or time.time()
    t = [x for x in _son_turlar.get(oturum, []) if simdi - x < 3600]
    if len(t) >= SAATLIK_TUR:
        _son_turlar[oturum] = t
        return True
    t.append(simdi)
    _son_turlar[oturum] = t
    return False


def denetle(metin: str, oturum: str | None = None) -> Denetim:
    metin = temizle(metin)
    if len(metin) > MAX_KARAKTER:
        return Denetim(False, engel="cok_uzun",
                       mesaj=f"Anlatımın çok uzun ({len(metin)} karakter). En fazla {MAX_KARAKTER} karakter: önemli kısımları seç.")
    h = hassas_icerik(metin)
    if h == "kendine_zarar":
        return Denetim(False, engel=h, mesaj=DESTEK_MESAJI)
    if h:
        return Denetim(False, engel=h, mesaj="Bu konuyu ikizine öğretemem. Öğrenme görevine uygun bir konu seç.")
    kv = kisisel_veri_bul(metin)
    if kv:
        turler = ", ".join(sorted({b["tur"] for b in kv}))
        return Denetim(False, engel="kisisel_veri", uyarilar=[{"kod": "kisisel_veri", "mesaj": turler}],
                       mesaj=f"Anlatımında {turler} var. Kişisel bilgiyi çıkar; ikizin buna ihtiyaç duymaz.")
    if oturum and hiz_siniri_asildi(oturum):
        return Denetim(False, engel="hiz_siniri", mesaj="Bu saat için sınav hakkın doldu. Biraz dinlen, sonra devam edelim.")

    cumleler, uyarilar = [], []
    for i, c in enumerate(cumlelere_bol(metin), 1):
        if enjeksiyon_mu(c):
            uyarilar.append({"kod": "talimat_gibi", "cumle_no": i,
                             "mesaj": "Bu cümle ikize talimat gibi yazılmış, atlandı. Konuyu anlatır gibi yaz."})
            continue
        if len(c) > MAX_CUMLE_UZUNLUK:
            uyarilar.append({"kod": "uzun_cumle", "cumle_no": i, "mesaj": "Cümle çok uzun, kısaltıp böl."})
            continue
        cumleler.append(c)
    if len(cumleler) > MAX_CUMLE:
        cumleler = cumleler[:MAX_CUMLE]
        uyarilar.append({"kod": "cok_cumle", "mesaj": f"İlk {MAX_CUMLE} cümle alındı."})
    if not cumleler:
        return Denetim(False, uyarilar=uyarilar, engel="bos", mesaj="Sınava girecek bir cümle kalmadı. Konuyu kendi sözlerinle anlat.")
    return Denetim(True, cumleler, uyarilar)


# --------------------------------------------------------- çıktı doğrulama
def alan_denetle(metin: str) -> Denetim:
    """Kısa form alanları (ad, konu, not, kaynak adı) için: kişisel veri, zararlı içerik ve talimat denetimi.
    Öğretme metnine özgü "cümle" kuralları uygulanmaz; "AI" ya da "C#" gibi kısa bir konu da geçerlidir."""
    metin = temizle(metin)
    h = hassas_icerik(metin)
    if h == "kendine_zarar":
        return Denetim(False, engel=h, mesaj=DESTEK_MESAJI)
    if h:
        return Denetim(False, engel=h, mesaj="Bu içerik kabul edilmedi. Öğrenmeyle ilgili bir şey yaz.")
    kv = kisisel_veri_bul(metin)
    if kv:
        turler = ", ".join(sorted({b["tur"] for b in kv}))
        return Denetim(False, engel="kisisel_veri", mesaj=f"Bu alanda {turler} var. Kişisel bilgi yazma.")
    if enjeksiyon_mu(metin):
        return Denetim(False, engel="talimat_gibi", mesaj="Bu alan talimat gibi yazılmış. Yalnızca istenen bilgiyi yaz.")
    return Denetim(True)


def _icerik_kelimeleri(s: str) -> set[str]:
    return {w[:5] for w in re.findall(r"\w+", _norm(s)) if len(w) > 3}


def cevap_atifla_ortusuyor_mu(cevap: str, cited: list[int], cumleler: list[str], esik: float = 0.5) -> bool:
    """İkizin cevabındaki içerik kelimelerinin en az %esik'i atıf yaptığı cümlelerde geçmeli.
    Geçmiyorsa ikiz kendi bilgisini kullanmıştır."""
    kaynak = " ".join(cumleler[c - 1] for c in cited if 1 <= c <= len(cumleler))
    k = _icerik_kelimeleri(cevap)
    if not k:
        return True
    return len(k & _icerik_kelimeleri(kaynak)) / len(k) >= esik


# ------------------------------------------------- ekibe görev verme denetimi
_ODEV_YAPTIRMA = [
    r"(odev|proje|rapor|tez|makale|essay|kompozisyon|lab)\w*\W*\d*\W*\w{0,3}\s*(yap|yaz|coz|hazirla|bitir)(?!\w*\s*(plan|takvim))\b",
    r"\bbenim yerime\b", r"\byerime (yap|yaz|coz|gir)",
    r"(sinavda|sinavimda|quizde).{0,25}(cevap|coz)",
]
_RE_ODEV = [re.compile(p) for p in _ODEV_YAPTIRMA]


def odev_yaptirma_mi(metin: str) -> bool:
    """Ekibe 'ödevimi yap' gibi görevler verilemez: ekip anlamaya ve planlamaya yardım eder."""
    n = _norm(metin)
    return any(rx.search(n) for rx in _RE_ODEV)


def gorev_denetle(metin: str) -> Denetim:
    metin = temizle(metin).strip()
    if not metin:
        return Denetim(False, engel="bos", mesaj="Ekibe ne yaptırmak istediğini yaz.")
    if len(metin) > 400:
        return Denetim(False, engel="cok_uzun", mesaj="Görevi 400 karakterin altında anlat.")
    h = hassas_icerik(metin)
    if h == "kendine_zarar":
        return Denetim(False, engel=h, mesaj=DESTEK_MESAJI)
    if h:
        return Denetim(False, engel=h, mesaj="Bu görevi veremem. Öğrenme ve planlamayla ilgili bir görev yaz.")
    kv = kisisel_veri_bul(metin)
    if kv:
        turler = ", ".join(sorted({b["tur"] for b in kv}))
        return Denetim(False, engel="kisisel_veri", mesaj=f"Görevde {turler} var. Kişisel bilgiyi çıkar.")
    if enjeksiyon_mu(metin):
        return Denetim(False, engel="talimat_gibi", mesaj="Bu görev ekibe kural değiştirtmeye çalışıyor gibi görünüyor. Ne istediğini düz cümleyle anlat.")
    if odev_yaptirma_mi(metin):
        return Denetim(False, engel="odev_yaptirma",
                       mesaj="Ödevini senin yerine yapamam; ama anlamana yardım edebilirim: konuyu birlikte çalışır, mini sınav hazırlar ya da teslim gününe göre planı düzenleriz.")
    return Denetim(True, [metin])


def ipucu_sizdiriyor_mu(ipucu: str, referans: str, cumleler: list[str], soru: str = "") -> bool:
    """Hakem ipucu, kullanıcının anlatmadığı referans içeriğini söylüyorsa True."""
    bilinen = set()
    for c in cumleler + [soru]:
        bilinen |= _icerik_kelimeleri(c)
    sizan = (_icerik_kelimeleri(ipucu) & _icerik_kelimeleri(referans)) - bilinen
    return len(sizan) >= 3
