// HM26 — "Kesik köşeli 24 birim" piktogram ailesi (v0.9.3: MANAGER26_Karakter_Tasarimlari.html "Özel oyun sembolleri" bölümüyle birebir hizalı)
// Tek stroke, currentColor; kit ailesi 1.7 kalınlık, yardımcı ekstralar 1.5
import React from 'react';

const S = (d: string | React.ReactNode, filled = false, sw = 1.5) => (
  <svg viewBox="0 0 24 24" width="100%" height="100%" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

// ── Özel oyun sembolleri (29) — tasarım kiti v1 ile birebir ──
export const IHome = () => S(<path d="M3 10 12 3 21 10M5 9v11h14V9M9 20v-7h6v7" />, false, 1.7); // Ana merkez
export const ISquad = () => S(<path d="M7 3 3 6l3 4 2-1v12h8V9l2 1 3-4-4-3a4 4 0 0 1-10 0M10 13h4M10 16h4" />, false, 1.7); // Kadro
export const ITactics = () => S(<path d="M4 3h16v18H4zM4 12h16M8 3v4h8V3M8 21v-4h8v4M14.5 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0" />, false, 1.7); // Taktik
export const IMarket = () => S(<path d="M3 7h16M15 3l4 4-4 4M21 17H5M9 13l-4 4 4 4" />, false, 1.7); // Piyasa
export const IClub = () => S(<path d="M12 3 3 6v6c0 5 9 9 9 9s9-4 9-9V6zM8 9h8M8 12h8M10 15h4" />, false, 1.7); // Kulüp
export const IComps = () => S(<path d="M8 3h8v7a4 4 0 0 1-8 0zM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 14v5M8 21h8" />, false, 1.7); // Müsabakalar
export const IInbox = () => S(<path d="M3 5h18v14H3zM3 6l9 7 9-7" />, false, 1.7); // Gelen kutusu
export const ICalendar = () => S(<path d="M4 5h16v16H4zM8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 17h2" />, false, 1.7); // Takvim
export const IBall = () => S(<path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7l4 3-1.5 4.5h-5L8 10zM12 7V3M16 10l4-2M14.5 14.5l3 4M9.5 14.5l-3 4M8 10 4 8" />, false, 1.7); // Top
export const IWhistle = () => S(<path d="M3 13a4 4 0 0 1 4-4h5l8-4v7l-8 1a4 4 0 1 1-9 0M7 12v2M17 6V3" />, false, 1.7); // Düdük
export const IShield = () => S(<path d="M12 3 8 4 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM8 12l3 3 5-6" />, false, 1.7); // Güvence
export const IBell = () => S(<path d="M6 9a6 6 0 0 1 12 0v6l2 3H4l2-3zM10 21h4" />, false, 1.7); // Bildirim
export const IGym = () => S(<path d="M3 8v8M6 6v12M18 6v12M21 8v8M6 12h12" />, false, 1.7); // Antrenman
export const IMedical = () => S(<path d="M4 7h16v14H4zM8 7V4h8v3M12 11v6M9 14h6" />, false, 1.7); // Sağlık
export const ISprout = () => S(<path d="M12 21V11M12 13C5 14 4 8 4 6c5 0 8 2 8 7M12 10c0-5 4-7 8-7 0 5-3 8-8 7" />, false, 1.7); // Akademi
export const IChart = () => S(<path d="M3 21h18M6 17v-5M12 17V7M18 17V3M4 9l5-4 4 1 7-5" />, false, 1.7); // Analiz
export const INews = () => S(<path d="M4 3h13v18H4zM17 8h4v10a3 3 0 0 1-3 3M7 7h7M7 11h7M7 15h4" />, false, 1.7); // Haberler
export const IMenu = () => S(<path d="M4 6h16M4 12h12M4 18h16" />, false, 1.7); // Menü
export const ISettings = () => S(<path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6" />, false, 1.7); // Ayarlar
export const IProfile = () => S(<path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2" />, false, 1.7); // Profil
export const IBackup = () => S(<path d="M12 3v12M7 8l5-5 5 5M4 14v7h16v-7" />, false, 1.7); // Yedekleme
export const ICoin = () => S(<path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M9 7h6M9 11h6M9 15h6M12 7v11" />, false, 1.7); // Bütçe
export const IHair = () => S(<path d="M4 15V9a8 8 0 0 1 16 0v6M4 10c5 0 9-3 11-6 0 5 2 7 5 8M7 15c0 8 10 8 10 0" />, false, 1.7); // Saç
export const IEyes = () => S(<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />, false, 1.7); // Göz
export const IWardrobe = () => S(<path d="M4 3h16v18H4zM12 3v18M9 10v4M15 10v4M2 21h20" />, false, 1.7); // Kıyafet
export const IPalette = () => S(<path d="M21 12a9 9 0 1 0-9 9h2a2 2 0 0 0 1-4 2 2 0 0 1 2-3h2a2 2 0 0 0 2-2M7 8h.01M12 6h.01M16 9h.01M6 13h.01" />, false, 1.7); // Palet
export const ICheck = () => S(<path d="M5 12l4 4L19 6" />, false, 1.7); // Onay
export const IReset = () => S(<path d="M4 4v6h6M4 10a8 8 0 1 1 1 8" />, false, 1.7); // Sıfırla
export const IArrow = () => S(<path d="M4 12h16M14 6l6 6-6 6" />, false, 1.7); // İlerle

// ── Kit dışı yardımcı ekstralar (mevcut kullanımlar; 1.5) ──
export const IMore = () => S(<><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" /></>);
export const IChev = () => S(<path d="M9 5l7 7-7 7" />);
export const ISearch = () => S(<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></>);
export const IStar = () => S(<path d="m12 3 2.78 5.63L21 9.54l-4.5 4.39L17.56 20 12 17.07 6.44 20l1.06-6.07L3 9.54l6.22-.91Z" />);
export const IStarF = () => S(<path d="m12 3 2.78 5.63L21 9.54l-4.5 4.39L17.56 20 12 17.07 6.44 20l1.06-6.07L3 9.54l6.22-.91Z" />, true);
export const IInfo = () => S(<><path d="M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" /><path d="M12 11v5" /><path d="M12 7h.01" /></>);

export const ICONS: Record<string, React.FC> = {
  home: IHome, squad: ISquad, tactics: ITactics, market: IMarket, club: IClub, comps: IComps,
  inbox: IInbox, calendar: ICalendar, ball: IBall, whistle: IWhistle, shield: IShield, bell: IBell,
  gym: IGym, medical: IMedical, sprout: ISprout, chart: IChart, news: INews,
  menu: IMenu, settings: ISettings, profile: IProfile, backup: IBackup, coin: ICoin,
  hair: IHair, eyes: IEyes, wardrobe: IWardrobe, palette: IPalette, check: ICheck, reset: IReset, arrow: IArrow,
  more: IMore, chevron: IChev, search: ISearch, star: IStar, starF: IStarF, info: IInfo,
};

// ── v0.9.8: Gömülü PNG semboller (assets-inbox paketi) — tema-adaptif çift renk ──
// Kural: iki renk varyantı da varsa ikisi birden render edilir; html.m26-dark/m26-light sınıfı CSS ile doğru olanı gösterir
// (açık tema → koyu ikon, koyu tema → krem ikon). Tek varyant varsa o her zaman görünür; hiçbiri yoksa/bozuksa SVG piktogram fallback.
import { SYMBOL_IVORY, SYMBOL_DARK, symbolSrc } from '../../data/assetManifest';

export const GameIcon: React.FC<{ id: string; className?: string }> = ({ id, className }) => {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => { setFailed(false); }, [id]);
  const iv = SYMBOL_IVORY[id] ? symbolSrc(id, false) : null;
  const dk = SYMBOL_DARK[id] ? symbolSrc(id, true) : null;
  const both = !!(iv && dk);
  const I = ICONS[id];
  const cls = `w-full h-full object-contain select-none`;
  const onErr = () => setFailed(true);
  return (
    <span className={`inline-block shrink-0 ${className ?? 'w-5 h-5'}`} aria-hidden="true">
      {!failed && iv ? (
        <img src={iv} alt="" draggable={false} decoding="async" onError={onErr}
             className={both ? `${cls} gi-ivory` : cls} />
      ) : null}
      {!failed && dk ? (
        <img src={dk} alt="" draggable={false} decoding="async" onError={onErr}
             className={both ? `${cls} gi-dark` : cls} />
      ) : null}
      {(failed || (!iv && !dk)) && I ? <I /> : null}
    </span>
  );
};
