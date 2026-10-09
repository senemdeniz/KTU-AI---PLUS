"""
İkiz API — mobil uygulamanın konuştuğu Python backend.

Çalıştırma (telefon aynı Wi-Fi'dan erişebilsin diye 0.0.0.0):
    uvicorn server:app --host 0.0.0.0 --port 8000

ANTHROPIC_API_KEY tanımlı değilse ajanlar demo modunda (hazır cevaplarla) çalışır.
Oturumlar bellekte tutulur; sunucu yeniden başlarsa sıfırlanır.
"""

from __future__ import annotations

import io
import uuid
from dataclasses import asdict

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import ikiz_ajan as ia

app = FastAPI(title="İkiz API", version="1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SESSIONS: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# İstek gövdeleri
# ---------------------------------------------------------------------------
class OnboardingIn(BaseModel):
    name: str = ""
    cv_text: str = ""
    hobbies: list[str] = []
    goals: list[str] = []
    daily_minutes: int = Field(30, ge=5, le=240)


class DayIn(BaseModel):
    completed_ids: list[str] = []


class FastForwardIn(BaseModel):
    days: int = Field(7, ge=1, le=30)
    consistency: float = Field(0.4, ge=0.0, le=1.0)


class ReplanIn(BaseModel):
    reason: str | None = None


class TalkIn(BaseModel):
    message: str
    mode: str = "chat"  # "chat" | "teach"


# ---------------------------------------------------------------------------
# Yardımcılar
# ---------------------------------------------------------------------------
def _get(sid: str) -> dict:
    s = SESSIONS.get(sid)
    if not s:
        raise HTTPException(404, "Oturum bulunamadı. Uygulamayı baştan başlat.")
    return s


def _require_started(s: dict) -> None:
    if "state" not in s:
        raise HTTPException(409, "Önce hedefle başla.")


def _history(s: dict) -> list[dict]:
    goal: ia.GoalDecision = s["goal"]
    base = ia._avg({k: s["profile"].skills.get(k, 0.0) for k in goal.target_skills})
    rows = [{"day": 0, "real": base, "ideal": base}]
    rows += [{"day": e["day"], "real": e["real_avg"], "ideal": e["ideal_avg"]} for e in s["state"].log]
    return rows


def _view(sid: str) -> dict:
    """Mobil uygulamanın ihtiyaç duyduğu her şey tek cevapta."""
    s = _get(sid)
    out = {
        "session_id": sid,
        "mock": ia.is_mock(),
        "profile": asdict(s["profile"]),
        "goal": asdict(s["goal"]),
        "started": "state" in s,
    }
    if "state" in s:
        st: ia.TwinState = s["state"]
        out.update({
            "roadmap": asdict(s["roadmap"]),
            "twin": ia.twin_snapshot(st),
            "history": _history(s),
            "today": st.day + 1,
            "finished": st.day >= s["goal"].duration_days,
            "coach": s.get("coach"),
            "replan": s.get("replan"),
            "chat": s.get("chat", []),
        })
    return out


# ---------------------------------------------------------------------------
# Uç noktalar
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"ok": True, "mock": ia.is_mock(), "model": ia.MODEL}


@app.post("/cv/parse")
async def parse_cv(file: UploadFile = File(...)):
    """PDF CV'den metin çıkarır; mobil uygulama sonucu onboarding formuna koyar."""
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(413, "PDF 8 MB'tan büyük olmamalı.")
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        text = "\n".join((p.extract_text() or "") for p in reader.pages).strip()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, f"PDF okunamadı: {e}") from e
    if not text:
        raise HTTPException(422, "PDF'te metin bulunamadı (taranmış bir görsel olabilir).")
    return {"text": text}


@app.post("/sessions")
def create_session(body: OnboardingIn):
    if not body.cv_text.strip() and not body.goals:
        raise HTTPException(422, "En azından CV'ni ya da hedeflerini yazmalısın.")
    profile = ia.extract_profile(body.name or "Kullanıcı", body.cv_text, body.hobbies, body.goals, body.daily_minutes)
    goal = ia.select_goal(profile)
    sid = uuid.uuid4().hex[:12]
    SESSIONS[sid] = {"profile": profile, "goal": goal, "chat": []}
    return _view(sid)


@app.get("/sessions/{sid}")
def get_session(sid: str):
    return _view(sid)


@app.post("/sessions/{sid}/start")
def start(sid: str):
    s = _get(sid)
    s["roadmap"] = ia.build_roadmap(s["profile"], s["goal"])
    s["state"] = ia.init_twin(s["profile"], s["goal"])
    s["coach"], s["replan"] = None, None
    return _view(sid)


@app.post("/sessions/{sid}/day")
def close_day(sid: str, body: DayIn):
    s = _get(sid)
    _require_started(s)
    if s["state"].day >= s["goal"].duration_days:
        raise HTTPException(409, "Hedef süresi tamamlandı.")
    ia.advance_day(s["state"], s["roadmap"], set(body.completed_ids))
    s["replan"] = None
    s["coach"] = ia.coach_feedback(s["state"])
    return _view(sid)


@app.post("/sessions/{sid}/fast-forward")
def fast_forward(sid: str, body: FastForwardIn):
    s = _get(sid)
    _require_started(s)
    st: ia.TwinState = s["state"]
    days = min(body.days, s["goal"].duration_days - st.day)
    if days <= 0:
        raise HTTPException(409, "Hedef süresi tamamlandı.")
    ia.fast_forward(st, s["roadmap"], days, body.consistency, seed=st.day + 7)
    s["replan"] = None
    s["coach"] = ia.coach_feedback(st)
    return _view(sid)


@app.post("/sessions/{sid}/replan")
def replan(sid: str, body: ReplanIn):
    s = _get(sid)
    _require_started(s)
    st: ia.TwinState = s["state"]
    result = ia.maybe_replan(st, s["roadmap"], s["goal"], (body.reason or "").strip() or None)
    if result is None:
        raise HTTPException(409, "Şu an yeniden planlamaya gerek yok.")
    st.risk, st.missed_days = "steady", 0
    s["replan"] = result
    s["coach"] = ia.coach_feedback(st)
    return _view(sid)


@app.post("/sessions/{sid}/talk")
def talk(sid: str, body: TalkIn):
    s = _get(sid)
    _require_started(s)
    if not body.message.strip():
        raise HTTPException(422, "Mesaj boş olamaz.")
    mode = "teach" if body.mode == "teach" else "chat"
    out = ia.twin_talk(s["state"], s["roadmap"], body.message, mode=mode)
    s["chat"] += [
        {"role": "user", "text": body.message, "mode": mode},
        {"role": "twin", "text": out.get("reply", ""), "questions": out.get("questions") or [],
         "score": out.get("teach_score"), "score_reason": out.get("teach_reason")},
    ]
    return _view(sid)
