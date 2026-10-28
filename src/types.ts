// HM26 Aşama 0 — Merkez tip tanımları (GDD §16 referanslı)

export type LeagueId = 'zirve' | 'gecit' | 'kok';

export type PositionGroup = 'GK' | 'CB' | 'FB' | 'WB' | 'DM' | 'CM' | 'AM' | 'WG' | 'ST';

export type GamePlan = 'dengeli' | 'posession' | 'yuksekPres' | 'hizliKontra' | 'kanat' | 'dusukBlok';
export type Formation = '4-3-3' | '4-2-3-1' | '4-4-2' | '4-1-4-1' | '3-5-2' | '5-3-2';
export type TriState = 'low' | 'mid' | 'high';
export type PassRisk = 'safe' | 'mid' | 'direct';
export type DefLine = 'deep' | 'normal' | 'high';
export type FocusDir = 'left' | 'center' | 'right' | 'balanced';

export interface Facilities { training: number; health: number; academy: number; analysis: number; }

export interface Club {
  id: string;
  name: string;
  short: string; // arma monogramı
  city: string;
  league: LeagueId;
  color1: string; color2: string; color3?: string; // v0.9.6: vurgu rengi (kulüp logo paketi)
  founded: number;
  stadium: string; capacity: number;
  strength: number;          // GK — takım genel kadro gücü hedefi
  transferBudget: number;    // ₺ milyon
  wageBudget: number;        // ₺ milyon / ay
  facilities: Facilities;
  story: string;             // 1-2 satır 2026-27 hikâyesi
  boardGoal: string;         // yönetim hedefi
  derby?: string;
  rivalIds: string[];
  /** Wave 15: fictional external opponents, excluded from the three domestic league pools. */
  isInternational?: boolean;
  country?: string;
  continentalRating?: number;
}

export interface PlayerRatings {
  gen: number;   // Genel (§8.2 ağırlık formülüyle)
  tek: number;   // Teknik
  att: number;   // Hücum (GK'de yok — yerine kal)
  def: number;   // Defans
  fiz: number;   // Fizik
  men: number;   // Oyun Zekâsı
  kal?: number;  // Kalecilik (sadece GK)
}


/** Sistem D — Gelişmiş sağlık heyeti modeli */
// ─── v0.9.5 Şartname FAZ A: genişleme alanları (hepsi opsiyonel, geriye uyumlu) ───
export interface CareerSeasonRow {
  season: number;          // seasonNo (1 tabanlı)
  clubId: string;
  apps: number; goals: number; assists: number;
  conceded?: number;       // sadece kaleciler
  cleanSheets?: number;    // sadece kaleciler
  saves?: number;          // Dalga 1: sadece kaleciler
  avgRating: number;
  retired?: boolean;       // "Jübile Yaptı" mührü
}

export interface PlayerBadges { /* rozet anahtarları string olarak tutulur */ }

export interface PlayerInjury {
  type: 'adale_gerilmesi' | 'ayak_bilegi_burkulmasi' | 'diz_meniskus' | 'kirik' | 'yorgunluk';
  name: string;                          // örn "Diz Menisküs Yırtığı"
  daysRemaining: number;
  severity: 'hafif' | 'orta' | 'ciddi';
  canPlayWithRisk: boolean;              // iğneyle oynatma riski (%50 kondi)
  clinicUsed?: boolean;                  // v0.9.9: Avrupa Kliniği sevki aynı sakatlıkta 1 kez
}

export interface Player {
  id: string;
  clubId: string;
  name: string;
  age: number;
  group: PositionGroup;
  side: 'L' | 'C' | 'R' | 'ANY'; // tercih edilen tarafı
  secondary: PositionGroup[];    // yakın pozisyonlar
  // v0.9.5 şartname genişletmesi (opsiyonel, geriye uyumlu)
  kitNumber?: number;                   // 1-99 forma numarası
  mentorId?: string | null;             // akıl hocası (ağabey mekanizması — FAZ B)
  badges?: string[];                    // ['golK','asistK','totw','sampiyon','tribun','milli']
  careerHistory?: CareerSeasonRow[];    // sezonluk kariyer dökümü
  transferHistory?: { season: number; fromClub: string; toClub: string; fee: number; kind: 'transfer' | 'loan' | 'free' }[];
  breakoutTriggered?: boolean;          // patlama sezonu yaşadı
  isRetired?: boolean;                  // jübile
  inPainkillerGambled?: boolean;        // iğneyle oynatıldı (FAZ B zinciri)
  ratings: PlayerRatings;
  form: number;        // 0-100
  fitness: number;     // 0-100
  sharpness: number;   // maç ritmi
  potential: number;
  wage: number;        // ₺ bin / ay (basit)
  foreign: boolean;
  injuredDays: number;
  suspendedMatches: number;
  contractYears?: number; // kalansözleşme (eski kayıtlar için opsiyonel; yoksa 3 kabul)
  important?: boolean; // elle yazılmış önemli oyuncu
  bio?: string;
  injury?: PlayerInjury;    // Sistem D (v0.3+)
  role?: string;            // Sistem C — tercih edilen rol kimliği (örn 'st_poacher')
}

export interface TacticPlan {
  id: string;
  name: string;
  formation: Formation;
  /** FAZ 2: kullanıcının elle dizdiği 11 (slot sırası autoXI dizilimiyle aynı) */
  customLineup?: (string | null)[];
  customBench?: string[];
  plan: GamePlan;
  press: TriState;
  tempo: TriState;
  direction: FocusDir;
  defLine: DefLine;
  passRisk: PassRisk;
  width: number;       // takım genişliği 0-100
  fbAdvanced: boolean; // bekler ileri
  midLine: TriState;   // orta saha çizgisi
  strikerSupport: TriState; // forvet destek mesafesi
  // Dalga 2: taktiksel uyum — bu formasyonla kaç maç oynandı; eski kayıtlarda yok (taban 60)
  familiarityMatches?: number;
  familiarityFormation?: Formation;
  setPieces: { captain: string | null; penalty: string | null; cornerL: string | null; cornerR: string | null; fkShort: string | null; fkLong: string | null };
}

export type Screen =
  | 'hub' | 'squad' | 'tactics' | 'market' | 'club' | 'comps'
  | 'inbox' | 'careerProfile' | 'settings' | 'backup' | 'stats' | 'newsroom'
  | 'matchPrep' | 'liveMatch' | 'matchReport';

export interface MatchArchiveEntry {
  id: string;
  day: number;
  seasonNo: number;
  comp: 'lig' | 'kupa' | 'kupa-ko' | 'hazirlik' | 'intl-grup' | 'intl-ko';
  homeId: string;
  awayId: string;
  hg: number;
  ag: number;
  xgHome: number;
  xgAway: number;
  foulsHome: number;
  foulsAway: number;
  yellowsHome: number;
  yellowsAway: number;
  redsHome: number;
  redsAway: number;
  referee?: { label: string; strictness: 'lenient' | 'balanced' | 'strict' };
  playerRows: Record<string, { min: number; g: number; a: number; yellow: number; red: number; rating: number; posGroup: string }>;
  playerClubIds: Record<string, string>;
  // C1 (v3): maç motorunun ürettiği tam istatistik bloğu — eski kayıtlarda yok; ekran "—" gösterir
  poss?: number;            // ev sahibi topa sahip olma %
  shotsH?: number; shotsA?: number; shotsOnH?: number; shotsOnA?: number;
  cornersH?: number; cornersA?: number; savesH?: number; savesA?: number;
  pressH?: number; pressA?: number; wideH?: number; wideA?: number; centralH?: number; centralA?: number;
  // C2 (v3): sıkıştırılmış dakikalı olaylar [dakika, tür, taraf, oyuncu?]
  events?: CompactMatchEvent[];
}

/**
 * C2 — kalıcı maç olayı (dizi/tuple formatıyla düşük saklama maliyeti).
 * tür: 0 gol · 1 sarı kart · 2 kırmızı kart · 3 oyuncu değişikliği
 * taraf: 0 ev sahibi · 1 deplasman · 2 nötr
 */
export type CompactMatchEvent = [number, number, number, string?];

export interface DemoFixture {
  round: number; homeId: string; awayId: string; played: boolean; hg?: number; ag?: number; day: number;
  comp: 'lig' | 'kupa' | 'kupa-ko' | 'hazirlik' | 'intl-grup' | 'intl-ko';
  /** C3 (v3): maçın beklenen gol çifti — kullanıcı maçında motor xG'si, AI maçında güçten türetilir; eski kayıtlarda yok */
  xgHome?: number; xgAway?: number;
  league?: LeagueId;
  group?: string;      // kupa grup harfi A..I
  koRound?: string;    // Son 16 / Çeyrek Final / Yarı Final / Final
  pens?: boolean;      // penaltılara gitti mi
  internationalCupId?: 'champions' | 'continental';
}

export interface TableRow { clubId: string; p: number; w: number; d: number; l: number; gf: number; ga: number; pts: number; }

export interface ManagerFace {
  skin: number; hairColor: number; hairStyle: number; beard: boolean; suit: number; accent: number;
  // v0.9.0 Karakter & Simge Kiti — opsiyonel geriye uyumlu kozmetik alanlar (eksikse varsayılan)
  eyeStyle?: number; eyeColor?: number; outfit?: number; beardStyle?: number; glasses?: number;
}

export interface ManagerDraft {
  name: string;
  portrait: number; // svg avatar index
  face?: ManagerFace | null; // Dalga 9: özel tasarım yüz (varsa portrait indeksini ezer)
  background: 'eskiFutbolcu' | 'analist' | 'altyapi' | 'planlamaci' | null;
  era: 'yerlesik' | 'gecis' | 'acik';
  difficulty: 'rahat' | 'dengeli' | 'zorlu' | 'efsanevi' | 'ozel';
  challengePoints: number; // 0-100 KZP
}

export interface InboxMsg {
  id: string;
  kind: 'kritik' | 'transfer' | 'yonetim' | 'kadro' | 'lig';
  title: string;
  body: string;
  day: number;
  read: boolean;
}

export type GoalPace = 'dusuk' | 'dengeli' | 'yuksek';
export type Randomness = 'low' | 'normal' | 'high';

/** Aşama 2 — AI kulübünden gelen satın alma teklifi (§11.3) */
export interface IncomingOffer {
  id: string;
  playerId: string;
  fromClubId: string;        // teklifi yapan AI kulüp
  fee: number;               // önerilen bonservis ₺M
  day: number;               // teklif günü
  expiresDay: number;        // geçerlilik sonu
  negotiable: boolean;       // karşı teklif kabul mü
  state: 'open' | 'accepted' | 'rejected' | 'expired' | 'countered';
}

export interface SellOnClause {
  beneficiaryClubId: string;
  pct: number;
  signedFee: number;
  signedDay: number;
}

export interface TransferLogEntry {
  id: string;
  day: number; seasonNo: number;
  playerName: string; age: number; group: PositionGroup;
  fromClubId: string | null; toClubId: string;
  fee: number; kind: 'in' | 'out' | 'youth';
  sellOnPct?: number;      // share granted on the buyer's future resale
  sellOnPaid?: number;     // cash paid to prior clubs when this transfer closes
  exchangePlayerName?: string;
}

export interface CareerSettings {
  goalPace: GoalPace;            // §10.7 gol ritmi profili
  randomness: Randomness;        // §10.9 — kariyer başında kilitli
  marketRefresh: 'sakin' | 'dengeli' | 'yogun'; // §11.1
  boardPressure: 'dusuk' | 'orta' | 'yuksek';
  injuryRate: 'dusuk' | 'normal' | 'yuksek';
  textSize: 'kucuk' | 'normal' | 'buyuk';
  highContrast: boolean;
  reduceMotion: boolean;
  matchSpeed: 'yavas' | 'normal' | 'hizli';
  suggestions: boolean;
}

export interface Career {
  slot: number;                  // 1-3
  manager: ManagerDraft & { background: NonNullable<ManagerDraft['background']> };
  clubId: string;
  seed: number;
  day: number;                   // kariyer günü (1 = 20.07.2026)
  week: number;
  settings: CareerSettings;
  pending: {
    marketShortlist: string[];
    /** Saved player snapshots keep generated free agents/targets in the shortlist across refreshes and reloads. */
    marketShortlistPlayers?: Player[];
    activeProject: { kind: keyof Facilities | 'stadium'; daysLeft: number; fromTo: string } | null;
  };
  // v0.3 genişlemeleri (SPEC Böl.III)
  clubFacilities?: { training: number; health: number; academy: number; analysis: number };
  boardConfidence?: number;      // 0-100, başlangıç 70
  managerYellowCards?: number;   // HM26 v0.9.11: sezonda 2 menajer sarısı → sonraki maç cezası
  managerSuspendedMatches?: number;
  trophyCabinet?: { season: string; type: 'lig' | 'kupa' | 'yukse'; title: string }[];
  shortlist?: string[];          // oyuncu id'leri (Sistem E)
  /** Dalga 1 (v0.5): haftalık antrenman odağı */
  trainingFocus?: { area: 'Teknik' | 'Hücum' | 'Defans' | 'Fizik' | 'Zekâ'; intensity: 'hafif' | 'normal' | 'yogun'; sinceDay: number };
  /** Dalga 1 (v0.5): aktif ültimatom — 3 resmi maçta en az `need` puan */
  ultimatum?: { left: number; need: number; got: number; startDay: number };
  /** Dalga 1 (v0.5): kovulma sonrası iş arama; doluyken kulüp maçları AI'ya geçer, kullanıcı teklif seçene kadar işsiz */
  jobSearch?: { sinceDay: number; offers: string[]; firedFrom: string; firedFromLeague: LeagueId; reason: string };
  /** Dalga 1 (v0.5): akademi günü adayları (sezon içi tek gün) */
  academyIntake?: AcademyIntake;
  culture?: OffPitchCulture;
  pendingCultureIssue?: CultureIssue;
  cultureHistory?: { id: string; kind: CultureIssueKind; day: number; choice: string }[];
}

export interface AcademyIntake {
  day: number;
  expiresDay?: number;
  seasonNo: number;
  academyLevel?: number;
  candidates: Player[];
  signed: string[];
  passed: string[];
  signingFees?: Record<string, number>;
}

export interface CultureHonor { id: string; title: string; seasonNo: number; earnedDay: number }
export interface OffPitchCulture {
  fanTrust: number;
  communityTrust: number;
  discipline: number;
  ultrasHeat: number;
  chairmanName: string;
  chairmanStyle: 'patient' | 'ambitious' | 'pragmatic' | 'community';
  nemesisClubId: string | null;
  honors: CultureHonor[];
  lastFfpReviewSeason?: number;
}
export type CultureIssueKind = 'discipline' | 'scandal' | 'community' | 'ultras' | 'ffp';
export interface CultureIssue { id: string; kind: CultureIssueKind; day: number; headline: string; body: string }

/** Aşama 4 — Sezon Sinematiği veri satırı */
export interface SeasonRecord {
  season: string; clubId: string; leagueId: LeagueId; rank: number; pts: number; cup: string;
}
