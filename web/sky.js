// Gökyüzü: arka plandaki yıldız alanı ve takımyıldız çizimi.
const NS = 'http://www.w3.org/2000/svg';
export const svg = (tag, attrs = {}, ...kids) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  kids.forEach((c) => c && e.append(c));
  return e;
};
const azalt = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function arkaplan(canvas) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, yildizlar = [], px = 0, py = 0, tx = 0, ty = 0;
  const uret = () => {
    const n = Math.round((w * h) / 9000);
    let s = 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    yildizlar = Array.from({ length: n }, () => ({ x: r() * w, y: r() * h, z: 0.3 + r() * 0.9, f: r() * 6.28, h: r() < 0.06 }));
  };
  const boyut = () => {
    const d = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * d; canvas.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
    uret(); ciz(0);
  };
  const ciz = (t) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * 0.2, h * 1.05, 0, w * 0.2, h * 1.05, Math.max(w, h) * 0.9);
    g.addColorStop(0, 'rgba(60,70,160,.28)'); g.addColorStop(1, 'rgba(7,11,28,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    px += (tx - px) * 0.04; py += (ty - py) * 0.04;
    for (const s of yildizlar) {
      const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1100 + s.f)) * s.z;
      ctx.globalAlpha = azalt ? 0.6 * s.z : a;
      ctx.fillStyle = s.h ? '#f5d78e' : '#c9d0f5';
      const x = s.x + px * s.z * 14, y = s.y + py * s.z * 14;
      ctx.beginPath(); ctx.arc(x, y, s.h ? 1.5 : s.z * 1.1, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  addEventListener('resize', boyut);
  if (!azalt) addEventListener('pointermove', (e) => { tx = e.clientX / w - 0.5; ty = e.clientY / h - 0.5; });
  boyut();
  if (!azalt) { const d = (t) => { ciz(t); requestAnimationFrame(d); }; requestAnimationFrame(d); }
}

/** Takımyıldız noktaları: sol altta başlayıp sağ üste yükselen, dalgalı bir rota. */
export function noktalar(n, w, h, tohum = 3) {
  let s = tohum * 9973;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pad = 26;
  return Array.from({ length: Math.max(n, 1) }, (_, i) => {
    const t = n <= 1 ? 0 : i / (n - 1);
    const y = h - pad - t * (h - 2 * pad) * 0.86 + Math.sin(t * 9 + tohum) * h * 0.075 + (r() - 0.5) * h * 0.05;
    return { x: pad + t * (w - 2 * pad) + (r() - 0.5) * 8, y: Math.min(h - pad, Math.max(pad, y)) };
  });
}

/** Sen (altın, dolu) / rota (soluk kesikli: planı aksatmasaydın) / gelecek (sönük). İkiz burada YOK. */
export function takimyildiz({ sen, rota, toplam, w = 640, h = 400, etiket = true }) {
  const p = noktalar(toplam, w, h);
  const yol = (a, b) => p.slice(a, b).map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ');
  const el = svg('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': `Takımyıldız: ${sen} yıldız yaktın, rotan ${rota} diyor, toplam ${toplam}` });
  el.append(svg('defs', {}, svg('radialGradient', { id: 'parla' }, svg('stop', { offset: '0', 'stop-color': '#f5d78e', 'stop-opacity': '.55' }), svg('stop', { offset: '1', 'stop-color': '#f5d78e', 'stop-opacity': '0' }))));
  if (rota < toplam) el.append(svg('path', { d: yol(Math.max(rota - 1, 0), toplam), stroke: '#2e3b75', 'stroke-width': 1.2, fill: 'none' }));
  if (rota > sen) el.append(svg('path', { d: yol(Math.max(sen - 1, 0), rota), stroke: '#c9d0f5', 'stroke-opacity': .55, 'stroke-width': 1.4, 'stroke-dasharray': '3 6', fill: 'none' }));
  if (sen > 1) el.append(svg('path', { d: yol(0, sen), stroke: '#f5d78e', 'stroke-width': 1.8, fill: 'none' }));
  p.forEach((q, i) => {
    if (i < sen) {
      const son = i === sen - 1;
      if (son) el.append(svg('circle', { cx: q.x, cy: q.y, r: 22, fill: 'url(#parla)' }));
      el.append(svg('circle', { cx: q.x, cy: q.y, r: son ? 6.5 : 4.5, fill: '#f5d78e' }));
    } else if (i < rota) el.append(svg('circle', { cx: q.x, cy: q.y, r: 4, fill: 'none', stroke: '#c9d0f5', 'stroke-opacity': .7, 'stroke-width': 1.4, 'stroke-dasharray': '2 2' }));
    else el.append(svg('circle', { cx: q.x, cy: q.y, r: 3, fill: '#2e3b75' }));
  });
  const yazi = (q, dy, renk, s) => svg('text', { x: q.x, y: q.y + dy, 'text-anchor': 'middle', fill: renk, 'font-size': 13, 'font-weight': 700, 'font-family': 'DM Sans, sans-serif' }, document.createTextNode(s));
  if (etiket && sen > 0) el.append(yazi(p[sen - 1], 26, '#f5d78e', 'Sen'));
  if (etiket && rota > sen) el.append(yazi(p[rota - 1], -16, '#c9d0f5', 'Rota'));
  return el;
}

/** İkizin gökyüzü: her kavram bir yıldız. sönük = öğretilmedi, parlak = kısmen, halkalı = tamamen. Kilitli = günü gelmedi. */
export function ikizGogu(yildizlar, w = 640, h = 220, etiket = true) {
  const n = Math.max(yildizlar.length, 1), pad = 64;
  const el = svg('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': `İkizin ${yildizlar.filter((y) => y.star !== 'sonuk').length} kavramı biliyor, toplam ${yildizlar.length}` });
  const p = yildizlar.map((_, i) => { const t = n === 1 ? 0.5 : i / (n - 1); return { x: pad + t * (w - 2 * pad), y: h * 0.52 - Math.sin(t * Math.PI) * h * 0.2 + (i % 2 ? 10 : -4) }; });
  for (let i = 1; i < p.length; i++) {
    const bilir = yildizlar[i].star !== 'sonuk' && yildizlar[i - 1].star !== 'sonuk';
    el.append(svg('line', { x1: p[i - 1].x, y1: p[i - 1].y, x2: p[i].x, y2: p[i].y, stroke: bilir ? '#8ea2ff' : '#1f2a57', 'stroke-width': bilir ? 1.6 : 1, 'stroke-dasharray': bilir ? 'none' : '2 5' }));
  }
  yildizlar.forEach((y, i) => {
    const q = p[i];
    if (y.star === 'halkali') { el.append(svg('circle', { cx: q.x, cy: q.y, r: 13, fill: 'none', stroke: '#8ea2ff', 'stroke-width': 1.4 })); el.append(svg('circle', { cx: q.x, cy: q.y, r: 6.5, fill: '#8ea2ff' })); }
    else if (y.star === 'parlak') el.append(svg('circle', { cx: q.x, cy: q.y, r: 6, fill: '#8ea2ff' }));
    else el.append(svg('circle', { cx: q.x, cy: q.y, r: 4, fill: y.acik ? '#3a4888' : '#1f2a57' }));
    if (etiket) el.append(svg('text', { x: q.x, y: q.y + 30, 'text-anchor': 'middle', fill: y.star === 'sonuk' ? '#7f89b8' : '#c9d0f5', 'font-size': 12, 'font-weight': 600, 'font-family': 'DM Sans, sans-serif' }, document.createTextNode(y.baslik.length > 18 ? y.baslik.slice(0, 17) + '…' : y.baslik)));
  });
  return el;
}

/** Karşılama: iki takımyıldız sırayla belirir (animasyon). */
export function ikiliAnimasyon(kap) {
  const W = 560, H = 560, n = 18;
  const a = noktalar(n, W, H, 5), b = noktalar(n, W, H, 11).map((q) => ({ x: q.x, y: q.y - 18 }));
  const kok = svg('svg', { viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  kap.append(kok);
  const ciz = (ilerle) => {
    kok.replaceChildren();
    const kat = (pts, renk, halka, dash) => {
      const m = Math.floor(ilerle * pts.length);
      if (m > 1) kok.append(svg('path', { d: pts.slice(0, m).map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' '), stroke: renk, 'stroke-width': 1.6, fill: 'none', 'stroke-dasharray': dash || 'none', opacity: 0.85 }));
      pts.slice(0, m).forEach((q, i) => kok.append(halka ? svg('circle', { cx: q.x, cy: q.y, r: 3.5, fill: 'none', stroke: renk, 'stroke-width': 1.2, 'stroke-opacity': .7 }) : svg('circle', { cx: q.x, cy: q.y, r: i === m - 1 ? 7 : 4.5, fill: renk })));
    };
    kat(b, '#c9d0f5', true, '3 6'); kat(a, '#f5d78e', false);
  };
  if (azalt) { ciz(1); return; }
  let t0 = null;
  const adim = (t) => {
    t0 ??= t;
    const ilerle = Math.min(((t - t0) / 5200), 1);
    ciz(ilerle);
    if (ilerle < 1) requestAnimationFrame(adim);
  };
  requestAnimationFrame(adim);
}

/** Sen ve rota eğrisi. */
export function egri(sen, ikiz, w = 760, h = 300) {
  const max = Math.max(...ikiz, 1), n = Math.max(ikiz.length - 1, 1), pad = 28;
  const nk = (a) => a.map((v, i) => `${i ? 'L' : 'M'}${(pad + (i / n) * (w - 2 * pad)).toFixed(1)} ${(h - pad - (v / max) * (h - 2 * pad)).toFixed(1)}`).join(' ');
  const el = svg('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': `Yıldız eğrisi: sen ${sen.at(-1) ?? 0}, rota ${ikiz.at(-1) ?? 0}` });
  for (let i = 0; i <= 4; i++) { const y = pad + (i / 4) * (h - 2 * pad); el.append(svg('line', { x1: pad, x2: w - pad, y1: y, y2: y, stroke: '#1f2a57', 'stroke-width': 1 })); }
  el.append(svg('path', { d: nk(ikiz), stroke: '#c9d0f5', 'stroke-opacity': .6, 'stroke-width': 2, 'stroke-dasharray': '3 7', fill: 'none' }));
  el.append(svg('path', { d: nk(sen), stroke: '#f5d78e', 'stroke-width': 2.8, fill: 'none', 'stroke-linejoin': 'round' }));
  return el;
}
