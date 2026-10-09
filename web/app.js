import { arkaplan, takimyildiz, ikizGogu, ikiliAnimasyon, egri, svg, avatarCiz, AVATAR_BICIM } from './sky.js';

const _rc = Element.prototype.replaceChildren;
Element.prototype.replaceChildren = function (...k) { return _rc.apply(this, k.flat().filter((x) => x != null && x !== false)); };
const _ap = Element.prototype.append;
Element.prototype.append = function (...k) { return _ap.apply(this, k.flat().filter((x) => x != null && x !== false)); };

/* ---------- yardımcılar (metin her zaman textContent ile yazılır: XSS yok) ---------- */
const $ = (s, k = document) => k.querySelector(s);
export const h = (tag, a = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(a || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
};
const kisa = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const guvenliUrl = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : '#');
let toastT;
const bildir = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('goster'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('goster'), 3400); };

async function api(yol, yontem = 'GET', govde) {
  let r;
  const basliklar = { 'X-Ikiz': '1', ...(govde ? { 'Content-Type': 'application/json' } : {}) };
  try { r = await fetch(yol, { method: yontem, headers: basliklar, credentials: 'same-origin', body: govde ? JSON.stringify(govde) : undefined }); }
  catch { throw new Error('Sunucuya ulaşılamıyor. Sunucunun açık olduğundan emin ol.'); }
  if (!r.ok) {
    let m = r.status === 429 ? 'Çok fazla istek gönderdin. Biraz bekle.' : `Beklenmeyen hata (${r.status}).`;
    try { const j = await r.json(); if (typeof j.detail === 'string') m = j.detail; else if (Array.isArray(j.detail)) m = 'Girdiğin bilgilerden biri geçersiz. Alanları kontrol et.'; } catch { /* json değil */ }
    throw new Error(m);
  }
  return r.json();
}

/* ---------- ajanlar ---------- */
const AJAN = {
  'Gözlemevi': ['🔭', '#f5d78e'], 'Astronom': ['🌙', '#b7c4ff'], 'Kutup Yıldızı': ['⭐', '#ffe9a8'], 'Haritacı': ['🧭', '#8fe3c4'],
  'Kaynak Avcısı': ['📚', '#ffc58f'], 'Gözcü': ['👁️', '#ff9c8a'], 'Yörüngeci': ['🛰️', '#9bd0ff'], 'Rehber': ['💡', '#f5d78e'],
  'Konu Bekçisi': ['🛡️', '#ff9fb8'], 'Kaşif': ['🔍', '#d6b8ff'], 'İkiz': ['👯', '#8ea2ff'], 'Hakem': ['⚖️', '#9be0b4'],
};
const ajanRenk = (a) => (AJAN[a] || ['✦', '#f5d78e'])[1];
const avatar = (ad, aktif = false) => h('div', { class: 'ava' + (aktif ? ' aktif' : ''), style: `--c:${ajanRenk(ad)}`, 'aria-hidden': 'true' }, (AJAN[ad] || ['✦'])[0]);
const TUR = { decision: 'karar', handoff: 'devir', done: 'tamam', guard: 'koruma', error: 'hata', start: 'başladı', chat: '', info: '' };
function balon(o, yeni = false) {
  return h('div', { class: `balon${yeni ? ' yeni' : ''}${o.tur === 'guard' || o.tur === 'error' ? ' koruma' : ''}` },
    avatar(o.ajan),
    h('div', { class: 'govde', style: `--c:${ajanRenk(o.ajan)}` },
      h('div', { class: 'ad' }, h('span', {}, o.ajan), TUR[o.tur] ? h('span', { class: 'tur' + (o.tur === 'guard' ? ' koruma' : '') }, (o.tur === 'handoff' ? '→ ' : '') + TUR[o.tur]) : null),
      h('div', {}, o.mesaj)));
}
const yaziyor = () => h('div', { class: 'yaziyor', 'aria-label': 'Yazıyor' }, h('i'), h('i'), h('i'));

/* ---------- durum ---------- */
const S = { kullanici: null, sid: null, view: null, olaylar: [], son: 0, ekran: 'karsilama', sekme: 'gokyuzu', alan: 0, zamanlayici: null, ses: false, mesgul: false };
const kok = () => $('#ana');
const goster = (ekran, ...icerik) => { S.ekran = ekran; kok().replaceChildren(...icerik); scrollTo(0, 0); kok().focus({ preventScroll: true }); };

async function tazele() {
  const sid = S.sid;
  if (!sid) return;
  try {
    const [v, o] = await Promise.all([api(`/v2/sessions/${sid}`), api(`/v2/sessions/${sid}/events?after=${S.son}`)]);
    if (S.sid !== sid) return false;         // bu arada çıkış yapıldı ya da başka bir gökyüzüne geçildi
    S.view = v;
    if (o.olaylar.length) { S.son = o.olaylar.at(-1).id; S.olaylar.push(...o.olaylar); S.yeniOlay = true; }
    return true;
  } catch (e) {
    if (S.sid === sid && /bulunamad/.test(e.message)) { S.sid = null; location.reload(); }
    return false;
  }
}
const SVG_YILDIZ = () => svg('svg', { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true' }, svg('path', { d: 'M12 2C13 9 15 11 22 12C15 13 13 15 12 22C11 15 9 13 2 12C9 11 11 9 12 2Z', fill: '#f5d78e' }));
const marka = () => h('span', { class: 'marka' }, SVG_YILDIZ(), 'İkiz');
const logoDugmesi = () => h('button', { class: 'marka logo-dugme', 'aria-label': 'İkiz: tüm takımyıldızların', title: 'Tüm takımyıldızların', onclick: () => sekmeGit('takimlar') }, SVG_YILDIZ(), 'İkiz');

/* ---------- 0 · karşılama: tek cümle, kayıt ve giriş ---------- */
function hesapFormu(baslangic = 'kayit', onDoldur = '') {
  let mod = baslangic;
  const kullanici = h('input', { class: 'girdi', id: 'h-kullanici', autocomplete: 'username', maxlength: 24, required: true, autocapitalize: 'none', spellcheck: 'false', value: onDoldur });
  const sifre = h('input', { class: 'girdi', id: 'h-sifre', type: 'password', maxlength: 128, required: true });
  const sifre2 = h('input', { class: 'girdi', id: 'h-sifre2', type: 'password', maxlength: 128 });
  const tekrarGrup = h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'h-sifre2' }, 'Şifre (tekrar)'), sifre2);
  const ipucu = h('p', { class: 'kucuk sis2' });
  const hata = h('p', { class: 'hata-satir', role: 'alert' });
  const gonder = h('button', { class: 'dugme', type: 'submit' });
  const sekmeler = [['kayit', 'Kayıt ol'], ['giris', 'Giriş yap']].map(([k, ad]) => h('button', { type: 'button', class: 'sekme', role: 'tab', onclick: () => { mod = k; ciz(); } }, ad));
  const ciz = () => {
    sekmeler.forEach((b, i) => b.setAttribute('aria-selected', String(['kayit', 'giris'][i] === mod)));
    tekrarGrup.hidden = mod !== 'kayit';
    sifre.autocomplete = mod === 'kayit' ? 'new-password' : 'current-password';
    sifre2.autocomplete = 'new-password';
    ipucu.textContent = mod === 'kayit' ? 'Kullanıcı adı: küçük harf, rakam, nokta ya da alt çizgi. Şifre: en az 8 karakter, harf ve rakam.' : '';
    gonder.textContent = mod === 'kayit' ? 'Kayıt ol ve ikizimi oluştur' : 'Giriş yap';
    hata.textContent = '';
  };
  const form = h('form', { class: 'hesap-kart', novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); hata.textContent = '';
    const k = kullanici.value.trim().toLowerCase();
    if (!k || !sifre.value) { hata.textContent = 'Kullanıcı adını ve şifreni yaz.'; return; }
    if (mod === 'kayit' && sifre.value !== sifre2.value) { hata.textContent = 'Şifreler aynı değil.'; return; }
    gonder.disabled = true;
    try {
      const r = await api(`/v2/auth/${mod === 'kayit' ? 'register' : 'login'}`, 'POST', { kullanici: k, sifre: sifre.value });
      S.kullanici = r.kullanici; S.sid = r.session_id;
      if (S.sid) devam(); else profil();
    } catch (err) { hata.textContent = err.message; gonder.disabled = false; }
  } },
    h('div', { class: 'sekmeler', role: 'tablist' }, sekmeler),
    h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'h-kullanici' }, 'Kullanıcı adı'), kullanici),
    h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'h-sifre' }, 'Şifre'), sifre),
    tekrarGrup, ipucu, hata, gonder);
  ciz();
  return form;
}
function karsilama(mod = 'kayit', onDoldur = '') {
  const kap = h('div', { class: 'ikili' });
  goster('karsilama', h('div', { class: 'sayfa' },
    h('header', { class: 'ust' }, marka(), h('span', { class: 'rozet', id: 'model-rozet' }, h('i'), 'Bağlanıyor…')),
    h('section', { class: 'karsilama' },
      h('div', {},
        h('h1', {}, 'Bir ajan ekibi yolunu çizer; sen öğrendiğini ikizine öğretirsin.'),
        hesapFormu(mod, onDoldur),
        h('button', { class: 'baglanti demo-link', onclick: () => canliDemo() }, 'Kayıt olmadan canlı demoyu izle')),
      kap)));
  ikiliAnimasyon(kap);
  modelRozeti();
  (onDoldur ? $('#h-sifre') : $('#h-kullanici'))?.focus();
}
function modelRozeti() {
  api('/health').then((d) => {
    S.yetenek = d.yetenekler || {};
    const r = $('#model-rozet'); if (!r) return;
    r.classList.toggle('canli', !d.demo);
    const m = d.modeller || {}, kisaAd = (x) => String(x || '').split('/').pop();
    r.replaceChildren(h('i'), d.demo ? 'Demo modu' : m.hizli && m.hizli !== m.buyuk ? `Canlı: ${kisaAd(m.buyuk)} + ${kisaAd(m.hizli)}` : `Canlı: ${kisaAd(d.model)}`);
    r.title = d.demo ? 'Model anahtarı tanımlı değil: ajanlar hazır içerikle çalışır. Kurulum için README’ye bak.' : 'Ajanlar gerçek dil modeliyle çalışıyor.';
  }).catch(() => { const r = $('#model-rozet'); if (r) r.replaceChildren(h('i'), 'Sunucuya ulaşılamıyor'); });
}

/* ---------- 1 · profil ---------- */
const ORNEKLER = [['Veri Yapıları', 'akademik'], ['Kalkülüs I · Türev', 'akademik'], ['Gitar', 'hobi'], ['İspanyolca', 'hobi']];
function profil() {
  const sec = (ad, deger, etiket, secili) => h('label', { class: 'secenek' }, h('input', { type: 'radio', name: ad, value: deger, checked: secili }), h('span', {}, etiket));
  const ad = h('input', { class: 'girdi', id: 'p-ad', autocomplete: 'given-name', maxlength: 40, required: true, placeholder: 'Adın' });
  const konu = h('input', { class: 'girdi', id: 'p-konu', maxlength: 80, required: true, placeholder: 'Örn. Veri Yapıları', autocomplete: 'off' });
  const tarih = h('input', { class: 'girdi', id: 'p-tarih', type: 'date' });
  const not_ = h('textarea', { class: 'girdi', id: 'p-not', maxlength: 200, placeholder: 'Örn. Staj mülakatlarına hazırlanıyorum. (Ad, telefon, e-posta gibi kişisel bilgi yazma.)' });
  const onay = h('input', { type: 'checkbox', id: 'p-onay', required: true });
  const hata = h('div', { class: 'hata-kutu', role: 'alert', hidden: true });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, 'İkizimi oluştur');
  const prev = h('div', { class: 'ikili' });
  const ozet = h('div', { class: 'onizleme' });
  const secimi = (n) => document.querySelector(`input[name=${n}]:checked`)?.value;
  let avatar = 0;
  const avatarSecici = h('div', { class: 'avatar-secici', role: 'radiogroup', 'aria-label': 'Seni temsil eden takımyıldız' });
  const avatarCizSecici = () => avatarSecici.replaceChildren(...AVATAR_BICIM.map((b, i) => h('button', { type: 'button', class: 'avatar-sec' + (i === avatar ? ' secili' : ''), role: 'radio', 'aria-checked': String(i === avatar),
    onclick: () => { avatar = i; avatarCizSecici(); guncelle(); } }, h('span', { class: 'ic' }, avatarCiz(i, { yanik: 1, boyut: 52, etiket: b.ad }), h('span', {}, b.ad)))));
  const guncelle = () => {
    const doldu = [ad.value, konu.value, secimi('seviye'), secimi('dk'), secimi('alan'), secimi('sure')].filter(Boolean).length;
    prev.replaceChildren(h('figure', { class: 'kayit-avatar' }, avatarCiz(avatar, { yanik: Math.max(0.15, doldu / 6), boyut: 300, etiket: ad.value.trim() || 'Sen' }),
      h('figcaption', { class: 'sis kucuk' }, `${ad.value.trim() || 'Sen'} · ${AVATAR_BICIM[avatar].ad}`)));
    ozet.replaceChildren(h('b', {}, konu.value.trim() || 'Konunu yaz'), h('span', { class: 'sis kucuk' }, `${ad.value.trim() || 'Sen'} · günde ${secimi('dk') || '30'} dk · ${secimi('sure') || '21'} günlük yol`));
  };
  const form = h('form', { novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); hata.hidden = true;
    if (!ad.value.trim() || !konu.value.trim()) { hata.textContent = 'Adını ve öğrenmek istediğin konuyu yaz.'; hata.hidden = false; return; }
    if (!onay.checked) { hata.textContent = 'Devam etmek için aşağıdaki onay kutusunu işaretle.'; hata.hidden = false; return; }
    dugme.disabled = true; dugme.textContent = 'Ekip çağrılıyor…';
    const alan = secimi('alan');
    try {
      const r = await api('/v2/sessions', 'POST', {
        ad: ad.value.trim(), akademik: alan === 'akademik' ? konu.value.trim() : null, hobi: alan === 'hobi' ? konu.value.trim() : null,
        dakika: Number(secimi('dk')), zaman: secimi('zaman'), seviye: secimi('seviye'), hedef_notu: not_.value.trim(), sure: Number(secimi('sure')), avatar,
        son_tarihler: alan === 'akademik' && tarih.value ? [{ baslik: 'Sınav / teslim', tarih: tarih.value }] : [],
      });
      S.sid = r.session_id; S.olaylar = []; S.son = 0; S.view = null; kurulum();
    } catch (err) {
      if (/giriş yap/.test(err.message)) { karsilama('giris'); bildir(err.message); return; }
      if (/Zaten bir gökyüzün/.test(err.message)) { await baslat(); return; }
      hata.textContent = err.message; hata.hidden = false; dugme.disabled = false; dugme.textContent = 'İkizimi oluştur'; }
  } },
    h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'p-ad' }, 'Sana nasıl seslenelim?'), ad),
    h('fieldset', { class: 'grup' }, h('legend', {}, 'Gökyüzünde seni hangi takımyıldız temsil etsin?'),
      h('p', { class: 'kucuk sis2', style: 'margin:0 0 8px' }, 'Bu senin avatarın. Bitirdiğin görevlerle yıldızları yanar. Her konu için ayrı bir ikizin olacak; onlar da bu biçimin mavi, aynadaki hali.'), avatarSecici),
    h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'p-konu' }, 'Neyi öğrenmek istiyorsun?'), konu,
      h('div', { class: 'oneriler' }, ORNEKLER.map(([k, a]) => h('button', { type: 'button', class: 'oneri', onclick: () => { konu.value = k; document.querySelector(`input[name=alan][value=${a}]`).checked = true; guncelle(); } }, k)))),
    h('fieldset', { class: 'grup' }, h('legend', {}, 'Bu bir ders mi, hobi mi?'), h('div', { class: 'secenekler' }, sec('alan', 'akademik', 'Akademik', true), sec('alan', 'hobi', 'Hobi', false))),
    h('fieldset', { class: 'grup' }, h('legend', {}, 'Konuyu ne kadar biliyorsun?'), h('div', { class: 'secenekler' }, sec('seviye', 'baslangic', 'Yeni başlıyorum', true), sec('seviye', 'orta', 'Biraz biliyorum', false), sec('seviye', 'ileri', 'İyi biliyorum', false))),
    h('fieldset', { class: 'grup' }, h('legend', {}, 'Günde ne kadar zaman ayırabilirsin?'), h('div', { class: 'secenekler' }, [15, 30, 45, 60, 90].map((d) => sec('dk', String(d), `${d} dk`, d === 30)))),
    h('fieldset', { class: 'grup' }, h('legend', {}, 'Hedefine kaç günde ulaşmak istiyorsun?'), h('div', { class: 'secenekler' }, [7, 14, 21, 30, 45, 60].map((d) => sec('sure', String(d), `${d} gün`, d === 21)))),
    h('fieldset', { class: 'grup' }, h('legend', {}, 'Günün hangi saatinde?'), h('div', { class: 'secenekler' }, sec('zaman', 'sabah', 'Sabah', false), sec('zaman', 'ogle', 'Öğlen', false), sec('zaman', 'aksam', 'Akşam', true))),
    h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'p-tarih' }, 'Yaklaşan bir sınav ya da teslim var mı? (isteğe bağlı)'), tarih),
    h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'p-not' }, 'Hedefini bir cümleyle anlat (isteğe bağlı)'), not_),
    h('label', { class: 'onay' }, onay, h('span', {}, 'İkizin ve ajanlar yapay zekâdır. Yazdıklarım plan üretmek için kullanılır, istediğim an tamamen silebilirim.')),
    hata, h('div', {}, dugme));
  goster('profil', h('div', { class: 'sayfa' },
    h('header', { class: 'ust' }, marka(), h('button', { class: 'baglanti', onclick: () => cikis() }, 'Çıkış yap')),
    h('section', { class: 'profil' },
      h('div', {}, h('h2', {}, 'Önce seni tanıyalım.'), h('p', { class: 'sis' }, 'Bu bilgiler yol haritanı ve ikizini kurar. Birkaç tıkla bitiyor.'), form),
      h('aside', {}, prev, ozet))));
  form.addEventListener('input', guncelle); form.addEventListener('change', guncelle);
  avatarCizSecici(); guncelle(); konu.focus();
}

/* ---------- 2 · ikizin oluşuyor ---------- */
const KURULUM = [['Astronom', 'Seni okuyor', 'Konunu, seviyeni ve zamanını anlıyor.'], ['Kutup Yıldızı', 'Hedefini seçiyor', 'Adayları puanlayıp en ideal tekini seçiyor.'],
  ['Haritacı', 'Yol haritasını çiziyor', 'Planı seçtiğin süreye kolaydan zora yerleştiriyor.'], ['Kaynak Avcısı', 'Kaynakları tarıyor', 'Sana en uygun tek kaynağı gerekçesiyle seçiyor.'],
  ['Gözcü', 'Rotanı çiziyor', 'Planı aksatmazsan her gün nerede olacağını hesaplıyor.'], ['Rehber', 'Seni karşılıyor', 'İlk günün için tek net adım hazırlıyor.']];
function kurulum() {
  const liste = h('ol', { class: 'adimlar' });
  const akis = h('div', { class: 'canli-akis', 'aria-live': 'polite' });
  const gok = h('div', { class: 'takim' });
  const durum = h('p', { class: 'sis' }, 'Ekip toplanıyor…');
  goster('kurulum', h('div', { class: 'sayfa' },
    h('header', { class: 'ust' }, marka(), h('span', { class: 'rozet' }, h('i'), 'Ekip çalışıyor')),
    h('section', { class: 'kurulum' },
      h('div', {}, h('h2', {}, 'Gökyüzün kuruluyor.'), h('p', { class: 'sis', style: 'margin-bottom:6px' }, 'İkizin de doğuyor; ama henüz hiçbir şey bilmiyor. Ona sen öğreteceksin.'), durum, liste),
      h('div', { class: 'kurulum-sag' }, gok, akis))));
  let gecti = false;
  const ciz = () => {
    const v = S.view, gorulen = new Set(S.olaylar.map((o) => o.ajan));
    const sonAjan = S.olaylar.at(-1)?.ajan;
    const hazir = v?.durum === 'hazir' && v.alanlar.every((a) => a.hazir);
    const idx = KURULUM.findLastIndex(([a]) => gorulen.has(a));
    liste.replaceChildren(...KURULUM.map(([a, b, c], i) => h('li', { class: hazir || i < idx ? 'bitti' : i === idx ? 'aktif' : '' }, h('b', {}, b), h('span', {}, c))));
    const n = Math.min(Math.max(v?.profil?.sure || 21, 7), 30);           // çok uzun planlarda çizim okunur kalsın
    const yildiz = hazir ? n : Math.min(n, Math.round((Math.max(idx + 1, 0) / KURULUM.length) * n));
    gok.replaceChildren(takimyildiz({ sen: 0, rota: yildiz, toplam: n, w: 640, h: 400 }));
    akis.replaceChildren(...S.olaylar.slice(-6).map((o, i, a) => balon(o, i === a.length - 1)), ...(hazir ? [] : [yaziyor()]));
    akis.scrollTop = akis.scrollHeight;
    durum.textContent = hazir ? 'Hazır. Gökyüzün çizildi.' : sonAjan ? `${sonAjan} çalışıyor…` : 'Ekip toplanıyor…';
    if (hazir && !gecti) {
      gecti = true;
      setTimeout(() => { if (S.ekran === 'kurulum') (S.demo ? uygulama : tanitim)(); }, S.demo ? 600 : 1500);   // bu arada başka ekrana geçildiyse dokunma
    }
  };
  clearInterval(S.zamanlayici);
  const dongu = async () => { if (S.ekran !== 'kurulum') return; await tazele(); if (S.ekran === 'kurulum') ciz(); if (!gecti) setTimeout(dongu, 700); };
  dongu();
}

/* ---------- Ajan bilgi kartları: her ajanın ne işe yaradığı ---------- */
const TUR_ADI = { llm: 'Yapay zekâ', kod: 'Kural tabanlı', 'llm+kod': 'Yapay zekâ + kural' };
function ajanKartlari(ajanlar, onSec = null) {
  return h('div', { class: 'ajan-kartlar' }, ajanlar.map((a) => h(onSec ? 'button' : 'article', { class: 'ajan-kart', style: `--c:${ajanRenk(a.ad)}`, ...(onSec ? { type: 'button', onclick: () => onSec(a.ad) } : {}) },
    h('span', { class: 'ic' },
      h('span', { class: 'ajan-kart-bas' }, avatar(a.ad), h('span', {}, h('b', {}, a.ad), h('span', { class: 'ajan-rol' }, a.rol))),
      h('span', { class: 'ajan-fayda' }, a.fayda),
      h('span', { class: 'ajan-alt' }, h('span', {}, a.ne_zaman), h('span', { class: 'ajan-tur' }, TUR_ADI[a.tur] || '')),
      a.model ? h('span', { class: 'ajan-model' }, a.model) : null))));
}

/* ---------- 3 · ekibin neler yapabileceği ---------- */
function ikon(...yollar) { return svg('svg', { viewBox: '0 0 160 96', 'aria-hidden': 'true' }, ...yollar); }
function tanitim() {
  const kap = (n) => ({ stroke: '#f5d78e', 'stroke-width': 1.6, fill: 'none', ...n });
  const slaytlar = [
    ['İlerlemeni izler', 'Her gün biter; rotanla arandaki yıldız farkını ölçer. Suçlamaz, sadece görünür kılar.',
      ikon(svg('path', kap({ d: 'M8 84 L40 70 L70 74 L100 50 L132 38' })), svg('path', { d: 'M8 84 L40 62 L70 50 L100 34 L132 18', stroke: '#c9d0f5', 'stroke-opacity': .6, 'stroke-width': 1.4, fill: 'none', 'stroke-dasharray': '3 6' }), svg('circle', { cx: 132, cy: 38, r: 5, fill: '#f5d78e' }), svg('circle', { cx: 132, cy: 18, r: 4, fill: 'none', stroke: '#c9d0f5', 'stroke-width': 1.4 }))],
    ['Planı tempona uydurur', 'Geride kalırsan görevleri kısaltır ya da yeniden sıralar. Büyük değişiklikleri sana sorar, sen onaylarsın.',
      ikon(svg('path', kap({ d: 'M10 70 H50 L62 40 L74 70 H150' })), svg('circle', { cx: 62, cy: 40, r: 6, fill: '#f5d78e' }), svg('path', { d: 'M92 32 H140 M92 48 H128', stroke: '#8ea2ff', 'stroke-width': 3, 'stroke-linecap': 'round' }))],
    ['Kaynak bulur, birini seçer', 'Seviyene, zamanına ve bütçene göre kaynakları puanlar; en uygun tekini nedeniyle söyler. Bağlantı uydurmaz.',
      ikon(svg('rect', { x: 14, y: 20, width: 40, height: 56, rx: 4, fill: 'none', stroke: '#f5d78e', 'stroke-width': 1.6 }), svg('rect', { x: 62, y: 28, width: 40, height: 48, rx: 4, fill: 'none', stroke: '#2e3b75', 'stroke-width': 1.6 }), svg('rect', { x: 110, y: 28, width: 36, height: 48, rx: 4, fill: 'none', stroke: '#2e3b75', 'stroke-width': 1.6 }), svg('path', { d: 'M24 40 H44 M24 52 H40', stroke: '#f5d78e', 'stroke-width': 2, 'stroke-linecap': 'round' }))],
    ['İkizine öğretirsin', 'İkizin boş doğar ve yalnızca senin öğrettiklerini bilir; hiçbir zaman senden önde olamaz. Anlattıkça yıldızları yanar. Ayrı bir ajan anlattığının konuyla ilgisini denetler.',
      ikon(svg('circle', { cx: 44, cy: 40, r: 16, fill: 'none', stroke: '#f5d78e', 'stroke-width': 1.6 }), svg('circle', { cx: 112, cy: 40, r: 16, fill: 'none', stroke: '#8ea2ff', 'stroke-width': 1.6, 'stroke-dasharray': '4 4' }), svg('path', { d: 'M62 40 H94', stroke: '#f5d78e', 'stroke-width': 1.6, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round' }), svg('path', { d: 'M30 78 a14 14 0 0 1 28 0 M98 78 a14 14 0 0 1 28 0', stroke: '#2e3b75', 'stroke-width': 1.6, fill: 'none' }))],
  ];
  goster('tanitim', h('div', { class: 'sayfa' },
    h('header', { class: 'ust' }, marka(), h('button', { class: 'baglanti', onclick: uygulama }, 'Atla')),
    h('section', { class: 'tanitim' },
      h('h2', {}, 'Ekibin seni bu yolda bırakmaz.'),
      h('div', { class: 'slaytlar' }, slaytlar.map(([b, a, i]) => h('article', { class: 'slayt' }, i, h('h3', {}, b), h('p', {}, a)))),
      S.view?.ajanlar ? h('div', { class: 'tanitim-ekip' }, h('h3', {}, `Ekibin: ${S.view.ajanlar.length} ajan, her birinin tek bir işi var`),
        ajanKartlari(S.view.ajanlar)) : null,
      h('div', {}, h('button', { class: 'dugme', onclick: uygulama }, 'Gökyüzüne gir')))));
}

async function devam() { const ok = await tazele(); if (ok) uygulama(); else karsilama(); }

/* ======================================================================
   4 · uygulama
   ====================================================================== */
const IKON = {
  gokyuzu: 'M12 2C13 9 15 11 22 12C15 13 13 15 12 22C11 15 9 13 2 12C9 11 11 9 12 2Z',
  harita: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  bugun: 'M4 5h16v14H4zM8 12l3 3 5-6',
  ekip: 'M7 7a2.5 2.5 0 1 0 0 .01M17 9a2.5 2.5 0 1 0 0 .01M11 18a2.5 2.5 0 1 0 0 .01M9 8.2l6 .8M16 11l-4 5M8 9.5l2.4 6',
  ikiz: 'M9 8a3.5 3.5 0 1 0 0 .01M16 9a3 3 0 1 0 0 .01M3 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 7-4.5',
  ogret: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4',
  ayarlar: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z',
  profil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  cikis: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l4-4-4-4M14 12H4',
};
const SEKMELER = [['gokyuzu', 'Gökyüzü'], ['harita', 'Yol haritası'], ['bugun', 'Bugün'], ['ekip', 'Ekip'], ['ikiz', 'İkizin'], ['ogret', 'İkizine öğret'], ['profil', 'Profil']];
const ikonSvg = (k) => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: IKON[k] }));
const aktifAlan = () => S.view?.alanlar[Math.min(S.alan, S.view.alanlar.length - 1)];

function alanSecici(onSec) {
  const v = S.view;
  if (!v || v.alanlar.length < 2) return h('span');
  return h('div', { class: 'alan-sec', role: 'group', 'aria-label': 'Alan' },
    v.alanlar.map((a, i) => h('button', { class: 'sekme', 'aria-pressed': String(i === S.alan), onclick: () => { S.alan = i; onSec(); } }, a.konu)));
}

function uygulama() {
  if (!S.view) { devam(); return; }
  clearInterval(S.zamanlayici);
  const ana = h('main', { class: 'icerik', id: 'sekme-ana' });
  const navDugmeleri = (mobil) => SEKMELER.map(([k, ad]) => h('button', { class: 'nav-dugme', dataset: { sekme: k }, onclick: () => sekmeGit(k) }, ikonSvg(k), mobil ? kisa(ad) : ad, h('span', { class: 'sayac', hidden: true, dataset: { sayac: k } })));
  const kisa = (ad) => ({ 'Yol haritası': 'Harita', 'İkizine öğret': 'Öğret' }[ad] || ad);
  const kabuk = h('div', { class: 'kabuk' },
    h('aside', { class: 'yan' }, logoDugmesi(), h('button', { class: 'kullanici-cip', id: 'kullanici-cip', title: 'Profilin', onclick: () => sekmeGit('profil') }), h('nav', { 'aria-label': 'Ana gezinme' }, navDugmeleri(false)),
      h('div', { class: 'alt' }, h('span', { class: 'rozet', id: 'model-rozet' }, h('i'), '…'),
        h('button', { class: 'nav-dugme', dataset: { sekme: 'ayarlar' }, onclick: () => sekmeGit('ayarlar') }, ikonSvg('ayarlar'), 'Veriler ve güvenlik'),
        h('button', { class: 'nav-dugme', onclick: cikis }, ikonSvg('cikis'), 'Çıkış yap'))),
    h('div', { class: 'ana-kolon' }, h('div', { class: 'mobil-ust' }, logoDugmesi(), h('button', { class: 'baglanti', onclick: cikis }, 'Çıkış')), ana),
    h('nav', { class: 'mobil-nav', 'aria-label': 'Ana gezinme' }, navDugmeleri(true)));
  goster('uygulama', kabuk);
  kullaniciCipi();
  modelRozeti();
  S.panolar = {}; S.aktifPano = null;
  sekmeGit(S.sekme || 'gokyuzu');
  const dongu = async () => {
    if (S.ekran !== 'uygulama') return;
    const eski = S.son;
    const yaziyorKullanici = document.activeElement?.closest?.('.koru') && document.activeElement.matches('input, textarea, select');
    if (await tazele()) { rozetler(); if (!yaziyorKullanici) S.aktifPano?.guncelle(S.view); S.yeniOlay = false; }
    S.zamanlayici = setTimeout(dongu, S.view?.durum === 'hazir' ? 2600 : 900);
  };
  S.zamanlayici = setTimeout(dongu, 900);
}

const PANOLAR = () => ({ gokyuzu: gokyuzuPano, harita: haritaPano, bugun: bugunPano, ekip: ekipPano, ikiz: ikizPano, ogret: ogretPano, profil: profilPano, ayarlar: ayarPano, takimlar: takimlarPano });
function sekmeGit(k) {
  S.sekme = k;
  document.querySelectorAll('[data-sekme]').forEach((b) => (b.dataset.sekme === k ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  S.panolar[k] ??= PANOLAR()[k]();
  S.aktifPano = S.panolar[k];
  $('#sekme-ana').replaceChildren(S.aktifPano.el);
  S.aktifPano.guncelle(S.view);
  scrollTo(0, 0);
}
/* Sen ve ikizlerin: kullanıcı altın avatar, her konunun kendi mavi ikizi */
const senOrani = (v) => { const hz = v.alanlar.filter((a) => a.hazir); const t = hz.reduce((x, a) => x + a.ilerleme.toplam_yildiz, 0); return t ? hz.reduce((x, a) => x + a.ilerleme.sen_yildiz, 0) / t : 0; };
const kullaniciAvatar = (v, boyut = 40) => avatarCiz(v.profil?.avatar || 0, { yanik: Math.max(0.12, senOrani(v)), boyut, etiket: v.ad });
const ikizAvatar = (v, a, boyut = 90) => avatarCiz(v.profil?.avatar || 0, { renk: a.ikiz_kimlik?.renk || '#8ea2ff', yanik: (a.ikiz?.bilgi_yuzde || 0) / 100, ayna: true, halka: true, boyut, etiket: a.ikiz_kimlik?.ad || 'İkizin' });
const ikizAdi = (a) => a.ikiz_kimlik?.ad || 'İkizin';
function kullaniciCipi() {
  const v = S.view; const el = $('#kullanici-cip'); if (!v || !el) return;
  el.replaceChildren(h('span', { class: 'ic' }, kullaniciAvatar(v, 38), h('span', { class: 'cip-yazi' }, h('b', {}, v.ad), h('span', { class: 'kucuk sis' }, `${v.alanlar.length} takımyıldız · ${v.alanlar.length} ikiz`))));
}
function rozetler() {
  const v = S.view; if (!v) return;
  kullaniciCipi();
  const say = { ekip: v.oneriler.length, bugun: v.bugun.filter((t) => !t.done).length };
  document.querySelectorAll('[data-sayac]').forEach((e) => { const n = say[e.dataset.sayac] || 0; e.hidden = !n; e.textContent = n; });
}
const baslikSatiri = (b, alt, ...eylem) => h('div', { class: 'baslik-satiri' }, h('div', {}, h('h2', {}, b), alt ? h('p', { class: 'sis', style: 'margin-top:8px' }, alt) : null), h('div', { class: 'sag-eylem' }, eylem));
const dugme = (t, f, sinif = '') => h('button', { class: `dugme ${sinif}`.trim(), onclick: f }, t);
async function yap(f, basari) { if (S.mesgul) return; S.mesgul = true; try { const r = await f(); if (basari) bildir(basari); await tazele(); rozetler(); S.aktifPano?.guncelle(S.view); return r; } catch (e) { bildir(e.message); } finally { S.mesgul = false; } }

/* İkizine öğret sekmesini belirli bir takımyıldız ve kavramla açar (sunucudaki öğretme durumu da ona geçer). */
async function ogretAc(alanAdi, kavram = null) {
  const i = Math.max(0, S.view.alanlar.findIndex((a) => a.alan === alanAdi));
  const a = S.view.alanlar[i];
  S.alan = i;
  const k = kavram || a?.ikiz?.siradaki?.id || 'serbest';
  S.ogretGorev = k;
  try { S.view = await api(`/v2/sessions/${S.sid}/teach/select`, 'POST', { alan: a.alan, kavram: k }); } catch (e) { bildir(e.message); }
  sekmeGit('ogret');
}

/* ---------- Gökyüzü ---------- */
function ikizOzeti(a, kompakt = false) {
  const ik = a.ikiz;
  const sira = ik.siradaki;
  return h('section', { class: 'ikiz-ozet' + (kompakt ? ' kompakt' : '') },
    h('div', { class: 'ikiz-ozet-bas' },
      h('span', { class: 'ikiz-mini', style: `--ikiz:${a.ikiz_kimlik?.renk || '#8ea2ff'}` }, ikizAvatar(S.view, a, 58)),
      h('div', { style: 'flex:1' }, h('h3', {}, `${ikizAdi(a)} · ${a.konu} ikizin`), h('p', { class: 'sis kucuk' }, ik.ogretilen
        ? `${ik.kavram_sayisi} kavramdan ${ik.ogretilen} tanesini ona öğrettin. Bildiği her şeyi senden öğrendi.`
        : 'Henüz hiçbir şey bilmiyor. İlk kavramı ona sen öğreteceksin.')),
      h('b', { class: 'ikiz-yuzde' }, `%${ik.bilgi_yuzde}`)),
    h('div', { class: 'ikiz-gok' }, ikizGogu(ik.yildizlar.filter((y) => !y.id.startsWith('serbest-')), 760, 200)),
    sira ? h('div', { class: 'sag-eylem' }, dugme(`Öğret: ${sira.baslik}`, () => ogretAc(a.alan, sira.id), 'kucuk')) : null);
}
function takimyildizlarim(v, yenile) {
  return h('section', { class: 'takimlar', 'aria-label': 'Takımyıldızların' },
    h('div', { class: 'takimlar-bas' }, h('h3', {}, 'Takımyıldızların'), h('button', { class: 'baglanti', onclick: () => sekmeGit('profil') }, 'Yeni takımyıldız aç')),
    h('div', { class: 'takimlar-satir' }, v.alanlar.map((a, i) => h('button', { class: 'takim-kart' + (i === S.alan ? ' secili' : ''), 'aria-pressed': String(i === S.alan), onclick: () => { S.alan = i; yenile(); } },
      h('span', { class: 'ic' },
        a.hazir ? h('span', { class: 'kart-gok' }, takimyildiz({ sen: a.ilerleme.sen_yildiz, rota: a.ilerleme.rota_yildiz, toplam: a.ilerleme.toplam_yildiz, w: 320, h: 150, etiket: false })) : h('span', { class: 'kuruluyor' }, yaziyor()),
        h('b', {}, a.konu),
        h('span', { class: 'kucuk sis' }, a.hazir ? `${a.ilerleme.sen_yildiz}/${a.ilerleme.toplam_yildiz} yıldız · ${ikizAdi(a)} %${a.ikiz.bilgi_yuzde}` : 'Ekip kuruyor…'))))));
}
function gokyuzuPano() {
  const el = h('div', {});
  const guncelle = (v) => {
    const a = aktifAlan(), il = a?.ilerleme;
    const oneri = v.oneriler[0];
    el.replaceChildren(
      takimyildizlarim(v, () => guncelle(S.view)),
      baslikSatiri(il ? `${il.gun + 1}. gün` : `${v.gun}. gün`, il ? `Merhaba ${v.ad}. ${a.konu} için ${a.hedef.sure} günlük rotanın ${il.gun + 1}. günündesin.` : `Merhaba ${v.ad}.`, dugme('Ekibe görev ver', () => { sekmeGit('ekip'); setTimeout(() => $('#komut-metin')?.focus(), 50); })),
      il ? h('section', { class: 'gok-bolumu' },
        h('div', {}, h('div', { class: 'takim' }, takimyildiz({ sen: il.sen_yildiz, rota: il.rota_yildiz, toplam: il.toplam_yildiz }), h('span', { class: 'koordinat' }, a.konu)),
          h('div', { class: 'lejant' }, h('span', {}, h('i', { class: 'nokta-altin' }), 'Senin yaktıkların'), h('span', {}, h('i', { class: 'nokta-rota' }), 'Rota: planı aksatmasaydın bugün burada olurdun'))),
        h('div', { class: 'rakamlar' },
          h('div', { class: 'rakam' }, h('span', {}, 'Yanan yıldız'), h('b', {}, `${il.sen_yildiz} / ${il.toplam_yildiz}`)),
          h('div', { class: 'rakam' + (il.fark > 0 ? ' uyari' : '') }, h('span', {}, 'Rotanın gerisinde'), h('b', {}, il.fark > 0 ? `${il.fark} yıldız` : 'değilsin')),
          h('div', { class: 'rakam' }, h('span', {}, 'Seri'), h('b', {}, `${il.seri} gün`)),
          h('div', { class: 'rakam' }, h('span', {}, 'Parlaklık'), h('b', {}, `%${il.parlaklik}`)),
          h('div', { class: 'rakam' }, h('span', {}, 'Durum'), h('b', { style: 'font-size:22px' }, il.risk_tr)))) : h('p', { class: 'sis' }, 'Bu alanın gökyüzü hazırlanıyor…'),
      oneri ? h('div', { class: 'onay-seridi' }, h('div', {}, h('b', {}, `${oneri.kaynak} bir değişiklik öneriyor: `), oneri.baslik), dugme('İncele', () => sekmeGit('ekip'), 'kucuk')) : null,
      v.koc && (!v.koc.alan || v.koc.alan === a?.alan) ? h('div', { class: 'rehber' }, avatar('Rehber'), h('div', {}, h('p', {}, v.koc.message), v.koc.ask_user ? h('p', { class: 'sis', style: 'margin-top:6px' }, v.koc.ask_user) : null,
        h('button', { class: 'baglanti', style: 'margin-top:10px', onclick: () => sekmeGit('ekip') }, 'Ekibin ne yaptığını gör'))) : null,
      a?.ikiz ? ikizOzeti(a, true) : null,
      il ? h('section', { class: 'bolum' }, h('h3', {}, 'Rotana göre ilerlemen'), h('div', { class: 'grafik' }, egri(il.egri.sen, il.egri.rota),
        h('div', { class: 'lejant' }, h('span', {}, h('i', { class: 'nokta-altin' }), 'Sen'), h('span', {}, h('i', { class: 'nokta-rota' }), 'Rota')))) : null,
      h('p', { class: 'kucuk sis2', style: 'margin-top:40px' }, h('button', { class: 'baglanti', onclick: () => sekmeGit('ayarlar') }, 'Veriler ve güvenlik'), ' · Ajanlar ve ikizin yapay zekâdır.'));
  };
  return { el, guncelle };
}

/* ---------- Yol haritası ve kaynaklar ---------- */
const ucretEtiketi = (k) => (k.ucretsiz === true ? 'Ücretsiz' : k.ucretsiz === false ? 'Ücretli' : 'Ücreti sitede kontrol et');
const GUVEN_SINIF = { 'yüksek': 'yuksek', 'orta': 'orta', 'düşük': 'dusuk' };
function canliDurum(url, kontrol) {
  const d = kontrol?.sonuc?.[url];
  if (!d) return h('span', { class: 'canli-durum bekliyor' }, 'Bağlantı henüz kontrol edilmedi');
  if (d.durum === 'acik') return h('span', { class: 'canli-durum acik' }, `Bağlantı açılıyor${d.ms ? ` · ${d.ms} ms` : ''}`);
  if (d.durum === 'kontrol_edilmedi') return h('span', { class: 'canli-durum bekliyor' }, 'Bağlantı kontrolü kapalı');
  return h('span', { class: 'canli-durum sorun' }, d.durum === 'reddedildi' ? 'Güvensiz bağlantı, açılmadı' : `Şu an ulaşılamıyor${d.kod ? ` (${d.kod})` : ''}`);
}
function guvenSatiri(k, kontrol) {
  return h('div', { class: 'guven-satiri' },
    h('span', { class: `guven ${GUVEN_SINIF[k.guven] || 'dusuk'}` }, `Güven: ${k.guven || 'bilinmiyor'}`),
    h('span', { class: 'kucuk sis' }, `${k.yayinci_turu || ''}${k.yayinci ? ' · ' + k.yayinci : ''}`),
    k.url ? canliDurum(k.url, kontrol) : null);
}
function kaynakKarti(k, ana = false, kontrol = null) {
  const etiketler = h('div', { class: 'etiketler' }, k.rol ? h('span', { class: 'rol-k' }, k.rol) : null, h('span', { class: 'etiket-k' }, k.tur), h('span', { class: 'etiket-k' }, ucretEtiketi(k)), h('span', { class: 'etiket-k' }, k.dil), k.puan != null ? h('span', { class: 'puan' }, `uygunluk ${k.puan}/100`) : null);
  const baslik = ana ? h('h3', {}, k.baslik) : h('h4', {}, k.baslik);
  const link = h('a', { class: ana ? 'dugme kucuk git' : '', href: guvenliUrl(k.url), target: '_blank', rel: 'noopener noreferrer' }, ana ? 'Bu kaynakla başla' : 'Kaynağı aç');
  return h('article', { class: ana ? 'kaynak-ana' : 'kaynak' }, etiketler, baslik, guvenSatiri(k, kontrol), h('p', { class: ana ? '' : 'kucuk sis' }, k.gerekce),
    h('div', {}, link));
}
const SINIF_IKON = { dil: 'Aa', teknik: '{ }', akademik: 'Σ', beceri: '♪' };
function stratejiKutusu(k) {
  const st = k.strateji;
  if (!st) return h('p', { class: 'sis' }, k.yaklasim);
  return h('div', { class: 'strateji' },
    h('div', { class: 'strateji-bas' }, h('span', { class: 'strateji-ikon', 'aria-hidden': 'true' }, SINIF_IKON[st.sinif] || '✦'),
      h('div', {}, h('p', { class: 'ust-baslik' }, 'Kaynak Avcısı’nın araştırma stratejisi'), h('h4', {}, st.ad))),
    h('p', { class: 'sis' }, st.ozet),
    h('ol', { class: 'strateji-adim' }, st.adimlar.map((x) => h('li', {}, x))),
    st.not ? h('p', { class: 'kucuk sis2' }, st.not) : null);
}
function kaynakBolumu(k, kontrol) {
  if (!k) return h('p', { class: 'sis' }, 'Kaynak taraması yok.');
  const izgara = (baslik, xs, alt = null) => (xs.length ? h('div', { class: 'dil-grup' }, h('h4', {}, baslik), alt ? h('p', { class: 'kucuk sis2' }, alt) : null,
    h('div', { class: 'kaynaklar-izgara' }, xs.map((x) => kaynakKarti(x, false, kontrol)))) : null);
  const terimNotu = k.ingilizce_terim ? `İngilizce kaynaklarda konu “${k.ingilizce_terim}” olarak geçer; orada bu terimle ara.` : null;
  if (k.kaynak_turu === 'dogrulanmis') {
    const alt = k.alternatifler, sinif = k.strateji?.sinif;
    const TAMAMLAYICI = ['Görsel tamamlayıcı', 'Pratik aracı', 'Başvuru'];
    let gruplar;
    if (sinif === 'dil') {
      gruplar = [izgara('1 · Türkçe temel', alt.filter((x) => x.rol === '1. Türkçe temel')),
        izgara('2 · İngilizce üzerinden köprü', alt.filter((x) => x.rol === '2. İngilizce köprü'), terimNotu),
        izgara('3 · Hedef dilde (A2 sonrası)', alt.filter((x) => x.rol === '3. Hedef dilde'))];
    } else {
      gruplar = [izgara(sinif === 'teknik' ? 'Destek ve derinleştirme' : 'Diğer dersler', alt.filter((x) => !TAMAMLAYICI.includes(x.rol)), terimNotu),
        izgara(sinif === 'beceri' ? 'Pratik araçları' : 'Tamamlayıcı araçlar', alt.filter((x) => TAMAMLAYICI.includes(x.rol)))];
    }
    return h('div', {}, stratejiKutusu(k), kaynakKarti(k.secim, true, kontrol), ...gruplar);
  }
  if (k.kaynak_turu === 'platform') {
    const sira = k.strateji?.sinif === 'teknik' ? ['İngilizce', 'Türkçe'] : ['Türkçe', 'İngilizce'];
    return h('div', {}, stratejiKutusu(k), k.strateji ? null : h('p', { class: 'sis' }, k.yaklasim),
      ...sira.map((dil) => { const ps = k.platformlar.filter((p) => p.dil === dil); return ps.length ? h('div', { class: 'dil-grup' },
        h('h4', {}, dil === 'Türkçe' ? 'Türkçe güvenilir platformlar' : `İngilizce platformlar (“${ps[0].terim}” olarak aranır)`),
        h('div', { class: 'kaynaklar-izgara' }, ps.map((p) => h('article', { class: 'kaynak' }, h('h4', {}, p.ad),
          h('div', { class: 'guven-satiri' }, h('span', { class: `guven ${GUVEN_SINIF[p.guven] || 'dusuk'}` }, `Güven: ${p.guven}`), h('span', { class: 'kucuk sis' }, p.yayinci_turu)),
          h('p', { class: 'kucuk sis' }, p.neden), canliDurum(p.url, kontrol),
          h('a', { href: guvenliUrl(p.url), target: '_blank', rel: 'noopener noreferrer' }, 'Konu sayfasına git'))))) : null; }),
      k.model_onerileri?.length ? h('div', { style: 'margin-top:16px' }, h('h4', { style: 'margin:0 0 6px;font-size:16px' }, 'Kaynak Avcısı’nın aklına gelenler (bağlantısız, doğrulanmadı)'),
        h('ul', { class: 'sis' }, k.model_onerileri.map((o) => h('li', {}, `${o.baslik}: ${o.neden}`)))) : null,
      h('p', { class: 'kucuk sis2', style: 'margin-top:14px' }, k.dogrulama));
  }
  return h('div', {}, h('p', { class: 'sis' }, k.yaklasim));
}
const bolumLinkleri = (bolum) => (bolum?.length ? h('span', { class: 'bolum-link' }, bolum.map((b) => h('a', { href: guvenliUrl(b.url), target: '_blank', rel: 'noopener noreferrer' }, b.baslik))) : null);
function kendiKaynakFormu(a) {
  const baslik = h('input', { class: 'girdi', id: 'kk-baslik', maxlength: 120, placeholder: 'Örn. Hocamın ders notları, Grokking Algorithms' });
  const url = h('input', { class: 'girdi', id: 'kk-url', maxlength: 500, placeholder: 'https://… (isteğe bağlı)', inputmode: 'url' });
  const tur = h('select', { class: 'girdi', id: 'kk-tur', style: 'width:auto' }, ...['Kitap', 'Ders notu', 'Video', 'Kurs', 'Web sitesi', 'Diğer'].map((x) => h('option', { value: x }, x)));
  const not_ = h('input', { class: 'girdi', id: 'kk-not', maxlength: 200, placeholder: 'Neden bu kaynak? (isteğe bağlı)' });
  const hata = h('p', { class: 'kucuk', style: 'color:var(--mercan)', role: 'alert' });
  return h('form', { class: 'kendi-form koru', onsubmit: async (e) => {
    e.preventDefault(); hata.textContent = '';
    if (baslik.value.trim().length < 2) { hata.textContent = 'Kaynağın adını yaz.'; return; }
    try {
      const r = await api(`/v2/sessions/${S.sid}/sources`, 'POST', { alan: a.alan, baslik: baslik.value.trim(), url: url.value.trim() || null, tur: tur.value, not: not_.value.trim() });
      baslik.value = ''; url.value = ''; not_.value = '';
      bildir(`Kaynak Avcısı değerlendirdi: güven ${r.kaynak.guven}`);
      await tazele(); S.aktifPano?.guncelle(S.view);
    } catch (err) { hata.textContent = err.message; }
  } },
    h('label', { class: 'etiket', for: 'kk-baslik' }, 'Kendi kaynağını ekle'),
    h('p', { class: 'kucuk sis2' }, 'Kaynak Avcısı yayıncıyı değerlendirir ve bağlantıyı açıp kontrol eder. Yalnızca https bağlantıları kabul edilir.'),
    baslik, h('div', { class: 'secenekler' }, tur, url), not_, hata, h('div', {}, h('button', { class: 'dugme kucuk', type: 'submit' }, 'Kaynağı ekle')));
}
function kendiKaynaklar(a) {
  if (!a.kendi_kaynaklar?.length) return null;
  return h('div', { class: 'kendi-liste' }, a.kendi_kaynaklar.map((k) => h('article', { class: 'kaynak kendi' + (a.birincil === k.id ? ' birincil' : '') },
    h('div', { class: 'etiketler' }, h('span', { class: 'etiket-k' }, k.tur), a.birincil === k.id ? h('span', { class: 'puan' }, 'Birincil kaynağın') : null),
    h('h4', {}, k.baslik), guvenSatiri(k, a.kaynak_kontrol), k.not ? h('p', { class: 'kucuk sis' }, k.not) : null,
    h('div', { class: 'sag-eylem' },
      k.url ? h('a', { href: guvenliUrl(k.url), target: '_blank', rel: 'noopener noreferrer' }, 'Aç') : null,
      a.birincil === k.id ? h('button', { class: 'baglanti', onclick: () => yap(() => api(`/v2/sessions/${S.sid}/sources/primary`, 'POST', { alan: a.alan, kaynak_id: null }), 'Kaynak Avcısı’nın önerisine dönüldü') }, 'Birincil olmaktan çıkar')
        : h('button', { class: 'baglanti', onclick: () => yap(() => api(`/v2/sessions/${S.sid}/sources/primary`, 'POST', { alan: a.alan, kaynak_id: k.id }), 'Birincil kaynağın güncellendi') }, 'Birincil yap'),
      h('button', { class: 'baglanti', style: 'color:var(--mercan)', onclick: () => yap(() => api(`/v2/sessions/${S.sid}/sources/${a.alan}/${k.id}`, 'DELETE'), 'Kaynak silindi') }, 'Sil')))));
}
const TIP_ADI = { learn: 'Öğren', practice: 'Uygula', reflect: 'Düşün', teach: 'İkizine anlat' };
function haftaGogu(gunler, bugun) {
  const w = 700, hh = 110, pad = 40;
  const el = svg('svg', { viewBox: `0 0 ${w} ${hh}`, class: 'hafta-gok', role: 'img', 'aria-label': `${gunler.length} günlük hafta` });
  const p = gunler.map((g, i) => ({ x: pad + (gunler.length === 1 ? 0.5 : i / (gunler.length - 1)) * (w - 2 * pad), y: hh / 2 + Math.sin(i * 1.3 + g.gun) * 18 }));
  for (let i = 1; i < p.length; i++) el.append(svg('line', { x1: p[i - 1].x, y1: p[i - 1].y, x2: p[i].x, y2: p[i].y, stroke: gunler[i].bitti && gunler[i - 1].bitti ? '#f5d78e' : '#2e3b75', 'stroke-width': gunler[i].bitti && gunler[i - 1].bitti ? 1.8 : 1.2, 'stroke-dasharray': gunler[i].gun > bugun ? '3 6' : 'none' }));
  gunler.forEach((g, i) => {
    const q = p[i];
    if (g.gun === bugun) el.append(svg('circle', { cx: q.x, cy: q.y, r: 13, fill: 'none', stroke: '#f5d78e', 'stroke-width': 1.6, class: 'bugun-halka' }));
    el.append(svg('circle', { cx: q.x, cy: q.y, r: g.bitti ? 6 : 4.5, fill: g.bitti ? '#f5d78e' : g.gun < bugun ? '#5b4a5e' : '#2e3b75' }));
    if (g.anlat) el.append(svg('path', { d: `M${q.x} ${q.y - 26} l6 6 -6 6 -6 -6z`, fill: g.anlatBitti ? '#8ea2ff' : 'none', stroke: '#8ea2ff', 'stroke-width': 1.4 }));
    el.append(svg('text', { x: q.x, y: hh - 8, 'text-anchor': 'middle', fill: g.gun === bugun ? '#f5d78e' : '#7f89b8', 'font-size': 12, 'font-weight': 700, 'font-family': 'DM Sans, sans-serif' }, document.createTextNode(`${g.gun}`)));
  });
  return el;
}
function haftalikRota(a, bugun, bolumBy, acikDurum = new Map()) {
  const haftaSay = Math.ceil(a.hedef.sure / 7);
  return h('div', { class: 'haftalar' }, Array.from({ length: haftaSay }, (_, wi) => {
    const bas = wi * 7 + 1, son = Math.min(a.hedef.sure, bas + 6);
    const gorevler = a.harita.filter((t) => t.day >= bas && t.day <= son);
    const gunler = Array.from({ length: son - bas + 1 }, (_, i) => {
      const gun = bas + i, g = gorevler.filter((t) => t.day === gun);
      const anlat = g.find((t) => t.type === 'teach');
      return { gun, bitti: g.length > 0 && g.every((t) => t.done), anlat: !!anlat, anlatBitti: !!anlat?.done };
    });
    const bitenSay = gorevler.filter((t) => t.done).length;
    const tema = a.haftalar?.[Math.min(wi, (a.haftalar?.length || 1) - 1)];
    const buHafta = bugun >= bas && bugun <= son;
    const anahtar = `${a.alan}:${wi}`;
    const d = h('details', { class: 'hafta' + (buHafta ? ' bu-hafta' : ''), open: (acikDurum.has(anahtar) ? acikDurum.get(anahtar) : buHafta) || undefined });
    d.addEventListener('toggle', () => acikDurum.set(anahtar, d.open));
    d.append(
      h('summary', {}, h('span', { class: 'hafta-no' }, `${wi + 1}. hafta`), h('span', { class: 'hafta-tema' }, tema ? tema.theme : `${bas}–${son}. günler`),
        h('span', { class: 'hafta-ilerleme' }, h('i', { style: `width:${gorevler.length ? Math.round((bitenSay / gorevler.length) * 100) : 0}%` })), h('span', { class: 'kucuk sis2' }, `${bitenSay}/${gorevler.length}`)),
      tema ? h('p', { class: 'kucuk sis', style: 'margin:4px 0 0' }, `Kilometre taşı: ${tema.milestone}`) : null,
      haftaGogu(gunler, bugun),
      h('ul', { class: 'hafta-gorevler' }, gorevler.map((t) => h('li', { class: (t.done ? 'bitti' : '') + (t.day === bugun ? ' bugun' : '') + (t.type === 'teach' ? ' anlat' : '') },
        h('span', { class: 'g' }, `${t.done ? '★' : '☆'} ${t.day}. gün`),
        h('span', { class: 't' }, t.title, h('span', { class: 'kucuk sis2' }, ` · ${TIP_ADI[t.type] || ''} · ${t.minutes} dk`), t.type === 'teach' ? bolumLinkleri(bolumBy[t.id]) : null)))));
    return d;
  }));
}
function haritaPano() {
  const el = h('div', {});
  const otoKontrol = new Set();
  const haftaAcik = new Map();
  const formlar = {};
  let kontrolEdiliyor = false;
  const kontrolEt = async (alan) => {
    if (kontrolEdiliyor) return; kontrolEdiliyor = true; S.aktifPano?.guncelle(S.view);
    try { const r = await api(`/v2/sessions/${S.sid}/sources/check`, 'POST', { alan }); bildir(`${r.acik}/${r.toplam} bağlantı açılıyor`); } catch (e) { bildir(e.message); }
    kontrolEdiliyor = false; await tazele(); S.aktifPano?.guncelle(S.view);
  };
  const guncelle = (v) => {
    const a = aktifAlan(); if (!a?.hazir) { el.replaceChildren(h('p', { class: 'sis' }, 'Harita hazırlanıyor…')); return; }
    if (!a.kaynak_kontrol && !otoKontrol.has(a.alan)) { otoKontrol.add(a.alan); kontrolEt(a.alan); }
    const bugun = a.ilerleme.gun + 1;
    const bolumBy = Object.fromEntries((a.ikiz?.yildizlar || []).map((y) => [y.id, y.bolum]));
    const birincil = a.kendi_kaynaklar?.find((k) => k.id === a.birincil);
    el.replaceChildren(
      baslikSatiri('Yol haritan', a.hedef.secilen),
      alanSecici(() => guncelle(S.view)),
      h('div', { class: 'hedef-satiri' },
        h('div', {}, h('p', { class: 'sis' }, a.hedef.gerekce), h('p', { class: 'kucuk sis2', style: 'margin-top:8px' }, `Başarı ölçütü: ${a.hedef.olcut} · Süre: ${a.hedef.sure} gün (Profil’den değiştirebilirsin)`)),
        h('div', { class: 'parlaklik' }, h('b', {}, `%${a.ilerleme.parlaklik}`), h('span', {}, 'Hedef parlaklığı'), h('span', { class: 'kucuk sis2' }, 'İkizinin başarısı kadar parlar'))),
      h('section', { class: 'bolum' },
        h('div', { class: 'bolum-bas' }, h('h3', {}, birincil ? 'Senin birincil kaynağın' : 'Önerilen kaynak'),
          h('div', { class: 'sag-eylem' },
            dugme(kontrolEdiliyor ? 'Kontrol ediliyor…' : 'Bağlantıları şimdi kontrol et', () => kontrolEt(a.alan), 'ince kucuk'),
            dugme('Yeniden tara', () => yap(() => api(`/v2/sessions/${S.sid}/assign`, 'POST', { metin: 'Kaynak öner' }), 'Kaynak Avcısı yeniden tarıyor'), 'ince kucuk'))),
        birincil ? h('div', { class: 'kaynak-ana' }, h('h3', {}, birincil.baslik), guvenSatiri(birincil, a.kaynak_kontrol),
          birincil.url ? h('div', {}, h('a', { class: 'dugme kucuk git', href: guvenliUrl(birincil.url), target: '_blank', rel: 'noopener noreferrer' }, 'Bu kaynakla başla')) : null,
          h('p', { class: 'kucuk sis2' }, 'Kaynak Avcısı’nın önerisi aşağıda duruyor.')) : null,
        kaynakBolumu(a.kaynaklar, a.kaynak_kontrol),
        h('div', { class: 'kendi-bolum' }, h('h4', { style: 'margin:0;font-size:18px' }, 'Kendi kaynakların'), kendiKaynaklar(a), (formlar[a.alan] ??= kendiKaynakFormu(a)))),
      h('section', { class: 'bolum' }, h('h3', {}, `${a.hedef.sure} günlük rota`), h('p', { class: 'kucuk sis2' }, 'Her hafta bir takımyıldız: altın yıldızlar bitirdiğin günler, halka bugünün, mavi elmas ikizine anlatacağın gün.'),
        haftalikRota(a, bugun, bolumBy, haftaAcik)));
  };
  return { el, guncelle };
}

/* ---------- Bugün ---------- */
function tempoEgrisi(kayitlar) {
  const pts = kayitlar.filter((k) => k.bpm);
  if (pts.length < 1) return null;
  const w = 560, hgt = 160, pad = 26, min = Math.min(...pts.map((p) => p.bpm)) - 8, max = Math.max(...pts.map((p) => p.bpm)) + 8;
  const x = (i) => pad + (pts.length === 1 ? 0.5 : i / (pts.length - 1)) * (w - 2 * pad), y = (b) => hgt - pad - ((b - min) / (max - min || 1)) * (hgt - 2 * pad);
  const el = svg('svg', { viewBox: `0 0 ${w} ${hgt}`, role: 'img', 'aria-label': `Tempo: ${pts[0].bpm} BPM'den ${pts.at(-1).bpm} BPM'e` });
  el.append(svg('path', { d: pts.map((p, i) => `${i ? 'L' : 'M'}${x(i)} ${y(p.bpm)}`).join(' '), stroke: '#f5d78e', 'stroke-width': 2.4, fill: 'none' }));
  pts.forEach((p, i) => {
    el.append(svg('circle', { cx: x(i), cy: y(p.bpm), r: 4.5, fill: '#f5d78e' }));
    el.append(svg('text', { x: x(i), y: y(p.bpm) - 10, 'text-anchor': 'middle', fill: '#eef0fa', 'font-size': 12, 'font-family': 'DM Sans, sans-serif' }, document.createTextNode(String(p.bpm))));
  });
  return el;
}
function pratikBolumu(a) {
  const beceri = h('select', { class: 'girdi', id: 'p-beceri', style: 'width:auto' }, ...(a.beceriler || []).map((b) => h('option', { value: b }, b)), h('option', { value: 'Şarkının tamamı' }, 'Şarkının tamamı'));
  const bpm = h('input', { class: 'girdi', id: 'p-bpm', type: 'number', min: 20, max: 300, placeholder: 'örn. 60', style: 'width:110px' });
  const dk = h('input', { class: 'girdi', id: 'p-dk', type: 'number', min: 1, max: 240, value: 10, style: 'width:90px' });
  const not_ = h('input', { class: 'girdi', id: 'p-not', maxlength: 200, placeholder: 'Ne zorladı? (isteğe bağlı)' });
  const secili = beceri.value;
  const kayitlar = (a.pratik || []);
  const grafikKap = h('div', {});
  const ciz = () => { const k = kayitlar.filter((x) => x.beceri === beceri.value); grafikKap.replaceChildren(k.length ? h('div', { class: 'grafik' }, tempoEgrisi(k)) : h('p', { class: 'kucuk sis2' }, 'Bu beceri için henüz tempo kaydı yok.')); };
  beceri.addEventListener('change', ciz); ciz();
  return h('section', { class: 'bolum pratik koru' },
    h('h3', {}, 'Pratik kaydı'),
    h('p', { class: 'sis' }, 'Beceride ilerleme görünmez kalmasın: metronomda temiz çalabildiğin en yüksek tempoyu (BPM) kaydet. Gözcü her kaydı bir öncekiyle karşılaştırır.'),
    h('div', { class: 'secenekler', style: 'align-items:end' },
      h('label', { class: 'kucuk', for: 'p-beceri' }, 'Beceri', beceri), h('label', { class: 'kucuk', for: 'p-bpm' }, 'Tempo (BPM)', bpm), h('label', { class: 'kucuk', for: 'p-dk' }, 'Süre (dk)', dk)),
    not_,
    h('div', {}, dugme('Kaydet', () => yap(async () => {
      const r = await api(`/v2/sessions/${S.sid}/practice`, 'POST', { alan: a.alan, beceri: beceri.value, bpm: bpm.value ? Number(bpm.value) : null, dakika: Number(dk.value || 10), not: not_.value.trim() });
      bildir(r.mesaj); bpm.value = ''; not_.value = '';
    }), 'kucuk')),
    grafikKap);
}
function bugunPano() {
  const el = h('div', {});
  let pratikAlan = null, pratikEl = null;
  const guncelle = (v) => {
    const bitti = v.bugun.filter((t) => t.done).length;
    const hobi = v.alanlar.find((a) => a.hazir && BECERI_KONULARI.test(a.konu));
    if (hobi && (pratikAlan !== hobi.alan || (pratikEl && (hobi.pratik || []).length !== pratikEl._sayi))) { pratikAlan = hobi.alan; pratikEl = pratikBolumu(hobi); pratikEl._sayi = (hobi.pratik || []).length; }
    const etiket = (alan) => v.alanlar.find((a) => a.alan === alan)?.konu || alan;
    el.replaceChildren(
      baslikSatiri('Bugün', `${bitti} / ${v.bugun.length} yıldız yandı.`),
      h('ul', { class: 'liste' }, v.bugun.map((t) => h('li', { class: 'gorev' + (t.done ? ' bitti' : '') },
        h('button', { class: 'tik', role: 'checkbox', 'aria-checked': String(t.done), 'aria-label': `${t.title} tamamlandı`, onclick: () => (t.type === 'teach' ? ogretAc(t.alan, t.id) : yap(() => api(`/v2/sessions/${S.sid}/tasks/${t.id}/complete?yapildi=${!t.done}`, 'POST'))) },
          svg('svg', { viewBox: '0 0 24 24' }, svg('path', { d: 'M5 12l5 5 9-10' }))),
        h('div', {}, h('div', { class: 'bas' }, t.title), h('div', { class: 'meta' }, `${etiket(t.alan)} · ${{ learn: 'Öğren', practice: 'Uygula', reflect: 'Düşün', teach: 'İkizine anlat' }[t.type]} · ${t.minutes} dk`)),
        t.type === 'teach' ? dugme('Anlat', () => ogretAc(t.alan, t.id), 'ince kucuk') : h('span')))),
      v.bugun.length ? null : h('p', { class: 'sis' }, 'Bugün için görev yok.'),
      v.son_tarihler.length ? h('section', { class: 'bolum' }, h('h3', {}, 'Yaklaşanlar'), h('div', { class: 'chip-satiri' }, v.son_tarihler.map((d) => h('span', { class: 'chip' }, `${d.baslik} · ${d.kalan_gun >= 0 ? d.kalan_gun + ' gün' : 'geçti'}`)))) : null,
      h('div', { class: 'gun-bitir' }, dugme('Günü bitir', () => yap(() => api(`/v2/sessions/${S.sid}/day/close`, 'POST'), 'Gün kapanıyor, ekip değerlendiriyor'), ''),
        h('span', { class: 'kucuk sis' }, 'Gözcü seni rotanla karşılaştırır; gerekirse Yörüngeci planı ayarlar.')),
      hobi ? pratikEl : null, demo);
  };
  const gun = h('select', { class: 'girdi', id: 'd-gun', style: 'width:auto' }, [1, 2, 3, 5, 7].map((g) => h('option', { value: g, selected: g === 3 }, `${g} gün`)));
  const oran = h('select', { class: 'girdi', id: 'd-oran', style: 'width:auto' }, [0, 25, 50, 75, 100].map((o) => h('option', { value: o, selected: o === 25 }, `%${o}`)));
  const demo = h('section', { class: 'demo-denetim' }, h('h3', {}, 'Canlı demo kontrolü'),
    h('p', { class: 'sis' }, 'Günleri tek tek yaşamak yerine zamanı ilerlet: kaç gün geçsin, o günlerde planın ne kadarını yapmış ol? Ekip anında tepki verir.'),
    h('div', { class: 'secenekler', style: 'align-items:center' }, h('label', { for: 'd-gun' }, 'Geçen süre'), gun, h('label', { for: 'd-oran' }, 'Yaptığım'), oran,
      dugme('İlerlet', () => yap(() => api(`/v2/sessions/${S.sid}/demo/skip`, 'POST', { gun: Number(gun.value), tutarlilik: Number(oran.value) / 100 }), 'Ekip değerlendiriyor'), 'kucuk')));
  return { el, guncelle };
}

/* ---------- Ekip: canlı zihin haritası + ajan çıktıları ---------- */
const HARITA_SIRA = ['Astronom', 'Kutup Yıldızı', 'Haritacı', 'Kaynak Avcısı', 'Gözcü', 'Yörüngeci', 'Rehber', 'Hakem', 'İkiz', 'Kaşif', 'Konu Bekçisi'];
const AKISLAR = [['Astronom', 'Kutup Yıldızı', 'Haritacı', 'Kaynak Avcısı'], ['Gözcü', 'Yörüngeci', 'Rehber'], ['Konu Bekçisi', 'Kaşif', 'İkiz', 'Hakem']];
const AKIS_ADI = ['Kurulum hattı', 'Otonom döngü', 'İkizine öğret'];
const W = 1000, H = 640;
function konumlar() {
  const k = { 'Gözlemevi': { x: W / 2, y: H / 2 } };
  HARITA_SIRA.forEach((ad, i) => {
    const a = -Math.PI * 0.95 + (i / HARITA_SIRA.length) * Math.PI * 2;
    k[ad] = { x: W / 2 + Math.cos(a) * W * 0.41, y: H / 2 + Math.sin(a) * H * 0.4 };
  });
  return k;
}
let sonBalon = '';
function zihinHaritasi(v, aktif, sonMesaj, secili, onSec) {
  const k = konumlar();
  const kap = h('div', { class: 'zihin', role: 'group', 'aria-label': 'Ajan ekibi zihin haritası' });
  const cizgi = svg('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', class: 'zihin-cizgi', 'aria-hidden': 'true' });
  HARITA_SIRA.forEach((ad) => cizgi.append(svg('line', { x1: k['Gözlemevi'].x, y1: k['Gözlemevi'].y, x2: k[ad].x, y2: k[ad].y, class: 'kol' + (aktif === ad ? ' canli' : '') })));
  if (aktif && aktif !== 'Gözlemevi' && k[aktif] && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const yol = `M${k['Gözlemevi'].x} ${k['Gözlemevi'].y} L${k[aktif].x} ${k[aktif].y}`;
    for (const gecik of [0, 0.4]) {
      const kuyruk = svg('circle', { r: 5, fill: ajanRenk(aktif), opacity: gecik ? 0.5 : 1 });
      kuyruk.append(svg('animateMotion', { dur: '1.2s', repeatCount: 'indefinite', path: yol, begin: `${gecik}s` }));
      cizgi.append(kuyruk);
    }
  }
  AKISLAR.forEach((grup, gi) => grup.slice(1).forEach((ad, i) => {
    const a = k[grup[i]], b = k[ad];
    cizgi.append(svg('path', { d: `M${a.x} ${a.y} Q ${(a.x + b.x) / 2 + (W / 2 - (a.x + b.x) / 2) * 0.25} ${(a.y + b.y) / 2 + (H / 2 - (a.y + b.y) / 2) * 0.25} ${b.x} ${b.y}`, class: `akis akis${gi}` + (aktif === ad || aktif === grup[i] ? ' canli' : '') }));
  }));
  kap.append(cizgi);
  const bilgi = Object.fromEntries(v.ajanlar.map((a) => [a.ad, a]));
  const sayac = {}, sonZaman = {}; S.olaylar.forEach((o) => { sayac[o.ajan] = (sayac[o.ajan] || 0) + 1; sonZaman[o.ajan] = o.t; });
  const simdiSn = Date.now() / 1000;
  ['Gözlemevi', ...HARITA_SIRA].forEach((ad) => {
    const p = k[ad];
    const yakin = sonZaman[ad] && simdiSn - sonZaman[ad] < 90;
    const dugum = h('button', { class: 'dugum' + (ad === 'Gözlemevi' ? ' merkez' : '') + (aktif === ad ? ' aktif' : '') + (secili === ad ? ' secili' : '') + (yakin ? ' yakin' : '') + (!sayac[ad] ? ' bos' : ''),
      style: `left:${(p.x / W) * 100}%;top:${(p.y / H) * 100}%;--c:${ajanRenk(ad)}`, 'aria-pressed': String(secili === ad),
      title: bilgi[ad]?.rol || ad, onclick: () => onSec(ad) },
      h('span', { class: 'ic' }, avatar(ad, aktif === ad), h('span', { class: 'dugum-ad' }, ad)), sayac[ad] ? h('span', { class: 'dugum-sayi' }, sayac[ad]) : null);
    kap.append(dugum);
    if (aktif === ad && sonMesaj) {
      const yatay = p.x / W < 0.34 ? ' sol' : p.x / W > 0.66 ? ' sag' : '', dikey = p.y / H < 0.34 ? ' alt' : '';
      const sabit = sonBalon === ad + sonMesaj ? ' sabit' : '';     // aynı mesaj her yenilemede yeniden belirmesin
      sonBalon = ad + sonMesaj;
      kap.append(h('div', { class: 'dugum-balon' + yatay + dikey + sabit, style: `left:${(p.x / W) * 100}%;top:${(p.y / H) * 100}%;--c:${ajanRenk(ad)}` }, kisa(sonMesaj, 110)));
    }
  });
  return h('div', {}, kap, h('div', { class: 'zihin-lejant' }, AKIS_ADI.map((a, i) => h('span', {}, h('i', { class: `akis-renk akis${i}` }), a)), h('span', { class: 'kucuk sis2' }, 'Bir ajana dokun: ürettiği çıktıyı gör')));
}
function onceSure(t) {
  const s = Math.max(0, Math.round(Date.now() / 1000 - t));
  return s < 10 ? 'az önce' : s < 60 ? `${s} sn önce` : s < 3600 ? `${Math.round(s / 60)} dk önce` : `${Math.round(s / 3600)} sa önce`;
}
function adimSeridi(onSec) {
  const son = S.olaylar.slice(-10);
  return h('div', { class: 'adim-serit', 'aria-label': 'Son adımlar' }, son.map((o, i) => h('button', { class: 'adim' + (i === son.length - 1 ? ' son' : ''), style: `--c:${ajanRenk(o.ajan)}`, onclick: () => onSec(o.ajan), title: o.mesaj },
    h('span', { class: 'ic' }, avatar(o.ajan), h('span', { class: 'adim-ad' }, o.ajan), h('span', { class: 'adim-zaman' }, onceSure(o.t)), h('span', { class: 'adim-metin' }, kisa(o.mesaj, 70))))));
}
function ekipPano() {
  let secili = 'Gözlemevi', cikti = null, ciktiSayi = -1, yukleniyor = false;
  const haritaKap = h('div', {}), ciktiKap = h('aside', { class: 'cikti', 'aria-live': 'polite' }), simdi = h('div', { class: 'simdi' });
  const oneriKap = h('div', {}), gorevKap = h('div', {}), akis = h('div', { class: 'canli-akis', style: 'max-height:none', 'aria-live': 'polite' }), sohbetKap = h('div', {});
  let mod = 'gorev', yanit = h('div', { class: 'hata-kutu', hidden: true, role: 'alert' });
  const metin = h('textarea', { id: 'komut-metin', maxlength: 400, rows: 2, 'aria-label': 'Ekibe mesaj' });
  const ajanSec = h('select', { class: 'girdi', style: 'min-height:38px;padding:0 10px;width:auto', 'aria-label': 'Hangi ajan', hidden: true });
  const modDugmeleri = [['gorev', 'Görev ver'], ['soru', 'Soru sor']].map(([k, ad]) => h('button', { type: 'button', class: 'sekme', 'aria-pressed': String(k === mod), onclick: () => { mod = k; modGuncelle(); } }, ad));
  const ornekler = h('div', { class: 'oneriler' });
  const ORN = { gorev: ['Gelecek hafta vizem var, planı ona göre ayarla', 'Mini sınav hazırla', 'Bu hafta yoğunum, planı hafiflet', 'Kaynak öner'], soru: ['Planım nasıl gidiyor?', 'Bugün motivasyonum yok', 'Neden bu hedefi seçtin?'] };
  const modGuncelle = () => {
    modDugmeleri.forEach((b, i) => b.setAttribute('aria-pressed', String(['gorev', 'soru'][i] === mod)));
    ajanSec.hidden = mod !== 'soru';
    metin.placeholder = mod === 'gorev' ? 'Ekibe ne yaptırmak istiyorsun? Örn. Gelecek hafta vizem var, planı ona göre ayarla' : 'Bir ajana sor. Örn. Planım nasıl gidiyor?';
    ornekler.replaceChildren(...ORN[mod].map((o) => h('button', { type: 'button', class: 'oneri', onclick: () => { metin.value = o; metin.focus(); } }, o)));
  };
  const gonder = h('button', { class: 'dugme', type: 'submit' }, 'Gönder');
  const komut = h('form', { class: 'komut', onsubmit: async (e) => {
    e.preventDefault(); const m = metin.value.trim(); if (!m) return;
    yanit.hidden = true; gonder.disabled = true;
    await yap(async () => {
      const r = mod === 'gorev' ? await api(`/v2/sessions/${S.sid}/assign`, 'POST', { metin: m }) : await api(`/v2/sessions/${S.sid}/chat`, 'POST', { metin: m, ajan: ajanSec.value || null, alan: aktifAlan()?.alan });
      if (r.ok) { metin.value = ''; bildir(mod === 'gorev' ? 'Görev ekibe dağıtıldı' : `${r.ajan} yanıtladı`); } else { yanit.textContent = r.mesaj || 'Bu mesaj kabul edilmedi.'; yanit.hidden = false; }
    });
    gonder.disabled = false;
  } }, h('div', { class: 'secenekler' }, modDugmeleri), ornekler, metin, yanit, h('div', { class: 'alt-satir' }, ajanSec, gonder));
  metin.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) komut.requestSubmit(); });

  const ciktiCiz = () => {
    const o = cikti;
    if (!o) { ciktiKap.replaceChildren(h('p', { class: 'sis' }, yukleniyor ? 'Çıktı getiriliyor…' : 'Bir ajana dokun.')); return; }
    ciktiKap.replaceChildren(
      h('div', { class: 'cikti-bas' }, avatar(o.ajan), h('div', {}, h('h3', {}, o.ajan), h('p', { class: 'kucuk sis' }, o.rol))),
      o.fayda ? h('p', { class: 'cikti-fayda' }, o.fayda) : null,
      ...(o.bolumler.length ? o.bolumler.map((b) => h('section', { class: 'cikti-bolum' }, h('h4', {}, b.baslik),
        h('ul', {}, b.satirlar.map((x) => h('li', {}, typeof x === 'object' ? h('a', { href: guvenliUrl(x.url), target: '_blank', rel: 'noopener noreferrer' }, x.metin) : x)))))
        : [h('p', { class: 'sis' }, 'Bu ajan henüz bir şey üretmedi.')]));
  };
  const ciktiGetir = async (ad) => {
    secili = ad; yukleniyor = true; ciktiCiz();
    try { cikti = await api(`/v2/sessions/${S.sid}/agents/${encodeURIComponent(ad)}/output`); } catch (e) { bildir(e.message); cikti = { ajan: ad, rol: '', bolumler: [] }; }
    yukleniyor = false; ciktiCiz(); S.aktifPano?.guncelle(S.view);
  };
  const seritKap = h('div', {}), kartKap = h('div', {});
  let kartlarCizildi = false;
  const el = h('div', {}, baslikSatiri('Ekip', 'Ajanların ne yaptığını canlı izle; birine dokun, ne ürettiğini gör.'), simdi,
    h('div', { class: 'zihin-yerlesim' }, haritaKap, ciktiKap),
    h('h3', { class: 'ara-baslik', style: 'margin-top:28px' }, 'Son adımlar'), seritKap,
    h('section', { class: 'bolum' }, h('h3', { class: 'ara-baslik' }, 'Ekibini tanı: kim ne işe yarar?'),
      h('p', { class: 'sis kucuk', style: 'margin:-4px 0 14px' }, 'Bir karta dokun; o ajanın senin için ürettiği yukarıda açılır.'), kartKap),
    h('div', { class: 'ekip-yerlesim', style: 'margin-top:34px' },
      h('div', {}, h('h3', { class: 'ara-baslik' }, 'Akış'), oneriKap, gorevKap, akis),
      h('div', {}, h('h3', { class: 'ara-baslik' }, 'Ekibe görev ver'), sohbetKap, komut)));
  modGuncelle();
  let sonSayi = -1;
  const guncelle = (v) => {
    const sonOlay = S.olaylar.at(-1);
    const taze = sonOlay && Date.now() / 1000 - sonOlay.t < 8;
    const calisiyor = v.durum !== 'hazir' || taze;
    const aktif = calisiyor && sonOlay ? sonOlay.ajan : null;
    simdi.replaceChildren(aktif ? h('span', {}, h('i', { class: 'canli-nokta' }), h('b', {}, aktif), ` · ${kisa(sonOlay.mesaj, 120)}`)
      : h('span', { class: 'sis' }, h('i', { class: 'canli-nokta bos' }), 'Ekip hazır, seni bekliyor. Bir görev ver ya da bir ajana dokun.'));
    haritaKap.replaceChildren(zihinHaritasi(v, aktif, sonOlay?.mesaj, secili, ciktiGetir));
    seritKap.replaceChildren(adimSeridi(ciktiGetir));
    if (!kartlarCizildi) { kartlarCizildi = true; kartKap.replaceChildren(ajanKartlari(v.ajanlar, (ad) => { ciktiGetir(ad); scrollTo({ top: 0, behavior: 'smooth' }); })); }
    if (!cikti && !yukleniyor) ciktiGetir(secili);
    else if (S.olaylar.length !== ciktiSayi && S.olaylar.slice(ciktiSayi < 0 ? 0 : ciktiSayi).some((o) => o.ajan === secili)) { ciktiSayi = S.olaylar.length; ciktiGetir(secili); }
    if (ciktiSayi < 0) ciktiSayi = S.olaylar.length;
    if (!ajanSec.options.length) ajanSec.replaceChildren(h('option', { value: '' }, 'Otomatik'), ...v.sohbet_ajanlari.map((a) => h('option', { value: a }, a)));
    oneriKap.replaceChildren(...v.oneriler.map((p) => h('div', { class: 'oner-kart' },
      h('div', { style: 'display:flex;gap:10px;align-items:center' }, avatar(p.kaynak), h('b', {}, `${p.kaynak} onayını bekliyor`)), h('h3', { style: 'font-size:22px' }, p.baslik), h('p', {}, p.ozet),
      ...p.degisiklikler.map((d) => h('div', { class: 'fark-satir' }, `${d.etiket}: ${d.once} → `, h('b', {}, d.sonra))),
      h('div', { class: 'sag-eylem' }, dugme('Onayla', () => yap(() => api(`/v2/sessions/${S.sid}/proposals/${p.id}/approve`, 'POST'), 'Değişiklik uygulandı')), dugme('Reddet', () => yap(() => api(`/v2/sessions/${S.sid}/proposals/${p.id}/reject`, 'POST'), 'Plan olduğu gibi kaldı'), 'ince')))));
    gorevKap.replaceChildren(...v.gorevler.slice().reverse().slice(0, 3).map((g) => h('div', { class: 'yanit-kutu' }, h('span', { class: 'kucuk sis2' }, 'Verdiğin görev'), h('b', {}, g.metin),
      ...g.atamalar.map((a) => h('div', { style: 'display:flex;gap:10px;align-items:center' }, avatar(a.ajan), h('span', { class: 'sis' }, `${a.durum === 'bitti' ? '✓' : '…'} ${a.is}`))),
      g.sonuc?.mini_sinav ? h('div', {}, h('b', { style: 'color:var(--altin)' }, 'Mini sınav'), h('ol', { style: 'margin:6px 0 0;padding-left:20px' }, g.sonuc.mini_sinav.map((q) => h('li', {}, q)))) : null,
      g.sonuc?.kaynak ? h('div', {}, h('b', { style: 'color:var(--altin)' }, 'Kaynaklar'), h('p', { class: 'kucuk sis' }, g.sonuc.kaynak.join(' · ')), h('button', { class: 'baglanti', onclick: () => sekmeGit('harita') }, 'Yol haritası sayfasında gör')) : null)));
    sohbetKap.replaceChildren(...v.sohbet.slice(-4).map((m) => (m.rol === 'kullanici'
      ? h('div', { class: 'yanit-kutu', style: 'background:rgba(245,215,142,.08);border-color:rgba(245,215,142,.3)' }, h('span', { class: 'kucuk sis2' }, 'Sen'), h('span', {}, m.metin))
      : balon({ ajan: m.ajan, mesaj: m.metin, tur: 'chat' }))));
    if (S.olaylar.length !== sonSayi) {
      sonSayi = S.olaylar.length;
      akis.replaceChildren(...(calisiyor && sonOlay ? [yaziyor()] : []), ...S.olaylar.slice(-12).reverse().map((o, i) => balon(o, i === 0 && S.yeniOlay)));
    }
  };
  return { el, guncelle };
}

/* ---------- İkizin: yalnızca öğrettiklerinden oluşur ---------- */
const YILDIZ_ADI = { sonuk: 'Bilmiyor', parlak: 'Kısmen biliyor', halkali: 'Tam biliyor' };
function ikizPano() {
  const el = h('div', {});
  const acik = new Set();          // açık "nasıl öğrendi?" bölümleri yeniden çizimde kapanmasın
  let sonImza = '';
  const guncelle = (v) => {
    const a = aktifAlan(), ik = a?.ikiz; if (!ik) { el.replaceChildren(h('p', { class: 'sis' }, 'İkizin doğuyor…')); return; }
    const imza = JSON.stringify([S.alan, ik, a.ikiz_kimlik, v.alanlar.map((x) => [x.alan, x.ikiz_kimlik, x.ikiz?.bilgi_yuzde])]);
    if (imza === sonImza && el.childElementCount) return;    // değişen bir şey yoksa formlara ve açık bölümlere dokunma
    sonImza = imza;
    el.replaceChildren(
      baslikSatiri('İkizlerin', 'Her konunun ilerlemesi farklı olduğu için her takımyıldızın kendi ikizi var. Her ikiz boş doğar ve yalnızca o konuda senin öğrettiklerini bilir; senden önde olamaz. İkizler yapay zekâ karakterleridir.'),
      ikizSecici(v, () => guncelle(S.view)),
      ikizKimlikKarti(v, a),
      h('div', { class: 'ikiz-gok' }, ikizGogu(ik.yildizlar, 760, 230)),
      h('div', { class: 'lejant' }, h('span', {}, h('i', { class: 'nokta-sonuk' }), 'Henüz öğretmedin'), h('span', {}, h('i', { class: 'nokta-mavi-dolu' }), 'Kısmen biliyor'), h('span', {}, h('i', { class: 'nokta-halkali' }), 'Tam biliyor')),
      h('div', { class: 'rakamlar', style: 'margin-top:26px;max-width:560px' },
        h('div', { class: 'rakam' }, h('span', {}, 'Öğrettiğin kavram'), h('b', {}, `${ik.ogretilen} / ${ik.kavram_sayisi}`)),
        h('div', { class: 'rakam' }, h('span', {}, 'Tam bildiği'), h('b', {}, `${ik.halkali}`)),
        h('div', { class: 'rakam' }, h('span', {}, 'Bilgisi'), h('b', {}, `%${ik.bilgi_yuzde}`))),
      h('section', { class: 'bolum' }, h('h3', {}, 'Ona ne öğrettin?'),
        h('ul', { class: 'liste' }, ik.yildizlar.map((y) => h('li', { class: 'gorev' + (y.acik ? '' : ' kilitli') },
          h('span', { class: `ikiz-nokta ${y.star}` }),
          h('div', {}, h('div', { class: 'bas' }, y.baslik), h('div', { class: 'meta' }, y.acik ? `${YILDIZ_ADI[y.star]}${y.total ? ` · son sınav ${y.score}/${y.total}` : ''}${y.deneme ? ` · ${y.deneme}. deneme` : ''}` : `${y.gun}. günde açılır`),
            y.cumleler?.length ? h('details', { class: 'ikiz-detay', open: acik.has(y.id) || undefined, ontoggle: (e) => (e.target.open ? acik.add(y.id) : acik.delete(y.id)) },
              h('summary', {}, 'İkizin bu kavramı senden nasıl öğrendi?'),
              h('p', { class: 'kucuk sis2' }, 'Ona anlattıkların:'), h('ol', { class: 'cumleler kucuk-liste' }, y.cumleler.map((c) => h('li', {}, c))),
              y.sorular?.length ? h('div', {}, h('p', { class: 'kucuk sis2' }, 'Sınavda:'), h('ul', { class: 'soru-sonuc' }, y.sorular.map((q) => h('li', {}, h('span', { class: `karar ${q.sonuc}` }, { dogru: 'Doğru', eksik: 'Eksik', yanlis: 'Yanlış', anlatilmadi: 'Anlatılmadı' }[q.sonuc]), ' ', q.soru)))) : null) : null),
          y.acik ? dugme(y.star === 'sonuk' ? 'Öğret' : 'Yeniden öğret', () => ogretAc(a.alan, y.id.startsWith('serbest-') ? 'serbest' : y.id), y.star === 'sonuk' ? 'kucuk' : 'ince kucuk') : h('span'))))),
      h('div', { class: 'sag-eylem', style: 'margin-top:26px' }, dugme('Öğretme akışının canlı demosunu izle', () => canliDemo(), 'ince kucuk')));
  };
  return { el, guncelle };
}

/* ---------- Ses (tarayıcı konuşma tanıma, tr-TR) ---------- */
const SesTanima = window.SpeechRecognition || window.webkitSpeechRecognition;
function sesBaslat(onMetin, onBitti) {
  const r = new SesTanima(); r.lang = 'tr-TR'; r.continuous = true; r.interimResults = true;
  r.onresult = (e) => { let kesin = '', gecici = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) kesin += t; else gecici += t; } onMetin(kesin, gecici); };
  r.onerror = (e) => onBitti(e.error === 'not-allowed' ? 'Mikrofon izni verilmedi. Adres çubuğundan izin ver.' : e.error === 'no-speech' ? null : `Ses hatası: ${e.error}`);
  r.onend = () => onBitti(null);
  try { r.start(); } catch { onBitti('Mikrofon başlatılamadı.'); }
  return () => { try { r.stop(); } catch { /* zaten durmuş */ } };
}

/* ---------- İkizine öğret ---------- */
const ROMEN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
const BECERI_IPUCU = 'Beceri konularında (gitar gibi) ikizine nasıl yaptığını anlat: parmak yerleşimi, hangi geçişte takıldığın, tempoyu nasıl artırdığın. Çaldığını değil, nasıl çaldığını öğretiyorsun.';
const DIL_KONULARI = /ispanyolca|ingilizce|almanca|fransızca|italyanca|japonca|korece|çince|arapça|rusça|spanish|english|german|french/i;
const BECERI_KONULARI = /gitar|piyano|keman|bateri|ukulele|çizim|resim|dans|yüzme|guitar|piano/i;
const konuIpucu = (konu) => BECERI_KONULARI.test(konu) ? BECERI_IPUCU
  : DIL_KONULARI.test(konu) ? 'Dil konularında kuralı kendi cümlenle Türkçe açıkla ve her kurala bir örnek cümle ekle (ör. “Estoy cansado: yorgunum, geçici bir durum”).' : null;
function ogretPano() {
  const metin = h('textarea', { class: 'girdi', id: 'og-metin', maxlength: 1500, placeholder: 'Konuyu bir arkadaşına anlatır gibi yaz ya da sesle anlat…', style: 'min-height:140px' });
  const uyari = h('div', { class: 'hata-kutu', role: 'alert', hidden: true });
  const gecici = h('p', { class: 'gecici', 'aria-live': 'polite' });
  const cumleKap = h('div', {}), sonucKap = h('div', { 'aria-live': 'polite' }), baslikKap = h('div', {}), ipucuKap = h('div', {});
  let durdur = null, dinliyor = false;
  const sesBtn = SesTanima ? h('button', { type: 'button', class: 'dugme ince ses-dugme', onclick: () => {
    if (dinliyor) { durdur?.(); return; }
    dinliyor = true; uyari.hidden = true; sesBtn.classList.add('dinliyor'); sesBtn.replaceChildren(h('i', { class: 'kayit' }), 'Dinliyorum… durdurmak için dokun');
    durdur = sesBaslat((kesin, g) => { if (kesin) metin.value = (metin.value ? metin.value + ' ' : '') + kesin.trim(); gecici.textContent = g; },
      (hata) => { dinliyor = false; sesBtn.classList.remove('dinliyor'); sesBtn.replaceChildren(h('i', { class: 'kayit' }), 'Sesle anlat'); gecici.textContent = ''; if (hata) { uyari.textContent = hata; uyari.hidden = false; } });
  } }, h('i', { class: 'kayit' }), 'Sesle anlat') : h('button', { type: 'button', class: 'dugme ince ses-dugme', onclick: () => sunucuSes() }, h('i', { class: 'kayit' }), 'Sesle anlat');
  // Tarayıcı ses tanıması yoksa: kaydı sunucudaki ses modeline (Whisper) gönder
  let kaydedici = null;
  const sunucuSes = async () => {
    if (!S.yetenek?.ses) { uyari.textContent = 'Bu tarayıcıda sesli anlatım yok ve sunucuda ses modeli yapılandırılmadı. Chrome ya da Safari kullan.'; uyari.hidden = false; return; }
    if (kaydedici) { kaydedici.stop(); return; }
    let akis;
    try { akis = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { uyari.textContent = 'Mikrofon izni verilmedi.'; uyari.hidden = false; return; }
    const parca = []; kaydedici = new MediaRecorder(akis);
    kaydedici.ondataavailable = (e) => parca.push(e.data);
    kaydedici.onstop = async () => {
      akis.getTracks().forEach((x) => x.stop());
      const b = new Blob(parca, { type: kaydedici.mimeType || 'audio/webm' }); kaydedici = null;
      sesBtn.classList.remove('dinliyor'); sesBtn.replaceChildren(h('i', { class: 'kayit' }), 'Yazıya çevriliyor…');
      try {
        const veri = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.readAsDataURL(b); });
        const r = await api(`/v2/sessions/${S.sid}/teach/audio`, 'POST', { mime: b.type.split(';')[0] || 'audio/webm', veri });
        metin.value = (metin.value ? metin.value + ' ' : '') + r.metin; bildir('Sesin yazıya çevrildi; kontrol edip ekle');
      } catch (e) { uyari.textContent = e.message; uyari.hidden = false; }
      sesBtn.replaceChildren(h('i', { class: 'kayit' }), 'Sesle anlat');
    };
    kaydedici.start(); sesBtn.classList.add('dinliyor'); sesBtn.replaceChildren(h('i', { class: 'kayit' }), 'Kaydediyorum… bitirmek için dokun');
  };
  // Fotoğraftan anlat: görüntü tarayıcıda küçültülüp yeniden kodlanır (EXIF/konum bilgisi silinir), sonra görüntü destekli modele gider
  const dosya = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true, 'aria-label': 'Fotoğraf seç' });
  const onizleme = h('div', { class: 'foto-onizleme', hidden: true });
  dosya.addEventListener('change', async () => {
    const f = dosya.files?.[0]; dosya.value = ''; if (!f) return;
    uyari.hidden = true;
    if (!S.yetenek?.gorsel) { uyari.textContent = 'Fotoğrafı okumak için görüntü destekli bir model gerekiyor; demo modunda kapalı. README’deki “Görüntü ve ses” bölümüne bak.'; uyari.hidden = false; return; }
    try {
      const img = await createImageBitmap(f);
      const olcek = Math.min(1, 1280 / Math.max(img.width, img.height));
      const tuval = h('canvas'); tuval.width = Math.round(img.width * olcek); tuval.height = Math.round(img.height * olcek);
      tuval.getContext('2d').drawImage(img, 0, 0, tuval.width, tuval.height);
      const url = tuval.toDataURL('image/jpeg', 0.85);
      onizleme.replaceChildren(h('img', { src: url, alt: 'Yüklediğin görüntü (sunucuda saklanmaz)' }), h('span', { class: 'kucuk sis' }, 'Astronom görüntüyü okuyor…')); onizleme.hidden = false;
      const r = await api(`/v2/sessions/${S.sid}/teach/image`, 'POST', { alan: aktifAlan().alan, mime: 'image/jpeg', veri: url.split(',')[1] });
      metin.value = (metin.value ? metin.value + ' ' : '') + r.cumleler.join(' ');
      onizleme.lastChild.textContent = r.cumleler.length ? `Görüntüden ${r.cumleler.length} cümlelik taslak çıktı. Kendi sözlerinle düzelt, sonra ekle.${r.cikarilan ? ` ${r.cikarilan} cümle kişisel veri nedeniyle atıldı.` : ''}` : (r.uyari || 'Görüntüde konuyla ilgili bir şey bulunamadı.');
      metin.focus();
    } catch (e) { onizleme.hidden = true; uyari.textContent = e.message; uyari.hidden = false; }
  });
  const fotoBtn = h('button', { type: 'button', class: 'dugme ince', onclick: () => dosya.click() }, 'Fotoğraftan anlat');
  const ekleBtn = dugme('Cümleleri ekle', async () => {
    const m = metin.value.trim(); if (!m) return; uyari.hidden = true;
    await yap(async () => {
      const r = await api(`/v2/sessions/${S.sid}/teach/add`, 'POST', { metin: m, alan: aktifAlan().alan });
      if (r.ok) { metin.value = ''; if (r.uyarilar?.length) { uyari.textContent = r.uyarilar.map((u) => u.mesaj).join(' '); uyari.hidden = false; } else bildir('İkizin yeni cümleleri öğrendi'); }
      else { uyari.textContent = (r.engel === 'konu_disi' ? 'Konu Bekçisi: ' : '') + r.mesaj; uyari.hidden = false; }
    });
  }, 'ince');
  const kavramSec = h('select', { class: 'girdi', id: 'og-kavram', style: 'width:auto;min-width:240px' });
  const kavramDegis = async (alan, kavram) => {
    S.ogretGorev = kavram;
    try { S.view = await api(`/v2/sessions/${S.sid}/teach/select`, 'POST', { alan, kavram }); } catch (e) { bildir(e.message); }
    uyari.hidden = true; S.aktifPano?.guncelle(S.view);
  };
  kavramSec.addEventListener('change', () => kavramDegis(aktifAlan().alan, kavramSec.value || 'serbest'));
  let secimSuruyor = false;
  const sinavBtn = dugme('İkizini sınava sok', async () => {
    sinavBtn.disabled = true; sinavBtn.textContent = 'İkiz sınavda…';
    await yap(async () => { const r = await api(`/v2/sessions/${S.sid}/teach/exam`, 'POST', { gorev_id: kavramSec.value || 'serbest' }); if (!r.ok) { uyari.textContent = r.mesaj; uyari.hidden = false; } });
    sinavBtn.disabled = false; sinavBtn.textContent = 'İkizini sınava sok';
    sonucKap.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  const silBtn = h('button', { class: 'baglanti', onclick: () => yap(() => api(`/v2/sessions/${S.sid}/teach`, 'DELETE'), 'İkizin öğrendiklerini sildi') }, 'Hepsini sil');
  const duzelt = async (no) => {
    await yap(async () => {
      const r = await api(`/v2/sessions/${S.sid}/teach/sentences/${no}`, 'DELETE');
      metin.value = r.cumle + (metin.value ? ' ' + metin.value : '');
      metin.focus(); metin.setSelectionRange(0, r.cumle.length);
      bildir(`${ROMEN[no - 1] || no}. cümle düzeltmen için yazı alanına alındı`);
    });
  };
  const el = h('div', {}, baslikKap,
    h('div', { class: 'ogret-yerlesim' },
      h('div', { style: 'display:grid;gap:18px' },
        h('div', { class: 'guven-notu' }, svg('svg', { viewBox: '0 0 24 24' }, svg('path', { d: IKON.ayarlar })), h('p', {}, 'Ad, telefon, e-posta, kimlik ya da kart bilgisi yazma. Yazdıkların yalnızca bu sınav için kullanılır, ikiz dışına çıkmaz ve istediğin an silinir. Konuyla ilgisiz anlatımı Konu Bekçisi durdurur.')),
        h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'og-kavram' }, 'Hangi kavramı öğretiyorsun?'), kavramSec, ipucuKap),
        cumleKap, h('label', { class: 'etiket', for: 'og-metin' }, 'Anlat'), metin, gecici, uyari,
        onizleme, dosya,
        h('div', { class: 'sag-eylem' }, sesBtn, fotoBtn, ekleBtn, sinavBtn),
        h('p', { class: 'kucuk sis2' }, 'Fotoğrafta yüz, isim ya da numara olmasın. Görüntü ve ses sunucuda saklanmaz; yalnızca yazıya dökülür ve eklemeden önce sen kontrol edersin.')),
      sonucKap));
  const guncelle = (v) => {
    const a = aktifAlan(); const og = v.ogret; const bu = og.alan === a.alan;
    const konu = bu ? og.konu : a.konu.split('·').pop().trim();
    baslikKap.replaceChildren(baslikSatiri(`İkizine öğret · ${ikizAdi(a)}`, `${ikizAdi(a)}, ${konu} ikizin. Bir kavram seç, ona anlat, sınava sok. Yalnızca o kavram için anlattıklarını bilir; diğer ikizlerin bunu duymaz.`),
      ikizSecici(v, () => { const b = S.view.alanlar[S.alan]; kavramDegis(b.alan, b.ikiz?.siradaki?.id || 'serbest'); }));
    const acik = (a.ikiz?.yildizlar || []).filter((y) => y.acik && !y.id.startsWith('serbest-'));
    const secili = bu && og.kavram ? (og.kavram === 'serbest' ? '' : og.kavram) : (S.ogretGorev && acik.some((y) => y.id === S.ogretGorev) ? S.ogretGorev : (a.ikiz?.siradaki?.id || ''));
    if ((!bu || og.kavram == null) && a.hazir && !secimSuruyor) {
      secimSuruyor = true; kavramDegis(a.alan, secili || 'serbest').finally(() => { secimSuruyor = false; }); return;
    }
    if (document.activeElement !== kavramSec) {
      kavramSec.replaceChildren(...acik.map((y) => h('option', { value: y.id, selected: y.id === secili }, `${y.gun}. gün · ${y.baslik}${y.star !== 'sonuk' ? ` (${YILDIZ_ADI[y.star].toLowerCase()})` : ''}`)),
        h('option', { value: 'serbest', selected: !secili }, 'Serbest anlatım (plan dışı)'));
    }
    const yild = acik.find((y) => y.id === secili);
    ipucuKap.replaceChildren(
      konuIpucu(a.konu) ? h('p', { class: 'kucuk sis' }, konuIpucu(a.konu)) : null,
      yild?.bolum?.length ? h('p', { class: 'kucuk sis' }, 'Önce buradan çalış: ', bolumLinkleri(yild.bolum)) : null);
    const son = bu ? og.son : null;
    const gb = son?.geri_bildirim;
    const hatali = new Set(gb?.duzelt || []);
    const cumleler = bu ? og.cumleler : [];
    cumleKap.replaceChildren(...(cumleler.length ? [h('p', { class: 'etiket' }, `İkizine “${yild?.baslik || 'serbest anlatım'}” için anlattıkların`), h('p', { class: 'kucuk sis2' }, 'İkizin bu kavram hakkında yalnızca bu cümleleri bilir.'), h('ol', { class: 'cumleler' }, cumleler.map((c, i) => h('li', { class: hatali.has(i + 1) ? 'hatali' : '' },
      h('span', {}, c, hatali.has(i + 1) ? h('button', { class: 'baglanti duzelt', onclick: () => duzelt(i + 1) }, 'Düzelt') : null)))), h('div', {}, silBtn)] : []));
    sinavBtn.disabled = !cumleler.length || sinavBtn.textContent !== 'İkizini sınava sok';
    sonucKap.replaceChildren(...(son ? [h('h3', { style: 'font-size:26px;margin-bottom:6px' }, `İkiz sınavda: ${son.kavram || son.topic}`),
      h('div', { class: 'yildiz-sonuc' }, h('b', { style: 'font-family:var(--baslik);font-size:34px' }, `${son.score} / ${son.total}`), h('span', { class: 'sis' }, son.star === 'halkali' ? 'İkizin bu kavramı tam biliyor: halkalı yıldız yandı' : son.star === 'parlak' ? 'İkizin kısmen öğrendi: yıldız yandı, halkası için eksikleri tamamla' : 'İkizin henüz öğrenemedi: yıldız sönük')),
      gb ? h('div', { class: 'hakem-kutu' + (gb.sorunlu ? ' sorunlu' : '') },
        h('div', { style: 'display:flex;gap:12px;align-items:flex-start' }, avatar('Hakem'), h('div', {}, h('b', {}, 'Hakem'), h('p', {}, gb.ozet))),
        gb.duzelt_metin?.length ? h('div', { class: 'duzelt-liste' }, h('span', { class: 'kucuk sis2' }, 'Düzeltmen gereken cümleler'),
          gb.duzelt_metin.map((d) => h('div', { class: 'duzelt-satir' }, h('b', {}, `${ROMEN[d.no - 1] || d.no}.`), h('span', {}, d.cumle), dugme('Düzelt', () => duzelt(d.no), 'ince kucuk')))) : null,
        gb.yonlendirme?.length ? h('div', {}, h('span', { class: 'kucuk sis2' }, 'Doğru yer'), h('div', { class: 'yon-linkler' }, gb.yonlendirme.map((y) => h('a', { class: 'dugme kucuk', href: guvenliUrl(y.url), target: '_blank', rel: 'noopener noreferrer' }, y.baslik)))) : null) : null,
      ...son.items.map((m, i) => h('div', { class: 'sinav-madde' }, h('span', { class: 'kucuk sis2' }, `Soru ${i + 1}`), h('b', {}, m.question),
        h('span', { class: 'kucuk sis2' }, `İkiz (yapay zekâ) yanıtı${m.cited?.length ? ` · dayandığı cümle: ${m.cited.map((c) => ROMEN[c - 1] || c).join(', ')}` : ''}`), h('p', {}, m.twin_answer),
        h('span', { class: `karar ${m.result}` }, { dogru: 'Doğru', eksik: 'Eksik', yanlis: 'Yanlış', anlatilmadi: 'Anlatılmadı' }[m.result]),
        m.hint ? h('div', { style: 'display:flex;gap:10px;align-items:flex-start' }, avatar('Hakem'), h('p', { class: 'sis' }, m.hint)) : null))]
      : [h('p', { class: 'sis2' }, 'İkizini sınava soktuğunda sonuçlar burada anında görünür: Hakem hatalı cümleni işaretler, eksik kalan yeri söyler ve seni kaynağın doğru bölümüne götürür. Cevabı söylemez.')]));
  };
  return { el, guncelle };
}

function ikizSecici(v, onSec) {
  return h('div', { class: 'ikiz-secici', role: 'group', 'aria-label': 'İkiz seç' }, v.alanlar.map((a, i) => h('button', { class: 'ikiz-sec' + (i === S.alan ? ' secili' : ''), 'aria-pressed': String(i === S.alan), style: `--ikiz:${a.ikiz_kimlik?.renk || '#8ea2ff'}`,
    onclick: () => { S.alan = i; onSec(); } }, h('span', { class: 'ic' }, ikizAvatar(v, a, 46), h('span', { class: 'cip-yazi' }, h('b', {}, ikizAdi(a)), h('span', { class: 'kucuk sis' }, a.konu))))));
}
function ikizKimlikKarti(v, a) {
  const ik = a.ikiz;
  const girdi = h('input', { class: 'girdi', maxlength: 20, value: ikizAdi(a), 'aria-label': 'İkizin adı', style: 'max-width:200px' });
  const form = h('form', { class: 'ikiz-ad-form koru', onsubmit: (e) => { e.preventDefault(); const ad = girdi.value.trim(); if (ad && ad !== ikizAdi(a)) yap(() => api(`/v2/sessions/${S.sid}/tracks/${a.alan}/twin`, 'PATCH', { ad }), `İkizinin yeni adı: ${ad}`); } },
    girdi, h('button', { class: 'dugme ince kucuk', type: 'submit' }, 'Adını değiştir'));
  return h('section', { class: 'ikiz-kimlik', style: `--ikiz:${a.ikiz_kimlik?.renk || '#8ea2ff'}` },
    h('div', { class: 'ikiz-kimlik-avatar' }, ikizAvatar(v, a, 150)),
    h('div', {},
      h('p', { class: 'ust-baslik' }, `${a.konu} ikizin`),
      h('h3', {}, ikizAdi(a)),
      h('p', { class: 'sis' }, ik.ogretilen
        ? `${a.konu} hakkında bildiği her şeyi senden öğrendi: ${ik.kavram_sayisi} kavramdan ${ik.ogretilen} tanesi. Diğer ikizlerin bunu bilmez.`
        : `${a.ikiz_kimlik?.dogum ? `${a.ikiz_kimlik.dogum} tarihinde doğdu. ` : ''}${a.konu} hakkında henüz hiçbir şey bilmiyor; ilk kavramı ona sen öğreteceksin.`),
      form));
}

/* ---------- Profil: sen ve ikizin, paralel takımyıldız avatarları ---------- */
function profilHero(v) {
  const hazir = v.alanlar.filter((a) => a.hazir);
  const top = (f) => hazir.reduce((x, a) => x + f(a), 0);
  const senYildiz = top((a) => a.ilerleme.sen_yildiz), toplam = Math.max(1, top((a) => a.ilerleme.toplam_yildiz));
  const seri = Math.max(0, ...hazir.map((a) => a.ilerleme.seri));
  const bicim = v.profil.avatar || 0;
  const secici = h('div', { class: 'avatar-secici', role: 'radiogroup', 'aria-label': 'Takımyıldız biçimin' }, AVATAR_BICIM.map((b, i) => h('button', { class: 'avatar-sec' + (i === bicim ? ' secili' : ''), role: 'radio', 'aria-checked': String(i === bicim),
    onclick: () => yap(() => api(`/v2/sessions/${S.sid}/profile`, 'PATCH', { avatar: i }), `Avatarın artık ${b.ad}`) }, h('span', { class: 'ic' }, avatarCiz(i, { yanik: 1, boyut: 44, etiket: b.ad }), h('span', {}, b.ad)))));
  return [
    h('div', { class: 'hero-ikili' },
      h('figure', { class: 'hero-kisi sen' }, kullaniciAvatar(v, 190),
        h('figcaption', {}, h('b', {}, v.ad), h('span', {}, `Sen · ${AVATAR_BICIM[bicim].ad}`), h('span', {}, `${senYildiz}/${toplam} yıldız yaktın · seri ${seri} gün`))),
      h('div', { class: 'hero-bag', 'aria-hidden': 'true' }, h('span', { class: 'bag-cizgi', style: '--oran:.6' }), h('span', { class: 'kucuk sis2' }, 'her konuya bir ikiz')),
      h('div', { class: 'hero-ikizler' }, v.alanlar.map((a, i) => h('button', { class: 'hero-ikiz', style: `--ikiz:${a.ikiz_kimlik?.renk || '#8ea2ff'}`, title: `${ikizAdi(a)}: ${a.konu}`,
        onclick: () => { S.alan = i; sekmeGit('ikiz'); } }, h('span', { class: 'ic' }, ikizAvatar(v, a, 96),
          h('b', {}, ikizAdi(a)), h('span', { class: 'kucuk sis' }, a.konu),
          h('span', { class: 'kucuk' }, a.hazir ? `${a.ikiz.ogretilen}/${a.ikiz.kavram_sayisi} kavram · %${a.ikiz.bilgi_yuzde}` : 'doğuyor…')))))),
    h('div', { class: 'hero-alt' }, h('span', { class: 'kucuk sis' }, 'Avatarın sensin. İkizlerin seninkinin aynadaki hali; her biri yalnızca kendi konusunda öğrettiklerini bilir.'), secici),
  ];
}

/* ---------- Profil ---------- */
function profilPano() {
  const el = h('div', {});
  let kuruldu = false;
  const ad = h('input', { class: 'girdi', id: 'pr-ad', maxlength: 40 });
  const not_ = h('textarea', { class: 'girdi', id: 'pr-not', maxlength: 200 });
  const tarih = h('input', { class: 'girdi', id: 'pr-tarih', type: 'date' });
  const sure = h('input', { class: 'girdi', id: 'pr-sure', type: 'number', min: 7, max: 90, style: 'width:120px' });
  const hata = h('div', { class: 'hata-kutu', role: 'alert', hidden: true });
  const sec = (ad_, deger, etiket) => h('label', { class: 'secenek' }, h('input', { type: 'radio', name: ad_, value: deger }), h('span', {}, etiket));
  const grupDk = h('div', { class: 'secenekler' }, [15, 30, 45, 60, 90].map((d) => sec('pr-dk', String(d), `${d} dk`)));
  const grupZaman = h('div', { class: 'secenekler' }, sec('pr-zaman', 'sabah', 'Sabah'), sec('pr-zaman', 'ogle', 'Öğlen'), sec('pr-zaman', 'aksam', 'Akşam'));
  const grupSeviye = h('div', { class: 'secenekler' }, sec('pr-seviye', 'baslangic', 'Yeni başlıyorum'), sec('pr-seviye', 'orta', 'Biraz biliyorum'), sec('pr-seviye', 'ileri', 'İyi biliyorum'));
  const grupSure = h('div', { class: 'secenekler' });
  const deger = (n) => el.querySelector(`input[name=${n}]:checked`)?.value;
  const kaydet = h('button', { class: 'dugme', type: 'submit' }, 'Değişiklikleri kaydet');
  const yeniKonu = h('input', { class: 'girdi', id: 'pr-yeni', maxlength: 80, placeholder: 'Örn. İspanyolca, Olasılık, Fotoğrafçılık' });
  const yeniTur = h('select', { class: 'girdi', id: 'pr-tur', style: 'width:auto' }, h('option', { value: 'akademik' }, 'Akademik'), h('option', { value: 'hobi' }, 'Hobi'));
  const doldur = (v) => {
    const p = v.profil;
    ad.value = p.ad; not_.value = p.not || ''; sure.value = p.sure; tarih.value = p.son_tarihler[0]?.tarih || '';
    grupSure.replaceChildren(...v.sure_secenekleri.map((d) => h('button', { type: 'button', class: 'sekme', 'aria-pressed': String(d === p.sure), onclick: () => { sure.value = d; grupSure.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === `${d} gün`))); } }, `${d} gün`)));
    [['pr-dk', String(p.dakika)], ['pr-zaman', p.zaman], ['pr-seviye', p.seviye]].forEach(([n, d]) => { const i = el.querySelector(`input[name=${n}][value="${d}"]`); if (i) i.checked = true; });
  };
  const form = h('form', { novalidate: true, onsubmit: async (e) => {
    e.preventDefault(); hata.hidden = true;
    const p = S.view.profil;
    const govde = {};
    if (ad.value.trim() && ad.value.trim() !== p.ad) govde.ad = ad.value.trim();
    if (Number(deger('pr-dk')) !== p.dakika) govde.dakika = Number(deger('pr-dk'));
    if (deger('pr-zaman') !== p.zaman) govde.zaman = deger('pr-zaman');
    if (deger('pr-seviye') !== p.seviye) govde.seviye = deger('pr-seviye');
    if ((not_.value.trim()) !== (p.not || '')) govde.hedef_notu = not_.value.trim();
    if (Number(sure.value) !== p.sure) govde.sure = Number(sure.value);
    if ((tarih.value || '') !== (p.son_tarihler[0]?.tarih || '')) govde.son_tarihler = tarih.value ? [{ baslik: 'Sınav / teslim', tarih: tarih.value }] : [];
    if (!Object.keys(govde).length) { bildir('Değişiklik yok'); return; }
    kaydet.disabled = true;
    try { S.view = await api(`/v2/sessions/${S.sid}/profile`, 'PATCH', govde); await tazele(); doldur(S.view); bildir('Profil güncellendi; ekip planı buna göre ayarladı'); }
    catch (err) { hata.textContent = err.message; hata.hidden = false; }
    kaydet.disabled = false;
  } },
    h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'pr-ad' }, 'Adın'), ad),
    h('fieldset', { class: 'grup' }, h('legend', {}, 'Hedefine kaç günde ulaşmak istiyorsun?'), grupSure,
      h('label', { class: 'kucuk sis', for: 'pr-sure' }, 'ya da gün sayısı yaz (7–90): ', sure),
      h('p', { class: 'kucuk sis2' }, 'Süreyi değiştirirsen Haritacı kalan görevleri yeni takvime yayar; geçmiş günlerin değişmez.')),
    h('fieldset', { class: 'grup' }, h('legend', {}, 'Günde ne kadar zaman ayırabilirsin?'), grupDk),
    h('fieldset', { class: 'grup' }, h('legend', {}, 'Günün hangi saatinde?'), grupZaman),
    h('fieldset', { class: 'grup' }, h('legend', {}, 'Konuyu ne kadar biliyorsun?'), grupSeviye, h('p', { class: 'kucuk sis2' }, 'Seviyeni değiştirirsen Kaynak Avcısı kaynakları yeniden puanlar.')),
    h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'pr-tarih' }, 'Yaklaşan sınav ya da teslim'), tarih),
    h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'pr-not' }, 'Hedefin (kişisel bilgi yazma)'), not_),
    hata, h('div', {}, kaydet));
  const ekleForm = h('form', { class: 'yeni-takim', onsubmit: async (e) => {
    e.preventDefault(); const k = yeniKonu.value.trim(); if (!k) return;
    await yap(async () => { await api(`/v2/sessions/${S.sid}/tracks`, 'POST', { tur: yeniTur.value, konu: k }); yeniKonu.value = ''; }, 'Ekip yeni takımyıldızını kuruyor');
  } }, h('label', { class: 'etiket', for: 'pr-yeni' }, 'Yeni bir konu öğrenmek istiyorum'), h('div', { class: 'secenekler' }, yeniTur, yeniKonu, h('button', { class: 'dugme kucuk', type: 'submit' }, 'Takımyıldız aç')));
  const heroKap = h('section', { class: 'profil-hero' });
  el.append(heroKap, baslikSatiri('Profilin', 'Bilgilerini güncelle; ekip planını anında buna göre ayarlar.'),
    h('div', { class: 'profil-yerlesim' }, form, h('aside', { class: 'profil-yan' }, h('h3', {}, 'Takımyıldızların'), h('div', { id: 'pr-takimlar' }), ekleForm)));
  const guncelle = (v) => {
    if (!kuruldu) { doldur(v); kuruldu = true; }
    heroKap.replaceChildren(...profilHero(v));
    $('#pr-takimlar', el).replaceChildren(...v.alanlar.map((a, i) => h('button', { class: 'takim-satir', onclick: () => { S.alan = i; sekmeGit('gokyuzu'); } },
      h('span', { class: 'ic' }, h('b', {}, a.konu), h('span', { class: 'kucuk sis' }, a.hazir ? `${a.etiket} · ${a.ilerleme.sen_yildiz}/${a.ilerleme.toplam_yildiz} yıldız · ${ikizAdi(a)} %${a.ikiz.bilgi_yuzde}` : 'Ekip kuruyor…')))));
  };
  return { el, guncelle };
}

/* ---------- Veriler ve güvenlik ---------- */
function ayarPano() {
  const el = h('div', {});
  const guncelle = (v) => el.replaceChildren(
    baslikSatiri('Veriler ve güvenlik', 'Neyi sakladığımız, neyi korumaya çalıştığımız ve verini nasıl silebileceğin.'),
    h('section', { class: 'ayar-grup' }, h('h3', {}, 'Model'), h('p', { class: 'sis' }, v.demo ? 'Demo modundasın: ajanlar hazır içerikle çalışır, karar mantığı gerçektir. Gerçek modele bağlamak için README’deki .env adımlarını izle.'
      : `Planlama ve değerlendirme (Haritacı, Kutup Yıldızı, Yörüngeci, Kaşif, Hakem): ${v.modeller?.buyuk || v.model}. Sık çağrılan kısa işler (Gözlemevi, Konu Bekçisi, Rehber, İkiz, Astronom, Kaynak Avcısı, sohbet): ${v.modeller?.hizli || v.model}.${v.modeller?.gorsel ? ` Fotoğraf: ${v.modeller.gorsel}.` : ''}${v.modeller?.ses ? ` Ses: ${v.modeller.ses}.` : ''}`)),
    h('section', { class: 'ayar-grup' }, h('h3', {}, 'İkizine öğret nasıl korunuyor?'), h('ul', {},
      h('li', {}, 'Kişisel veri (kimlik, telefon, e-posta, IBAN, kart) modele ulaşmadan engellenir. Gizli karakter ve benzer harfle saklama denemeleri de yakalanır.'),
      h('li', {}, 'Talimat gibi yazılmış cümleler (“önceki kuralları unut”) ayıklanır; yazdıkların modele güvenilmez veri olarak verilir.'),
      h('li', {}, 'Konu Bekçisi, anlattığının seçtiğin konuyla ilgisini denetler; model yanıt vermezse anlatım geçmez.'),
      h('li', {}, 'İkiz boş doğar ve yalnızca senin cümlelerini bilir; cevabı cümlene dayanmıyorsa “anlatılmadı” sayılır. Hakem referans cevabı ipucunda söylemez.'),
      h('li', {}, 'Boyut ve saatlik tur sınırı vardır. Ödev yaptırma istekleri reddedilir. Kendine zarar içeren mesajlarda destek bilgisi gösterilir.'))),
    h('section', { class: 'ayar-grup' }, h('h3', {}, 'Sınırlar'), h('ul', {},
      h('li', {}, 'Kurallar ilk savunma hattıdır; üretimde bir moderasyon modeliyle desteklenmelidir.'),
      h('li', {}, 'Sesli anlatımda tarayıcının ses tanıma servisi sesini kendi sunucusunda işleyebilir.'),
      h('li', {}, 'Doğrulanmış listesi olmayan konularda kaynak bağlantısı uydurulmaz; güvenilir platformların konu sayfasına yönlendirilir.'))),
    h('section', { class: 'ayar-grup' }, h('h3', {}, 'Hesabın'),
      h('p', { class: 'sis' }, v.profil.kullanici ? `Kullanıcı adın: ${v.profil.kullanici}. Şifren sunucuda düz metin olarak değil, tuzlanmış bir özet olarak saklanır; giriş bilgisi tarayıcıda yalnızca sunucunun okuyabildiği bir çerezde durur.` : 'Bu bir demo gökyüzü; bir hesaba bağlı değil ve bir gün sonra silinir.'),
      v.profil.kullanici ? h('div', { class: 'sag-eylem' }, h('button', { class: 'dugme mercan', onclick: async () => {
        if (!confirm('Hesabın, takımyıldızların, ikizlerin ve anlattığın her şey kalıcı olarak silinecek. Emin misin?')) return;
        try { await api('/v2/auth/account', 'DELETE'); } catch (e) { bildir(e.message); return; }
        durumuSifirla(); karsilama(); bildir('Hesabın ve tüm verilerin silindi');
      } }, 'Hesabımı ve verilerimi sil')) : null));
  return { el, guncelle };
}


/* ---------- Takımyıldızların (logo) ---------- */
function takimlarPano() {
  const el = h('div', {});
  const yeniKonu = h('input', { class: 'girdi', id: 'tk-yeni', maxlength: 80, placeholder: 'Örn. İspanyolca, Olasılık' });
  const yeniTur = h('select', { class: 'girdi', id: 'tk-tur', style: 'width:auto' }, h('option', { value: 'akademik' }, 'Akademik'), h('option', { value: 'hobi' }, 'Hobi'));
  const form = h('form', { class: 'takim-buyuk yeni koru', onsubmit: async (e) => {
    e.preventDefault(); const k = yeniKonu.value.trim(); if (!k) return;
    await yap(async () => { await api(`/v2/sessions/${S.sid}/tracks`, 'POST', { tur: yeniTur.value, konu: k }); yeniKonu.value = ''; }, 'Ekip yeni takımyıldızını kuruyor');
  } }, h('h3', {}, 'Yeni takımyıldız aç'), h('p', { class: 'sis kucuk' }, 'Yeni bir konu ekle; ekip ona rota çizer, konuya özgü kaynak arar ve o konu için yeni bir ikiz doğar.'),
    h('label', { class: 'etiket', for: 'tk-yeni' }, 'Konu'), yeniKonu, yeniTur, h('button', { class: 'dugme kucuk', type: 'submit' }, 'Takımyıldız aç'));
  const liste = h('div', { class: 'takim-izgara' });
  el.append(baslikSatiri('Takımyıldızların', 'Şimdiye kadar açtığın tüm konular. Her konunun kendi ikizi var. Altın yıldızlar senin yaktıkların, ikizin yıldızları ona öğrettiklerin.'), liste);
  const guncelle = (v) => {
    liste.replaceChildren(...v.alanlar.map((a, i) => h('article', { class: 'takim-buyuk' },
      a.hazir ? h('div', { class: 'kart-gok' }, takimyildiz({ sen: a.ilerleme.sen_yildiz, rota: a.ilerleme.rota_yildiz, toplam: a.ilerleme.toplam_yildiz, w: 520, h: 230 })) : h('div', { class: 'kuruluyor' }, yaziyor()),
      h('div', { class: 'takim-buyuk-bas' }, h('div', {}, h('h3', {}, a.konu), h('p', { class: 'kucuk sis' }, `${a.etiket}${a.hazir ? ` · ${a.ilerleme.gun + 1}. gün / ${a.hedef.sure}` : ''}`)),
        a.hazir ? h('b', { class: 'ikiz-yuzde', title: 'İkizinin bilgisi' }, `%${a.ikiz.bilgi_yuzde}`) : null),
      a.hazir ? h('div', { class: 'kart-ikiz-satir', style: `--ikiz:${a.ikiz_kimlik?.renk || '#8ea2ff'}` }, h('div', { class: 'kart-ikiz-kim' }, ikizAvatar(S.view, a, 64), h('b', {}, ikizAdi(a)), h('span', { class: 'kucuk sis' }, 'bu konunun ikizi')),
        h('div', { class: 'kart-ikiz' }, ikizGogu(a.ikiz.yildizlar.filter((y) => !y.id.startsWith('serbest-')), 520, 120, false))) : null,
      a.hazir ? h('p', { class: 'kucuk sis' }, `${a.ilerleme.sen_yildiz}/${a.ilerleme.toplam_yildiz} yıldız · ${a.ilerleme.fark > 0 ? `rotanın ${a.ilerleme.fark} yıldız gerisinde` : 'rotada'} · ikizine ${a.ikiz.ogretilen}/${a.ikiz.kavram_sayisi} kavram öğrettin`) : h('p', { class: 'kucuk sis' }, 'Ekip kuruyor…'),
      a.hazir ? h('div', { class: 'sag-eylem' }, dugme('Gökyüzünde aç', () => { S.alan = i; sekmeGit('gokyuzu'); }, 'kucuk'), dugme('İkizine öğret', () => ogretAc(a.alan), 'ince kucuk')) : null)),
      form);
  };
  return { el, guncelle };
}

/* ---------- Çıkış ---------- */
function durumuSifirla() {
  clearTimeout(S.zamanlayici);
  Object.assign(S, { kullanici: null, sid: null, view: null, olaylar: [], son: 0, panolar: {}, aktifPano: null, sekme: 'gokyuzu', alan: 0 });
}
async function cikis() {
  const k = S.kullanici;
  try { await api('/v2/auth/logout', 'POST'); } catch { /* çerez zaten geçersiz olabilir */ }
  durumuSifirla();
  karsilama('giris', k || '');
  bildir('Çıkış yaptın. Gökyüzün hesabında seni bekliyor.');
}

/* ---------- Canlı demo: öğretme akışını kendi kendine oynatır (gerçek API çağrılarıyla) ---------- */
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
function demoSeridi() {
  let el = $('#demo-serit');
  if (!el) { el = h('div', { id: 'demo-serit', role: 'status', 'aria-live': 'polite' }); document.body.append(el); }
  return el;
}
function demoAnlat(adim, toplam, metin, ...eylem) {
  const el = demoSeridi();
  el.replaceChildren(h('div', { class: 'demo-ilerleme' }, h('i', { style: `width:${Math.round((adim / toplam) * 100)}%` })),
    h('div', { class: 'demo-ic' }, h('span', { class: 'demo-etiket' }, `Canlı demo · ${adim}/${toplam}`), h('p', {}, metin),
      h('div', { class: 'sag-eylem' }, ...eylem, S.demoCalisiyor ? h('button', { class: 'baglanti', onclick: () => { S.demoDur = true; } }, 'Durdur') : null)));
}
async function yazarakDoldur(alan, metin) {
  alan.focus();
  const hiz = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 18;
  for (let i = 1; i <= metin.length; i++) { if (S.demoDur) throw new Error('durdu'); alan.value = metin.slice(0, i); if (hiz) await bekle(hiz); }
}
const butonBul = (metin, kok = document) => [...kok.querySelectorAll('button')].find((b) => b.textContent.trim() === metin && !b.disabled);
async function tikla(metin) { const b = butonBul(metin); if (!b) throw new Error(`Düğme bulunamadı: ${metin}`); b.classList.add('demo-vurgu'); await bekle(500); b.click(); await bekle(300); }
async function sonucBekle(kosul, sure = 15000) { const t0 = Date.now(); while (Date.now() - t0 < sure) { if (S.demoDur) throw new Error('durdu'); await tazele(); S.aktifPano?.guncelle(S.view); if (kosul(S.view)) return; await bekle(400); } }

async function canliDemo() {
  if (S.demoCalisiyor) return;
  S.demoCalisiyor = true; S.demoDur = false; S.demo = true;
  const N = 9, kendiSid = S.kullanici ? S.sid : null;
  const geriDon = async () => { $('#demo-serit')?.remove(); if (!kendiSid) { location.reload(); return; } S.sid = kendiSid; S.olaylar = []; S.son = 0; S.view = null; S.panolar = {}; await devam(); };
  try {
    demoAnlat(1, N, 'Demo için Elif adında yeni bir öğrenci oluşturuyoruz: Veri Yapıları, 14 gün, günde 30 dakika. Ekip şimdi kuruluyor.');
    const r = await api('/v2/sessions', 'POST', { ad: 'Elif', akademik: 'Veri Yapıları', hobi: null, dakika: 30, zaman: 'aksam', seviye: 'baslangic', sure: 14, son_tarihler: [], misafir: true });
    S.sid = r.session_id; S.olaylar = []; S.son = 0; S.view = null; S.alan = 0; S.sekme = 'gokyuzu';
    kurulum();
    await sonucBekle((v) => v?.durum === 'hazir' && v.alanlar.every((a) => a.hazir), 30000);
    await bekle(1500);
    if (S.ekran !== 'uygulama') uygulama();
    demoAnlat(2, N, 'Rota çizildi, kaynak seçildi. Şimdi 3 günü planı aksatmadan geçiriyoruz; ilk “anlat” kavramı açılıyor.');
    await api(`/v2/sessions/${S.sid}/demo/skip`, 'POST', { gun: 3, tutarlilik: 1 });
    await sonucBekle((v) => v.durum === 'hazir' && v.alanlar[0].ikiz.siradaki);
    await bekle(1200);
    const kavram = S.view.alanlar[0].ikiz.siradaki;
    await api(`/v2/sessions/${S.sid}/teach/select`, 'POST', { alan: S.view.alanlar[0].alan, kavram: kavram.id });
    S.ogretGorev = kavram.id; await tazele(); sekmeGit('ogret');
    demoAnlat(3, N, `İkizin boş doğdu. Ona “${kavram.baslik}” kavramını anlatıyoruz. İlk cümle doğru.`);
    const alan = () => $('#og-metin');
    await yazarakDoldur(alan(), 'Bağlı listede her düğüm bir sonraki düğümü işaret eder.');
    await tikla('Cümleleri ekle'); await sonucBekle((v) => v.ogret.cumleler.length === 1);
    demoAnlat(4, N, 'İkinci cümlede bilerek bir hata yapıyoruz: bağlı listede indeksle doğrudan erişim yoktur.');
    await yazarakDoldur(alan(), 'Bağlı listede elemana indeksle doğrudan ulaşılır.');
    await tikla('Cümleleri ekle'); await sonucBekle((v) => v.ogret.cumleler.length === 2);
    demoAnlat(5, N, 'İkizi sınava sokuyoruz. Kaşif soruları hazırlar, İkiz yalnızca bu iki cümleyle cevap verir, Hakem bağımsız değerlendirir.');
    await tikla('İkizini sınava sok'); await sonucBekle((v) => v.ogret.son);
    await bekle(800);
    demoAnlat(6, N, `Hakem hatalı cümleyi işaretledi ve seni doğru kaynağa yönlendirdi: ${S.view.ogret.son.geri_bildirim?.yonlendirme?.[0]?.baslik || 'kaynak bölümü'}. Şimdi “Düzelt”e basıp cümleyi düzeltiyoruz.`);
    await bekle(3500);
    const duzeltBtn = $('.duzelt-satir button'); if (duzeltBtn) { duzeltBtn.classList.add('demo-vurgu'); await bekle(600); duzeltBtn.click(); }
    await sonucBekle((v) => v.ogret.cumleler.length === 1);
    alan().value = '';
    await yazarakDoldur(alan(), 'Bağlı listede indeks yoktur; bir elemana ulaşmak için baştan başlayıp düğüm düğüm gezmek gerekir.');
    await tikla('Cümleleri ekle'); await sonucBekle((v) => v.ogret.cumleler.length === 2);
    demoAnlat(7, N, 'Eksik kalan soruyu da tamamlıyoruz: başa ekleme neden hızlı?');
    await yazarakDoldur(alan(), 'Başa ekleme hızlıdır çünkü kaydırma gerekmez; yeni düğüm eski başı işaret eder.');
    await tikla('Cümleleri ekle'); await sonucBekle((v) => v.ogret.cumleler.length === 3);
    await tikla('İkizini sınava sok'); await sonucBekle((v) => v.ogret.son);
    await bekle(800);
    demoAnlat(8, N, `Sonuç: ${S.view.ogret.son.score}/${S.view.ogret.son.total}. İkizin artık bu kavramı biliyor ve bildiği her şeyi senden öğrendi. İkizinin gökyüzüne bakalım.`);
    await bekle(3500); sekmeGit('ikiz'); await bekle(3500);
    sekmeGit('ekip'); await bekle(800);
    const hakem = [...document.querySelectorAll('.dugum')].find((d) => d.textContent.includes('Hakem')); if (hakem) hakem.click();
    S.demoCalisiyor = false;
    demoAnlat(9, N, 'Ekip sayfasında her ajanın bu süreçte ne yaptığını görebilirsin. Hakem’in çıktısı açık: düzeltilecek cümle ve doğru kaynak orada. Demo bitti; artık kendin dene.',
      dugme(kendiSid ? 'Kendi gökyüzüme dön' : 'Kayıt ol ve başla', geriDon, 'kucuk'));
  } catch (e) {
    S.demoCalisiyor = false;
    demoAnlat(0, N, e.message === 'durdu' ? 'Demo durduruldu.' : `Demo bir adımda durdu: ${e.message}`,
      dugme(kendiSid ? 'Kendi gökyüzüme dön' : 'Ana sayfaya dön', geriDon, 'kucuk'));
  } finally { S.demoCalisiyor = false; S.demo = false; }
}

/* ---------- başlangıç: giriş yapmış kullanıcı doğrudan gökyüzüne girer ---------- */
async function baslat() {
  goster('yukleniyor', h('div', { class: 'sayfa yukleniyor' }, h('div', { class: 'yukleniyor-ic' }, SVG_YILDIZ(), h('p', { class: 'sis' }, 'Gökyüzün açılıyor…'))));
  let ben = { kullanici: null, session_id: null };
  try { ben = await api('/v2/auth/me'); } catch { /* sunucu kapalıysa karşılama hatayı gösterir */ }
  S.kullanici = ben.kullanici; S.sid = ben.session_id;
  if (!S.kullanici) karsilama();
  else if (!S.sid) profil();
  else devam();
}
arkaplan($('#gok'));
baslat();
