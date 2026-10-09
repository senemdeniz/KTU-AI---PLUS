import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { SessionView } from './types';

/**
 * Backend adresi:
 * 1) EXPO_PUBLIC_API_URL tanımlıysa o (ör. canlıya alınmış sunucu)
 * 2) Expo Go ile açıldıysa, Expo geliştirme sunucusunun çalıştığı bilgisayarın IP'si + :8000
 *    (telefon ve bilgisayar aynı Wi-Fi'da olmalı; backend --host 0.0.0.0 ile açılmalı)
 * 3) Web'de / emülatörde localhost
 */
function defaultBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.platform?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') return `http://${host}:8000`;
  if (Platform.OS === 'android') return 'http://10.0.2.2:8000'; // Android emülatörü
  return 'http://localhost:8000';
}

let baseUrl = defaultBaseUrl();
export const getBaseUrl = () => baseUrl;
export const setBaseUrl = (url: string) => {
  baseUrl = url.trim().replace(/\/$/, '');
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, init);
  } catch {
    throw new Error(`Sunucuya ulaşılamadı (${baseUrl}). Backend açık mı, telefon ve bilgisayar aynı Wi-Fi'da mı?`);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body?.detail === 'string' ? body.detail : `Sunucu hatası (${res.status})`);
  return body as T;
}

const json = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  health: () => call<{ ok: boolean; mock: boolean; model: string }>('/health'),
  createSession: (b: { name: string; cv_text: string; hobbies: string[]; goals: string[]; daily_minutes: number }) =>
    call<SessionView>('/sessions', json(b)),
  start: (sid: string) => call<SessionView>(`/sessions/${sid}/start`, { method: 'POST' }),
  closeDay: (sid: string, completed_ids: string[]) => call<SessionView>(`/sessions/${sid}/day`, json({ completed_ids })),
  fastForward: (sid: string, days: number, consistency: number) =>
    call<SessionView>(`/sessions/${sid}/fast-forward`, json({ days, consistency })),
  replan: (sid: string, reason: string) => call<SessionView>(`/sessions/${sid}/replan`, json({ reason })),
  talk: (sid: string, message: string, mode: 'chat' | 'teach') =>
    call<SessionView>(`/sessions/${sid}/talk`, json({ message, mode })),

  /** PDF CV yükler, çıkarılan metni döndürür. Mobilde {uri,name,type}, web'de File gönderilir. */
  parseCv: async (asset: { uri: string; name: string; mimeType?: string; file?: File }) => {
    const form = new FormData();
    if (Platform.OS === 'web' && asset.file) {
      form.append('file', asset.file, asset.name);
    } else {
      form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/pdf' } as unknown as Blob);
    }
    return call<{ text: string }>('/cv/parse', { method: 'POST', body: form });
  },
};
