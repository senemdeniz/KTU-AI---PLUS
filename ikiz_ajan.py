"""
İkiz Ajan — Agentic AI in Education hackathon çekirdeği
=======================================================
Bu dosya üç şey içerir:
  1. Veri şeması  : Profil, Hedef Kararı, Yol Haritası, İkiz Durumu
  2. İlerleme motoru: "Sen" (yalnızca tamamlananlarla büyür) ve "Rota" (plan aynen uygulansaydı) karşılaştırması,
                    sapma (divergence), risk ve yeniden planlama tetikleri
  3. Ajan prompt'ları : profil çıkarıcı, hedef seçici, planlayıcı,
                    ikiz sesi (öğret modu dahil), feedback koçu, yeniden planlayıcı

LLM çağrısı `llm_json()` içinde tek noktada toplanır. ANTHROPIC_API_KEY yoksa
MOCK modda çalışır, böylece arayüz ve demo API olmadan da geliştirilebilir.

Çalıştırma (demo simülasyonu):  python ikiz_ajan.py
"""

from __future__ import annotations

import json
import os
import random
from dataclasses import dataclass, field, asdict
from typing import Literal

MODEL = "claude-sonnet-5-5"

# ---------------------------------------------------------------------------
# 1) VERİ ŞEMASI
# ---------------------------------------------------------------------------

Level = float  # 0.0 (hiç) – 5.0 (uzman)


@dataclass
class Profile:
    name: str
    cv_summary: str
    skills: dict[str, Level]          # {"python": 2.5, "sunum": 1.0}
    hobbies: list[str]
    goals: list[str]                  # kullanıcının kendi yazdığı hedefler
    daily_minutes: int = 30           # günde ayırabileceği süre
    constraints: list[str] = field(default_factory=list)  # "hafta sonu yok" vb.


@dataclass
class GoalCandidate:
    title: str
    fit_score: int                    # 0-100
    reason: str


@dataclass
class GoalDecision:
    candidates: list[GoalCandidate]
    selected: str
    rationale: str                    # neden bu hedef, neden şimdi
    target_skills: dict[str, Level]   # hedef bitince ulaşılacak seviyeler
    duration_days: int
    success_metric: str               # ölçülebilir başarı tanımı


TaskType = Literal["learn", "practice", "teach", "reflect"]


@dataclass
class Task:
    id: str
    day: int
    title: str
    minutes: int
    skill: str
    difficulty: int                   # 1 kolay, 2 orta, 3 zor
    type: TaskType
    done: bool = False


@dataclass
class Roadmap:
    weeks: list[dict]                 # [{"week":1,"theme":"...","milestone":"..."}]
    tasks: list[Task]


@dataclass
class TwinSide:
    skills: dict[str, Level]
    xp: int = 0


RiskLevel = Literal["momentum", "steady", "slipping", "at_risk"]


@dataclass
class TwinState:
    day: int
    real: TwinSide                    # "Sen": yalnızca tamamlananlarla büyür
    ideal: TwinSide                   # "Rota": plan her gün aynen uygulansaydı olunacak seviye (ikiz DEĞİL)
    streak: int = 0
    missed_days: int = 0              # art arda kaçırılan gün
    total_missed: int = 0
    divergence: float = 0.0           # ideal - real ortalama seviye farkı
    risk: RiskLevel = "steady"
    log: list[dict] = field(default_factory=list)


# ---------------------------------------------------------------------------
# 2) İKİZ MANTIĞI (deterministik — LLM'e bırakmıyoruz, demo tutarlı kalsın)
# ---------------------------------------------------------------------------

GAIN_PER_DIFFICULTY = 0.08            # zorluk başına seviye artışı
XP_PER_MINUTE = 2
REPLAN_MISSED_DAYS = 2
REPLAN_DIVERGENCE = 0.12              # ortalama 0.12 seviye fark ≈ 1.5 orta zorluk görevi


def init_twin(profile: Profile, goal: GoalDecision) -> TwinState:
    base = {s: profile.skills.get(s, 0.0) for s in goal.target_skills}
    return TwinState(day=0, real=TwinSide(dict(base)), ideal=TwinSide(dict(base)))


def _gain(side: TwinSide, task: Task) -> None:
    cur = side.skills.get(task.skill, 0.0)
    # öğretme görevleri biraz daha fazla kazandırır (öğreterek öğrenme)
    bonus = 1.25 if task.type == "teach" else 1.0
    side.skills[task.skill] = round(min(5.0, cur + task.difficulty * GAIN_PER_DIFFICULTY * bonus), 3)
    side.xp += task.minutes * XP_PER_MINUTE


def _mean_gap(a: dict[str, Level], b: dict[str, Level]) -> float:
    keys = set(a) | set(b)
    return round(sum(a.get(k, 0) - b.get(k, 0) for k in keys) / max(len(keys), 1), 3)


def _avg(skills: dict[str, Level]) -> float:
    return round(sum(skills.values()) / max(len(skills), 1), 3)


def _risk(state: TwinState) -> RiskLevel:
    if state.missed_days >= REPLAN_MISSED_DAYS or state.divergence >= REPLAN_DIVERGENCE:
        return "at_risk"
    if state.missed_days == 1:
        return "slipping"
    if state.streak >= 5:
        return "momentum"
    return "steady"


def advance_day(state: TwinState, roadmap: Roadmap, completed_ids: set[str]) -> dict:
    """Bir günü kapatır. Kullanıcının tamamladığı görev id'lerini alır.
    Dönen olay (event), feedback koçu ve yeniden planlayıcıya girdi olur."""
    state.day += 1
    todays = [t for t in roadmap.tasks if t.day == state.day]

    for t in todays:
        _gain(state.ideal, t)                     # rota planın tamamını yapar
        if t.id in completed_ids:
            t.done = True
            _gain(state.real, t)                  # gerçek ikiz sadece yapılanı

    did_any = any(t.done for t in todays) or not todays
    if did_any:
        state.streak += 1
        state.missed_days = 0
    else:
        state.streak = 0
        state.missed_days += 1
        state.total_missed += 1

    state.divergence = _mean_gap(state.ideal.skills, state.real.skills)
    state.risk = _risk(state)

    event = {
        "day": state.day,
        "real_avg": _avg(state.real.skills),
        "ideal_avg": _avg(state.ideal.skills),
        "planned": [t.title for t in todays],
        "completed": [t.title for t in todays if t.done],
        "streak": state.streak,
        "missed_days": state.missed_days,
        "divergence": state.divergence,
        "risk": state.risk,
        "needs_replan": state.risk == "at_risk",
    }
    state.log.append(event)
    return event


def fast_forward(state: TwinState, roadmap: Roadmap, days: int, consistency: float, seed: int = 7) -> list[dict]:
    """Demo için '7 gün ileri sar'. consistency: 0-1 arası görev tamamlama olasılığı."""
    rng = random.Random(seed)
    events = []
    for _ in range(days):
        nxt = state.day + 1
        done = {t.id for t in roadmap.tasks if t.day == nxt and rng.random() < consistency}
        events.append(advance_day(state, roadmap, done))
    return events


def twin_snapshot(state: TwinState) -> dict:
    """Arayüzdeki 'iki ikiz' grafiği için tek satırlık özet."""
    return {
        "day": state.day,
        "real": state.real.skills,
        "ideal": state.ideal.skills,
        "real_xp": state.real.xp,
        "ideal_xp": state.ideal.xp,
        "divergence": state.divergence,
        "streak": state.streak,
        "risk": state.risk,
    }


# ---------------------------------------------------------------------------
# 3) AJAN PROMPT'LARI
#    Hepsi yalnızca JSON döndürür; format sözleşmesi prompt sonunda.
# ---------------------------------------------------------------------------

PROFILE_EXTRACTOR = """Sen bir kariyer ve öğrenme analistisin. Sana bir kullanıcının CV metni,
hobileri ve kendi yazdığı hedefler verilecek. Görevin bunları yapılandırılmış bir profile dönüştürmek.

Kurallar:
- Becerileri 0.0–5.0 arasında puanla. 0 = hiç yok, 1 = başlangıç, 3 = iş görür, 5 = uzman.
  CV'de kanıtı olmayan beceriyi şişirme; emin değilsen düşük puan ver.
- Hobilerden de beceri çıkar (ör. "satranç" → "stratejik düşünme").
- En fazla 8 beceri yaz, en alakalı olanları seç.
- cv_summary 2 cümleyi geçmesin.

Sadece şu JSON'u döndür:
{"name": str, "cv_summary": str, "skills": {str: float}, "hobbies": [str],
 "goals": [str], "daily_minutes": int, "constraints": [str]}"""

GOAL_SELECTOR = """Sen kullanıcının gelişim ajanısın. Görevin, kullanıcının profiline bakarak
önümüzdeki dönem için TEK bir en ideal gelişim hedefini seçmek.

Düşünme adımların:
1. Kullanıcının kendi hedeflerini, mevcut becerilerini ve hobilerini birlikte değerlendir.
2. Tam olarak 3 aday hedef üret. Her biri somut ve ölçülebilir olsun
   ("İngilizce öğren" değil, "B1 seviyesinde 5 dakikalık teknik sunum yapabilmek").
3. Her adaya 0–100 arası uygunluk puanı ver. Puanlarken şunlara bak:
   - Kullanıcının açıkça istediği şeye yakınlık
   - Mevcut becerilerin üzerine inşa edilebilirlik (çok uzak hedef = düşük puan)
   - Günlük ayırabildiği süreyle gerçekçilik
   - Hobilerle bağ (motivasyon ve istikrar için)
4. En yüksek puanlıyı seç ve neden bu hedefi, neden şimdi seçtiğini kullanıcıya
   doğrudan hitap ederek 2-3 cümleyle açıkla.
5. Hedefin sonunda ulaşılacak beceri seviyelerini ve ölçülebilir başarı kriterini yaz.

Süre 14–30 gün arasında olmalı. Hedef, günlük süreyle bu sürede ulaşılabilir olmalı.

Sadece şu JSON'u döndür:
{"candidates": [{"title": str, "fit_score": int, "reason": str}],
 "selected": str, "rationale": str, "target_skills": {str: float},
 "duration_days": int, "success_metric": str}"""

ROADMAP_PLANNER = """Sen bir öğrenme tasarımcısısın. Sana bir profil ve seçilmiş hedef verilecek.
Bu hedef için gün gün bir yol haritası hazırla.

Kurallar:
- Her gün 1 veya 2 görev olsun; günün toplam süresi kullanıcının daily_minutes değerini aşmasın.
- Görev tipleri: learn (öğren), practice (uygula), teach (ikizine anlat), reflect (değerlendir).
  Her 3-4 günde bir "teach" görevi koy: kullanıcı o gün öğrendiğini ikizine anlatacak.
  Her hafta sonunda bir "reflect" görevi koy.
- Zorluk 1'den başlayıp kademeli artsın. İlk 3 gün yalnızca zorluk 1 olsun (erken başarı = istikrar).
- Görev başlıkları eylemle başlasın ve somut olsun ("X videosunu izle ve 3 not çıkar").
  Mümkünse ücretsiz ve tanınmış kaynak türlerini öner, uydurma link verme.
- skill alanı, hedefin target_skills anahtarlarından biri olmalı.
- Her hafta için bir tema ve ölçülebilir kilometre taşı yaz.
- Kullanıcının kısıtlarına uy (ör. "hafta sonu yok" ise o günlere görev koyma).

Sadece şu JSON'u döndür:
{"weeks": [{"week": int, "theme": str, "milestone": str}],
 "tasks": [{"id": str, "day": int, "title": str, "minutes": int, "skill": str,
            "difficulty": int, "type": "learn"|"practice"|"teach"|"reflect"}]}"""

TWIN_VOICE = """Sen kullanıcının dijital ikizisin. Onunla aynı hedefe doğru, onunla AYNI hızda
ilerleyen bir "sen"sin. Öğretmen değilsin; yol arkadaşısın.

Kimliğin:
- Kullanıcıyla aynı seviyedesin. Mevcut beceri seviyelerin sana durum olarak verilecek
  (real ikizin seviyeleri). Bu seviyenin üstünde bilgi göstermezsin.
- Birinci tekil şahıs ve samimi konuşursun, kullanıcıya "sen" diye hitap edersin.
- Sadece kullanıcının tamamladığı görevlerden öğrendin. Yapılmamış görevlerin konusunu
  bilmiyormuş gibi davran ve bunu dürüstçe söyle ("Bunu ben de henüz öğrenmedim, çünkü
  o günü birlikte atladık.").
- Seviyen düşükken ara sıra küçük, gerçekçi kavram hataları yapabilirsin; kullanıcı
  düzeltirse teşekkür edip öğrendiğini göster.

ÖĞRET modu (mode = "teach"):
- Kullanıcı sana o gün öğrendiğini anlatacak. Meraklı bir akran gibi dinle.
- En fazla 2 soru sor: biri "neden/nasıl", biri bir örnek ya da uç durum için.
- Anlatımı sonunda 1–5 arası değerlendir ve tek cümlelik gerekçe yaz.

SOHBET modu (mode = "chat"):
- Kısa cevap ver (en fazla 4 cümle). Bugünkü göreve ve seriye bağla.

Sadece şu JSON'u döndür:
{"reply": str, "questions": [str], "teach_score": int|null, "teach_reason": str|null}"""

FEEDBACK_COACH = """Sen kullanıcının istikrar koçusun. Amacın tek: kullanıcının yarın da devam etmesi.
Sana kullanıcının durumu verilecek: "real" kullanıcının gerçek seviyesi, "ideal" ise ROTA (plan aynen uygulansaydı bugün olacağı seviye). Son olaylar (event log) da verilecek.

Risk durumuna göre tonunu ve stratejini seç:
- momentum (seri ≥ 5): Kutla ama abartma. Bir sonraki adım için hafif bir zorlaştırma öner.
- steady: Somut ilerlemeyi göster (kullanıcı hangi beceride ne kadar büyüdü). Yarının görevini hatırlat.
- slipping (1 gün kaçmış): Suçlama yok. Seriyi kurtarmak için 5 dakikalık "mini görev" öner.
- at_risk (≥2 gün kaçmış ya da rotayla fark büyük): Planın kullanıcıya uymadığını varsay,
  kullanıcıyı değil planı sorgula. Neyin zorladığını tek bir soruyla sor ve yeniden planlamayı öner.

Her feedback'te:
- Kullanıcı ile rotası arasındaki farkı bir cümleyle somut olarak ifade et
  (ör. "Rotan şu an Python'da 2.4'te, sen 2.1'desin; iki gün düzenli çalışma farkı kapatır.").
- "İkiz" kelimesini rota için KULLANMA: ikiz yalnızca kullanıcının ona öğrettiklerini bilen ayrı bir karakterdir.
- Tek bir net eylem çağrısı yap.
- En fazla 3 cümle. Emoji yok, nasihat yok.

Sadece şu JSON'u döndür:
{"mode": "momentum"|"steady"|"slipping"|"at_risk", "message": str,
 "action": {"title": str, "minutes": int}, "ask_user": str|null}"""

REPLANNER = """Sen yol haritasını yöneten ajansın. Kullanıcı planın gerisinde kaldığında
planı KENDİ KARARINLA yeniden düzenlersin. Sana mevcut yol haritası, kullanıcının durumu (real) ve rotası (ideal),
event log ve (varsa) kullanıcının "neyin zorladığı" sorusuna cevabı verilecek.

Seçebileceğin müdahaleler (bir veya birkaçı):
- shrink: kalan görevlerin süresini ve zorluğunu düşür
- reorder: kullanıcının daha çok tamamladığı görev tipini öne al
- extend: hedef süresini en fazla %30 uzat
- swap_type: tamamlanmayan görev tipini başka tiple değiştir (ör. learn yerine practice)
- rescope: hedefi daha küçük ama yine ölçülebilir bir hedefle değiştir (son çare)

Kurallar:
- Önce en hafif müdahaleyi dene; rescope'u ancak missed_days ≥ 4 ise seç.
- Yalnızca kalan (henüz gelmemiş) günleri değiştir, geçmişe dokunma.
- Kararını kullanıcıya 2 cümleyle açıkla: ne değişti ve neden.

Sadece şu JSON'u döndür:
{"interventions": [str], "explanation": str,
 "new_duration_days": int, "updated_tasks": [<ROADMAP_PLANNER görev şeması>]}"""


# ---------------------------------------------------------------------------
# 4) LLM ÇAĞRISI (tek nokta) + MOCK
# ---------------------------------------------------------------------------

class LLMError(RuntimeError):
    """Model çağrısı başarısız oldu (ağ, kota, bozuk JSON). Üst katman demo içeriğine düşebilir."""


def provider() -> str | None:
    """Hangi sağlayıcı kullanılacak?
    anthropic     : ANTHROPIC_API_KEY
    openai_compat : HF_TOKEN (Hugging Face Inference Providers) ya da LLM_API_KEY + LLM_BASE_URL
                    (Groq, OpenRouter, Together, yerel Ollama gibi OpenAI uyumlu her uç nokta)
    None          : demo modu
    LLM_PROVIDER=mock ile demo modu zorlanabilir."""
    if os.environ.get("LLM_PROVIDER") == "mock":
        return None
    if os.environ.get("ANTHROPIC_API_KEY"):
        return "anthropic"
    if os.environ.get("HF_TOKEN") or os.environ.get("LLM_API_KEY"):
        return "openai_compat"
    return None


def model_name() -> str:
    p = provider()
    if p == "anthropic":
        return MODEL
    if p == "openai_compat":
        return os.environ.get("LLM_MODEL") or os.environ.get("HF_MODEL") or "openai/gpt-oss-120b"
    return "demo"


def _json_cikar(text: str) -> dict:
    """Modelin cevabından ilk JSON nesnesini çıkarır (kod bloğu, açıklama ya da düşünme metni olsa da)."""
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.split("```")[1].removeprefix("json").strip()
    a, b = text.find("{"), text.rfind("}")
    if a < 0 or b <= a:
        raise ValueError("cevapta JSON yok")
    return json.loads(text[a:b + 1])


def _openai_compat(system: str, payload: dict, max_tokens: int) -> str:
    import urllib.request
    base = (os.environ.get("LLM_BASE_URL") or "https://router.huggingface.co/v1").rstrip("/")
    key = os.environ.get("LLM_API_KEY") or os.environ.get("HF_TOKEN", "")
    body = json.dumps({
        "model": model_name(), "max_tokens": max_tokens, "temperature": 0.3,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": json.dumps(payload, ensure_ascii=False)}],
    }).encode()
    req = urllib.request.Request(base + "/chat/completions", data=body, method="POST",
                                 headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}",
                                          "User-Agent": "ikiz/2.0 (+python-urllib)", "Accept": "application/json"})
    import urllib.error
    try:
        with urllib.request.urlopen(req, timeout=float(os.environ.get("LLM_TIMEOUT", "90"))) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            ayrinti = e.read().decode("utf-8", "replace")[:300]
        except Exception:  # noqa: BLE001
            ayrinti = ""
        if key:
            ayrinti = ayrinti.replace(key, "***")
        raise LLMError(f"HTTP {e.code}: {ayrinti}") from e
    except urllib.error.URLError as e:
        raise LLMError(f"bağlantı hatası: {e.reason}") from e
    except Exception as e:  # noqa: BLE001
        raise LLMError(f"model uç noktasına ulaşılamadı: {type(e).__name__}: {e}") from e
    try:
        return data["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError) as e:
        raise LLMError("model cevabı beklenen biçimde değil") from e


def llm_json(system: str, payload: dict, max_tokens: int = 2000) -> dict:
    """System prompt + JSON girdi → JSON çıktı. Sağlayıcı yoksa mock döner; çağrı başarısızsa LLMError."""
    p = provider()
    if p is None:
        return _mock(system, payload)
    for deneme in range(2):                     # bozuk JSON için bir kez daha dene
        if p == "anthropic":
            try:
                import anthropic  # pip install anthropic
                msg = anthropic.Anthropic().messages.create(
                    model=MODEL, max_tokens=max_tokens, system=system,
                    messages=[{"role": "user", "content": json.dumps(payload, ensure_ascii=False)}])
            except Exception as e:  # noqa: BLE001
                raise LLMError(f"Anthropic çağrısı başarısız: {type(e).__name__}") from e
            text = "".join(b.text for b in msg.content if b.type == "text")
        else:
            text = _openai_compat(system, payload, max_tokens)
        try:
            return _json_cikar(text)
        except (ValueError, json.JSONDecodeError):
            if deneme == 1:
                raise LLMError("model geçerli JSON döndürmedi")
    raise LLMError("model geçerli JSON döndürmedi")


_TASK_BANK = {
    "python": {
        "learn": ["Python'da list ve dict yapılarını anlatan 15 dakikalık bir video izle, 3 not çıkar",
                  "pandas'ta DataFrame oluşturma ve filtrelemeyi resmi kılavuzdan oku"],
        "practice": ["Küçük bir CSV dosyasını pandas ile oku, ilk 5 satırı ve sütun tiplerini yazdır",
                     "Bir fonksiyon yaz: sütun adını alıp ortalamasını döndürsün"],
        "teach": ["İkizine pandas'ta filtrelemenin nasıl çalıştığını anlat"],
    },
    "veri_analizi": {
        "learn": ["Açık bir veri seti seç (ör. TÜİK veya Kaggle) ve sütunlarını incele",
                  "Eksik veriyle başa çıkma yöntemlerini öğren: silme, doldurma"],
        "practice": ["Veri setinde 2 grafik çiz: bir histogram ve bir çizgi grafik",
                     "Veri setinden 3 soru çıkar ve her birini bir groupby ile yanıtla"],
        "teach": ["İkizine histogram ile çizgi grafiğin ne zaman kullanıldığını anlat"],
    },
    "sunum": {
        "learn": ["İyi bir veri sunumunun 3 kuralını öğren: tek mesaj, sade grafik, net başlık"],
        "practice": ["Analizinden tek bir bulguyu 1 dakikada anlatan bir taslak yaz",
                     "Bir grafiğin başlığını, bulguyu söyleyecek şekilde yeniden yaz"],
        "teach": ["İkizine bulgunu 60 saniyede sun, sorularını yanıtla"],
    },
}


def _mock(system: str, payload: dict) -> dict:
    if system is PROFILE_EXTRACTOR:
        text = (payload.get("cv_text") or "").lower()
        skills = {"python": 2.0 if "python" in text else 0.8,
                  "veri_analizi": 1.2 if ("veri" in text or "data" in text) else 0.8,
                  "sunum": 1.0}
        return {"name": payload.get("name") or "Kullanıcı",
                "cv_summary": ". ".join((payload.get("cv_text") or "CV verilmedi").split(". ")[:2]).rstrip(".") + ".",
                "skills": skills, "hobbies": payload.get("hobbies", []),
                "goals": payload.get("goals", []),
                "daily_minutes": payload.get("daily_minutes", 30), "constraints": []}
    if system is GOAL_SELECTOR:
        return {
            "candidates": [
                {"title": "Python ile veri analizi projesi bitirmek", "fit_score": 86, "reason": "Mevcut Python temelin var ve hedeflerinle doğrudan örtüşüyor."},
                {"title": "İngilizce teknik sunum yapabilmek", "fit_score": 71, "reason": "Kariyer hedefini destekliyor ama günlük süreyle yavaş ilerler."},
                {"title": "Kişisel portfolyo sitesi yayınlamak", "fit_score": 58, "reason": "Faydalı, ancak hedeflerine dolaylı katkı sağlıyor."},
            ],
            "selected": "Python ile veri analizi projesi bitirmek",
            "rationale": "Python'da başlangıç seviyesini geçmişsin ve veri alanına geçmek istiyorsun. Günde 30 dakikayla 21 günde bitebilecek ve sonunda gösterebileceğin somut bir çıktı bırakan tek hedef bu.",
            "target_skills": {"python": 3.0, "veri_analizi": 2.5, "sunum": 1.5},
            "duration_days": 21,
            "success_metric": "Bir açık veri setiyle 5 grafikli analiz notebook'unu GitHub'a yüklemek",
        }
    if system is ROADMAP_PLANNER:
        skills = ["python", "veri_analizi", "sunum"]
        tasks = []
        for d in range(1, 22):
            ttype = "reflect" if d % 7 == 0 else "teach" if d % 4 == 0 else "practice" if d % 2 == 0 else "learn"
            skill = skills[(d - 1) % 3] if d > 3 else "python"
            if ttype == "reflect":
                title = f"{d // 7}. haftayı değerlendir: neyi bitirdin, seni ne zorladı?"
                skill = "sunum"
            else:
                bank = _TASK_BANK[skill][ttype]
                title = bank[d % len(bank)]
            tasks.append({"id": f"t{d}", "day": d, "title": title, "minutes": 15 if ttype == "reflect" else 25,
                          "skill": skill, "difficulty": 1 if d <= 3 else 2 if d <= 14 else 3, "type": ttype})
        return {"weeks": [
                    {"week": 1, "theme": "Temeller", "milestone": "Bir veri setini pandas ile okuyup özetleyebilmek"},
                    {"week": 2, "theme": "Analiz", "milestone": "3 soruyu grafikle yanıtlayan bir notebook"},
                    {"week": 3, "theme": "Anlatım", "milestone": "5 grafikli notebook'u GitHub'a yüklemek ve 2 dakikada sunmak"}],
                "tasks": tasks}
    if system is FEEDBACK_COACH:
        st = payload.get("state", {})
        risk, real, ideal = st.get("risk", "steady"), st.get("real", {}), st.get("ideal", {})
        gap_skill = max(ideal, key=lambda k: ideal[k] - real.get(k, 0)) if ideal else "python"
        r, i = real.get(gap_skill, 0), ideal.get(gap_skill, 0)
        gap_line = (f"Rotan {gap_skill} becerisinde {i:.2f}, sen {r:.2f} seviyesindesin."
                    if i - r > 0.01 else "Şu an rotandasın.")
        msgs = {
            "momentum": (f"{st.get('streak', 0)} gündür aralıksız devam ediyorsun. {gap_line} Yarın görevin bir tık zor olacak, hazırsın.",
                         {"title": "Yarınki görevin ilk adımını şimdi aç", "minutes": 2}, None),
            "steady": (f"İlerliyorsun. {gap_line} Yarının görevi seni bekliyor.",
                       {"title": "Yarınki görevi takvimine koy", "minutes": 1}, None),
            "slipping": (f"Dün atlandı, sorun değil. {gap_line} Seriyi kurtarmak için 5 dakika yeter.",
                         {"title": "5 dakikalık mini görev: dünkü notlarına göz at", "minutes": 5}, None),
            "at_risk": (f"{gap_line} Bu fark sende değil, planda bir sorun olduğunu gösteriyor.",
                        {"title": "Planı birlikte yeniden kuralım", "minutes": 3},
                        "Son günlerde seni en çok ne zorladı: süre mi, konu mu, motivasyon mu?"),
        }
        m, a, q = msgs[risk]
        return {"mode": risk, "message": m, "action": a, "ask_user": q}
    if system is TWIN_VOICE:
        learned = payload.get("learned_tasks", [])
        if payload.get("mode") == "teach":
            n = len(payload.get("user_message", "").split())
            score = 2 if n < 15 else 3 if n < 40 else 4
            return {"reply": "Anlattığın için sağ ol, kafamda daha net oturdu. Ama iki şeyi tam çözemedim.",
                    "questions": ["Bunu neden bu şekilde yapıyoruz, başka yolu yok mu?",
                                  "Gerçek bir veri setinde bunu nerede kullanırdık, bir örnek verir misin?"],
                    "teach_score": score,
                    "teach_reason": "Ana fikir doğru; bir örnek ekleseydin daha kalıcı olurdu." if score < 4 else "Net ve örnekli bir anlatımdı."}
        last = learned[-1] if learned else None
        reply = (f"En son birlikte şunu yaptık: {last.lower()}. {payload.get('streak', 0)} günlük serimiz var, bugün de bozmayalım."
                 if last else "Henüz birlikte hiçbir görev bitirmedik, o yüzden ben de senin kadar yeniyim. İlk görevle başlayalım mı?")
        return {"reply": reply, "questions": [], "teach_score": None, "teach_reason": None}
    if system is REPLANNER:
        rem = payload.get("remaining_tasks", [])
        updated = [{**t, "minutes": max(10, int(t["minutes"] * 0.6)), "difficulty": max(1, t["difficulty"] - 1),
                    "done": False} for t in rem]
        reason = payload.get("user_reason")
        why = f" Söylediğin şeyi dikkate aldım: \"{reason}\"." if reason else ""
        return {"interventions": ["shrink"],
                "explanation": f"Kalan görevlerin süresini yaklaşık %40 kısalttım ve zorluğu bir kademe düşürdüm.{why} Amaç tempoyu geri kazanmak; seri oturunca zorluğu yeniden artıracağım.",
                "new_duration_days": payload.get("goal", {}).get("duration_days", 21),
                "updated_tasks": updated}
    return {"mock": True}


# ---------------------------------------------------------------------------
# 5) AJAN ADIMLARI — arayüz bu fonksiyonları çağırır
# ---------------------------------------------------------------------------

def extract_profile(name: str, cv_text: str, hobbies: list[str], goals: list[str], daily_minutes: int) -> Profile:
    out = llm_json(PROFILE_EXTRACTOR, {"name": name, "cv_text": cv_text, "hobbies": hobbies,
                                       "goals": goals, "daily_minutes": daily_minutes})
    out["name"] = name or out.get("name", "Kullanıcı")
    out["daily_minutes"] = daily_minutes
    out.setdefault("constraints", [])
    return Profile(**out)


def is_mock() -> bool:
    return provider() is None


def select_goal(profile: Profile) -> GoalDecision:
    out = llm_json(GOAL_SELECTOR, asdict(profile))
    out["candidates"] = [GoalCandidate(**c) for c in out["candidates"]]
    return GoalDecision(**out)


def build_roadmap(profile: Profile, goal: GoalDecision) -> Roadmap:
    out = llm_json(ROADMAP_PLANNER, {"profile": asdict(profile), "goal": asdict(goal)}, max_tokens=6000)
    return Roadmap(weeks=out["weeks"], tasks=[Task(**t) for t in out["tasks"]])


def coach_feedback(state: TwinState) -> dict:
    return llm_json(FEEDBACK_COACH, {"state": twin_snapshot(state), "recent_events": state.log[-5:]})


def twin_talk(state: TwinState, roadmap: Roadmap, user_msg: str, mode: str = "chat") -> dict:
    learned = [t.title for t in roadmap.tasks if t.done]
    return llm_json(TWIN_VOICE, {"mode": mode, "twin_skills": state.real.skills,
                                 "learned_tasks": learned[-10:], "streak": state.streak,
                                 "user_message": user_msg})


def maybe_replan(state: TwinState, roadmap: Roadmap, goal: GoalDecision, user_reason: str | None = None) -> dict | None:
    """Ajanın kendi kararı: risk at_risk ise yeniden planlar, değilse hiçbir şey yapmaz."""
    if state.risk != "at_risk":
        return None
    remaining = [asdict(t) for t in roadmap.tasks if t.day > state.day]
    out = llm_json(REPLANNER, {"goal": asdict(goal), "state": twin_snapshot(state),
                               "recent_events": state.log[-7:], "remaining_tasks": remaining,
                               "user_reason": user_reason})
    if "updated_tasks" in out:
        kept = [t for t in roadmap.tasks if t.day <= state.day]
        roadmap.tasks = kept + [Task(**t) for t in out["updated_tasks"]]
    return out


# ---------------------------------------------------------------------------
# DEMO
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    demo = Profile(
        name="Elif",
        cv_summary="Bilgisayar mühendisliği 3. sınıf öğrencisi, bir dönem stajda Python ile otomasyon yazdı.",
        skills={"python": 2.0, "veri_analizi": 0.8, "sunum": 1.0},
        hobbies=["satranç", "fotoğrafçılık"],
        goals=["veri bilimine geçmek", "İngilizce sunum yapabilmek"],
        daily_minutes=30,
    )
    goal = select_goal(demo)
    roadmap = build_roadmap(demo, goal)
    print("SEÇİLEN HEDEF:", goal.selected, "\nGEREKÇE:", goal.rationale, "\n")

    for label, consistency in [("İstikrarlı kullanıcı", 0.95), ("Kopan kullanıcı", 0.35)]:
        state = init_twin(demo, goal)
        rm = Roadmap(roadmap.weeks, [Task(**asdict(t)) for t in roadmap.tasks])
        fast_forward(state, rm, days=7, consistency=consistency)
        snap = twin_snapshot(state)
        print(f"--- {label}: 7 gün sonra ---")
        print(" Gerçek Sen   :", snap["real"])
        print(" Rota:", snap["ideal"])
        print(f" seri={snap['streak']}  fark={snap['divergence']}  risk={snap['risk']}")
        print(" Koç:", coach_feedback(state)["message"])
        print(" Yeniden planlama tetiklendi mi?:", maybe_replan(state, rm, goal) is not None, "\n")
