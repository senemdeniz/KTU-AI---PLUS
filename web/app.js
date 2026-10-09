import { arkaplan, takimyildiz, ikizGogu, ikiliAnimasyon, egri, svg } from './sky.js';

const _rc = Element.prototype.replaceChildren;
Element.prototype.replaceChildren = function (...k) { return _rc.apply(this, k.flat().filter((x) => x != null && x !== false)); };

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
const depo = {
  oku: () => { try { return localStorage.getItem('ikiz.sid'); } catch { return null; } },
  yaz: (v) => { try { v ? localStorage.setItem('ikiz.sid', v) : localStorage.removeItem('ikiz.sid'); } catch { /* özel pencere */ } },
};
let toastT;
const bildir = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('goster'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('goster'), 3400); };

async function api(yol, yontem = 'GET', govde) {
  let r;
  try { r = await fetch(yol, { method: yontem, headers: govde ? { 'Content-Type': 'application/json' } : undefined, body: govde ? JSON.stringify(govde) : undefined }); }
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
const S = { sid: null, view: null, olaylar: [], son: 0, ekran: 'karsilama', sekme: 'gokyuzu', alan: 0, zamanlayici: null, ses: false, mesgul: false };
const kok = () => $('#ana');
const goster = (ekran, ...icerik) => { S.ekran = ekran; kok().replaceChildren(...icerik); scrollTo(0, 0); kok().focus({ preventScroll: true }); };

async function tazele() {
  if (!S.sid) return;
  try {
    const [v, o] = await Promise.all([api(`/v2/sessions/${S.sid}`), api(`/v2/sessions/${S.sid}/events?after=${S.son}`)]);
    S.view = v;
    if (o.olaylar.length) { S.son = o.olaylar.at(-1).id; S.olaylar.push(...o.olaylar); S.yeniOlay = true; }
    return true;
  } catch (e) {
    if (/bulunamad/.test(e.message)) { depo.yaz(null); S.sid = null; location.reload(); }
    return false;
  }
}
const SVG_YILDIZ = () => svg('svg', { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true' }, svg('path', { d: 'M12 2C13 9 15 11 22 12C15 13 13 15 12 22C11 15 9 13 2 12C9 11 11 9 12 2Z', fill: '#f5d78e' }));
const marka = () => h('span', { class: 'marka' }, SVG_YILDIZ(), 'İkiz');

/* ---------- 0 · karşılama ---------- */
function karsilama() {
  const kap = h('div', { class: 'ikili' });
  const sayfa = h('div', { class: 'sayfa' },
    h('header', { class: 'ust' }, marka(), h('span', { class: 'rozet', id: 'model-rozet' }, h('i'), 'Bağlanıyor…')),
    h('section', { class: 'karsilama' },
      h('div', {},
        h('h1', {}, 'Gökyüzünde yalnız değilsin.'),
        h('p', { class: 'alt' }, 'Ne öğrenmek istediğini yaz. Bir ajan ekibi sana rota çizer, kaynak bulur ve ilerlemeni izler. Öğrendiğini ikizine anlatırsın; ikizin yalnızca senin öğrettiklerinle büyür.'),
        h('div', { class: 'eylem' },
          h('button', { class: 'dugme', onclick: profil }, 'İkizini oluştur'),
          S.sid ? h('button', { class: 'dugme ince', onclick: devam }, 'Gökyüzüme dön') : null),
        h('div', { class: 'ipucu-satiri' },
          h('span', {}, h('i', { class: 'nokta-altin' }), 'Sen: bitirdiğin her görev bir yıldız'),
          h('span', {}, h('i', { class: 'nokta-rota' }), 'Rota: planı aksatmasaydın olacağın yer'),
          h('span', {}, h('i', { class: 'nokta-mavi' }), 'İkizin: yalnızca ona öğrettiklerini bilir'))),
      kap));
  goster('karsilama', sayfa);
  if (S.sid) {
    tazele().then((ok) => {
      if (!ok || !S.view || S.ekran !== 'karsilama') { ikiliAnimasyon(kap); return; }
      kap.replaceChildren(h('div', { class: 'donus' }, h('p', { class: 'sis' }, `${S.view.ad}, gökyüzün seni bekliyor`),
        ...S.view.alanlar.filter((a) => a.hazir).map((a) => h('div', { class: 'donus-kart' }, takimyildiz({ sen: a.ilerleme.sen_yildiz, rota: a.ilerleme.rota_yildiz, toplam: a.ilerleme.toplam_yildiz, w: 420, h: 170, etiket: false }),
          h('b', {}, a.konu), h('span', { class: 'kucuk sis' }, `${a.ilerleme.sen_yildiz}/${a.ilerleme.toplam_yildiz} yıldız · ikizin %${a.ikiz.bilgi_yuzde}`)))));
    });
  } else ikiliAnimasyon(kap);
  api('/health').then((d) => {
    const r = $('#model-rozet'); if (!r) return;
    r.classList.toggle('canli', !d.demo);
    r.replaceChildren(h('i'), d.demo ? 'Demo modu: ajanlar hazır içerikle çalışır' : `Canlı model: ${d.model}`);
  }).catch(() => { const r = $('#model-rozet'); if (r) r.replaceChildren(h('i'), 'Sunucuya ulaşılamıyor'); });
}

/* ---------- 1 · profil ---------- */
const ORNEKLER = [['Veri Yapıları', 'akademik'], ['Kalkülüs I · Türev', 'akademik'], ['Gitar', 'hobi'], ['İspanyolca', 'hobi']];
function profil() {
  const sec = (ad, deger, etiket, secili) => h('label', { class: 'secenek' }, h('input', { type: 'radio', name: ad, value: deger, checked: secili }), h('span', {}, etiket));
  const ad = h('input', { class: 'girdi', id: 'p-ad', autocomplete: 'given-name', maxlength: 40, required: true, placeholder: 'Adın', value: 'Elif' });
  const konu = h('input', { class: 'girdi', id: 'p-konu', maxlength: 80, required: true, placeholder: 'Örn. Veri Yapıları', autocomplete: 'off' });
  const tarih = h('input', { class: 'girdi', id: 'p-tarih', type: 'date' });
  const not_ = h('textarea', { class: 'girdi', id: 'p-not', maxlength: 200, placeholder: 'Örn. Staj mülakatlarına hazırlanıyorum. (Ad, telefon, e-posta gibi kişisel bilgi yazma.)' });
  const onay = h('input', { type: 'checkbox', id: 'p-onay', required: true });
  const hata = h('div', { class: 'hata-kutu', role: 'alert', hidden: true });
  const dugme = h('button', { class: 'dugme', type: 'submit' }, 'İkizimi oluştur');
  const prev = h('div', { class: 'ikili' });
  const ozet = h('div', { class: 'onizleme' });
  const secimi = (n) => document.querySelector(`input[name=${n}]:checked`)?.value;
  const guncelle = () => {
    const doldu = [ad.value, konu.value, secimi('seviye'), secimi('dk'), secimi('alan'), secimi('sure')].filter(Boolean).length;
    prev.replaceChildren(takimyildiz({ sen: doldu, rota: Math.min(doldu + 4, 18), toplam: 18, w: 420, h: 420, etiket: false }));
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
        dakika: Number(secimi('dk')), zaman: secimi('zaman'), seviye: secimi('seviye'), hedef_notu: not_.value.trim(), sure: Number(secimi('sure')),
        son_tarihler: alan === 'akademik' && tarih.value ? [{ baslik: 'Sınav / teslim', tarih: tarih.value }] : [],
      });
      S.sid = r.session_id; depo.yaz(S.sid); S.olaylar = []; S.son = 0; S.view = null; kurulum();
    } catch (err) { hata.textContent = err.message; hata.hidden = false; dugme.disabled = false; dugme.textContent = 'İkizimi oluştur'; }
  } },
    h('div', { class: 'grup' }, h('label', { class: 'etiket', for: 'p-ad' }, 'Sana nasıl seslenelim?'), ad),
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
    h('header', { class: 'ust' }, marka(), h('button', { class: 'baglanti', onclick: karsilama }, 'Geri')),
    h('section', { class: 'profil' },
      h('div', {}, h('h2', {}, 'Önce seni tanıyalım.'), h('p', { class: 'sis' }, 'Bu bilgiler yol haritanı ve ikizini kurar. Birkaç tıkla bitiyor.'), form),
      h('aside', {}, prev, ozet))));
  form.addEventListener('input', guncelle); form.addEventListener('change', guncelle);
  guncelle(); konu.focus();
}

/* ---------- 2 · ikizin oluşuyor ---------- */
const KURULUM = [['Astronom', 'Seni okuyor', 'Konunu, seviyeni ve zamanını anlıyor.'], ['Kutup Yıldızı', 'Hedefini seçiyor', 'Adayları puanlayıp en ideal tekini seçiyor.'],
  ['Haritacı', 'Yol haritasını çiziyor', '21 günlük planı kolaydan zora yerleştiriyor.'], ['Kaynak Avcısı', 'Kaynakları tarıyor', 'Sana en uygun tek kaynağı gerekçesiyle seçiyor.'],
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
    const yildiz = hazir ? 21 : Math.min(21, Math.round((Math.max(idx + 1, 0) / KURULUM.length) * 21));
    gok.replaceChildren(takimyildiz({ sen: 0, rota: yildiz, toplam: 21, w: 640, h: 400 }));
    akis.replaceChildren(...S.olaylar.slice(-6).map((o, i, a) => balon(o, i === a.length - 1)), ...(hazir ? [] : [yaziyor()]));
    akis.scrollTop = akis.scrollHeight;
    durum.textContent = hazir ? 'Hazır. Gökyüzün çizildi.' : sonAjan ? `${sonAjan} çalışıyor…` : 'Ekip toplanıyor…';
    if (hazir && !gecti) { gecti = true; setTimeout(tanitim, 1500); }
  };
  clearInterval(S.zamanlayici);
  const dongu = async () => { if (S.ekran !== 'kurulum') return; await tazele(); if (S.ekran === 'kurulum') ciz(); if (!gecti) setTimeout(dongu, 700); };
  dongu();
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
};
const SEKMELER = [['gokyuzu', 'Gökyüzü'], ['harita', 'Yol haritası'], ['bugun', 'Bugün'], ['ekip', 'Ekip'], ['ikiz', 'İkizin'], ['ogret', 'İkizine öğret'], ['profil', 'Profil']];
const ikonSvg = (k) => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, svg('path', { d: IKON[k] }));
const alanAdi = (a) => (a.alan.startsWith('akademik') ? 'Akademik' : 'Hobi');
const aktifAlan = () => S.view?.alanlar[Math.min(S.alan, S.view.alanlar.length - 1)];
const mevcutGun = (v) => v.gun;

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
    h('aside', { class: 'yan' }, marka(), h('nav', { 'aria-label': 'Ana gezinme' }, navDugmeleri(false)),
      h('div', { class: 'alt' }, h('span', { class: 'rozet', id: 'model-rozet' }, h('i'), '…'),
        h('button', { class: 'nav-dugme', dataset: { sekme: 'ayarlar' }, onclick: () => sekmeGit('ayarlar') }, ikonSvg('ayarlar'), 'Veriler ve güvenlik'))),
    ana, h('nav', { class: 'mobil-nav', 'aria-label': 'Ana gezinme' }, navDugmeleri(true)));
  goster('uygulama', kabuk);
  api('/health').then((d) => { const r = $('#model-rozet'); if (r) { r.classList.toggle('canli', !d.demo); r.replaceChildren(h('i'), d.demo ? 'Demo modu' : `Canlı: ${d.model}`); } }).catch(() => {});
  S.panolar = {}; S.aktifPano = null;
  sekmeGit(S.sekme || 'gokyuzu');
  const dongu = async () => {
    if (S.ekran !== 'uygulama') return;
    const eski = S.son;
    if (await tazele()) { rozetler(); S.aktifPano?.guncelle(S.view); S.yeniOlay = false; }
    S.zamanlayici = setTimeout(dongu, S.view?.durum === 'hazir' ? 2600 : 900);
  };
  S.zamanlayici = setTimeout(dongu, 900);
}

const PANOLAR = () => ({ gokyuzu: gokyuzuPano, harita: haritaPano, bugun: bugunPano, ekip: ekipPano, ikiz: ikizPano, ogret: ogretPano, profil: profilPano, ayarlar: ayarPano });
function sekmeGit(k) {
  S.sekme = k;
  document.querySelectorAll('[data-sekme]').forEach((b) => (b.dataset.sekme === k ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  S.panolar[k] ??= PANOLAR()[k]();
  S.aktifPano = S.panolar[k];
  $('#sekme-ana').replaceChildren(S.aktifPano.el);
  S.aktifPano.guncelle(S.view);
  scrollTo(0, 0);
}
function rozetler() {
  const v = S.view; if (!v) return;
  const say = { ekip: v.oneriler.length, bugun: v.bugun.filter((t) => !t.done).length };
  document.querySelectorAll('[data-sayac]').forEach((e) => { const n = say[e.dataset.sayac] || 0; e.hidden = !n; e.textContent = n; });
}
const baslikSatiri = (b, alt, ...eylem) => h('div', { class: 'baslik-satiri' }, h('div', {}, h('h2', {}, b), alt ? h('p', { class: 'sis', style: 'margin-top:8px' }, alt) : null), h('div', { class: 'sag-eylem' }, eylem));
const dugme = (t, f, sinif = '') => h('button', { class: `dugme ${sinif}`.trim(), onclick: f }, t);
async function yap(f, basari) { if (S.mesgul) return; S.mesgul = true; try { const r = await f(); if (basari) bildir(basari); await tazele(); rozetler(); S.aktifPano?.guncelle(S.view); return r; } catch (e) { bildir(e.message); } finally { S.mesgul = false; } }

/* ---------- Gökyüzü ---------- */
function ikizOzeti(a, kompakt = false) {
  const ik = a.ikiz;
  const sira = ik.siradaki;
  return h('section', { class: 'ikiz-ozet' + (kompakt ? ' kompakt' : '') },
    h('div', { class: 'ikiz-ozet-bas' },
      h('div', {}, h('h3', {}, 'İkizin'), h('p', { class: 'sis kucuk' }, ik.ogretilen
        ? `${ik.kavram_sayisi} kavramdan ${ik.ogretilen} tanesini ona öğrettin. Bildiği her şeyi senden öğrendi.`
        : 'Henüz hiçbir şey bilmiyor. İlk kavramı ona sen öğreteceksin.')),
      h('b', { class: 'ikiz-yuzde' }, `%${ik.bilgi_yuzde}`)),
    h('div', { class: 'ikiz-gok' }, ikizGogu(ik.yildizlar.filter((y) => !y.id.startsWith('serbest-')), 760, 200)),
    sira ? h('div', { class: 'sag-eylem' }, dugme(`Öğret: ${sira.baslik}`, () => { S.ogretGorev = sira.id; sekmeGit('ogret'); }, 'kucuk')) : null);
}
function takimyildizlarim(v, yenile) {
  return h('section', { class: 'takimlar', 'aria-label': 'Takımyıldızların' },
    h('div', { class: 'takimlar-bas' }, h('h3', {}, 'Takımyıldızların'), h('button', { class: 'baglanti', onclick: () => sekmeGit('profil') }, 'Yeni takımyıldız aç')),
    h('div', { class: 'takimlar-satir' }, v.alanlar.map((a, i) => h('button', { class: 'takim-kart' + (i === S.alan ? ' secili' : ''), 'aria-pressed': String(i === S.alan), onclick: () => { S.alan = i; yenile(); } },
      a.hazir ? takimyildiz({ sen: a.ilerleme.sen_yildiz, rota: a.ilerleme.rota_yildiz, toplam: a.ilerleme.toplam_yildiz, w: 320, h: 150, etiket: false }) : h('div', { class: 'kuruluyor' }, yaziyor()),
      h('b', {}, a.konu),
      h('span', { class: 'kucuk sis' }, a.hazir ? `${a.ilerleme.sen_yildiz}/${a.ilerleme.toplam_yildiz} yıldız · ikizin %${a.ikiz.bilgi_yuzde}` : 'Ekip kuruyor…')))));
}
function gokyuzuPano() {
  const el = h('div', {});
  const guncelle = (v) => {
    const a = aktifAlan(), il = a?.ilerleme;
    const oneri = v.oneriler[0];
    el.replaceChildren(
      takimyildizlarim(v, () => guncelle(S.view)),
      baslikSatiri(`${v.gun}. gün`, `Merhaba ${v.ad}. ${v.sure} günlük rotanın ${v.gun}. günündesin.`, dugme('Ekibe görev ver', () => { sekmeGit('ekip'); setTimeout(() => $('#komut-metin')?.focus(), 50); })),
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
      v.koc ? h('div', { class: 'rehber' }, avatar('Rehber'), h('div', {}, h('p', {}, v.koc.message), v.koc.ask_user ? h('p', { class: 'sis', style: 'margin-top:6px' }, v.koc.ask_user) : null,
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
function kaynakKarti(k, ana = false) {
  const etiketler = h('div', { class: 'etiketler' }, h('span', { class: 'etiket-k' }, k.tur), h('span', { class: 'etiket-k' }, ucretEtiketi(k)), h('span', { class: 'etiket-k' }, k.dil), k.puan != null ? h('span', { class: 'puan' }, `${k.puan}/100`) : null);
  const baslik = ana ? h('h3', {}, k.baslik) : h('h4', {}, k.baslik);
  const link = h('a', { class: ana ? 'dugme kucuk git' : '', href: guvenliUrl(k.url), target: '_blank', rel: 'noopener noreferrer' }, ana ? 'Bu kaynakla başla' : 'Kaynağı aç');
  return h('article', { class: ana ? 'kaynak-ana' : 'kaynak' }, etiketler, baslik, h('p', { class: ana ? '' : 'kucuk sis' }, k.gerekce), h('div', {}, link));
}
function kaynakBolumu(k) {
  if (!k) return h('p', { class: 'sis' }, 'Kaynak taraması yok.');
  if (k.kaynak_turu === 'dogrulanmis') {
    return h('div', {}, h('p', { class: 'sis' }, k.yaklasim), kaynakKarti(k.secim, true),
      k.alternatifler.length ? h('h4', { style: 'margin:26px 0 0;font-size:16px' }, 'Tamamlayıcılar') : null,
      h('div', { class: 'kaynaklar-izgara' }, k.alternatifler.map((x) => kaynakKarti(x))), h('p', { class: 'kucuk sis2', style: 'margin-top:14px' }, k.dogrulama));
  }
  if (k.kaynak_turu === 'platform') {
    return h('div', {}, h('p', { class: 'sis' }, k.yaklasim),
      h('div', { class: 'kaynaklar-izgara' }, k.platformlar.map((p) => h('article', { class: 'kaynak' }, h('h4', {}, p.ad), h('p', { class: 'kucuk sis' }, p.neden),
        h('a', { href: guvenliUrl(p.url), target: '_blank', rel: 'noopener noreferrer' }, 'Konu sayfasına git')))),
      k.model_onerileri?.length ? h('div', { style: 'margin-top:16px' }, h('h4', { style: 'margin:0 0 6px;font-size:16px' }, 'Kaynak Avcısı’nın aklına gelenler (bağlantısız, doğrulanmadı)'),
        h('ul', { class: 'sis' }, k.model_onerileri.map((o) => h('li', {}, `${o.baslik}: ${o.neden}`)))) : null,
      h('p', { class: 'kucuk sis2', style: 'margin-top:14px' }, k.dogrulama));
  }
  return h('div', {}, h('p', { class: 'sis' }, k.yaklasim));
}
const bolumLinkleri = (bolum) => (bolum?.length ? h('span', { class: 'bolum-link' }, bolum.map((b) => h('a', { href: guvenliUrl(b.url), target: '_blank', rel: 'noopener noreferrer' }, b.baslik))) : null);
function haritaPano() {
  const el = h('div', {});
  const guncelle = (v) => {
    const a = aktifAlan(); if (!a?.hazir) { el.replaceChildren(h('p', { class: 'sis' }, 'Harita hazırlanıyor…')); return; }
    const bugun = a.ilerleme.gun + 1;
    const bolumBy = Object.fromEntries((a.ikiz?.yildizlar || []).map((y) => [y.id, y.bolum]));
    el.replaceChildren(
      baslikSatiri('Yol haritan', a.hedef.secilen, dugme('Kaynakları yeniden tara', () => yap(() => api(`/v2/sessions/${S.sid}/assign`, 'POST', { metin: 'Kaynak öner' }), 'Kaynak Avcısı yeniden tarıyor'), 'ince kucuk')),
      alanSecici(() => guncelle(S.view)),
      h('div', { class: 'hedef-satiri' },
        h('div', {}, h('p', { class: 'sis' }, a.hedef.gerekce), h('p', { class: 'kucuk sis2', style: 'margin-top:8px' }, `Başarı ölçütü: ${a.hedef.olcut} · Süre: ${a.hedef.sure} gün (Profil’den değiştirebilirsin)`)),
        h('div', { class: 'parlaklik' }, h('b', {}, `%${a.ilerleme.parlaklik}`), h('span', {}, 'Hedef parlaklığı'), h('span', { class: 'kucuk sis2' }, 'İkizinin başarısı kadar parlar'))),
      h('section', { class: 'bolum' }, h('h3', {}, 'Önerilen kaynak'), kaynakBolumu(a.kaynaklar)),
      h('section', { class: 'bolum' }, h('h3', {}, `${a.hedef.sure} günlük plan`),
        h('div', { class: 'harita-listesi' }, a.harita.map((t) => h('div', { class: 'harita-satir' + (t.done ? ' bitti' : '') + (t.day === bugun ? ' bugun' : '') + (t.type === 'teach' ? ' anlat' : '') },
          h('span', { class: 'g' }, `${t.done ? '★' : '☆'} ${t.day}. gün`),
          h('span', { class: 't' }, t.title, t.type === 'teach' ? bolumLinkleri(bolumBy[t.id]) : null),
          h('span', { class: 'kucuk sis2' }, `${t.minutes} dk`))))));
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
  return h('section', { class: 'bolum pratik' },
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
    const hobi = v.alanlar.find((a) => a.alan.startsWith('hobi') && a.hazir);
    if (hobi && (pratikAlan !== hobi.alan || (pratikEl && (hobi.pratik || []).length !== pratikEl._sayi))) { pratikAlan = hobi.alan; pratikEl = pratikBolumu(hobi); pratikEl._sayi = (hobi.pratik || []).length; }
    const etiket = (alan) => v.alanlar.find((a) => a.alan === alan)?.konu || alan;
    el.replaceChildren(
      baslikSatiri('Bugün', `${bitti} / ${v.bugun.length} yıldız yandı.`),
      h('ul', { class: 'liste' }, v.bugun.map((t) => h('li', { class: 'gorev' + (t.done ? ' bitti' : '') },
        h('button', { class: 'tik', role: 'checkbox', 'aria-checked': String(t.done), 'aria-label': `${t.title} tamamlandı`, onclick: () => (t.type === 'teach' ? (S.alan = Math.max(0, v.alanlar.findIndex((a) => a.alan === t.alan)), sekmeGit('ogret')) : yap(() => api(`/v2/sessions/${S.sid}/tasks/${t.id}/complete?yapildi=${!t.done}`, 'POST'))) },
          svg('svg', { viewBox: '0 0 24 24' }, svg('path', { d: 'M5 12l5 5 9-10' }))),
        h('div', {}, h('div', { class: 'bas' }, t.title), h('div', { class: 'meta' }, `${etiket(t.alan)} · ${{ learn: 'Öğren', practice: 'Uygula', reflect: 'Düşün', teach: 'İkizine anlat' }[t.type]} · ${t.minutes} dk`)),
        t.type === 'teach' ? dugme('Anlat', () => { S.alan = Math.max(0, v.alanlar.findIndex((a) => a.alan === t.alan)); sekmeGit('ogret'); }, 'ince kucuk') : h('span')))),
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
function zihinHaritasi(v, aktif, sonMesaj, secili, onSec) {
  const k = konumlar();
  const kap = h('div', { class: 'zihin', role: 'group', 'aria-label': 'Ajan ekibi zihin haritası' });
  const cizgi = svg('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', class: 'zihin-cizgi', 'aria-hidden': 'true' });
  HARITA_SIRA.forEach((ad) => cizgi.append(svg('line', { x1: k['Gözlemevi'].x, y1: k['Gözlemevi'].y, x2: k[ad].x, y2: k[ad].y, class: 'kol' + (aktif === ad ? ' canli' : '') })));
  AKISLAR.forEach((grup, gi) => grup.slice(1).forEach((ad, i) => {
    const a = k[grup[i]], b = k[ad];
    cizgi.append(svg('path', { d: `M${a.x} ${a.y} Q ${(a.x + b.x) / 2 + (W / 2 - (a.x + b.x) / 2) * 0.25} ${(a.y + b.y) / 2 + (H / 2 - (a.y + b.y) / 2) * 0.25} ${b.x} ${b.y}`, class: `akis akis${gi}` + (aktif === ad || aktif === grup[i] ? ' canli' : '') }));
  }));
  kap.append(cizgi);
  const bilgi = Object.fromEntries(v.ajanlar.map((a) => [a.ad, a]));
  const sayac = {}; S.olaylar.forEach((o) => { sayac[o.ajan] = (sayac[o.ajan] || 0) + 1; });
  ['Gözlemevi', ...HARITA_SIRA].forEach((ad) => {
    const p = k[ad];
    const dugum = h('button', { class: 'dugum' + (ad === 'Gözlemevi' ? ' merkez' : '') + (aktif === ad ? ' aktif' : '') + (secili === ad ? ' secili' : ''),
      style: `left:${(p.x / W) * 100}%;top:${(p.y / H) * 100}%;--c:${ajanRenk(ad)}`, 'aria-pressed': String(secili === ad),
      title: bilgi[ad]?.rol || ad, onclick: () => onSec(ad) },
      avatar(ad, aktif === ad), h('span', { class: 'dugum-ad' }, ad), sayac[ad] ? h('span', { class: 'dugum-sayi' }, sayac[ad]) : null);
    kap.append(dugum);
    if (aktif === ad && sonMesaj) {
      kap.append(h('div', { class: 'dugum-balon', style: `left:${(p.x / W) * 100}%;top:${(p.y / H) * 100}%;--c:${ajanRenk(ad)}` }, kisa(sonMesaj, 110)));
    }
  });
  return h('div', {}, kap, h('div', { class: 'zihin-lejant' }, AKIS_ADI.map((a, i) => h('span', {}, h('i', { class: `akis-renk akis${i}` }), a)), h('span', { class: 'kucuk sis2' }, 'Bir ajana dokun: ürettiği çıktıyı gör')));
}
function indir(ad, metin) {
  const url = URL.createObjectURL(new Blob([metin], { type: 'text/markdown;charset=utf-8' }));
  const a = h('a', { href: url, download: `ikiz-${ad.toLocaleLowerCase('tr').replace(/[^a-z0-9ğüşıöç]+/g, '-')}.md` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
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
      h('div', { class: 'sag-eylem' },
        dugme('Kopyala', async () => { try { await navigator.clipboard.writeText(o.markdown); bildir('Çıktı kopyalandı'); } catch { bildir('Kopyalanamadı; İndir’i kullan'); } }, 'ince kucuk'),
        dugme('İndir (.md)', () => indir(o.ajan, o.markdown), 'ince kucuk')),
      ...(o.bolumler.length ? o.bolumler.map((b) => h('section', { class: 'cikti-bolum' }, h('h4', {}, b.baslik),
        h('ul', {}, b.satirlar.map((s) => h('li', {}, /^https:\/\//.test(s) ? h('a', { href: guvenliUrl(s), target: '_blank', rel: 'noopener noreferrer' }, s) : s)))))
        : [h('p', { class: 'sis' }, 'Bu ajan henüz bir şey üretmedi.')]));
  };
  const ciktiGetir = async (ad) => {
    secili = ad; yukleniyor = true; ciktiCiz();
    try { cikti = await api(`/v2/sessions/${S.sid}/agents/${encodeURIComponent(ad)}/output`); } catch (e) { bildir(e.message); cikti = { ajan: ad, rol: '', bolumler: [], markdown: '' }; }
    yukleniyor = false; ciktiCiz(); S.aktifPano?.guncelle(S.view);
  };
  const el = h('div', {}, baslikSatiri('Ekip', 'Ajanların ne yaptığını canlı izle; birine dokun, ürettiğini anında al.'), simdi,
    h('div', { class: 'zihin-yerlesim' }, haritaKap, ciktiKap),
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
    if (!cikti && !yukleniyor) ciktiGetir(secili);
    else if (S.olaylar.length !== ciktiSayi && S.olaylar.slice(ciktiSayi < 0 ? 0 : ciktiSayi).some((o) => o.ajan === secili)) { ciktiSayi = S.olaylar.length; ciktiGetir(secili); }
    if (ciktiSayi < 0) ciktiSayi = S.olaylar.length;
    ajanSec.replaceChildren(h('option', { value: '' }, 'Otomatik'), ...v.sohbet_ajanlari.map((a) => h('option', { value: a }, a)));
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
      akis.replaceChildren(...(calisiyor && sonOlay ? [yaziyor()] : []), ...S.olaylar.slice(-40).reverse().map((o, i) => balon(o, i === 0 && S.yeniOlay)));
    }
  };
  return { el, guncelle };
}

/* ---------- İkizin: yalnızca öğrettiklerinden oluşur ---------- */
const YILDIZ_ADI = { sonuk: 'Bilmiyor', parlak: 'Kısmen biliyor', halkali: 'Tam biliyor' };
function ikizPano() {
  const el = h('div', {});
  const guncelle = (v) => {
    const a = aktifAlan(), ik = a?.ikiz; if (!ik) { el.replaceChildren(h('p', { class: 'sis' }, 'İkizin doğuyor…')); return; }
    el.replaceChildren(
      baslikSatiri('İkizin', 'İkizin boş doğdu ve yalnızca senin öğrettiklerini bilir. Senden önde olamaz; sen öğrettikçe büyür. İkizin bir yapay zekâ karakteridir.'),
      alanSecici(() => guncelle(S.view)),
      h('div', { class: 'ikiz-gok' }, ikizGogu(ik.yildizlar, 760, 230)),
      h('div', { class: 'lejant' }, h('span', {}, h('i', { class: 'nokta-sonuk' }), 'Henüz öğretmedin'), h('span', {}, h('i', { class: 'nokta-mavi-dolu' }), 'Kısmen biliyor'), h('span', {}, h('i', { class: 'nokta-halkali' }), 'Tam biliyor')),
      h('div', { class: 'rakamlar', style: 'margin-top:26px;max-width:560px' },
        h('div', { class: 'rakam' }, h('span', {}, 'Öğrettiğin kavram'), h('b', {}, `${ik.ogretilen} / ${ik.kavram_sayisi}`)),
        h('div', { class: 'rakam' }, h('span', {}, 'Tam bildiği'), h('b', {}, `${ik.halkali}`)),
        h('div', { class: 'rakam' }, h('span', {}, 'Bilgisi'), h('b', {}, `%${ik.bilgi_yuzde}`))),
      h('section', { class: 'bolum' }, h('h3', {}, 'Ona ne öğrettin?'),
        h('ul', { class: 'liste' }, ik.yildizlar.map((y) => h('li', { class: 'gorev' + (y.acik ? '' : ' kilitli') },
          h('span', { class: `ikiz-nokta ${y.star}` }),
          h('div', {}, h('div', { class: 'bas' }, y.baslik), h('div', { class: 'meta' }, y.acik ? `${YILDIZ_ADI[y.star]}${y.total ? ` · son sınav ${y.score}/${y.total}` : ''}` : `${y.gun}. günde açılır`)),
          y.acik ? dugme(y.star === 'sonuk' ? 'Öğret' : 'Yeniden öğret', () => { S.ogretGorev = y.id.startsWith('serbest-') ? null : y.id; sekmeGit('ogret'); }, y.star === 'sonuk' ? 'kucuk' : 'ince kucuk') : h('span'))))));
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
  } }, h('i', { class: 'kayit' }), 'Sesle anlat') : h('p', { class: 'kucuk sis2' }, 'Sesle anlatma Chrome ve Safari’de çalışır.');
  const ekleBtn = dugme('Cümleleri ekle', async () => {
    const m = metin.value.trim(); if (!m) return; uyari.hidden = true;
    await yap(async () => {
      const r = await api(`/v2/sessions/${S.sid}/teach/add`, 'POST', { metin: m, alan: aktifAlan().alan });
      if (r.ok) { metin.value = ''; if (r.uyarilar?.length) { uyari.textContent = r.uyarilar.map((u) => u.mesaj).join(' '); uyari.hidden = false; } else bildir('İkizin yeni cümleleri öğrendi'); }
      else { uyari.textContent = (r.engel === 'konu_disi' ? 'Konu Bekçisi: ' : '') + r.mesaj; uyari.hidden = false; }
    });
  }, 'ince');
  const kavramSec = h('select', { class: 'girdi', id: 'og-kavram', style: 'width:auto;min-width:240px' });
  kavramSec.addEventListener('change', () => { S.ogretGorev = kavramSec.value || null; S.aktifPano?.guncelle(S.view); });
  const sinavBtn = dugme('İkizini sınava sok', async () => {
    sinavBtn.disabled = true; sinavBtn.textContent = 'İkiz sınavda…';
    await yap(async () => { const r = await api(`/v2/sessions/${S.sid}/teach/exam`, 'POST', { gorev_id: kavramSec.value || null }); if (!r.ok) { uyari.textContent = r.mesaj; uyari.hidden = false; } });
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
        h('div', { class: 'sag-eylem' }, sesBtn, ekleBtn, sinavBtn)),
      sonucKap));
  const guncelle = (v) => {
    const a = aktifAlan(); const og = v.ogret; const bu = og.alan === a.alan;
    const konu = bu ? og.konu : a.konu.split('·').pop().trim();
    baslikKap.replaceChildren(baslikSatiri('İkizine öğret', `Konu: ${konu}. İkizin yalnızca burada anlattıklarını bilir; doğru anlattıkça yıldızları yanar.`), alanSecici(() => guncelle(S.view)));
    const acik = (a.ikiz?.yildizlar || []).filter((y) => y.acik && !y.id.startsWith('serbest-'));
    const secili = S.ogretGorev && acik.some((y) => y.id === S.ogretGorev) ? S.ogretGorev : (a.ikiz?.siradaki?.id || '');
    if (document.activeElement !== kavramSec) {
      kavramSec.replaceChildren(...acik.map((y) => h('option', { value: y.id, selected: y.id === secili }, `${y.gun}. gün · ${y.baslik}${y.star !== 'sonuk' ? ` (${YILDIZ_ADI[y.star].toLowerCase()})` : ''}`)),
        h('option', { value: '', selected: !secili }, 'Serbest anlatım (plan dışı)'));
    }
    const yild = acik.find((y) => y.id === (kavramSec.value || secili));
    ipucuKap.replaceChildren(
      a.alan.startsWith('hobi') ? h('p', { class: 'kucuk sis' }, BECERI_IPUCU) : null,
      yild?.bolum?.length ? h('p', { class: 'kucuk sis' }, 'Önce buradan çalış: ', bolumLinkleri(yild.bolum)) : null);
    const son = bu ? og.son : null;
    const gb = son?.geri_bildirim;
    const hatali = new Set(gb?.duzelt || []);
    const cumleler = bu ? og.cumleler : [];
    cumleKap.replaceChildren(...(cumleler.length ? [h('ol', { class: 'cumleler' }, cumleler.map((c, i) => h('li', { class: hatali.has(i + 1) ? 'hatali' : '' },
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
  el.append(baslikSatiri('Profilin', 'Bilgilerini güncelle; ekip planını anında buna göre ayarlar.'),
    h('div', { class: 'profil-yerlesim' }, form, h('aside', { class: 'profil-yan' }, h('h3', {}, 'Takımyıldızların'), h('div', { id: 'pr-takimlar' }), ekleForm)));
  const guncelle = (v) => {
    if (!kuruldu) { doldur(v); kuruldu = true; }
    $('#pr-takimlar', el).replaceChildren(...v.alanlar.map((a, i) => h('button', { class: 'takim-satir', onclick: () => { S.alan = i; sekmeGit('gokyuzu'); } },
      h('b', {}, a.konu), h('span', { class: 'kucuk sis' }, a.hazir ? `${a.etiket} · ${a.ilerleme.sen_yildiz}/${a.ilerleme.toplam_yildiz} yıldız · ikizin %${a.ikiz.bilgi_yuzde}` : 'Ekip kuruyor…'))));
  };
  return { el, guncelle };
}

/* ---------- Veriler ve güvenlik ---------- */
function ayarPano() {
  const el = h('div', {});
  const guncelle = (v) => el.replaceChildren(
    baslikSatiri('Veriler ve güvenlik', 'Neyi sakladığımız, neyi korumaya çalıştığımız ve verini nasıl silebileceğin.'),
    h('section', { class: 'ayar-grup' }, h('h3', {}, 'Model'), h('p', { class: 'sis' }, v.demo ? 'Demo modundasın: ajanlar hazır içerikle çalışır, karar mantığı gerçektir.' : `Canlı model: ${v.model}.`)),
    h('section', { class: 'ayar-grup' }, h('h3', {}, 'İkizine öğret nasıl korunuyor?'), h('ul', {},
      h('li', {}, 'Kişisel veri (kimlik, telefon, e-posta, IBAN, kart) modele ulaşmadan engellenir. Gizli karakter ve benzer harfle saklama denemeleri de yakalanır.'),
      h('li', {}, 'Talimat gibi yazılmış cümleler (“önceki kuralları unut”) ayıklanır; yazdıkların modele güvenilmez veri olarak verilir.'),
      h('li', {}, 'Konu Bekçisi, anlattığının seçtiğin konuyla ilgisini denetler; model yanıt vermezse anlatım geçmez.'),
      h('li', {}, 'İkiz boş doğar ve yalnızca senin cümlelerini bilir; cevabı cümlene dayanmıyorsa “anlatılmadı” sayılır. Hakem referans cevabı ipucunda söylemez.'),
      h('li', {}, 'Boyut ve saatlik tur sınırı vardır. Ödev yaptırma istekleri reddedilir. Kendine zarar içeren mesajlarda destek bilgisi gösterilir.'))),
    h('section', { class: 'ayar-grup' }, h('h3', {}, 'Sınırlar'), h('ul', {},
      h('li', {}, 'Kurallar ilk savunma hattıdır; üretimde bir moderasyon modeliyle desteklenmelidir.'),
      h('li', {}, 'Sesli anlatımda tarayıcının ses tanıma servisi sesini kendi sunucusunda işleyebilir.'),
      h('li', {}, 'Doğrulanmamış konularda kaynak bağlantısı uydurulmaz; yalnızca arama bağlantısı verilir.'))),
    h('section', { class: 'ayar-grup' }, h('h3', {}, 'Verilerim'), h('p', { class: 'sis' }, 'Oturumunu, planını, ikizini ve anlattığın her şeyi sunucudan kalıcı olarak siler.'),
      h('div', { class: 'sag-eylem' }, h('button', { class: 'dugme mercan', onclick: async () => {
        if (!confirm('Tüm verilerin kalıcı olarak silinecek. Emin misin?')) return;
        try { await api(`/v2/sessions/${S.sid}`, 'DELETE'); } catch (e) { bildir(e.message); return; }
        depo.yaz(null); S.sid = null; S.view = null; S.olaylar = []; S.son = 0; S.panolar = {}; S.sekme = 'gokyuzu'; bildir('Verilerin silindi'); karsilama();
      } }, 'Verilerimi sil'))));
  return { el, guncelle };
}

/* ---------- başlangıç ---------- */
arkaplan($('#gok'));
S.sid = depo.oku();
karsilama();
