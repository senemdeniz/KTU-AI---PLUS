export type Alan = 'akademik' | 'hobi';
export type Risk = 'momentum' | 'steady' | 'slipping' | 'at_risk';

export interface Gorev {
  id: string; day: number; title: string; minutes: number; skill: string;
  difficulty: number; type: 'learn' | 'practice' | 'reflect' | 'teach'; done: boolean; alan: Alan;
}
export interface Olay {
  id: number; t: number; ajan: string; mesaj: string;
  tur: 'start' | 'info' | 'decision' | 'handoff' | 'done' | 'guard' | 'error'; veri: any; alan: Alan | null;
}
export interface Ikiz {
  gun: number; sen_yildiz: number; ikiz_yildiz: number; toplam_yildiz: number; fark: number;
  seri: number; risk: Risk; risk_tr: string; parlaklik: number; egri: { sen: number[]; ikiz: number[] };
}
export interface AlanView {
  alan: Alan; etiket: string; konu: string; hazir: boolean;
  hedef?: { secilen: string; gerekce: string; olcut: string; sure: number; adaylar: { title: string; fit_score: number; reason: string }[] };
  ikiz?: Ikiz;
  haftalar?: { week: number; theme: string; milestone: string }[];
  harita?: { id: string; day: number; title: string; type: Gorev['type']; minutes: number; done: boolean }[];
}
export interface AjanBilgi { ad: string; rol: string; tur: string; yetki: string; son: { tur: string; mesaj: string } | null }
export interface Oneri {
  id: string; kaynak: string; alan: Alan; baslik: string; ozet: string;
  degisiklikler: { etiket: string; once: string; sonra: string }[]; etkilenen_gun: number | null;
}
export interface GorevIsi {
  id: string; metin: string; durum: string;
  atamalar: { ajan: string; is: string; durum: string; ad: string }[]; sonuc: Record<string, any>;
}
export interface SinavMadde { question: string; twin_answer: string; cited: number[]; result: 'dogru' | 'eksik' | 'yanlis' | 'anlatilmadi'; hint: string | null }
export interface OgretSon {
  topic: string; star: 'sonuk' | 'parlak' | 'halkali'; score: number; total: number; sentences: string[];
  items: SinavMadde[]; guvenlik?: any; yapay_zeka?: boolean;
}
export interface View {
  session_id: string; ad: string; demo: boolean; model: string; durum: 'kuruluyor' | 'isleniyor' | 'hazir';
  gun: number; sure: number; alanlar: AlanView[]; bugun: Gorev[];
  son_tarihler: { baslik: string; tarih: string; kalan_gun: number }[];
  koc: { mode: string; message: string; action: { title: string; minutes: number } | null; ask_user: string | null; alan?: Alan } | null;
  oneriler: Oneri[]; gorevler: GorevIsi[];
  ogret: { alan: Alan; konu: string; cumleler: string[]; son: OgretSon | null };
  ajanlar: AjanBilgi[]; son_olay_id: number;
}
export interface Engel { ok: false; engel: string; mesaj: string; uyarilar?: { kod: string; mesaj: string }[] }
