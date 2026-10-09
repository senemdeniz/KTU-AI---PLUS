# İkiz API v2

Taban: `http://host:8000`. Gizli anahtarlar yalnızca sunucu ortam değişkenlerinde durur (`ANTHROPIC_API_KEY`, `HF_TOKEN`, `LLM_BASE_URL`, `LLM_MODEL`, `IKIZ_DB`, `AJAN_GECIKME`).

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET | `/health` | `{ok, surum, demo, saglayici, model}` |
| POST | `/v2/sessions` | `{ad, akademik?, hobi?, dakika, zaman: sabah/ogle/aksam, son_tarihler[{baslik,tarih}]}` → `{session_id}`; ajan kurulumu arka planda başlar |
| GET | `/v2/sessions/{sid}` | Tüm görünüm (`durum`: kuruluyor/isleniyor/hazir, `alanlar`, `bugun`, `oneriler`, `koc`, `ogret`, `ajanlar`, `son_olay_id`) |
| DELETE | `/v2/sessions/{sid}` | Tüm veriyi siler |
| GET | `/v2/sessions/{sid}/events?after=N` | Polling: `{olaylar[], son_olay_id, durum}` (mobil için) |
| GET | `/v2/sessions/{sid}/stream` | SSE (web için) |
| POST | `/v2/sessions/{sid}/tasks/{id}/complete?yapildi=true` | Bugünün görevini işaretle (409: bugüne ait değil) |
| POST | `/v2/sessions/{sid}/day/close` | Günü kapat: Gözcü → Gözlemevi → Yörüngeci → Rehber |
| POST | `/v2/sessions/{sid}/demo/skip` | `{gun, tutarlilik}` demo için günleri hızlandır |
| POST | `/v2/sessions/{sid}/assign` | `{metin}` ekibe görev ver. `ok:false` + `engel` (`odev_yaptirma`, `kisisel_veri`, `anlasilmadi`…) |
| POST | `/v2/sessions/{sid}/proposals/{pid}/approve` / `reject` | Büyük plan değişiklikleri onay bekler |
| POST | `/v2/sessions/{sid}/teach/add` | `{metin, alan}`; güvenlik denetiminden geçer |
| DELETE | `/v2/sessions/{sid}/teach` | Anlattıklarını sil |
| POST | `/v2/sessions/{sid}/teach/exam` | İkizi sınava sok: Kaşif → İkiz → Hakem |

Olay: `{id, t, ajan, mesaj, tur: start|info|decision|handoff|done|guard|error, veri, alan}`.
