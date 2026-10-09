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

/** Sen (altın, dolu) / ikizin (mavi, halka) / gelecek (sönük) takımyıldızı. */
export function takimyildiz({ sen, ikiz, toplam, w = 640, h = 400, etiket = true }) {
  const p = noktalar(toplam, w, h);
  const yol = (a, b) => p.slice(a, b).map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ');
  const el = svg('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': `Takımyıldız: ${sen} yıldız yanıyor, ikizin ${Math.max(ikiz - sen, 0)} yıldız önde, toplam ${toplam}` });
  const defs = svg('defs', {}, svg('radialGradient', { id: 'parla' }, svg('stop', { offset: '0', 'stop-color': '#f5d78e', 'stop-opacity': '.55' }), svg('stop', { offset: '1', 'stop-color': '#f5d78e', 'stop-opacity': '0' })));
  el.append(defs);
  if (ikiz < toplam) el.append(svg('path', { d: yol(Math.max(ikiz - 1, 0), toplam), stroke: '#2e3b75', 'stroke-width': 1.2, fill: 'none' }));
  if (ikiz > sen) el.append(svg('path', { d: yol(Math.max(sen - 1, 0), ikiz), stroke: '#8ea2ff', 'stroke-width': 1.5, 'stroke-dasharray': '6 6', fill: 'none' }));
  if (sen > 1) el.append(svg('path', { d: yol(0, sen), stroke: '#f5d78e', 'stroke-width': 1.8, fill: 'none' }));
  p.forEach((q, i) => {
    if (i < sen) {
      const son = i === sen - 1;
      if (son) el.append(svg('circle', { cx: q.x, cy: q.y, r: 22, fill: 'url(#parla)' }));
      el.append(svg('circle', { cx: q.x, cy: q.y, r: son ? 6.5 : 4.5, fill: '#f5d78e' }));
    } else if (i < ikiz) el.append(svg('circle', { cx: q.x, cy: q.y, r: 5.5, fill: 'none', stroke: '#8ea2ff', 'stroke-width': 2 }));
    else el.append(svg('circle', { cx: q.x, cy: q.y, r: 3, fill: '#2e3b75' }));
  });
  if (etiket && sen > 0) {
    const q = p[sen - 1];
    el.append(svg('text', { x: q.x, y: q.y + 26, 'text-anchor': 'middle', fill: '#f5d78e', 'font-size': 13, 'font-weight': 700, 'font-family': 'DM Sans, sans-serif' }, (() => { const t = document.createTextNode('Sen'); return t; })()));
  }
  if (etiket && ikiz > sen) {
    const q = p[ikiz - 1];
    el.append(svg('text', { x: q.x, y: q.y - 16, 'text-anchor': 'middle', fill: '#8ea2ff', 'font-size': 13, 'font-weight': 700, 'font-family': 'DM Sans, sans-serif' }, document.createTextNode('İkizin')));
  }
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
      pts.slice(0, m).forEach((q, i) => kok.append(halka ? svg('circle', { cx: q.x, cy: q.y, r: i === m - 1 ? 7 : 5, fill: 'none', stroke: renk, 'stroke-width': 2 }) : svg('circle', { cx: q.x, cy: q.y, r: i === m - 1 ? 7 : 4.5, fill: renk })));
    };
    kat(a, '#f5d78e', false); kat(b, '#8ea2ff', true, '6 6');
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

/** Sen ve ikiz eğrisi. */
export function egri(sen, ikiz, w = 760, h = 300) {
  const max = Math.max(...ikiz, 1), n = Math.max(ikiz.length - 1, 1), pad = 28;
  const nk = (a) => a.map((v, i) => `${i ? 'L' : 'M'}${(pad + (i / n) * (w - 2 * pad)).toFixed(1)} ${(h - pad - (v / max) * (h - 2 * pad)).toFixed(1)}`).join(' ');
  const el = svg('svg', { viewBox: `0 0 ${w} ${h}`, role: 'img', 'aria-label': `Yıldız eğrisi: sen ${sen.at(-1) ?? 0}, ikizin ${ikiz.at(-1) ?? 0}` });
  for (let i = 0; i <= 4; i++) { const y = pad + (i / 4) * (h - 2 * pad); el.append(svg('line', { x1: pad, x2: w - pad, y1: y, y2: y, stroke: '#1f2a57', 'stroke-width': 1 })); }
  el.append(svg('path', { d: nk(ikiz), stroke: '#8ea2ff', 'stroke-width': 2.2, 'stroke-dasharray': '7 7', fill: 'none' }));
  el.append(svg('path', { d: nk(sen), stroke: '#f5d78e', 'stroke-width': 2.8, fill: 'none', 'stroke-linejoin': 'round' }));
  return el;
}
