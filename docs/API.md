# İkiz API v2

Taban adres: `http://127.0.0.1:8000`. Model anahtarları yalnızca sunucuda durur (`.env`, bkz. `.env.example`).

**Kimlik:** Giriş, `ikiz_giris` adlı `HttpOnly` çerezle tutulur. Hesaba bağlı bir gökyüzüne (`/v2/sessions/{sid}/…`) yalnızca sahibi erişir; başkası `404` alır.
**CSRF:** `/v2/` altındaki her `POST`, `PATCH` ve `DELETE` isteği `X-Ikiz: 1` başlığını taşımalıdır; yoksa `403`.

## Hesap

| Yöntem | Yol | Gövde → Yanıt |
|---|---|---|
| POST | `/v2/auth/register` | `{kullanici, sifre}` → `{kullanici, session_id: null}` ve çerez. `422` geçersiz ad/şifre, `409` ad alınmış |
| POST | `/v2/auth/login` | `{kullanici, sifre}` → `{kullanici, session_id}` ve çerez. `401` yanlış bilgi, `429` çok fazla deneme |
| POST | `/v2/auth/logout` | Çerezi geçersiz kılar |
| GET | `/v2/auth/me` | `{kullanici, session_id}` (giriş yoksa ikisi de `null`) |
| DELETE | `/v2/auth/account` | Hesabı ve gökyüzünü kalıcı olarak siler |

## Gökyüzü

| Yöntem | Yol | Açıklama |
|---|---|---|
| GET | `/health` | `{ok, demo, saglayici, model, yetenekler{gorsel, ses}}` |
| POST | `/v2/sessions` | `{ad, akademik?, hobi?, dakika, zaman, seviye, sure, avatar, son_tarihler[]}` → `{session_id}`. Giriş gerekir (`401`); hesabın zaten gökyüzü varsa `409`. `misafir: true` → girişsiz demo gökyüzü (bir gün sonra silinir) |
| GET | `/v2/sessions/{sid}` | Tüm görünüm: `alanlar[]` (her konu: `ilerleme`, `ikiz`, `ikiz_kimlik`, `kaynaklar{strateji, secim, alternatifler, platformlar}`, `harita`), `bugun`, `oneriler`, `profil`, `ajanlar[]{ad, rol, fayda, ne_zaman, tur}` |
| DELETE | `/v2/sessions/{sid}` | Gökyüzünü siler |
| GET | `/v2/sessions/{sid}/events?after=N` | `{olaylar[], son_olay_id, durum}` |
| GET | `/v2/sessions/{sid}/stream` | Aynı olaylar, SSE |
| POST | `/v2/sessions/{sid}/tracks` | `{tur: akademik/hobi, konu}`: yeni takımyıldız, yeni ikiz |
| PATCH | `/v2/sessions/{sid}/tracks/{alan}/twin` | `{ad}`: ikizin adını değiştir |
| PATCH | `/v2/sessions/{sid}/profile` | `{ad?, dakika?, zaman?, seviye?, hedef_notu?, sure?, avatar?, son_tarihler?}` |
| POST | `/v2/sessions/{sid}/tasks/{id}/complete?yapildi=true` | Bugünün görevini işaretle |
| POST | `/v2/sessions/{sid}/day/close` | Günü kapat: Gözcü → Gözlemevi → Yörüngeci → Rehber |
| POST | `/v2/sessions/{sid}/demo/skip` | `{gun, tutarlilik}`: demo için günleri hızlandır |
| POST | `/v2/sessions/{sid}/assign` | `{metin}`: ekibe görev ver |
| POST | `/v2/sessions/{sid}/chat` | `{metin, ajan?, alan?}`: bir ajana soru sor |
| POST | `/v2/sessions/{sid}/proposals/{pid}/approve` · `/reject` | Büyük plan değişikliği onayı |
| GET | `/v2/sessions/{sid}/agents/{ajan}/output` | `{ajan, rol, fayda, ne_zaman, bolumler[{baslik, satirlar[str | {metin, url}]}]}` |

## İkizine öğret

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/v2/sessions/{sid}/teach/select` | `{alan, kavram}`: öğretilecek kavramı seç |
| POST | `/v2/sessions/{sid}/teach/add` | `{metin, alan}`: güvenlik ve Konu Bekçisi denetiminden geçer |
| DELETE | `/v2/sessions/{sid}/teach/sentences/{no}` · `/teach` | Bir cümleyi ya da hepsini sil |
| POST | `/v2/sessions/{sid}/teach/exam` | `{gorev_id}`: Kaşif → İkiz → Hakem |
| POST | `/v2/sessions/{sid}/teach/image` · `/teach/audio` | Fotoğraftan ya da sesten metin (saklanmaz) |

## Kaynaklar ve pratik

| Yöntem | Yol | Açıklama |
|---|---|---|
| POST | `/v2/sessions/{sid}/sources` | Kendi kaynağını ekle (yalnızca https, SSRF korumalı) |
| DELETE | `/v2/sessions/{sid}/sources/{alan}/{kid}` | Kendi kaynağını sil |
| POST | `/v2/sessions/{sid}/sources/primary` | Birincil kaynağı seç |
| POST | `/v2/sessions/{sid}/sources/check` | Bağlantıları canlı denetle |
| POST | `/v2/sessions/{sid}/practice` | Beceri konularında pratik kaydı (BPM, süre) |

Olay biçimi: `{id, t, ajan, mesaj, tur: start|info|decision|handoff|done|guard|error, veri, alan}`.
