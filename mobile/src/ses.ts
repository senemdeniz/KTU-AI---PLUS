import { Platform } from 'react-native';

export const sesVar = (): boolean => Platform.OS === 'web' && !!((globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition);

/** Tarayıcı konuşma tanıma (tr-TR). Dönen fonksiyon dinlemeyi durdurur. Metin kullanıcıya düzenlettirilir, sonra aynı denetimlerden geçer. */
export function dinle(onMetin: (kesin: string, gecici: string) => void, onBitti: (hata?: string) => void): () => void {
  const R = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
  if (!R) { onBitti('Bu tarayıcı sesli girişi desteklemiyor. Chrome ya da Safari dene.'); return () => {}; }
  const r = new R();
  r.lang = 'tr-TR'; r.continuous = true; r.interimResults = true;
  r.onresult = (e: any) => {
    let kesin = '', gecici = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) kesin += t; else gecici += t;
    }
    onMetin(kesin, gecici);
  };
  r.onerror = (e: any) => onBitti(e.error === 'not-allowed' ? 'Mikrofon izni verilmedi. Tarayıcı adres çubuğundan izin ver.' : e.error === 'no-speech' ? undefined : `Ses hatası: ${e.error}`);
  r.onend = () => onBitti();
  try { r.start(); } catch { onBitti('Mikrofon başlatılamadı.'); }
  return () => { try { r.stop(); } catch {} };
}
