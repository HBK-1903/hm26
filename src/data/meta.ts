// HM26 — GDD §6/§9 meta sabitleri (belgeden birebir)
import { Formation, GamePlan, ManagerDraft } from '../types';

export const FORMATIONS: Formation[] = ['4-3-3', '4-2-3-1', '4-4-2', '4-1-4-1', '3-5-2', '5-3-2'];

export const GAME_PLANS: { id: GamePlan; name: string; fx: string }[] = [
  { id: 'dengeli', name: 'Dengeli Oyun', fx: 'Tüm alanlarda nötr dağılım. Belirgin uzmanlık yok; plan değişimi risksiz.' },
  { id: 'posession', name: 'Topa Sahip Olma', fx: 'Build-up ve merkez kontrolü artar. Direkt geçiş ve ceza sahası yoğunluğu düşebilir.' },
  { id: 'yuksekPres', name: 'Yüksek Pres', fx: 'Rakip çıkışında top kazanma ihtimali artar. Kondisyon tüketimi ve savunma arkası riski yükselir.' },
  { id: 'hizliKontra', name: 'Hızlı Kontra', fx: 'Geçiş hızı ve dikey fırsat üretimi artar. Yerleşik rakibe karşı top kontrolü azalır.' },
  { id: 'kanat', name: 'Kanat Oyunu', fx: 'Kanat hücumu ve orta üretimi artar. Merkez sıkışabilir; santrfor tipi önem kazanır.' },
  { id: 'dusukBlok', name: 'Düşük Blok', fx: 'Yerleşik savunma güçlenir, kontra alanı açılır. Topa sahip olma ve hücum hacmi düşer.' },
];

export const PLAN_SLOTS = ['Ana Plan', 'Hücum Planı', 'Savunma Planı', 'Kontra Planı', 'Özel Plan'];

export const ERAS: { id: ManagerDraft['era']; name: string; desc: string }[] = [
  { id: 'yerlesik', name: 'Yerleşik Düzen', desc: 'Tarihî güçlü kulüpler, kararlı bütçeler, daha belirgin favoriler.' },
  { id: 'gecis', name: 'Geçiş Dönemi', desc: 'Eski güçlerle modern proje kulüpleri dengede. Varsayılan öneri budur.' },
  { id: 'acik', name: 'Açık Rekabet Dönemi', desc: 'Daha fazla yeniden yapılanma, piyasa hareketi ve beklenmedik aday.' },
];

export const MANAGER_BACKGROUNDS: { id: NonNullable<ManagerDraft['background']>; name: string; desc: string; bonus: string }[] = [
  { id: 'eskiFutbolcu', name: 'Eski Futbolcu', desc: 'Sahayı içeriden tanıyan isim.', bonus: 'İlk yaz döneminde ek bağlantı: 1 ek serbest/kiralık fırsat kartı.' },
  { id: 'analist', name: 'Taktik Analist', desc: 'Verinin dilini çözer.', bonus: 'İlk 8 resmî maçta gelişmiş rakip analizi paketi.' },
  { id: 'altyapi', name: 'Gençlik Antrenörü', desc: 'Oyuncu geliştirme eli.', bonus: 'İlk sezon için 1 ek bireysel gelişim odağı hakkı.' },
  { id: 'planlamaci', name: 'Kulüp Planlamacısı', desc: 'Tesis ve yapı ustası.', bonus: 'İlk uygun tesis/stadyum projesinde sınırlı yönetim katkısı.' },
];

export const DIFFICULTIES: { id: ManagerDraft['difficulty']; name: string; kzp: number; desc: string }[] = [
  { id: 'rahat', name: 'Rahat Kariyer', kzp: 20, desc: 'Yumuşak hedefler, sabırlı yönetim, sakin piyasa.' },
  { id: 'dengeli', name: 'Dengeli Kariyer', kzp: 45, desc: 'Önerilen varsayılan. Gerçekçi baskı, dengeli sürpriz oranı.' },
  { id: 'zorlu', name: 'Zorlu Kariyer', kzp: 70, desc: 'Sert hedefler, kısa sabır, zorlu görüşmeler.' },
  { id: 'efsanevi', name: 'Efsanevi Kariyer', kzp: 90, desc: 'Kırıcı baskı, yüksek rastlantısallık, acımasız piyasa.' },
  { id: 'ozel', name: 'Özel Kariyer', kzp: 50, desc: 'Tüm dünya/baskı/piyasa/gerçekçilik ayarları elle kurulur.' },
];

export const TRAINING_FOCUS = ['Teknik', 'Hücum', 'Defans', 'Fizik', 'Oyun Zekâsı'];

// §12.5 — Tesis seviye/maliyet tablosu (belgeden birebir)
export const FACILITY_TIERS = [
  { from: 1, cost: 1.0, days: 30, note: 'Küçük iyileşme' },
  { from: 2, cost: 2.1, days: 45, note: 'Orta iyileşme' },
  { from: 3, cost: 3.8, days: 60, note: 'Belirgin rekabet avantajı' },
  { from: 4, cost: 6.2, days: 90, note: 'Elit avantaj' },
];
