"""İkizine öğret akışını BAĞLI DİL MODELİYLE uçtan uca sınar (demo modunda çalışmaz).

Kullanım:  python3 llm_kontrol.py && python3 canli_ogret_kontrol.py
(Windows: .venv\\Scripts\\python canli_ogret_kontrol.py · macOS: .venv/bin/python canli_ogret_kontrol.py)

Senaryo: bir doğru ve bir bilerek hatalı cümle anlatılır → sınav → hatalı cümle düzeltilir → yeniden sınav.
Kontrol edilenler:
  1. Kaşif'in soruları anlatılan cümlelere dayanıyor mu (her soru bir cümleyi sınıyor mu)?
  2. Hatalı cümleyi sınayan soru Hakem tarafından "yanlış/eksik" sayılıyor mu?
  3. Düzeltmeden sonra o soru korunuyor ve "doğru"ya dönüyor mu?
"""
import sys
import time

import ayar

ayar.yukle()

import ikiz_ajan as ia  # noqa: E402
import ogret_ajani as oa  # noqa: E402

KONU, KAVRAM = "Veri Yapıları", "bağlı liste"
DOGRU = "Bağlı listede her düğüm, verisiyle birlikte bir sonraki düğümün adresini tutar."
HATALI = "Bağlı listede bir elemana indeksle doğrudan, tek adımda ulaşılır."
DUZELTME = "Bağlı listede indeks yoktur; bir elemana ulaşmak için baştan başlayıp düğüm düğüm ilerlemek gerekir."
ETIKET = {"dogru": "DOĞRU", "eksik": "EKSİK", "yanlis": "YANLIŞ", "anlatilmadi": "ANLATILMADI"}


def tur(baslik: str, cumleler: list[str], oturum: str) -> oa.TeachResult:
    print(f"\n=== {baslik} ===")
    for i, c in enumerate(cumleler, 1):
        print(f"  {i}. {c}")
    t0 = time.time()
    r = oa.ikize_ogret(KONU, KAVRAM, "\n".join(cumleler), oturum=oturum)
    print(f"  ({time.time() - t0:.1f} sn)")
    if r.guvenlik.get("engel"):
        sys.exit(f"Anlatım güvenlik denetiminden geçmedi: {r.guvenlik}")
    v_by = {v.question_id: v for v in r.verdicts}
    a_by = {a.question_id: a for a in r.answers}
    for q in r.exam:
        v, a = v_by.get(q.id), a_by.get(q.id)
        print(f"\n  Soru ({q.id}) · sınadığı cümle: {q.hedef or '—'}\n    {q.question}")
        print(f"    İkiz: {a.answer if a else '—'}  [dayandığı: {a.cited if a else '—'}]")
        print(f"    Hakem: {ETIKET.get(v.result, v.result) if v else '—'}" + (f" · ipucu: {v.hint}" if v and v.hint else ""))
    print(f"\n  Puan: {r.score}/{len(r.exam)} · yıldız: {r.star}")
    return r


def main() -> None:
    if ia.is_mock():
        sys.exit("Model anahtarı bulunamadı; bu kontrol yalnızca bağlı dil modeliyle yapılır. Önce .env dosyasına LLM_API_KEY yaz.")
    print(f"Sağlayıcı: {ia.provider()} · Kaşif/Hakem: {ia.model_name('Kaşif')} · İkiz: {ia.model_name('İkiz')}")
    oturum = f"kontrol-{int(time.time())}"
    try:
        r1 = tur("1. tur: bir doğru, bir hatalı cümle", [DOGRU, HATALI], oturum)
        r2 = tur("2. tur: hatalı cümle düzeltildi", [DOGRU, DUZELTME], oturum)
    except ia.HATALAR as e:
        sys.exit(f"\nModel çağrısı başarısız: {e}\n→ Önce 'python3 llm_kontrol.py' ile bağlantıyı doğrula.")

    v1 = {v.question_id: v.result for v in r1.verdicts}
    hedefli = sum(1 for q in r1.exam if q.hedef)
    hatali_sorular = [q for q in r1.exam if 2 in q.hedef]
    yakalandi = [q for q in hatali_sorular if v1.get(q.id) in ("yanlis", "eksik")]
    v2 = {v.question_id: v.result for v in r2.verdicts}
    q2 = {q.question.strip().lower(): q for q in r2.exam}
    korunan = [q2[q.question.strip().lower()] for q in yakalandi if q.question.strip().lower() in q2]
    duzeldi = [q for q in korunan if v2.get(q.id) == "dogru"]

    print("\n=== SONUÇ ===")
    kontroller = [
        ("Kaşif'in soruları anlatılan cümlelere dayanıyor", hedefli == len(r1.exam) and len(r1.exam) > 0, f"{hedefli}/{len(r1.exam)} soru bir cümleyi sınıyor"),
        ("Hatalı cümleyi sınayan soru var", bool(hatali_sorular), f"{len(hatali_sorular)} soru"),
        ("Hakem hatalı cümleyi yakaladı", bool(yakalandi), f"{len(yakalandi)} soru yanlış/eksik"),
        ("Düzeltmeden sonra o soru korundu", bool(korunan), f"{len(korunan)} soru"),
        ("Korunan soru doğruya döndü", bool(duzeldi), f"{len(duzeldi)} soru doğru"),
    ]
    for ad, ok, ayrinti in kontroller:
        print(f"  {'✓' if ok else '✗'} {ad} ({ayrinti})")
    gecti = all(ok for _, ok, _ in kontroller)
    print("\nGEÇTİ: akış bağlı modelle beklendiği gibi çalışıyor." if gecti else
          "\nKALDI: yukarıdaki ✗ satırları ve soru dökümünü paylaş; istemi ona göre düzeltelim.")
    sys.exit(0 if gecti else 1)


if __name__ == "__main__":
    main()
