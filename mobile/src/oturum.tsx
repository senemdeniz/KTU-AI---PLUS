import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Olay, View } from './types';

interface Ctx {
  view: View | null; olaylar: Olay[]; hata: string | null; mesgul: boolean;
  yenile: () => Promise<void>; calistir: <T>(f: () => Promise<T>) => Promise<T | undefined>;
  baslat: (sid: string) => void; bitir: () => void; sid: string | null; setView: (v: View) => void;
}
const O = createContext<Ctx>(null as any);
export const useOturum = () => useContext(O);

const ANAHTAR = 'ikiz.sid';
const kayit = {
  oku: (): string | null => { try { return (globalThis as any).localStorage?.getItem(ANAHTAR) ?? null; } catch { return null; } },
  yaz: (v: string | null) => { try { v ? (globalThis as any).localStorage?.setItem(ANAHTAR, v) : (globalThis as any).localStorage?.removeItem(ANAHTAR); } catch {} },
};

export function OturumSaglayici({ children }: { children: React.ReactNode }) {
  const [sid, setSid] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [olaylar, setOlaylar] = useState<Olay[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const son = useRef(0);

  const yenile = useCallback(async () => {
    if (!sid) return;
    try {
      const [v, o] = await Promise.all([api.gorunum(sid), api.olaylar(sid, son.current)]);
      setView(v);
      if (o.olaylar.length) { son.current = o.olaylar[o.olaylar.length - 1].id; setOlaylar((a) => [...a, ...o.olaylar]); }
      setHata(null);
    } catch (e: any) {
      if (/bulunamadı/.test(e.message)) { kayit.yaz(null); setSid(null); setView(null); } else setHata(e.message);
    }
  }, [sid]);

  useEffect(() => { const k = kayit.oku(); if (k) setSid(k); }, []);
  useEffect(() => {
    if (!sid) return;
    yenile();
    const ms = view && view.durum === 'hazir' ? 4000 : 900;
    const t = setInterval(yenile, ms);
    return () => clearInterval(t);
  }, [sid, view?.durum === 'hazir', yenile]);

  const calistir = useCallback(async <T,>(f: () => Promise<T>) => {
    setMesgul(true);
    try { const r = await f(); setHata(null); await yenile(); return r; }
    catch (e: any) { setHata(e.message); }
    finally { setMesgul(false); }
  }, [yenile]);

  const baslat = (id: string) => { son.current = 0; setOlaylar([]); setView(null); kayit.yaz(id); setSid(id); };
  const bitir = () => { kayit.yaz(null); setSid(null); setView(null); setOlaylar([]); son.current = 0; };
  return <O.Provider value={{ view, olaylar, hata, mesgul, yenile, calistir, baslat, bitir, sid, setView }}>{children}</O.Provider>;
}
