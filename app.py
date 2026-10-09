"""
İkiz — seninle birlikte gelişen öğrenme ikizi
Streamlit arayüzü. Çalıştırma:  streamlit run app.py
"""

from __future__ import annotations

import io
from dataclasses import asdict

import pandas as pd
import streamlit as st

import ikiz_ajan as ia

st.set_page_config(page_title="İkiz — öğrenme ikizin", page_icon="🪞", layout="wide")

# ---------------------------------------------------------------------------
# Görünüm
# ---------------------------------------------------------------------------
st.markdown(
    """
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
    h1, h2, h3 { font-family: 'Fraunces', serif !important; letter-spacing: -0.01em; }
    .ikiz-hero { padding: 0.2rem 0 0.8rem 0; }
    .ikiz-hero p { color: #6b6b6b; margin-top: -0.4rem; }
    .pill { display:inline-block; padding: 2px 10px; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }
    .pill.momentum { background:#e3f4ea; color:#1d6b3f; }
    .pill.steady   { background:#e8eef9; color:#2c4f8f; }
    .pill.slipping { background:#fdf1dc; color:#8a5a0b; }
    .pill.at_risk  { background:#fbe3e1; color:#9b2c22; }
    .coach { border-left: 4px solid #3b5bdb; padding: 0.6rem 1rem; background: rgba(59,91,219,0.06); border-radius: 6px; }
    .coach.at_risk { border-color:#c92a2a; background: rgba(201,42,42,0.06); }
    .muted { color:#7a7a7a; font-size:0.9rem; }
    </style>
    """,
    unsafe_allow_html=True,
)

RISK_TR = {"momentum": "Momentum", "steady": "Dengeli", "slipping": "Kayıyor", "at_risk": "Risk altında"}
TYPE_TR = {"learn": "Öğren", "practice": "Uygula", "teach": "İkizine öğret", "reflect": "Değerlendir"}

DEMO = {
    "f_name": "Elif",
    "f_cv": ("Bilgisayar mühendisliği 3. sınıf öğrencisi. Yaz stajında Python ile Excel raporlarını "
             "otomatikleştiren betikler yazdı. Temel SQL biliyor, veri bilimine ilgi duyuyor. "
             "Üniversite satranç kulübünde etkinlik koordinatörü."),
    "f_hobbies": "satranç, fotoğrafçılık",
    "f_goals": "veri bilimine geçmek\nİngilizce teknik sunum yapabilmek",
    "f_minutes": 30,
}


def fill_demo():
    for k, v in DEMO.items():
        st.session_state[k] = v


def reset():
    for k in list(st.session_state.keys()):
        del st.session_state[k]


ss = st.session_state
ss.setdefault("step", "onboarding")
ss.setdefault("chat_log", [])

# ---------------------------------------------------------------------------
# Kenar çubuğu
# ---------------------------------------------------------------------------
with st.sidebar:
    st.markdown("### 🪞 İkiz")
    if ia.is_mock():
        st.caption("Demo modu: API anahtarı yok, ajan hazır cevaplarla çalışıyor.")
    else:
        st.caption(f"Canlı mod: {ia.MODEL}")
    if "profile" in ss:
        p = ss.profile
        st.markdown(f"**{p.name}**  \n<span class='muted'>{p.cv_summary}</span>", unsafe_allow_html=True)
        st.markdown("**Başlangıç becerileri**")
        for s, v in p.skills.items():
            st.progress(min(v / 5, 1.0), text=f"{s}: {v:.1f} / 5")
    st.divider()
    st.button("Baştan başla", on_click=reset, width="stretch")


def hero(title: str, sub: str):
    st.markdown(f"<div class='ikiz-hero'><h1>{title}</h1><p>{sub}</p></div>", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# 1) ONBOARDING
# ---------------------------------------------------------------------------
def page_onboarding():
    hero("Seni tanıyalım", "CV'ni, hobilerini ve hedeflerini ver; ajan senin için en uygun gelişim hedefini seçsin ve bir ikiz oluştursun.")
    st.button("Demo profiliyle doldur", on_click=fill_demo)

    with st.form("onboarding"):
        c1, c2 = st.columns([1, 1])
        with c1:
            name = st.text_input("Adın", key="f_name")
            cv_text = st.text_area("CV'n (metin olarak yapıştır)", key="f_cv", height=170)
            cv_file = st.file_uploader("ya da PDF olarak yükle", type=["pdf"])
        with c2:
            hobbies = st.text_input("Hobilerin (virgülle ayır)", key="f_hobbies")
            goals = st.text_area("Kendini geliştirmek istediğin konular (her satıra bir tane)", key="f_goals", height=110)
            minutes = st.slider("Günde ayırabileceğin süre (dakika)", 10, 120, step=5, key="f_minutes")
        st.caption("Verilerin yalnızca bu oturumda tutulur ve hedef seçimi dışında bir amaçla kullanılmaz.")
        go = st.form_submit_button("İkizimi oluştur", type="primary")

    if go:
        if cv_file is not None:
            try:
                from pypdf import PdfReader
                reader = PdfReader(io.BytesIO(cv_file.read()))
                cv_text = "\n".join((pg.extract_text() or "") for pg in reader.pages)
            except Exception as e:  # noqa: BLE001
                st.error(f"PDF okunamadı: {e}")
                return
        if not (cv_text or "").strip() and not (goals or "").strip():
            st.warning("En azından CV'ni ya da hedeflerini yazmalısın.")
            return
        with st.spinner("Profilin çıkarılıyor ve ajan hedef adaylarını tartıyor..."):
            profile = ia.extract_profile(
                name=name or "Kullanıcı",
                cv_text=cv_text or "",
                hobbies=[h.strip() for h in (hobbies or "").split(",") if h.strip()],
                goals=[g.strip() for g in (goals or "").splitlines() if g.strip()],
                daily_minutes=int(minutes),
            )
            ss.profile = profile
            ss.goal = ia.select_goal(profile)
        ss.step = "goal"
        st.rerun()


# ---------------------------------------------------------------------------
# 2) HEDEF KARARI
# ---------------------------------------------------------------------------
def page_goal():
    g: ia.GoalDecision = ss.goal
    hero("Ajanın seçimi", "Üç aday hedefi tarttı ve birini seçti. İşte nedeni.")

    cols = st.columns(len(g.candidates))
    for col, c in zip(cols, sorted(g.candidates, key=lambda x: -x.fit_score)):
        with col, st.container(border=True):
            chosen = c.title == g.selected
            st.markdown(f"{'✅ **Seçildi**' if chosen else '<span class=muted>Aday</span>'}", unsafe_allow_html=True)
            st.markdown(f"#### {c.title}")
            st.progress(c.fit_score / 100, text=f"Uygunluk: {c.fit_score}/100")
            st.caption(c.reason)

    with st.container(border=True):
        st.markdown("**Neden bu hedef, neden şimdi?**")
        st.write(g.rationale)
        c1, c2 = st.columns(2)
        c1.metric("Süre", f"{g.duration_days} gün")
        c2.markdown(f"**Başarı ölçütü**  \n{g.success_metric}")
        st.markdown("**Hedef sonunda ulaşılacak seviyeler**")
        start = ss.profile.skills
        st.dataframe(
            pd.DataFrame([{"Beceri": k, "Şimdi": start.get(k, 0.0), "Hedef": v} for k, v in g.target_skills.items()]),
            hide_index=True, width="stretch",
        )

    if st.button("Bu hedefle başla: yol haritamı ve ikizimi oluştur", type="primary"):
        with st.spinner("Gün gün yol haritan hazırlanıyor..."):
            ss.roadmap = ia.build_roadmap(ss.profile, g)
            ss.state = ia.init_twin(ss.profile, g)
            ss.coach = None
            ss.replan = None
        ss.step = "panel"
        st.rerun()


# ---------------------------------------------------------------------------
# 3) PANEL
# ---------------------------------------------------------------------------
def refresh_coach():
    ss.coach = ia.coach_feedback(ss.state)


def history_df() -> pd.DataFrame:
    s: ia.TwinState = ss.state
    base = ia._avg({k: ss.profile.skills.get(k, 0.0) for k in ss.goal.target_skills})
    rows = [{"Gün": 0, "Gerçek Sen": base, "İstikrarlı Sen": base}]
    rows += [{"Gün": e["day"], "Gerçek Sen": e["real_avg"], "İstikrarlı Sen": e["ideal_avg"]} for e in s.log]
    return pd.DataFrame(rows).set_index("Gün")


def page_panel():
    s: ia.TwinState = ss.state
    g: ia.GoalDecision = ss.goal
    rm: ia.Roadmap = ss.roadmap

    hero(f"{ss.profile.name} ve ikizi", f"Hedef: {g.selected}")

    finished = s.day >= g.duration_days
    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Gün", f"{s.day} / {g.duration_days}")
    m2.metric("Seri", f"{s.streak} gün")
    m3.metric("İkizler arası fark", f"{s.divergence:.2f}")
    m4.markdown(f"**Durum**  \n<span class='pill {s.risk}'>{RISK_TR[s.risk]}</span>", unsafe_allow_html=True)

    c1, c2 = st.columns([3, 2])
    with c1, st.container(border=True):
        st.markdown("**İki ikiz: ortalama seviye**")
        st.caption("İstikrarlı Sen planı her gün uygulasaydın nerede olacağını gösterir. Gerçek Sen yalnızca bitirdiğin görevlerle büyür.")
        import altair as alt
        long = history_df().reset_index().melt("Gün", var_name="İkiz", value_name="Seviye")
        chart = (
            alt.Chart(long).mark_line(point=True, strokeWidth=3)
            .encode(
                x=alt.X("Gün:Q", axis=alt.Axis(tickMinStep=1)),
                y=alt.Y("Seviye:Q", scale=alt.Scale(zero=False, padding=8)),
                color=alt.Color("İkiz:N", scale=alt.Scale(domain=["Gerçek Sen", "İstikrarlı Sen"],
                                                          range=["#3b5bdb", "#adb5bd"]),
                                legend=alt.Legend(orient="bottom", title=None)),
                strokeDash=alt.StrokeDash("İkiz:N", scale=alt.Scale(domain=["Gerçek Sen", "İstikrarlı Sen"],
                                                                     range=[[1, 0], [6, 4]]), legend=None),
            ).properties(height=260)
        )
        st.altair_chart(chart, width="stretch")
    with c2, st.container(border=True):
        st.markdown("**Beceri bazında**")
        df = pd.DataFrame({"Gerçek Sen": s.real.skills, "İstikrarlı Sen": s.ideal.skills})
        st.bar_chart(df, stack=False, color=["#3b5bdb", "#adb5bd"], height=260)

    # Koç
    if ss.get("coach"):
        c = ss.coach
        st.markdown(
            f"<div class='coach {c['mode']}'><b>İstikrar koçu</b><br>{c['message']}"
            f"<br><span class='muted'>Şimdi yap: {c['action']['title']} ({c['action']['minutes']} dk)</span></div>",
            unsafe_allow_html=True,
        )
        st.write("")

    # Ajanın yeniden planlama kararı
    if s.risk == "at_risk" and not finished:
        with st.container(border=True):
            st.markdown("**Ajan planın sana uymadığını tespit etti.**")
            q = (ss.coach or {}).get("ask_user") or "Son günlerde seni en çok ne zorladı?"
            reason = st.text_input(q, key="replan_reason", placeholder="ör. akşamları 25 dakika ayıramıyorum")
            if st.button("Planı yeniden kur", type="primary"):
                with st.spinner("Ajan kalan günleri yeniden düzenliyor..."):
                    ss.replan = ia.maybe_replan(s, rm, g, reason or None)
                    s.risk = "steady"
                    s.missed_days = 0
                    refresh_coach()
                st.rerun()
    if ss.get("replan"):
        st.success(f"**Plan güncellendi** ({', '.join(ss.replan.get('interventions', []))}): {ss.replan.get('explanation', '')}")

    if finished:
        st.balloons()
        st.success(f"Hedef süresi doldu. Başarı ölçütün: {g.success_metric}")

    t1, t2, t3, t4 = st.tabs(["Bugün", "İleri sar (demo)", "İkizinle konuş", "Yol haritası"])

    with t1:
        today = s.day + 1
        todays = [t for t in rm.tasks if t.day == today]
        if finished:
            st.info("Tüm günler tamamlandı.")
        elif not todays:
            st.info("Bugün için görev yok, dinlen.")
        else:
            st.markdown(f"**{today}. gün görevleri**")
            for t in todays:
                st.checkbox(f"{t.title}  ·  {TYPE_TR[t.type]} · {t.minutes} dk · {t.skill} · zorluk {t.difficulty}",
                            key=f"chk_{t.id}_{today}")
            if any(t.type == "teach" for t in todays):
                st.caption("Bu bir öğretme görevi: 'İkizinle konuş' sekmesinde Öğret modunu seç.")
        if not finished and st.button("Günü kapat", type="primary"):
            done = {t.id for t in todays if ss.get(f"chk_{t.id}_{today}")}
            ia.advance_day(s, rm, done)
            ss.replan = None
            refresh_coach()
            st.rerun()

    with t2:
        st.caption("Jüriye istikrarın etkisini göstermek için zamanı ileri sar.")
        cc1, cc2 = st.columns(2)
        days = cc1.slider("Kaç gün?", 1, 14, 7)
        consistency = cc2.slider("Görevleri tamamlama olasılığı", 0.0, 1.0, 0.4, 0.05)
        if st.button("İleri sar") and not finished:
            ia.fast_forward(s, rm, min(days, g.duration_days - s.day), consistency, seed=s.day + 7)
            ss.replan = None
            refresh_coach()
            st.rerun()

    with t3:
        mode = st.radio("Mod", ["Sohbet", "Öğret"], horizontal=True,
                        help="Öğret modunda o gün öğrendiğini ikizine anlatırsın; ikizin soru sorar ve anlatımını puanlar.")
        for m in ss.chat_log[-8:]:
            with st.chat_message("user" if m["role"] == "user" else "assistant", avatar=None if m["role"] == "user" else "🪞"):
                st.write(m["text"])
        with st.form("chat", clear_on_submit=True):
            msg = st.text_area("Mesajın" if mode == "Sohbet" else "Bugün öğrendiğini ikizine anlat", height=90)
            send = st.form_submit_button("Gönder")
        if send and msg.strip():
            out = ia.twin_talk(s, rm, msg, mode="teach" if mode == "Öğret" else "chat")
            text = out.get("reply", "")
            if out.get("questions"):
                text += "\n\n" + "\n".join(f"- {q}" for q in out["questions"])
            if out.get("teach_score"):
                text += f"\n\n**Anlatım puanı: {out['teach_score']}/5.** {out.get('teach_reason') or ''}"
            ss.chat_log += [{"role": "user", "text": msg}, {"role": "twin", "text": text}]
            st.rerun()

    with t4:
        for w in rm.weeks:
            st.markdown(f"**{w['week']}. hafta: {w['theme']}**  \n<span class='muted'>Kilometre taşı: {w['milestone']}</span>",
                        unsafe_allow_html=True)
        st.dataframe(
            pd.DataFrame([{"Gün": t.day, "Görev": t.title, "Tür": TYPE_TR[t.type], "Dk": t.minutes,
                           "Beceri": t.skill, "Zorluk": t.difficulty,
                           "Durum": "✅" if t.done else ("—" if t.day > s.day else "✗")} for t in rm.tasks]),
            hide_index=True, width="stretch", height=360,
        )


# ---------------------------------------------------------------------------
PAGES = {"onboarding": page_onboarding, "goal": page_goal, "panel": page_panel}
PAGES[ss.step]()
