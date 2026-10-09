"""Gözlemevi: ajan ekibinin orkestratörü.

Ekip ve görev paylaşımı
  Astronom        profili okur                         (LLM)
  Kutup Yıldızı   her alan için TEK hedefi seçer       (LLM)
  Haritacı        gün gün yol haritası çizer           (LLM)
  Gözcü           ikiz motorunu çalıştırır, riski ölçer (KOD: deterministik, LLM değil)
  Yörüngeci       planı değiştirir; büyük değişiklik onay ister (LLM)
  Rehber          istikrar geri bildirimi + mini görev  (LLM)
  Kaşif           sınav sorusu hazırlar                 (LLM)
  İkiz            yalnızca öğrencinin cümlelerini bilir (LLM, kısıtlı bilgi)
  Hakem           İkiz'in cevabını denetler             (LLM + kod kemeri)
  Gözlemevi       kimin ne yapacağına karar verir, olay akışını yazar, onay kuyruğunu tutar

Her adım `emit` ile oturumun olay akışına yazılır; mobil uygulama bu akışı canlı gösterir.
LLM çağrısı başarısız olursa ekip demo içeriğine düşer ve bunu akışta açıkça söyler.
"""
from __future__ import annotations

import copy
import datetime as dt
import os
import threading
import time
import uuid
from dataclasses import asdict

import guvenlik as gv
import icerik
import ikiz_ajan as ia
import ogret_ajani as oa
import store

AJANLAR = [
    {"ad": "Gözlemevi", "rol": "Orkestratör: görevleri dağıtır, büyük kararları onaya sunar", "tur": "llm+kod",
     "yetki": "Plan değiştirmeden önce kullanıcıya sorar"},
    {"ad": "Astronom", "rol": "Profilini okur: alan, konu, süre", "tur": "llm", "yetki": "Yalnızca okur"},
    {"ad": "Kutup Yıldızı", "rol": "Her alan için en ideal tek hedefi seçer", "tur": "llm", "yetki": "Öneri verir"},
    {"ad": "Haritacı", "rol": "21 günlük gök haritasını çizer", "tur": "llm", "yetki": "Yeni plan oluşturur"},
    {"ad": "Gözcü", "rol": "İkizini ve istikrarını izler", "tur": "kod", "yetki": "Yalnızca okur ve ölçer"},
    {"ad": "Yörüngeci", "rol": "Plan gerisinde kalınca en hafif müdahaleyi seçer", "tur": "llm",
     "yetki": "Küçük değişikliği uygular, büyüğü onaya sunar"},
    {"ad": "Rehber", "rol": "Suçlamadan, tek net adım önerir", "tur": "llm", "yetki": "Mini görev ekleyebilir"},
    {"ad": "Kaşif", "rol": "Sınav sorusu hazırlar", "tur": "llm", "yetki": "Referans cevabı kullanıcıdan saklar"},
    {"ad": "İkiz", "rol": "Yalnızca senin anlattıklarını bilir", "tur": "llm", "yetki": "Başka bilgi kullanamaz"},
    {"ad": "Hakem", "rol": "İkiz'in cevaplarını denetler", "tur": "llm+kod", "yetki": "Cevabı söylemez, ipucu verir"},
]
ALAN_ADI = {"akademik": "Akademik", "hobi": "Hobiler"}
RISK_TR = {"momentum": "ivme kazanıyor", "steady": "düzenli", "slipping": "biraz aksıyor", "at_risk": "yavaşlıyor"}
MUDAHALE_TR = {"shrink": "kısalt", "reorder": "yeniden sırala", "extend": "süreyi uzat",
               "swap_type": "görev tipini değiştir", "rescope": "hedefi küçült"}
ONAY_GEREKTIREN = {"extend", "rescope"}


def _gecikme() -> None:
    d = float(os.environ.get("AJAN_GECIKME", "0.7"))
    if d > 0:
        time.sleep(d)


# ------------------------------------------------------------------ yardımcılar
def emit(s: dict, ajan: str, mesaj: str, tur: str = "info", veri: dict | None = None, alan: str | None = None) -> dict:
    e = {"id": len(s["olaylar"]) + 1, "t": round(time.time(), 2), "ajan": ajan, "mesaj": mesaj, "tur": tur,
         "veri": veri, "alan": alan}
    s["olaylar"].append(e)
    store.save(s)
    return e


def _calistir(fn, *args) -> None:
    if os.environ.get("AJAN_SENKRON") == "1":
        fn(*args)
    else:
        threading.Thread(target=fn, args=args, daemon=True).start()


def _twin(d: dict) -> ia.TwinState:
    return ia.TwinState(day=d["day"], real=ia.TwinSide(**d["real"]), ideal=ia.TwinSide(**d["ideal"]),
                        streak=d["streak"], missed_days=d["missed_days"], total_missed=d["total_missed"],
                        divergence=d["divergence"], risk=d["risk"], log=d["log"])


def _roadmap(d: dict) -> ia.Roadmap:
    return ia.Roadmap(weeks=d["weeks"], tasks=[ia.Task(**t) for t in d["tasks"]])


def _goal(d: dict) -> ia.GoalDecision:
    g = dict(d)
    g["candidates"] = [ia.GoalCandidate(**c) for c in g["candidates"]]
    return ia.GoalDecision(**g)


def _profile(d: dict) -> ia.Profile:
    return ia.Profile(**d)


def _yildiz(tr: dict, gun: int, bitmis_id: set[str]) -> tuple[int, int]:
    """(senin yaktığın, planın olması gereken) yıldız sayısı: bir tamamlanan görev = bir yıldız."""
    gercek = sum(1 for t in tr["roadmap"]["tasks"] if t["day"] <= gun and (t["done"] or t["id"] in bitmis_id))
    ideal = sum(1 for t in tr["roadmap"]["tasks"] if t["day"] <= gun)
    return gercek, ideal


def bugun_gorevleri(s: dict) -> list[dict]:
    out = []
    for alan, tr in s["tracks"].items():
        gun = tr["twin"]["day"] + 1
        for t in tr["roadmap"]["tasks"]:
            if t["day"] == gun:
                out.append({**t, "alan": alan, "done": t["done"] or t["id"] in s["bitenler"]})
    out.sort(key=lambda t: (t["type"] == "teach", t["alan"] != "akademik"))
    return out


# ------------------------------------------------------------------- kurulum
def _profil_uret(s: dict, alan: str, konu: str) -> dict:
    dk, ad = s["daily_minutes"], s["name"]
    if not ia.is_mock():
        try:
            p = ia.extract_profile(ad, f"Alan: {ALAN_ADI[alan]}. Konu: {konu}.", [konu] if alan == "hobi" else [],
                                   [f"{konu} üzerinde ilerlemek"], dk)
            return asdict(p)
        except ia.LLMError:
            emit(s, "Astronom", "Model yanıt vermedi; demo profiliyle devam ediyorum.", "error", alan=alan)
    return icerik.profil(alan, konu, ad, dk)


def _hedef_uret(s: dict, alan: str, konu: str, profil: dict) -> dict:
    if not ia.is_mock():
        try:
            return asdict(ia.select_goal(_profile(profil)))
        except ia.LLMError:
            emit(s, "Kutup Yıldızı", "Model yanıt vermedi; demo hedefiyle devam ediyorum.", "error", alan=alan)
    return icerik.hedef(alan, konu, s["daily_minutes"])


def _yol_uret(s: dict, alan: str, konu: str, profil: dict, hedef: dict) -> dict:
    if not ia.is_mock():
        try:
            rm = ia.build_roadmap(_profile(profil), _goal(hedef))
            d = {"weeks": rm.weeks, "tasks": [asdict(t) for t in rm.tasks]}
            for t in d["tasks"]:
                t["id"] = f"{alan[0]}-{t['id']}"
            return d
        except ia.LLMError:
            emit(s, "Haritacı", "Model yanıt vermedi; demo planıyla devam ediyorum.", "error", alan=alan)
    return icerik.yol(alan, konu, s["daily_minutes"])


def kurulum(sid: str) -> None:
    s = store.get(sid)
    with store.lock(sid):
        konular = {a: t["topic"] for a, t in s["tracks"].items()}
        emit(s, "Gözlemevi", f"Ekip kuruluyor: {len(konular)} alan. Her adım kayıt altında.", "start")
        _gecikme()
        emit(s, "Astronom", "Profilini okuyor…", "start")
        for alan, konu in konular.items():
            s["tracks"][alan]["profile"] = _profil_uret(s, alan, konu)
        _gecikme()
        etiket = " ve ".join(ALAN_ADI[a].lower() for a in konular)
        emit(s, "Astronom", f"Profilini okudu: {etiket}. Yalnızca yazdığın konuları kullandı.", "done")

        emit(s, "Gözlemevi", "Hedef seçimi için Kutup Yıldızı'na devrediyorum.", "handoff")
        for alan, konu in konular.items():
            tr = s["tracks"][alan]
            tr["goal"] = _hedef_uret(s, alan, konu, tr["profile"])
            g = tr["goal"]
            en_iyi = max(g["candidates"], key=lambda c: c["fit_score"])
            _gecikme()
            emit(s, "Kutup Yıldızı", f"{ALAN_ADI[alan]}: {len(g['candidates'])} aday puanladı. Seçim: {g['selected']} ({en_iyi['fit_score']}/100).",
                 "done", {"adaylar": g["candidates"], "gerekce": g["rationale"]}, alan)

        emit(s, "Gözlemevi", "Planı çizmesi için Haritacı'ya devrediyorum.", "handoff")
        for alan, konu in konular.items():
            tr = s["tracks"][alan]
            emit(s, "Haritacı", f"{ALAN_ADI[alan]} için {tr['goal']['duration_days']} günlük gök haritası çiziliyor…", "start", alan=alan)
            tr["roadmap"] = _yol_uret(s, alan, konu, tr["profile"], tr["goal"])
            tr["twin"] = asdict(ia.init_twin(_profile(tr["profile"]), _goal(tr["goal"])))
            _gecikme()
            emit(s, "Haritacı", f"{ALAN_ADI[alan]}: {len(tr['roadmap']['tasks'])} yıldız yerleştirdi. İlk 3 gün kolay; her 4 günde bir \"ikizine öğret\".",
                 "done", alan=alan)

        emit(s, "Gözcü", "İkizini senin seviyende başlattı.", "done")
        _gecikme()
        s["coach"] = {"mode": "steady", "message": f"Hoş geldin {s['name']}. İlk günün hazır; küçük başla, ben buradayım.",
                      "action": {"title": "Bugünün ilk adımını aç", "minutes": 1}, "ask_user": None, "alan": None}
        emit(s, "Rehber", "İlk gün için seni karşılayacak.", "done")
        s["durum"] = "hazir"
        emit(s, "Gözlemevi", "Gökyüzün hazır.", "done")


# --------------------------------------------------------------- günlük kapanış
def _fark_cumlesi(tr: dict, s: dict) -> tuple[str, int]:
    g, i = _yildiz(tr, tr["twin"]["day"], set())
    gap = i - g
    return (f"İkizin {gap} yıldız önde." if gap > 0 else "İkizinle aynı seviyedesin."), gap


def gun_kapat(sid: str, mod: str = "gercek", gun: int = 1, tutarlilik: float = 0.4) -> None:
    s = store.get(sid)
    with store.lock(sid):
        s["durum"] = "isleniyor"
        emit(s, "Gözlemevi", "Gün kapanıyor; ekip değerlendirmeye başlıyor.", "start")
        gun_no = None
        for alan, tr in s["tracks"].items():
            state, rm = _twin(tr["twin"]), _roadmap(tr["roadmap"])
            if mod == "demo":
                ia.fast_forward(state, rm, min(gun, tr["goal"]["duration_days"] - state.day), tutarlilik, seed=state.day + 7)
            else:
                bugun_ids = {t.id for t in rm.tasks if t.day == state.day + 1}
                ia.advance_day(state, rm, {i for i in s["bitenler"] if i in bugun_ids})
            tr["twin"], tr["roadmap"] = asdict(state), {"weeks": rm.weeks, "tasks": [asdict(t) for t in rm.tasks]}
            gun_no = state.day
        s["bitenler"] = []
        _gecikme()

        enriskli = []
        for alan, tr in s["tracks"].items():
            st = tr["twin"]
            fark, gap = _fark_cumlesi(tr, s)
            onek = f"{ALAN_ADI[alan]}: " if len(s["tracks"]) > 1 else ""
            if st["missed_days"] >= 1:
                ozet = f"{onek}Art arda {st['missed_days']} gün atlandı. {fark}"
            else:
                son = st["log"][-1]
                ozet = f"{onek}{len(son['completed'])}/{len(son['planned'])} adım tamamlandı, seri {st['streak']}. {fark}"
            emit(s, "Gözcü", f"{ozet} Durum: {RISK_TR[st['risk']]}.", "info",
                 {"risk": st["risk"], "seri": st["streak"], "fark": gap}, alan)
            if st["risk"] == "at_risk":
                enriskli.append(alan)
        _gecikme()

        for alan in enriskli:
            tr = s["tracks"][alan]
            emit(s, "Gözlemevi", f"Hatırlatma yetmez; plan {s['name']}'in gerçek temposuna uymuyor. {ALAN_ADI[alan]} planını değiştirmeye karar verdim.",
                 "decision", alan=alan)
            emit(s, "Gözlemevi", "Yörüngeci'ye devrediyorum.", "handoff", alan=alan)
            _gecikme()
            _yorungeci(s, alan)

        # Rehber: en riskli alana göre tek net mesaj
        sira = {"at_risk": 3, "slipping": 2, "steady": 1, "momentum": 0}
        for alan in enriskli:                       # yeniden planlanan alanın riski "steady"e çekildi; koç eski riske göre konuşsun
            s["tracks"][alan]["_koc_risk"] = "at_risk"
        en_zayif = max(s["tracks"], key=lambda a: sira[s["tracks"][a].get("_koc_risk") or s["tracks"][a]["twin"]["risk"]])
        tr = s["tracks"][en_zayif]
        koc_state = _twin(tr["twin"])
        if tr.get("_koc_risk"):
            koc_state.risk = tr.pop("_koc_risk")
        for t in s["tracks"].values():
            t.pop("_koc_risk", None)
        try:
            koc = ia.coach_feedback(koc_state)
        except ia.LLMError:
            koc = {"mode": koc_state.risk, "message": "Bugün küçük bir adım yeter. Yarın görevin seni bekliyor.",
                   "action": {"title": "Yarınki görevi aç", "minutes": 1}, "ask_user": None}
        koc["alan"] = en_zayif
        s["coach"] = koc
        if koc["mode"] in ("slipping", "at_risk") and koc_state.day < tr["goal"]["duration_days"]:
            yeni = {"id": f"{en_zayif[0]}-mini{koc_state.day + 1}", "day": koc_state.day + 1,
                    "title": icerik.hatirlatma_gorevi(tr["topic"]), "minutes": 5,
                    "skill": next(iter(tr["goal"]["target_skills"])), "difficulty": 1, "type": "practice", "done": False}
            tr["roadmap"]["tasks"].append(yeni)
            emit(s, "Rehber", f"Hafif moda geçti. Yarın için 5 dakikalık mini görev hazırladı.", "advice",
                 {"mini_gorev": yeni["title"]}, en_zayif)
        else:
            emit(s, "Rehber", koc["message"], "advice", alan=en_zayif)

        bitti = [a for a, t in s["tracks"].items() if t["twin"]["day"] >= t["goal"]["duration_days"]]
        if bitti:
            emit(s, "Gözlemevi", "Hedef süresi doldu: " + ", ".join(ALAN_ADI[a] for a in bitti) + ".", "done")
        s["durum"] = "hazir"
        emit(s, "Gözlemevi", f"{gun_no}. gün kapandı.", "done")


def _degisiklik_ozeti(onceki: dict | None, sonraki: dict | None, once_gun: int, sonra_gun: int) -> list[dict]:
    if not onceki or not sonraki:
        return []
    return [{"etiket": "Görev süresi", "once": f"{onceki['minutes']} dk", "sonra": f"{sonraki['minutes']} dk"},
            {"etiket": "Zorluk", "once": str(onceki["difficulty"]), "sonra": str(sonraki["difficulty"])},
            {"etiket": "Hedef tarihi", "once": f"{once_gun}. gün", "sonra": "değişmedi" if once_gun == sonra_gun else f"{sonra_gun}. gün"}]


def _ilk_kalan(roadmap: dict, gun: int) -> dict | None:
    return next((t for t in sorted(roadmap["tasks"], key=lambda t: t["day"]) if t["day"] > gun), None)


def _yorungeci(s: dict, alan: str, neden: str | None = None) -> dict | None:
    tr = s["tracks"][alan]
    state, rm, goal = _twin(tr["twin"]), _roadmap(tr["roadmap"]), _goal(tr["goal"])
    emit(s, "Yörüngeci", "En hafif müdahaleyi arıyor…", "start", alan=alan)
    once = _ilk_kalan(tr["roadmap"], state.day)
    kopya = copy.deepcopy(rm)
    try:
        sonuc = ia.maybe_replan(state, kopya, goal, neden)
    except ia.LLMError:
        emit(s, "Yörüngeci", "Model yanıt vermedi; plan olduğu gibi kaldı. Yeniden denemek için ekibe görev verebilirsin.", "error", alan=alan)
        return None
    if sonuc is None:
        return None
    yeni_rm = {"weeks": kopya.weeks, "tasks": [asdict(t) for t in kopya.tasks]}
    mud = sonuc.get("interventions", [])
    mud_tr = ", ".join(MUDAHALE_TR.get(m, m) for m in mud)
    kalan = sum(1 for t in yeni_rm["tasks"] if t["day"] > state.day)
    sonra = _ilk_kalan(yeni_rm, state.day)
    degisiklik = _degisiklik_ozeti(once, sonra, goal.duration_days, sonuc.get("new_duration_days", goal.duration_days))
    onay = any(m in ONAY_GEREKTIREN for m in mud)
    if onay:
        pid = uuid.uuid4().hex[:8]
        s["oneriler"][pid] = {"id": pid, "kaynak": "Yörüngeci", "alan": alan, "baslik": f"{ALAN_ADI[alan]} planı: {mud_tr}",
                              "ozet": sonuc.get("explanation", ""), "degisiklikler": degisiklik, "etkilenen_gun": kalan,
                              "durum": "bekliyor", "roadmap": yeni_rm, "yeni_sure": sonuc.get("new_duration_days")}
        emit(s, "Yörüngeci", f"Önerdiği değişiklik büyük ({mud_tr}); onayına sunuldu.", "decision",
             {"oneri_id": pid, "degisiklikler": degisiklik}, alan)
    else:
        tr["roadmap"] = yeni_rm
        state.risk, state.missed_days = "steady", 0
        tr["twin"] = asdict(state)
        emit(s, "Yörüngeci", f"En hafif müdahaleyi seçti: {mud_tr}. Kalan {kalan} görev yeniden çizildi.", "done",
             {"degisiklikler": degisiklik, "aciklama": sonuc.get("explanation", "")}, alan)
    return sonuc


# --------------------------------------------------------------- ekibe görev ver
def _kw(metin: str) -> set[str]:
    n = gv._norm(metin)
    k = set()
    if any(w in n for w in ("vize", "final", "sinav", "butunleme")) and any(w in n for w in ("plan", "hafta", "hazirl", "ayarla")):
        k.add("sinav_plani")
    if "kaynak" in n:
        k.add("kaynak")
    if any(w in n for w in ("mini sinav", "deneme", "test hazirla", "soru hazirla", "sinav hazirla")):
        k.add("mini_sinav")
    if any(w in n for w in ("yogun", "yorgun", "zorlan", "yetisemiyorum", "hafiflet", "hafifle", "kolaylastir")):
        k.add("hafiflet")
    return k


def gorev_denetle_ve_planla(sid: str, metin: str) -> dict:
    """Eşzamanlı kısım: denetim + Gözlemevi'nin görev dağılımı. İş arka planda yürür."""
    s = store.get(sid)
    with store.lock(sid):
        d = gv.gorev_denetle(metin)
        if not d.izin:
            emit(s, "Gözlemevi", f"Görev kabul edilmedi ({d.engel}).", "guard")
            return {"ok": False, "engel": d.engel, "mesaj": d.mesaj}
        niyet = _kw(metin)
        if not niyet:
            emit(s, "Gözlemevi", "Görevi bir ekip üyesine eşleyemedim; kullanıcıya örnek önerdim.", "info")
            return {"ok": False, "engel": "anlasilmadi",
                    "mesaj": "Bunu tam anlayamadım. Şunlardan biri gibi yazabilirsin: \"Vizem var, planı ona göre ayarla\", \"Mini sınav hazırla\", \"Bu hafta yoğunum\"."}
        atamalar = []
        if "sinav_plani" in niyet:
            atamalar += [{"ajan": "Yörüngeci", "is": "Vize tarihine göre kalan günleri yeniden dağıtır", "durum": "bekliyor", "ad": "sinav_plani"},
                         {"ajan": "Kaşif", "is": "Vize konusundan mini sınav hazırlar", "durum": "bekliyor", "ad": "mini_sinav"}]
        if "mini_sinav" in niyet and not any(a["ad"] == "mini_sinav" for a in atamalar):
            atamalar.append({"ajan": "Kaşif", "is": "Mini sınav hazırlar", "durum": "bekliyor", "ad": "mini_sinav"})
        if "kaynak" in niyet:
            atamalar.append({"ajan": "Kaşif", "is": "Çalışma kaynağı türleri önerir", "durum": "bekliyor", "ad": "kaynak"})
        if "hafiflet" in niyet:
            atamalar.append({"ajan": "Yörüngeci", "is": "Bu haftanın yükünü hafifletir", "durum": "bekliyor", "ad": "hafiflet"})
        jid = uuid.uuid4().hex[:8]
        s["gorevler"].append({"id": jid, "metin": metin.strip(), "durum": "calisiyor", "atamalar": atamalar, "sonuc": {}})
        isim = " ve ".join(sorted({a["ajan"] for a in atamalar}))
        emit(s, "Gözlemevi", f"Görevi {len(atamalar)} işe böldü: {isim}.", "decision", {"gorev_id": jid})
    _calistir(_gorev_yurut, sid, jid)
    return {"ok": True, "gorev_id": jid}


def _akademik_alan(s: dict) -> str:
    return "akademik" if "akademik" in s["tracks"] else next(iter(s["tracks"]))


def _sinav_gunu(s: dict, tr: dict) -> int | None:
    """Vize/final tarihini plan gününe çevirir (bugün = 0. gün)."""
    bugun = dt.date.fromisoformat(s["baslangic"])
    adaylar = [d for d in s["son_tarihler"] if any(k in gv._norm(d["baslik"]) for k in ("vize", "final", "sinav"))]
    if not adaylar:
        return None
    hedef = min(adaylar, key=lambda d: d["tarih"])
    return max(1, (dt.date.fromisoformat(hedef["tarih"]) - bugun).days + tr["twin"]["day"])


def _gorev_yurut(sid: str, jid: str) -> None:
    s = store.get(sid)
    with store.lock(sid):
        job = next(j for j in s["gorevler"] if j["id"] == jid)
        for a in job["atamalar"]:
            a["durum"] = "calisiyor"
            emit(s, a["ajan"], f"{a['is']}…", "start", {"gorev_id": jid})
            _gecikme()
            alan = _akademik_alan(s)
            tr = s["tracks"][alan]
            try:
                if a["ad"] == "sinav_plani":
                    _sinav_plani(s, job, alan, tr)
                elif a["ad"] == "hafiflet":
                    st = _twin(tr["twin"])
                    st.risk = "at_risk"
                    tr["twin"] = asdict(st)
                    _yorungeci(s, alan, job["metin"])
                elif a["ad"] == "mini_sinav":
                    _mini_sinav(s, job, alan, tr)
                elif a["ad"] == "kaynak":
                    job["sonuc"]["kaynak"] = ["Konu özeti ve çözümlü örnekler içeren ders notu", "Aşamalı çözümlü soru kitabı",
                                              "Kısa konu anlatım videosu (15–20 dk)", "Geçmiş yılların vize soruları (hocandan ya da bölüm arşivinden)"]
                    emit(s, "Kaşif", "Kaynak türlerini önerdi (bağlantı uydurmadım; hocandan ya da kütüphaneden bulabilirsin).", "done", alan=alan)
                a["durum"] = "bitti"
            except ia.LLMError:
                a["durum"] = "hata"
                emit(s, a["ajan"], "Model yanıt vermedi; bu iş yapılamadı.", "error")
        job["durum"] = "bitti"
        bekleyen = [p for p in s["oneriler"].values() if p["durum"] == "bekliyor"]
        emit(s, "Gözlemevi", "Görev tamamlandı." + (" Onayını bekleyen değişiklik var." if bekleyen else ""), "done", {"gorev_id": jid})


def _sinav_plani(s: dict, job: dict, alan: str, tr: dict) -> None:
    gun = _sinav_gunu(s, tr)
    state = _twin(tr["twin"])
    if gun is None:
        emit(s, "Yörüngeci", "Vize tarihini bilmiyorum. Zaman ekranından bir tarih ekleyebilirsin; şimdilik planı değiştirmedim.", "info", alan=alan)
        return
    yeni = copy.deepcopy(tr["roadmap"])
    degisen_gunler = set()
    for t in yeni["tasks"]:
        if t["done"] or t["day"] <= state.day:
            continue
        if t["day"] <= gun:
            if t["type"] == "learn":
                t["type"] = "practice"
            if not t["title"].startswith("Vize tekrarı"):
                t["title"] = f"Vize tekrarı · {t['title']}"
            degisen_gunler.add(t["day"])
        elif t["day"] <= gun + 2:
            t["minutes"] = max(10, int(t["minutes"] * 0.6))
            t["difficulty"] = max(1, t["difficulty"] - 1)
            degisen_gunler.add(t["day"])
    pid = uuid.uuid4().hex[:8]
    s["oneriler"][pid] = {"id": pid, "kaynak": "Yörüngeci", "alan": alan, "baslik": "Vize planı",
                          "ozet": f"Vize gününe ({gun}. gün) kadar görevler tekrar ağırlıklı yapıldı; vizeden sonraki 2 gün hafifletildi.",
                          "degisiklikler": [{"etiket": "Vizeye kadar", "once": "öğren + uygula", "sonra": "tekrar ağırlıklı"},
                                            {"etiket": "Vize sonrası 2 gün", "once": "normal", "sonra": "%40 hafif"},
                                            {"etiket": "Hedef tarihi", "once": f"{tr['goal']['duration_days']}. gün", "sonra": "değişmedi"}],
                          "etkilenen_gun": len(degisen_gunler), "durum": "bekliyor", "roadmap": yeni, "yeni_sure": None}
    emit(s, "Yörüngeci", f"{len(degisen_gunler)} günü etkileyen bir vize planı hazırladı; onayına sunuldu.", "decision",
         {"oneri_id": pid}, alan)


def _mini_sinav(s: dict, job: dict, alan: str, tr: dict) -> None:
    konu = tr["topic"].split("·")[-1].strip()
    try:
        sorular = oa.kasif_sinav(konu, "mini sınav")
    except ia.LLMError:
        raise
    job["sonuc"]["mini_sinav"] = [q.question for q in sorular]      # referans cevaplar kullanıcıya verilmez
    emit(s, "Kaşif", f"{len(sorular)} soruluk mini sınav hazırladı.", "done", alan=alan)


def oneriyi_karara_bagla(sid: str, pid: str, onayla: bool) -> dict | None:
    s = store.get(sid)
    with store.lock(sid):
        p = s["oneriler"].get(pid)
        if not p or p["durum"] != "bekliyor":
            return None
        tr = s["tracks"][p["alan"]]
        if onayla:
            tr["roadmap"] = p["roadmap"]
            if p.get("yeni_sure"):
                tr["goal"]["duration_days"] = p["yeni_sure"]
            st = _twin(tr["twin"])
            if st.risk == "at_risk":
                st.risk, st.missed_days = "steady", 0
                tr["twin"] = asdict(st)
            p["durum"] = "onaylandi"
            emit(s, "Gözlemevi", f"Onayladın: {p['baslik']} uygulandı.", "done", {"oneri_id": pid}, p["alan"])
        else:
            p["durum"] = "reddedildi"
            emit(s, "Gözlemevi", f"Reddettin: {p['baslik']}. Plan olduğu gibi kaldı.", "done", {"oneri_id": pid}, p["alan"])
        p.pop("roadmap", None)
        store.save(s)
        return p


# ---------------------------------------------------------------- ikizine öğret
def ogret_konu(s: dict, alan: str) -> str:
    return s["tracks"][alan]["topic"].split("·")[-1].strip()


def ogret_ekle(sid: str, metin: str, alan: str) -> dict:
    s = store.get(sid)
    with store.lock(sid):
        t = s["ogret"]
        mevcut = t["cumleler"] if t["alan"] == alan else []
        d = gv.denetle(metin)
        if not d.izin:
            emit(s, "Gözlemevi", f"Anlatım ikize gönderilmedi ({d.engel}).", "guard")
            return {"ok": False, "engel": d.engel, "mesaj": d.mesaj, "uyarilar": d.uyarilar}
        yeni = [c for c in d.cumleler if c not in mevcut]
        birlesik = mevcut + yeni
        if len("\n".join(birlesik)) > gv.MAX_KARAKTER or len(birlesik) > gv.MAX_CUMLE:
            return {"ok": False, "engel": "cok_uzun", "mesaj": "İkizin için yeterince anlattın; bir kısmını silip sadeleştir.", "uyarilar": []}
        t.update({"alan": alan, "konu": ogret_konu(s, alan), "cumleler": birlesik, "son": None})
        store.save(s)
        return {"ok": True, "uyarilar": d.uyarilar}


def ogret_sil(sid: str) -> None:
    s = store.get(sid)
    with store.lock(sid):
        s["ogret"] = {"alan": s["ogret"]["alan"], "konu": s["ogret"]["konu"], "cumleler": [], "son": None}
        emit(s, "Gözlemevi", "İkizin öğrendiklerini sildi.", "info")


def ogret_sinav(sid: str) -> dict:
    s = store.get(sid)
    with store.lock(sid):
        t = s["ogret"]
        if not t["cumleler"]:
            return {"ok": False, "mesaj": "İkizine önce birkaç cümle anlat."}
        alan = t["alan"]
        gorev = next((g for g in bugun_gorevleri(s) if g["alan"] == alan and g["type"] == "teach"), None)

        def _e(ajan, mesaj, tur):
            emit(s, ajan, mesaj, tur, alan=alan)
            _gecikme()
        try:
            sonuc = oa.ikize_ogret(t["konu"], gorev["title"] if gorev else f"{t['konu']} anlat", "\n".join(t["cumleler"]),
                                   emit=_e, oturum=sid)
        except ia.LLMError:
            emit(s, "Gözlemevi", "Model yanıt vermedi; sınav yapılamadı. Biraz sonra yeniden dene.", "error", alan=alan)
            return {"ok": False, "mesaj": "Model şu an yanıt vermiyor. Biraz sonra yeniden dene."}
        gorunum = oa.public_view(sonuc)
        t["son"] = gorunum
        if sonuc.exam and gorev and sonuc.star != "sonuk" and gorev["id"] not in s["bitenler"]:
            s["bitenler"].append(gorev["id"])
            emit(s, "Gözlemevi", "Bugünün \"anlat\" adımı tamamlandı olarak işaretlendi.", "done", alan=alan)
        store.save(s)
        return {"ok": True, "sonuc": gorunum}


# ------------------------------------------------------------------- görünüm
def _egri(tr: dict) -> dict:
    gun = tr["twin"]["day"]
    gercek, ideal = [0], [0]
    for d in range(1, gun + 1):
        g, i = _yildiz(tr, d, set())
        gercek.append(g)
        ideal.append(i)
    return {"sen": gercek, "ikiz": ideal}


def _parlaklik(tr: dict) -> int:
    hedef, gercek = tr["goal"]["target_skills"], tr["twin"]["real"]["skills"]
    if not hedef:
        return 0
    return round(100 * sum(min(1.0, gercek.get(k, 0) / v) for k, v in hedef.items() if v) / len(hedef))


def gorunum(sid: str) -> dict | None:
    s = store.get(sid)
    if not s:
        return None
    alanlar = []
    for alan, tr in s["tracks"].items():
        if "roadmap" not in tr:
            alanlar.append({"alan": alan, "etiket": ALAN_ADI[alan], "konu": tr["topic"], "hazir": False})
            continue
        gun = tr["twin"]["day"]
        gercek, ideal = _yildiz(tr, gun, set())
        toplam = len(tr["roadmap"]["tasks"])
        alanlar.append({
            "alan": alan, "etiket": ALAN_ADI[alan], "konu": tr["topic"], "hazir": True,
            "hedef": {"secilen": tr["goal"]["selected"], "gerekce": tr["goal"]["rationale"], "adaylar": tr["goal"]["candidates"],
                      "olcut": tr["goal"]["success_metric"], "sure": tr["goal"]["duration_days"]},
            "ikiz": {"gun": gun, "sen_yildiz": gercek, "ikiz_yildiz": ideal, "toplam_yildiz": toplam, "fark": ideal - gercek,
                     "seri": tr["twin"]["streak"], "risk": tr["twin"]["risk"], "risk_tr": RISK_TR[tr["twin"]["risk"]],
                     "parlaklik": _parlaklik(tr), "egri": _egri(tr)},
            "haftalar": tr["roadmap"]["weeks"],
        })
    bugun = bugun_gorevleri(s) if s["durum"] != "kuruluyor" and all("roadmap" in t for t in s["tracks"].values()) else []
    ilk = next(iter(s["tracks"].values()))
    gun = ilk["twin"]["day"] + 1 if "twin" in ilk else 1
    sure = ilk["goal"]["duration_days"] if "goal" in ilk else 21
    today = dt.date.fromisoformat(s["baslangic"])
    son_olay = {}
    for e in s["olaylar"]:
        son_olay[e["ajan"]] = {"tur": e["tur"], "mesaj": e["mesaj"]}
    return {
        "session_id": sid, "ad": s["name"], "demo": ia.is_mock(), "model": ia.model_name(), "durum": s["durum"],
        "gun": gun, "sure": sure, "alanlar": alanlar, "bugun": bugun,
        "son_tarihler": [{**d, "kalan_gun": (dt.date.fromisoformat(d["tarih"]) - today).days} for d in s["son_tarihler"]],
        "koc": s["coach"], "oneriler": [{k: v for k, v in p.items() if k != "roadmap"} for p in s["oneriler"].values() if p["durum"] == "bekliyor"],
        "gorevler": s["gorevler"][-3:],
        "ogret": {"alan": s["ogret"]["alan"], "konu": s["ogret"]["konu"], "cumleler": s["ogret"]["cumleler"], "son": s["ogret"]["son"]},
        "ajanlar": [{**a, "son": son_olay.get(a["ad"])} for a in AJANLAR],
        "son_olay_id": len(s["olaylar"]),
    }


def yeni_oturum(ad: str, akademik: str | None, hobi: str | None, dakika: int, zaman: str, son_tarihler: list[dict]) -> str:
    sid = uuid.uuid4().hex[:12]
    tracks = {}
    if akademik:
        tracks["akademik"] = {"topic": icerik.konu_adi(akademik)}
    if hobi:
        tracks["hobi"] = {"topic": icerik.konu_adi(hobi)}
    s = {"id": sid, "name": ad or "Elif", "daily_minutes": dakika, "zaman": zaman, "baslangic": dt.date.today().isoformat(),
         "son_tarihler": son_tarihler, "tracks": tracks, "durum": "kuruluyor", "olaylar": [], "bitenler": [], "coach": None,
         "oneriler": {}, "gorevler": [],
         "ogret": {"alan": "akademik" if akademik else "hobi", "konu": "", "cumleler": [], "son": None}}
    first = s["ogret"]["alan"]
    s["ogret"]["konu"] = tracks[first]["topic"].split("·")[-1].strip()
    store.save(s)
    return sid


def gorev_tamamla(sid: str, gorev_id: str, yapildi: bool = True) -> dict | None:
    """Bugünün bir görevini işaretler (gün kapanınca Gözcü bunu değerlendirir)."""
    s = store.get(sid)
    if not s:
        return None
    with store.lock(sid):
        bugun = {t["id"] for t in bugun_gorevleri(s)}
        if gorev_id not in bugun:
            return {"ok": False, "mesaj": "Bu görev bugüne ait değil."}
        if yapildi and gorev_id not in s["bitenler"]:
            s["bitenler"].append(gorev_id)
        if not yapildi and gorev_id in s["bitenler"]:
            s["bitenler"].remove(gorev_id)
        store.save(s)
    return {"ok": True}


def olaylar(sid: str, sonra: int = 0) -> dict | None:
    s = store.get(sid)
    if not s:
        return None
    ev = [e for e in s["olaylar"] if e["id"] > sonra]
    return {"olaylar": ev, "son_olay_id": s["olaylar"][-1]["id"] if s["olaylar"] else 0, "durum": s["durum"]}
