import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Alan, Olay, View } from './types';

function taban(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  if (Platform.OS === 'web') return 'http://localhost:8000';
  const host = (Constants.expoConfig as any)?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:8000`;
}
export const BASE = taban();

async function istek<T>(yol: string, yontem = 'GET', govde?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(BASE + yol, {
      method: yontem, headers: govde ? { 'Content-Type': 'application/json' } : undefined,
      body: govde ? JSON.stringify(govde) : undefined,
    });
  } catch {
    throw new Error('Sunucuya ulaşılamıyor. Sunucunun açık olduğundan emin ol.');
  }
  if (!r.ok) {
    let m = `Hata ${r.status}`;
    try { const j = await r.json(); if (typeof j.detail === 'string') m = j.detail; } catch {}
    throw new Error(m);
  }
  return r.json();
}

export interface Kurulum {
  ad: string; akademik: string | null; hobi: string | null; dakika: number; zaman: 'sabah' | 'ogle' | 'aksam';
  son_tarihler: { baslik: string; tarih: string }[];
}
export const api = {
  saglik: () => istek<{ demo: boolean; saglayici: string | null; model: string }>('/health'),
  ac: (k: Kurulum) => istek<{ session_id: string }>('/v2/sessions', 'POST', k),
  gorunum: (sid: string) => istek<View>(`/v2/sessions/${sid}`),
  olaylar: (sid: string, after: number) => istek<{ olaylar: Olay[]; son_olay_id: number; durum: string }>(`/v2/sessions/${sid}/events?after=${after}`),
  tamamla: (sid: string, id: string, yapildi: boolean) => istek<View>(`/v2/sessions/${sid}/tasks/${id}/complete?yapildi=${yapildi}`, 'POST'),
  gunuKapat: (sid: string) => istek<{ ok: boolean }>(`/v2/sessions/${sid}/day/close`, 'POST'),
  atla: (sid: string, gun: number, tutarlilik: number) => istek<{ ok: boolean }>(`/v2/sessions/${sid}/demo/skip`, 'POST', { gun, tutarlilik }),
  gorevVer: (sid: string, metin: string) => istek<any>(`/v2/sessions/${sid}/assign`, 'POST', { metin }),
  onayla: (sid: string, pid: string) => istek<View>(`/v2/sessions/${sid}/proposals/${pid}/approve`, 'POST'),
  reddet: (sid: string, pid: string) => istek<View>(`/v2/sessions/${sid}/proposals/${pid}/reject`, 'POST'),
  ogretEkle: (sid: string, metin: string, alan: Alan) => istek<any>(`/v2/sessions/${sid}/teach/add`, 'POST', { metin, alan }),
  ogretSil: (sid: string) => istek<{ ok: boolean }>(`/v2/sessions/${sid}/teach`, 'DELETE'),
  sinav: (sid: string) => istek<any>(`/v2/sessions/${sid}/teach/exam`, 'POST'),
  oturumSil: (sid: string) => istek<{ ok: boolean }>(`/v2/sessions/${sid}`, 'DELETE'),
};
