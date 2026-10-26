// HM26 Aşama 1 — dünya çekirdeği: 3 lig + kupa + takvim + dünya dönemi/zorluk + otomatik kayıt
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { PlayerInjury, Career, Club, Player, DemoFixture, TableRow, TacticPlan, InboxMsg, LeagueId, IncomingOffer, TransferLogEntry, SellOnClause, MatchArchiveEntry, CultureIssueKind } from '../types';
import { clubById, clubByIdSafe, CLUBS, INTERNATIONAL_CLUBS, LEAGUES } from '../data/clubs';
import { genSquad, genYouthRegen, genAcademyDay, mulberry32, playerValue } from '../data/gen';
import { computeJobOffers, evaluateUltimatum } from '../data/jobs';
import { applyTrainingWeek, TrainingFocus } from '../data/training';
import { canAddForeign, clubAcceptsLoan, aiAcceptsInboundLoan, loanWage, expiringLoans, activeLoans, onLoan, FREE_CLUB, LoanEntry } from '../data/market';
import { computeSeasonAwards, SeasonAwards } from '../data/awards';
import { minuteGrievance, grievanceLabel, evalPromise, newPromise, MinutePromise, minuteRole } from '../data/minutes';
import type { MatchStateEvent } from '../engine/engine';
import { buildEngineInput } from '../engine/adapter';
import { buildQuickMatchResult } from '../engine/quickMatchResult';
import { CLINIC_COST_M, clinicRemainingDays, needleOutcome } from '../engine/medical';
import { Cup, CupTie, buildCup, buildFriendlies, buildLeagueFixtures, cupGroupTable, dayToDate, inWindow, weekdayOf, ACADEMY_INTAKE_DAY } from '../data/calendar';
import { writeSave, writeSaveRetry, SaveBlob, SAVE_VERSION } from './persist';
import { applyComfortSettings } from '../utils/comfort';
import { consumeManagerBan, registerManagerYellow as registerManagerYellowRule } from '../engine/discipline';
import { normalizeSellOnClauses, withSellOnClause, calculateSellOnSettlement } from '../data/transferNegotiation';
import { academyIntakeExpired, evaluateAcademySigning, normalizeAcademyIntake } from '../data/academy';
import { addSeasonCultureHonors, assessFfp, normalizeClubCulture, resolveCultureChoice, type CultureChoice } from '../data/culture';
import { advanceInternationalSeason, archiveInternationalSeason, buildInternationalSeason, internationalFixtures, normalizeInternationalSeason, recordInternationalAiScorers, recordInternationalResult, recordInternationalScorers, type InternationalArchiveEntry, type InternationalCup, type InternationalSeason } from '../data/international';

export const SEED_BASE = 20260803;
export { dayToDate };

export interface DemoMatchEvent { minute: number; text: string; kind: 'info' | 'goal' | 'card' | 'chance' | 'save' | 'var' | 'sub' | 'half' | 'injury'; side?: 'home' | 'away'; path?: string[]; anim?: MatchStateEvent['anim']; playerId?: string; scorerId?: string; assisterId?: string; visualEvent?: 'free_kick' | 'brawl' | 'woodwork' | 'volley'; visualActors?: string[]; }
// Dalga 2 (§5-D): vuruş haritası noktası — dikey saha yüzde koordinatı (ev üst yarı, dep alt yarı)
export interface ShotDot { minute: number; side: 'home' | 'away'; x: number; y: number; xg: number; outcome: 'goal' | 'save' | 'miss' | 'clearance' | 'woodwork' }
export interface MatchCardRow { min: number; g: number; a: number; shots: number; saves: number; yellow: number; red: number; posGroup: string; rating: number }
export interface EngineRow { min: number; g: number; a: number; shots: number; saves: number; yellow: number; red: number; posGroup: string; endFit: number; rating: number }

export interface DemoMatchResult {
  homeId: string; awayId: string; hg: number; ag: number;
  events: DemoMatchEvent[]; xgHome: number; xgAway: number;
  posHome: number; shotsH: number; shotsA: number; shotsOnH: number; shotsOnA: number;
  insights: string[];
  // Dalga 2 (§5-D): gerçek istatistikler + vuruş haritası + 11'li karne
  cornersH: number; cornersA: number; foulsH: number; foulsA: number;
  yellowH: number; yellowA: number; redH: number; redA: number; savesH: number; savesA: number;
  wideH: number; wideA: number; centralH: number; centralA: number; pressWinsH: number; pressWinsA: number;
  shotsLog: ShotDot[];
  playerRows: Record<string, EngineRow>;
  referee?: { label: string; strictness: 'lenient' | 'balanced' | 'strict' };
}

interface SeasonFinaleState {
  season: string; clubId: string; leagueId: LeagueId; rank: number; pts: number; cup: string;
  championId: string; cupWinnerId: string | null;
  promoted: boolean; relegated: boolean; champion: boolean; cupWon: boolean;
  awards?: SeasonAwards | null; // Dalga 4: sezon ödül töreni (hesaplanmadan önce sıfırlanan playerStats'ten)
}

interface PersistedState {
  seasonFinale: SeasonFinaleState | null;
  table: Record<LeagueId, TableRow[]>;
  fixtures: DemoFixture[];   // 3 lig
  friendlies: DemoFixture[];
  cup: Cup;
  international: InternationalSeason;
  internationalArchive: InternationalArchiveEntry[];
  inbox: InboxMsg[];
  tactics: TacticPlan[];
  extraSquads: Record<string, Player[]>;     // Aşama 1 uyumluluk — migrate edilir
  budget: { tb: number; wbExtra?: number };
  career: Career;
  seasonNo: number;
  leagueOf: Record<string, LeagueId>;
  seasonHistory: { season: string; clubId: string; leagueId: LeagueId; rank: number; pts: number; cup: string }[];
  transfers: { id: string; name: string; fee: number; wage: number; day: number }[]; // Aşama 1 basit log
  /** FAZ 4 — sezon boyu oyuncu istatistikleri (gol/asist/kart) */
  playerStats?: Record<string, {
    playerId: string; clubId: string;
    goals: number; assists: number; yellows: number; reds: number; ratingSum: number; apps: number;
    conceded?: number;    // v0.9.5: kaleci gol yeme (GK)
    cleanSheets?: number; // v0.9.5: gol yememe (GK, min>0 & conceded==0)
  }>;
  // Aşama 2 — kalıcı dünya modeli
  playerClub: Record<string, string>;        // playerId → clubId (override; yoksa p.clubId)
  playerPatch: Record<string, Partial<Player>>; // dinamik durumlar + gelişim/yaşlanma
  extraPlayers: Player[];                    // serbest/youth regen üretilmiş nesneler
  removedPlayers: string[];                  // emekli/ayrılanlar (dünyadan çıkar)
  incomingOffers: IncomingOffer[];           // AI → kendi oyuncularına teklif
  transferLog: TransferLogEntry[];           // §11.5 geçmiş
  matchReports?: MatchArchiveEntry[];        // Wave 13: exact scored/referee/player-report evidence
  sellOnClauses?: Record<string, SellOnClause[]>; // Wave 11: future resale obligations, JSON-safe and backward compatible
  transferListed: string[];                  // satış listesi
  oppMatchDays: Record<string, number>;      // oyuncu bazlı maç ritmi (son maç günü)
  loans?: LoanEntry[];                       // Dalga 3: aktif kiralıklar (eski kayıtlarda boş)
  promises?: Record<string, MinutePromise>;  // Dalga 6: süre sözleri (playerId → söz)
  minuteNoted?: Record<string, number>;      // Dalga 6: son dakika-şikayeti bildirimi günü (30g soğuma)
  riskPlayIds?: string[];                    // v0.9.9: iğneyle oynatma onayı verilen sakat oyuncular (tek maçlık kumar)
}

interface AdvanceResult { blocked: boolean; reason?: string; summary: string[] }

interface GameState extends PersistedState {
  myClub: Club;
  myLeague: LeagueId;
  mySquad: Player[];
  squads: Record<string, Player[]>;
  nextFixture: DemoFixture | null;
  unread: number;
  effectiveStrength: (clubId: string) => number;
  saveNow: (silent?: boolean) => Promise<void>;
}

interface GameActions {
  clearSeasonFinale: () => void;
  advanceDay: () => AdvanceResult;
  buildDemoMatch: (homeId: string, awayId: string, tacticName: string) => DemoMatchResult;
  playLeagueMatch: (fx: DemoFixture, overrideResult?: DemoMatchResult) => DemoMatchResult;
  updateTactic: (idx: number, t: TacticPlan) => void;
  setInbox: (fn: (m: InboxMsg[]) => InboxMsg[]) => void;
  setCareer: (fn: (c: Career) => Career) => void;
  updateMarketShortlist: (playerIds: string[], players: Player[]) => void;
  recordManagerYellow: () => { yellows: number; banned: boolean };
  consumeManagerSuspension: (wasSuspended: boolean) => void;
  setBudget: (fn: (b: { tb: number; wbExtra?: number }) => { tb: number; wbExtra?: number }) => void;
  addSquadPlayer: (p: Player, fee: number) => void;
  // Aşama 2
  buyPlayer: (p: Player, fee: number, wage: number, years?: number, status?: 'rotasyon' | 'ilk11' | 'yildiz', swapPlayerId?: string, sellOnPct?: number) => { ok: boolean; reason?: string };
  /** v0.9.9 — Avrupa Kliniği: ₺0,3M kasaya, sakatlık süresi 14g kısalır (sakatlık başına 1 kez) */
  clinicTreat: (playerId: string) => { ok: boolean; reason?: string };
  /** v0.9.9 — iğneyle oynatma onayı (riskli sakat oyuncuyu bir maçlığına kadroya sokar) */
  setRiskPlay: (playerId: string, on: boolean) => void;
  /** v0.9.9 — maç sonu iğne kumarı çözümü: oynayan onaylılar için %25 nüks */
  applyRiskOutcome: (playedIds: string[]) => string[];
  /** v0.9.9 — ağabeylik: 29+ oyuncu ≤21 gence atanır (gelişim desteği) */
  setMentor: (youngId: string, seniorId: string | null) => { ok: boolean; reason?: string };
  renewContract: (playerId: string, years: number) => { ok: boolean; reason?: string };
  respondOffer: (offerId: string, accept: boolean, counterFee?: number) => void;
  resolveCultureIssue: (issueId: string, choice: CultureChoice) => { ok: boolean; reason?: string };
  toggleTransferList: (playerId: string) => void;
  playerOf: (playerId: string) => Player | null;
  clubOfPlayer: (playerId: string) => string | null;
  // Dalga 1 (v0.5)
  setTrainingFocus: (f: TrainingFocus) => void;
  signAcademyCandidate: (playerId: string) => { ok: boolean; reason?: string };
  passAcademyCandidate: (playerId: string) => void;
  acceptJob: (clubId: string) => { ok: boolean; reason?: string };
  // Dalga 2/3 (v0.5.2): kiralık paketi
  loanIn: (p: Player) => { ok: boolean; reason?: string };
  loanOut: (playerId: string) => { ok: boolean; reason?: string };
  // Dalga 6: süre sözü
  promiseMinutes: (playerId: string) => { ok: boolean; reason?: string };
  /** Dalga 6: oyuncunun güncel dakika memnuniyeti + söz durumu (UI rozetleri için) */
  minuteState: (playerId: string, rank: number, age: number) => { g: number; label: string | null; promise: 'none' | 'active' | 'kept' | 'broken' };
}

const GameCtx = createContext<(GameState & GameActions) | null>(null);
export const useGame = () => useContext(GameCtx)!;

// ─────────────────────────────────────────────────────────────
// Başlangıç durumu kurulumu
// ─────────────────────────────────────────────────────────────
function initTables(leagueOf: Record<string, LeagueId>): Record<LeagueId, TableRow[]> {
  const t: Record<LeagueId, TableRow[]> = { zirve: [], gecit: [], kok: [] };
  (Object.keys(t) as LeagueId[]).forEach((l) => { t[l] = []; });
  Object.entries(leagueOf).forEach(([id, l]) => t[l].push({ clubId: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  return t;
}

function initLeagueOf(): Record<string, LeagueId> {
  const out: Record<string, LeagueId> = {};
  CLUBS.forEach((c) => (out[c.id] = c.league));
  return out;
}

// Sistem D: ölçülebilir sakatlık çeşitleri (id, gösterim, ort tipik süre, şiddet)
const INJURY_TYPES: { type: PlayerInjury['type']; name: string; sev: 'hafif' | 'orta' | 'ciddi'; days: [number, number]; risk: boolean }[] = [
  { type: 'yorgunluk', name: 'Yorgunluk / Kas Sertliği', sev: 'hafif', days: [2, 5], risk: false },
  { type: 'adale_gerilmesi', name: 'Adale Gerilmesi (1. derece)', sev: 'hafif', days: [5, 10], risk: true },
  { type: 'ayak_bilegi_burkulmasi', name: 'Ayak Bileği Burkulması', sev: 'orta', days: [10, 21], risk: true },
  { type: 'adale_gerilmesi', name: 'Adale Yırtığı (2. derece)', sev: 'orta', days: [14, 28], risk: false },
  { type: 'diz_meniskus', name: 'Diz Menisküs Yırtığı', sev: 'ciddi', days: [45, 90], risk: false },
  { type: 'kirik', name: 'Taraksız Kemiği Kırığı', sev: 'ciddi', days: [30, 60], risk: false },
];

export function GameProvider({ career: initialCareer, snapshot, children }: {
  career: Career;
  snapshot?: SaveBlob | null;
  onExitToMenu?: () => void;
  children: React.ReactNode;
}) {
  const [st, setSt] = useState<PersistedState>(() => {
    if (snapshot) {
      const px = snapshot as unknown as PersistedState;
      // Aşama 1 → 2 migrasyonu: eksik alanları güvenli varsayılanlarla doldur
      const pxAny = px as unknown as Record<string, unknown>;
      const fallbackLeagueOf = px.leagueOf ?? initLeagueOf();
      const fallbackTable = px.table ?? initTables(fallbackLeagueOf);
      const fallbackCup = px.cup ?? buildCup((snapshot.career ?? initialCareer).seed);
      const fallbackIntl = buildInternationalSeason({ seasonNo: px.seasonNo ?? 1, seed: (snapshot.career ?? initialCareer).seed, tables: fallbackTable, domesticCup: fallbackCup });
      return {
        ...px,
        leagueOf: fallbackLeagueOf, table: fallbackTable, cup: fallbackCup,
        international: normalizeInternationalSeason(pxAny.international, fallbackIntl),
        internationalArchive: Array.isArray(pxAny.internationalArchive) ? pxAny.internationalArchive as InternationalArchiveEntry[] : [],
        playerClub: (pxAny.playerClub as Record<string, string>) ?? {},
        playerPatch: (pxAny.playerPatch as Record<string, Partial<Player>>) ?? {},
        extraPlayers: (pxAny.extraPlayers as Player[]) ?? [],
        removedPlayers: (pxAny.removedPlayers as string[]) ?? [],
        incomingOffers: (pxAny.incomingOffers as IncomingOffer[]) ?? [],
        transferLog: (pxAny.transferLog as TransferLogEntry[]) ?? [],
        matchReports: (pxAny.matchReports as MatchArchiveEntry[]) ?? [],
        sellOnClauses: normalizeSellOnClauses(pxAny.sellOnClauses),
        transferListed: (pxAny.transferListed as string[]) ?? [],
        oppMatchDays: (pxAny.oppMatchDays as Record<string, number>) ?? {},
        loans: (pxAny.loans as LoanEntry[]) ?? [],
        promises: (pxAny.promises as Record<string, MinutePromise>) ?? {},
        minuteNoted: (pxAny.minuteNoted as Record<string, number>) ?? {},
        extraSquads: (pxAny.extraSquads as Record<string, Player[]>) ?? {},
        career: {
          ...(snapshot.career ?? initialCareer),
          pending: {
            ...(snapshot.career ?? initialCareer).pending,
            marketShortlist: Array.isArray((snapshot.career ?? initialCareer).pending?.marketShortlist) ? (snapshot.career ?? initialCareer).pending.marketShortlist : [],
            marketShortlistPlayers: Array.isArray((snapshot.career ?? initialCareer).pending?.marketShortlistPlayers) ? (snapshot.career ?? initialCareer).pending.marketShortlistPlayers : [],
            activeProject: (snapshot.career ?? initialCareer).pending?.activeProject ?? null,
          },
          academyIntake: normalizeAcademyIntake((snapshot.career ?? initialCareer).academyIntake),
          culture: normalizeClubCulture((snapshot.career ?? initialCareer).culture, (snapshot.career ?? initialCareer).seed, (snapshot.career ?? initialCareer).clubId, clubById((snapshot.career ?? initialCareer).clubId).rivalIds ?? []),
          cultureHistory: (snapshot.career ?? initialCareer).cultureHistory ?? [],
        },
      };
    }
    const leagueOf = initLeagueOf();
    const table = initTables(leagueOf);
    const cup = buildCup(initialCareer.seed);
    const international = buildInternationalSeason({ seasonNo: 1, seed: initialCareer.seed, tables: table, domesticCup: cup });
    return {
      career: {
        ...initialCareer,
        culture: normalizeClubCulture(initialCareer.culture, initialCareer.seed, initialCareer.clubId, clubById(initialCareer.clubId).rivalIds ?? []),
        cultureHistory: initialCareer.cultureHistory ?? [],
      },
      seasonNo: 1,
      leagueOf,
      table,
      fixtures: buildLeagueFixtures(),
      friendlies: buildFriendlies(initialCareer.clubId, initialCareer.seed),
      cup,
      international,
      internationalArchive: [],
      inbox: [
        { id: 'm1', kind: 'yonetim', title: '2026–27 sezon hedefi', body: `${clubById(initialCareer.clubId).name} yönetim kurulundan hedef: “${clubById(initialCareer.clubId).boardGoal}”. Sportif hedef iş güvenliğinde öndedir.`, day: 1, read: false },
        { id: 'm2', kind: 'kadro', title: 'Kamp brifingi', body: 'Hazırlık kampı başladı. İlk hazırlık maçı 6. günde; lig fikstürü 27. günde başlar. Yoğunluk önerisi: Dengeli.', day: 1, read: false },
        { id: 'm3', kind: 'lig', title: 'Miras Kupası kuraları', body: 'Tam kura: 9 grup × 4 kulüp. Grup eşleşmeleri “Müsabakalar → Miras Kupası”nda. 9 lider + en iyi 7 ikinci Son 16 turuna yükselir.', day: 1, read: true },
        { id: 'm4-intl', kind: 'lig', title: 'Uluslararası kupalar: sezon kuraları', body: `${international.cups.map((competition) => `${competition.name}: 16 kulüp, 4 grup × 4; her gruptan ilk 2 çeyrek finale çıkar.`).join(' ')} Toplamda 24 yabancı kulüpten 16’sı kıta katsayısıyla katılır.`, day: 1, read: false },
      ],
      tactics: [
        { id: 'p1', name: 'Ana Plan', formation: '4-3-3', plan: 'dengeli', press: 'mid', tempo: 'mid', direction: 'balanced', defLine: 'normal', passRisk: 'mid', width: 55, fbAdvanced: false, midLine: 'mid', strikerSupport: 'mid', setPieces: { captain: null, penalty: null, cornerL: null, cornerR: null, fkShort: null, fkLong: null } },
        { id: 'p2', name: 'Hücum Planı', formation: '4-3-3', plan: 'yuksekPres', press: 'high', tempo: 'high', direction: 'balanced', defLine: 'high', passRisk: 'direct', width: 60, fbAdvanced: true, midLine: 'high', strikerSupport: 'low', setPieces: { captain: null, penalty: null, cornerL: null, cornerR: null, fkShort: null, fkLong: null } },
        { id: 'p3', name: 'Savunma Planı', formation: '5-3-2', plan: 'dusukBlok', press: 'low', tempo: 'low', direction: 'balanced', defLine: 'deep', passRisk: 'safe', width: 40, fbAdvanced: false, midLine: 'low', strikerSupport: 'high', setPieces: { captain: null, penalty: null, cornerL: null, cornerR: null, fkShort: null, fkLong: null } },
        { id: 'p4', name: 'Kontra Planı', formation: '4-2-3-1', plan: 'hizliKontra', press: 'mid', tempo: 'high', direction: 'balanced', defLine: 'normal', passRisk: 'direct', width: 50, fbAdvanced: false, midLine: 'mid', strikerSupport: 'low', setPieces: { captain: null, penalty: null, cornerL: null, cornerR: null, fkShort: null, fkLong: null } },
        { id: 'p5', name: 'Özel Plan', formation: '4-2-3-1', plan: 'kanat', press: 'mid', tempo: 'mid', direction: 'balanced', defLine: 'normal', passRisk: 'mid', width: 75, fbAdvanced: true, midLine: 'mid', strikerSupport: 'mid', setPieces: { captain: null, penalty: null, cornerL: null, cornerR: null, fkShort: null, fkLong: null } },
      ],
      extraSquads: {},
      budget: { tb: clubById(initialCareer.clubId).transferBudget },
      seasonHistory: [],
      seasonFinale: null,
      transfers: [],
      playerClub: {}, playerPatch: {}, extraPlayers: [], removedPlayers: [],
      incomingOffers: [], transferLog: [], matchReports: [], sellOnClauses: {}, transferListed: [], oppMatchDays: {}, 
    };
  });

  const stateRef = useRef(st);
  const clinicInFlightRef = useRef(new Set<string>()); // klinik çift tıklama kilidi
  stateRef.current = st;
  useEffect(() => { applyComfortSettings(st.career.settings); }, []); // girişte konfor ayarları uygulanır

  const worldSeed = st.career.seed;
  // §6.4 Dünya Dönemi etkisi: kariyer başında sabitlenir (kilitlenen rekabet kuralı)
  const eraMods = useMemo(() => {
    const era = st.career.manager.era;
    const rng = mulberry32(worldSeed + 101);
    const out: Record<string, number> = {};
    const all = [...CLUBS].sort((a, b) => b.strength - a.strength);
    if (era === 'yerlesik') {
      all.slice(0, 5).forEach((c) => (out[c.id] = 2));       // tarihî güçlüler belirginleşir
      all.slice(-5).forEach((c) => (out[c.id] = -1));
    } else if (era === 'acik') {
      all.slice(0, 5).forEach((c) => (out[c.id] = -1));      // favori avantajı kırılır
      all.slice(-6).forEach((c) => (out[c.id] = 2));         // beklenmedik adaylar
      all.slice(5, 17).forEach((c) => (out[c.id] = rng() < 0.5 ? 1 : 0));
    } else {
      // Geçiş Dönemi (varsayılan): hafif karışıklık
      all.slice(0, 4).forEach((c) => (out[c.id] = 1));
      all.slice(-5).forEach((c) => (out[c.id] = 1));
    }
    CLUBS.filter((c) => !(c.id in out)).forEach((c) => (out[c.id] = 0));
    return out;
  }, [worldSeed, st.career.manager.era]);

  // Tüm kulüp kadroları (36) seed'den bir kez; §8.5 + §16.3
  const baseSquads = useMemo(() => {
    const out: Record<string, Player[]> = {};
    [...CLUBS, ...INTERNATIONAL_CLUBS].forEach((c) => { out[c.id] = genSquad(c, worldSeed); });
    return out;
  }, [worldSeed]);

  // Aşama 2 kalıcı dünya modeli:
  // - baseSquads: seed üretimi başlangıç dünyası (transferler bu dizileri değiştirmez;
  //   her oyuncu playerClub override'ı ve removed listesiyle doğru kulübe dağıtılır)
  // - playerPatch: form/kondisyon/gelişim gibi dinamik alanların son hâli
  const squads = useMemo(() => {
    const merged: Record<string, Player[]> = {};
    const push = (p0: Player) => {
      const patch = st.playerPatch[p0.id];
      const p = patch ? { ...p0, ...patch } : p0;
      if (st.removedPlayers.includes(p.id)) return;
      const cid = st.playerClub[p.id] ?? p.clubId;
      (merged[cid] ??= []).push({ ...p, clubId: cid });
    };
    Object.values(baseSquads).forEach((arr) => arr.forEach(push));
    st.extraPlayers.forEach(push);
    // Aşama 1 kayıtlarından taşınan extraSquads (varsa) — treat as overrides
    Object.entries(st.extraSquads).forEach(([cid, arr]) => {
      arr.forEach((p0) => {
        if (st.removedPlayers.includes(p0.id)) return;
        const patch = st.playerPatch[p0.id];
        const p = patch ? { ...p0, ...patch } : p0;
        (merged[cid] ??= []).push({ ...p, clubId: cid });
      });
    });
    return merged;
  }, [baseSquads, st.playerPatch, st.playerClub, st.extraPlayers, st.removedPlayers, st.extraSquads]);

  // Oyuncu lookup (base squad + overrides).
  const playerOf = useCallback((playerId: string): Player | null => {
    for (const arr of Object.values(squads)) { const p = arr.find((x) => x.id === playerId); if (p) return p; }
    return null;
  }, [squads]);

  const clubOfPlayer = useCallback((playerId: string): string | null => {
    const p = playerOf(playerId);
    return p ? p.clubId : null;
  }, [playerOf]);

  const effectiveStrength = useCallback((clubId: string) => {
    const s = squads[clubId] ?? [];
    const top = [...s].sort((a, b) => b.ratings.gen - a.ratings.gen).slice(0, 11);
    const base = top.length ? Math.round(top.reduce((x, p) => x + p.ratings.gen, 0) / top.length) : clubById(clubId).strength;
    return Math.max(40, Math.min(95, base + (eraMods[clubId] ?? 0)));
  }, [squads, eraMods]);

  const myClub = useMemo(() => ({ ...clubById(st.career.clubId), league: st.leagueOf[st.career.clubId] }), [st.career.clubId, st.leagueOf]);
  const myLeague = myClub.league;
  const mySquad = squads[st.career.clubId] ?? [];

  // Kullanıcının tüm resmi maçları (lig + kupa + hazırlık), gün sıralı
  const allMyFixtures = useMemo(() => {
    const mine = (f: DemoFixture) => f.homeId === st.career.clubId || f.awayId === st.career.clubId;
    return [...st.fixtures.filter((f) => f.comp === 'lig' && f.league === st.leagueOf[st.career.clubId] && mine(f)),
      ...st.cup.fixtures.filter(mine),
      ...st.friendlies.filter(mine),
      ...internationalFixtures(st.international?.cups ?? []).filter(mine),
      ...st.cup.rounds.flatMap((r) => r.ties.filter((t) => mine(t as unknown as DemoFixture)).map((t) => ({ ...(t as unknown as Record<string, unknown>), round: 0, played: !!t.winner, day: r.day, comp: 'kupa-ko' as const, koRound: r.name }) as DemoFixture))]
      .sort((a, b) => a.day - b.day);
  }, [st.fixtures, st.cup, st.friendlies, st.international, st.career.clubId, st.leagueOf]);

  const nextFixture = useMemo(() => allMyFixtures.find((f) => !f.played) ?? null, [allMyFixtures]);

  const unread = st.inbox.filter((m) => !m.read).length;

  // ── Kaydetme (§3.3: gün sonu / maç sonu / transfer / sezon / çıkış) ──
  const saveNow = useCallback(async () => {
    const s = stateRef.current;
    const { career: _omitCareer, ...rest } = s;
    void _omitCareer;
    const full = {
      ...rest,
      career: s.career,
      version: SAVE_VERSION,
      day: s.career.day,
    } as unknown as SaveBlob;
    // FIX P1/3: ilk kayıt day-1'da retry'li; sonrası sessiz ama aerobik. Böylece soğuk profil ilk kurulumu kaybolmaz.
    const isFirstWrite = s.career.day === 1 && s.fixtures.every((f) => !f.played);
    if (isFirstWrite) {
      const res = await writeSaveRetry(full, 3);
      if (!res) {
        // retry da tükendiyse kullanıcıya haber ver — global unhandled yerine toast yerine console+a11y göstergesinde
        console.error('[save] İlk kariyer kaydı 3 denemede de yazılamadı — sayfa yenilenebilir.');
      }
    } else {
      await writeSave(full).catch(() => {});
    }
  }, []);

  // FIX P1/3 devamı: mount sonrası 300ms'de ilk kariyer kaydını yaz (başarısızsa 3 retry'lı yukarıda)
  useEffect(() => {
    const freshAndEmpty = !snapshot && stateRef.current.career.day === 1;
    if (!freshAndEmpty) return;
    const t = setTimeout(() => { void saveNow(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Çıkışta kaydet
  useEffect(() => {
    const h = () => { void saveNow(); };
    window.addEventListener('pagehide', h);
    window.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && h());
    return () => { window.removeEventListener('pagehide', h); };
  }, [saveNow]);

  // ── Örnek gol dağılımı + dünya/zorluk ayarları (§8.4, §10.9) ──

  // FAZ 4: simGoals üzerinden golleri kadro oyuncularına dağıt (deterministik, rng seed'li)
  const attributeGoals = useCallback((stats: NonNullable<PersistedState['playerStats']>, clubId: string, goals: number, rng: () => number): NonNullable<PersistedState['playerStats']> => {
    if (goals <= 0) return stats;
    const sq = squads[clubId] ?? [];
    if (!sq.length) return stats;
    // Hücum önceliği: ST/WG/AM daha şanslı
    const weighted = [...sq].sort((a, b) => {
      const wa = a.group === 'ST' ? 4 : a.group === 'WG' ? 3 : a.group === 'AM' ? 2.5 : a.group === 'CM' ? 1.5 : 0.8;
      const wb = b.group === 'ST' ? 4 : b.group === 'WG' ? 3 : b.group === 'AM' ? 2.5 : b.group === 'CM' ? 1.5 : 0.8;
      return wb * (b.ratings.gen / 70) - wa * (a.ratings.gen / 70);
    });
    const out = { ...stats };
    for (let i = 0; i < goals; i++) {
      const idx = Math.floor((rng() ** 2) * Math.min(8, weighted.length));
      const scorer = weighted[idx];
      const prev = out[scorer.id] ?? { playerId: scorer.id, clubId, goals: 0, assists: 0, yellows: 0, reds: 0, ratingSum: 0, apps: 0 };
      out[scorer.id] = { ...prev, goals: prev.goals + 1, apps: prev.apps + 1 };
      // %65 ihtimalle asist de dağıt (farklı oyuncu)
      if (rng() < 0.65) {
        const aIdx = Math.floor((rng() ** 1.5) * Math.min(10, weighted.length));
        const assister = weighted[aIdx];
        if (assister.id !== scorer.id) {
          const pa = out[assister.id] ?? { playerId: assister.id, clubId, goals: 0, assists: 0, yellows: 0, reds: 0, ratingSum: 0, apps: 0 };
          out[assister.id] = { ...pa, assists: pa.assists + 1, apps: pa.apps + 1 };
        }
      }
    }
    return out;
  }, [squads]);

  // Motor maçı için: res.engine.playerRows üzerinden tam doğru birikim (gol+asist+kartlar)
  const digestEngineRows = useCallback((stats: NonNullable<PersistedState['playerStats']>, rows: Record<string, { min: number; g: number; a: number; yellow: number; red: number; rating: number; conceded?: number; posGroup?: string }>, clubIdHome: string, squadHome: Player[], squadAway: Player[]): NonNullable<PersistedState['playerStats']> => {
    const out = { ...stats };
    Object.entries(rows).forEach(([pid, r]) => {
      if (!r.min) return;
      const club = squadHome.some((p) => p.id === pid) ? clubIdHome : (squadAway.some((p) => p.id === pid) ? '?' : '?');
      // Gerçek clubId çöz
      const realClub = squads ? Object.keys(squads).find((cid) => (squads[cid] ?? []).some((p) => p.id === pid)) ?? club : club;
      const prev = out[pid] ?? { playerId: pid, clubId: realClub, goals: 0, assists: 0, yellows: 0, reds: 0, ratingSum: 0, apps: 0, conceded: 0, cleanSheets: 0 };
      const con = r.conceded ?? 0;
      const isGK = r.posGroup === 'GK';
      out[pid] = {
        ...prev, clubId: realClub,
        goals: prev.goals + r.g, assists: prev.assists + r.a,
        yellows: prev.yellows + r.yellow, reds: prev.reds + r.red,
        ratingSum: prev.ratingSum + r.rating, apps: prev.apps + 1,
        // v0.9.5 GK hijyeni
        conceded: (prev.conceded ?? 0) + con,
        cleanSheets: (prev.cleanSheets ?? 0) + (isGK && con === 0 ? 1 : 0),
      };
    });
    return out;
  }, [squads]);

  const simGoals = useCallback((strH: number, strA: number, rng: () => number): [number, number] => {
    const pace = stateRef.current.career.settings.goalPace === 'dusuk' ? 0.85 : stateRef.current.career.settings.goalPace === 'yuksek' ? 1.18 : 1;
    const jitter = stateRef.current.career.settings.randomness === 'low' ? 0.45 : stateRef.current.career.settings.randomness === 'high' ? 0.95 : 0.7;
    const base = (1.28 + (strH - strA) * 0.055 + 0.22) * pace;
    const lamH = Math.max(0.15, base + (rng() - 0.5) * 0.8 * (1 + jitter));
    const lamA = Math.max(0.12, (1.25 - base * 0.42) * pace + (rng() - 0.5) * 0.8 * (1 + jitter));
    const pois = (l: number) => { let L = Math.exp(-l), k = 0, p = 1; do { k++; p *= rng(); } while (p > L); return k - 1; };
    return [Math.min(6, pois(lamH)), Math.min(6, pois(lamA))];
  }, []);

  const applyResultToTable = useCallback((table: Record<LeagueId, TableRow[]>, fixture: DemoFixture, hg: number, ag: number): Record<LeagueId, TableRow[]> => {
    if (fixture.comp !== 'lig' || !fixture.league) return table;
    const l = fixture.league;
    const rows = table[l].map((r) => ({ ...r }));
    const apply = (id: string, gf: number, ga: number) => {
      const row = rows.find((r) => r.clubId === id)!;
      row.p++; row.gf += gf; row.ga += ga;
      if (gf > ga) { row.w++; row.pts += 3; } else if (gf === ga) { row.d++; row.pts += 1; } else row.l++;
    };
    apply(fixture.homeId, hg, ag); apply(fixture.awayId, ag, hg);
    rows.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    return { ...table, [l]: rows };
  }, []);

  // AI fikstürlerini simüle et (belirli gün veya tümü)
  const simulateDayFixtures = useCallback((s: PersistedState, day: number, seedShift: number, includeMine = false): { s: PersistedState; notes: string[] } => {
    const notes: string[] = [];
    let fixtures = s.fixtures;
    let table = s.table;
    let cup = s.cup;
    let international = s.international;
    let friendlies = s.friendlies;
    const rng = mulberry32(worldSeed + day * 991 + seedShift);
    // Dalga 1 (v0.5): işsiz kullanıcıda eski kulübün maçları da AI'ya devredilir
    const isMine = (f: DemoFixture) => !includeMine && (f.homeId === s.career.clubId || f.awayId === s.career.clubId);

    // Lig fikstürleri (kullanıcının maçı hariç)
    let pStats = s.playerStats ?? {};
    fixtures = fixtures.map((f) => {
      if (f.played || f.day !== day || isMine(f)) return f;
      const [hg, ag] = simGoals(effectiveStrength(f.homeId), effectiveStrength(f.awayId), rng);
      table = applyResultToTable(table, f, hg, ag);
      if (f.comp === 'lig') {
        pStats = attributeGoals(pStats, f.homeId, hg, rng);
        pStats = attributeGoals(pStats, f.awayId, ag, rng);
      }
      return { ...f, played: true, hg, ag };
    });

    // Kupa grup maçları
    let cupFixtureChanged = false;
    const newCupFixtures = cup.fixtures.map((f) => {
      if (f.played || f.day !== day || isMine(f)) return f;
      const [hg, ag] = simGoals(effectiveStrength(f.homeId), effectiveStrength(f.awayId), rng);
      cupFixtureChanged = true;
      return { ...f, played: true, hg, ag };
    });
    if (cupFixtureChanged) cup = { ...cup, fixtures: newCupFixtures };

    // Hazırlık maçları (AI tarafı yok ama güvenlik için)
    friendlies = friendlies.map((f) => {
      if (f.played || f.day !== day || isMine(f)) return f;
      const [hg, ag] = simGoals(effectiveStrength(f.homeId), effectiveStrength(f.awayId), rng);
      return { ...f, played: true, hg, ag };
    });

    // Kupa KO turları (AI)
    const mineId = s.career.clubId;
    const newRounds = cup.rounds.map((r) => {
      if (r.day !== day || r.ties.every((t) => t.winner)) return r;
      const ties = r.ties.map((t) => {
        if (t.winner || t.homeId === mineId || t.awayId === mineId) return t;
        const [hg, ag] = simGoals(effectiveStrength(t.homeId), effectiveStrength(t.awayId), rng);
        let winner = hg > ag ? t.homeId : ag > hg ? t.awayId : null;
        let pens = false;
        if (!winner) { pens = true; winner = rng() < 0.5 ? t.homeId : t.awayId; }
        return { ...t, hg, ag, pens, winner };
      });
      const played = ties.every((t) => t.winner);
      return { ...r, ties, played };
    });
    if (JSON.stringify(newRounds) !== JSON.stringify(cup.rounds)) cup = { ...cup, rounds: newRounds };

    // International group/knockout fixtures use foreign fictional squads but never touch domestic league tables.
    for (const fixture of internationalFixtures(international.cups)) {
      if (fixture.played || fixture.day !== day || isMine(fixture)) continue;
      const [hg, ag] = simGoals(effectiveStrength(fixture.homeId), effectiveStrength(fixture.awayId), rng);
      let internationalCups = recordInternationalResult(international.cups, fixture, hg, ag, worldSeed + day * 313);
      internationalCups = recordInternationalAiScorers(internationalCups, fixture.internationalCupId, fixture.homeId, hg, squads[fixture.homeId] ?? [], rng);
      internationalCups = recordInternationalAiScorers(internationalCups, fixture.internationalCupId, fixture.awayId, ag, squads[fixture.awayId] ?? [], rng);
      international = { ...international, cups: internationalCups };
      pStats = attributeGoals(pStats, fixture.homeId, hg, rng);
      pStats = attributeGoals(pStats, fixture.awayId, ag, rng);
    }

    return { s: { ...s, fixtures, table, cup, international, friendlies, playerStats: pStats }, notes };
  }, [worldSeed, effectiveStrength, simGoals, applyResultToTable, attributeGoals]);


  // ── Aşama 2: dinamik durum evrimi (§8.3) ──
  // Maç günü: oynamış oyuncularda kondisyon düşer, sharpness yükselir, küçük kart/ceza riski.
  // Maçsız gün: kondisyon toparlanır, forma hafif regresyon, sakat sayacı azalır.
  const evolvePlayers = useCallback((s: PersistedState, newDay: number, playedToday: string | null, actualPlayedIds?: string[]): Record<string, Partial<Player>> => {
    const patch = { ...s.playerPatch };
    const rng = mulberry32(worldSeed + newDay * 313);
    const squad = squads[s.career.clubId] ?? [];
    const playedSet = new Set<string>(); // maç günü ilk 18 varsayımı: form+sharpness ≥65 sıralı (demo)
    if (playedToday) {
      [...squad]
        .filter((p) => (patch[p.id]?.injuredDays ?? p.injuredDays) <= 0 && (patch[p.id]?.suspendedMatches ?? p.suspendedMatches) <= 0)
        .sort((a, b) => ((patch[b.id]?.form ?? b.form) + (patch[b.id]?.fitness ?? b.fitness)) - ((patch[a.id]?.form ?? a.form) + (patch[a.id]?.fitness ?? a.fitness)))
        .slice(0, 18).forEach((p) => playedSet.add(p.id));
      // Gerçek maç raporundan oyuncu dakikası (özellikle iğneyle oynayan sakat) da yorgunluğa dahil.
      (actualPlayedIds ?? []).forEach((id) => playedSet.add(id));
    }
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    squad.forEach((p) => {
      if (s.removedPlayers.includes(p.id)) return;
      const cur = patch[p.id] ? { ...p, ...patch[p.id] } : p;
      let { form, fitness, sharpness, injuredDays, suspendedMatches, ratings } = cur;
      let injury = cur.injury;
      injuredDays = Math.max(0, injuredDays - 1);
      if (injury) {
        injury = { ...injury, daysRemaining: injuredDays };
        const healthLvl2 = (s.career.clubFacilities?.health ?? clubById(s.career.clubId).facilities.health) || 2;
        if (injuredDays > 0 && healthLvl2 >= 3 && injuredDays % 7 === 0 && rng() < (healthLvl2 - 2) * 0.33) {
          injuredDays = Math.max(0, injuredDays - 1);          // sağlık tesisi 3+: erken iyileşme şansı
          injury = { ...injury, daysRemaining: injuredDays };
        }
        if (injuredDays === 0) injury = undefined;             // iyileşti
      }
      if (playedToday && playedSet.has(p.id)) {
        fitness = clamp(fitness - (7 + Math.floor(rng() * 7)), 25, 100);      // maç yorgunluğu
        sharpness = clamp(sharpness + 6, 0, 100);
        form = clamp(form + Math.floor(rng() * 7) - 2, 20, 99);              // forma hafif yükseliş eğilimi
        // Sarı kart cezası birikimi yok (demo) — %6 tek maç ceza
        if (rng() < 0.06 && suspendedMatches === 0) suspendedMatches = 1;
        // Sakatlık riski (§10.7 injuryRate ayarı + yorgunluk)
        const injMul = s.career.settings.injuryRate === 'dusuk' ? 0.4 : s.career.settings.injuryRate === 'yuksek' ? 2 : 1;
        const healthLvl = (s.career.clubFacilities?.health ?? clubById(s.career.clubId).facilities.health) || 2;
        const healthDrain = 1 - (healthLvl - 1) * 0.08; // seviye başına %8 daha seyrek
        if (injuredDays === 0 && rng() < 0.018 * injMul * (fitness < 45 ? 2.2 : 1) * healthDrain) {
          const it = INJURY_TYPES[Math.floor(rng() * INJURY_TYPES.length)];
          injuredDays = it.days[0] + Math.floor(rng() * (it.days[1] - it.days[0]));
          injury = { type: it.type, name: it.name, daysRemaining: injuredDays, severity: it.sev, canPlayWithRisk: it.risk };
        }
        if (suspendedMatches > 0) suspendedMatches = Math.max(0, suspendedMatches - 1 / 3) | 0; // basit: maç sayar
      } else {
        fitness = clamp(fitness + 6, 0, 100);                                 // dinlenme
        sharpness = clamp(sharpness - 1.5, 0, 100);
        form = clamp(form + Math.floor(rng() * 5) - 2, 20, 99);
        if (suspendedMatches > 0) suspendedMatches = suspendedMatches - 1;    // maçsız gün ceza işlemez — yalnız pazartesi haftalık düşüm
      }
      // v0.9.9 Ağabeylik: 29+ mentor atanmış u23 oyuncu günlük ritim/form desteği + seyrek GEN sıçraması
      if (cur.mentorId && cur.age <= 23) {
        const mentor = squad.find((m) => m.id === cur.mentorId);
        if (mentor && mentor.age >= 29) {
          sharpness = clamp(sharpness + 0.5, 0, 100);
          form = clamp(form + 0.3, 20, 99);
          if (cur.age <= 21 && mentor.ratings.gen >= ratings.gen + 8 && ratings.gen < cur.potential && rng() < 0.012) {
            ratings = { ...ratings, gen: ratings.gen + 1 };   // ağabey gözetiminde seyrek gelişim sıçraması
          }
        }
      }
      patch[p.id] = { form: Math.round(form), fitness: Math.round(fitness), sharpness: Math.round(sharpness), injuredDays, injury, suspendedMatches: Math.max(0, Math.round(suspendedMatches)), ratings };
    });
    return patch;
  }, [worldSeed, squads]);

  // ── Aşama 2: AI gelen teklif üretimi (§11.3) — pencere içinde, haftada 0-2 teklif ──
  const maybeSpawnOffer = useCallback((s: PersistedState, newDay: number): { offers: IncomingOffer[]; notes: string[] } => {
    const notes: string[] = [];
    if (!inWindow(newDay)) return { offers: s.incomingOffers, notes };
    const rng = mulberry32(worldSeed + newDay * 6617);
    if (rng() > 0.16) return { offers: s.incomingOffers, notes };
    const squad = (squads[s.career.clubId] ?? []).filter((p) => !s.removedPlayers.includes(p.id));
    if (!squad.length) return { offers: s.incomingOffers, notes };
    // Hedef önceliği: satış listesi > yüksek performanslı genç/yıldız
    const listed = squad.filter((p) => s.transferListed.includes(p.id));
    const pool = listed.length ? listed : [...squad].sort((a, b) => b.ratings.gen - a.ratings.gen).slice(0, 7);
    const target = pool[Math.floor(rng() * pool.length)];
    if (s.incomingOffers.some((o) => o.playerId === target.id && o.state === 'open')) return { offers: s.incomingOffers, notes };
    if (target.wage < 500 && !listed.length && rng() < 0.5) return { offers: s.incomingOffers, notes }; // düşük profil oyuncuya seyrek ilgi
    const buyers = CLUBS.filter((c) => c.id !== s.career.clubId && c.strength >= target.ratings.gen - 6);
    const buyer = buyers[Math.floor(rng() * buyers.length)] ?? CLUBS[Math.floor(rng() * CLUBS.length)];
    const value = playerValue(target, s.leagueOf[s.career.clubId]);
    const fee = Math.round(value * (0.75 + rng() * 0.7) * 10) / 10;
    const of: IncomingOffer = {
      id: `of-${newDay}-${target.id}`,
      playerId: target.id, fromClubId: buyer.id, fee,
      day: newDay, expiresDay: newDay + 5, negotiable: rng() < 0.7, state: 'open',
    };
    notes.push(`📩 ${buyer.name}, ${target.name} için ₺${fee}M teklif gönderdi (Piyasa → Gelen Teklifler).`);
    return { offers: [of, ...s.incomingOffers], notes };
  }, [worldSeed, squads]);

  // Kupa grup aşaması → Son 16 kurulumu (§4.3: 9 lider + en iyi 7 ikinci)
  const buildKnockouts = useCallback((s: PersistedState): { s: PersistedState; notes: string[] } => {
    const notes: string[] = [];
    const cup = s.cup;
    if (cup.rounds.length > 0) return { s, notes };
    const allPlayed = cup.fixtures.every((f) => f.played);
    if (!allPlayed) return { s, notes };
    const winners: string[] = [];
    const seconds: { id: string; pts: number; gd: number; gf: number }[] = [];
    Object.keys(cup.groups).forEach((g) => {
      const t = cupGroupTable(cup, g);
      winners.push(t[0].clubId);
      seconds.push({ id: t[1].clubId, pts: t[1].pts, gd: t[1].gf - t[1].ga, gf: t[1].gf });
    });
    seconds.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    const qualified = [...winners, ...seconds.slice(0, 7).map((x) => x.id)];
    const rng = mulberry32(worldSeed + 9999);
    // Eşleştirme: grup liderleri seribaşı avantajıyla karıştır
    const seeds = [...winners].sort(() => rng() - 0.5);
    const unseeds = [...seconds.slice(0, 7).map((x) => x.id)].sort(() => rng() - 0.5);
    const ties: CupTie[] = [];
    const pool = [...qualified];
    for (let i = 0; i < 8; i++) {
      const home = seeds[i] ?? pool.splice(Math.floor(rng() * pool.length), 1)[0];
      const away = unseeds[i] ?? pool.splice(Math.floor(rng() * pool.length), 1)[0];
      if (home && away) ties.push({ id: `r16-${i}`, homeId: home, awayId: away });
    }
    const userIn = ties.some((t) => t.homeId === s.career.clubId || t.awayId === s.career.clubId);
    notes.push(userIn
      ? 'Miras Kupası: Son 16 turuna yükseldin! Eşleşmen Müsabakalar → Miras Kupası ekranında.'
      : 'Miras Kupası grup aşaması tamamlandı. Son 16 kura yapıldı.');
    return { s: { ...s, cup: { ...cup, rounds: [{ name: 'Son 16', day: 149, ties, played: false }] } }, notes };
  }, [worldSeed]);

  const advanceKnockouts = useCallback((s: PersistedState): { s: PersistedState; notes: string[] } => {
    const notes: string[] = [];
    const cup = s.cup;
    if (!cup.rounds.length) return { s, notes };
    const idx = cup.rounds.findIndex((r) => !r.played);
    if (idx === -1) {
      if (!cup.champion && cup.rounds.every((r) => r.played)) {
        const final = cup.rounds[cup.rounds.length - 1];
        const t = final.ties[0];
        if (t?.winner) {
          notes.push(`${clubById(t.winner).name} Miras Kupası'nı kazandı! Final: Birlik Miras Stadyumu.`);
          return { s: { ...s, cup: { ...cup, champion: t.winner } }, notes };
        }
      }
      return { s, notes };
    }
    const r = cup.rounds[idx];
    if (!r.ties.every((t) => t.winner)) return { s, notes };
    // Sonraki tur
    const winners = r.ties.map((t) => t.winner!);
    const sched: Record<string, { name: string; day: number }> = {
      'Son 16': { name: 'Çeyrek Final', day: 223 },
      'Çeyrek Final': { name: 'Yarı Final', day: 265 },
      'Yarı Final': { name: 'Final', day: 300 },
    };
    const nxt = sched[r.name];
    if (!nxt) return { s, notes };
    const rng = mulberry32(worldSeed + idx * 137 + 55);
    const shuffled = [...winners].sort(() => rng() - 0.5);
    const ties: CupTie[] = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      if (shuffled[i + 1]) ties.push({ id: `${nxt.name}-${i / 2}`, homeId: shuffled[i], awayId: shuffled[i + 1] });
    }
    notes.push(`Miras Kupası: ${nxt.name} kurası ${dayToDate(nxt.day).split(' ').slice(0, 2).join(' ')} tarihinde.`);
    return { s: { ...s, cup: { ...cup, rounds: [...cup.rounds, { ...nxt, ties, played: false }] } }, notes };
  }, [worldSeed]);

  // Kullanıcı maçını sonuca işle (tüm resmi/comp varyantları dahil)
  const finishUserFixture = useCallback((s: PersistedState, fx: DemoFixture, hg: number, ag: number): PersistedState => {
    const add = (arr: DemoFixture[]) => arr.map((f) => (f.day === fx.day && f.homeId === fx.homeId && f.awayId === fx.awayId && f.comp === fx.comp && !f.played ? { ...f, played: true, hg, ag } : f));
    let table = applyResultToTable(s.table, fx, hg, ag);
    let fixtures = s.fixtures;
    let friendlies = s.friendlies;
    let cup = s.cup;
    let international = s.international;
    if (fx.comp === 'lig') fixtures = add(fixtures);
    else if (fx.comp === 'hazirlik') friendlies = add(friendlies);
    else if (fx.comp === 'kupa') cup = { ...cup, fixtures: cup.fixtures.map((f) => (f.day === fx.day && f.homeId === fx.homeId && f.awayId === fx.awayId ? { ...f, played: true, hg, ag } : f)) };
    else if (fx.comp === 'kupa-ko') cup = { ...cup, rounds: cup.rounds.map((r) => r.day === fx.day ? { ...r, ties: r.ties.map((t) => ((t.homeId === fx.homeId && t.awayId === fx.awayId) ? { ...t, hg, ag, pens: hg === ag, winner: (() => { if (hg > ag) return fx.homeId; if (ag > hg) return fx.awayId; const pSeed = (s.career.seed + fx.day * 197 + hg * 13 + ag * 7) >>> 0; return mulberry32(pSeed)() < 0.5 ? fx.homeId : fx.awayId; })() } : t)), played: r.ties.every((t) => t.winner || (t.homeId === fx.homeId && t.awayId === fx.awayId)) } : r) };
    else if (fx.comp === 'intl-grup' || fx.comp === 'intl-ko') international = { ...international, cups: recordInternationalResult(international.cups, fx, hg, ag, s.career.seed + fx.day * 313) };
    return { ...s, table, fixtures, friendlies, cup, international };
  }, [applyResultToTable]);

  // Sezon sonu: yükselme/düşme + yeni sezon (§4.3, §14)
  const startNewSeason = useCallback((s: PersistedState): { s: PersistedState; notes: string[] } => {
    const notes: string[] = [];
    const lid = s.leagueOf[s.career.clubId];
    const myTable = s.table[lid];
    const myRank = myTable.findIndex((r) => r.clubId === s.career.clubId) + 1;
    const myPts = myTable.find((r) => r.clubId === s.career.clubId)?.pts ?? 0;
    const cupReach = !s.cup.rounds.length ? 'Grup Aşaması' : s.cup.champion === s.career.clubId ? 'Şampiyon' : (s.cup.rounds[s.cup.rounds.length - 1].ties.some((t) => t.homeId === s.career.clubId || t.awayId === s.career.clubId) ? s.cup.rounds[s.cup.rounds.length - 1].name : 'Tur');
    const season = `${2025 + s.seasonNo}–${String(26 + s.seasonNo).padStart(2, '0')}`;
    const history = [...s.seasonHistory, { season, clubId: s.career.clubId, leagueId: lid, rank: myRank, pts: myPts, cup: cupReach }];
    // Sistem F: sezon sonunda kupa müzesine ekleme
    let trophies = [...(s.career.trophyCabinet ?? [])];
    if (myRank === 1) trophies = [...trophies, { season, type: 'lig', title: `${LEAGUES[lid].name} Şampiyonluğu` }];
    if (cupReach === 'Şampiyon') trophies = [...trophies, { season, type: 'kupa', title: 'Miras Kupası' }];
    (s.international?.cups ?? []).filter((competition) => competition.champion === s.career.clubId).forEach((competition) => { trophies = [...trophies, { season, type: 'kupa', title: competition.name }]; });
    if (myRank <= 2 && lid !== 'zirve') trophies = [...trophies, { season, type: 'yukse', title: `${LEAGUES[lid].name}'den yükselme` }];
    // SeasonFinale hesaplaması myNewLeague sonrasında yapılacak

    // Ödül (§12.2 öneri tablosu)
    const prizeTable: Record<LeagueId, number[]> = { zirve: [25, 15, 10, 8, 5, 2], gecit: [9, 6.5, 4.5, 3.5, 2, 0.8], kok: [4.5, 3, 2.2, 1.6, 0.8, 0.3] };
    const prizeBand = prizeTable[lid];
    const prize = myRank <= 6 ? prizeBand[Math.min(myRank - 1, 5)] : prizeBand[lid === 'zirve' ? 5 : 5];
    const champ = myTable[0].clubId;
    notes.push(`2026–27 sezonu kapandı: ${clubById(champ).name} ${LEAGUES[lid].short} şampiyonu.`);
    notes.push(`Takımın ${myRank}. bitirdi (${myPts} puan). Ödül: ₺${prize}M.`);

    // FAZ 4: yeni sezonda oyuncu istatistik merkezi sıfırlanır
    // (sezona ait gol kralı/asist kralı ayrıldığı için sezonsal; sonraki genişleme: kariyer toplamı)

    // Terfi/düşme: Zirve son2↔Geçit ilk2, Geçit son2↔Kök ilk2; Kök son 2 düşmez (ilk sürüm)
    const leagueOf = { ...s.leagueOf };
    const zr = s.table.zirve, gc = s.table.gecit, kk = s.table.kok;
    zr.slice(-2).forEach((r) => { leagueOf[r.clubId] = 'gecit'; notes.push(`${clubById(r.clubId).name} Geçit Ulusal'a düştü.`); });
    gc.slice(0, 2).forEach((r) => { leagueOf[r.clubId] = 'zirve'; notes.push(`${clubById(r.clubId).name} Miras Zirve'ye yükseldi!`); });
    gc.slice(-2).forEach((r) => { leagueOf[r.clubId] = 'kok'; notes.push(`${clubById(r.clubId).name} Kök Bölge'ye düştü.`); });
    kk.slice(0, 2).forEach((r) => { leagueOf[r.clubId] = 'gecit'; notes.push(`${clubById(r.clubId).name} Geçit Ulusal'a yükseldi!`); });
    const myNewLeague = leagueOf[s.career.clubId];
    if (myNewLeague !== lid) notes.push(myNewLeague === 'zirve' ? `🎉 KULÜBÜN MİRAS ZİRVE LİGİ'NE YÜKSELDİ!` : myNewLeague > lid ? `Kulübün düştü: ${LEAGUES[myNewLeague].name}.` : `Kulübün yükseldi: ${LEAGUES[myNewLeague].name}.`);

    const seasonFinale: SeasonFinaleState = {
      season, clubId: s.career.clubId, leagueId: lid, rank: myRank, pts: myPts, cup: cupReach,
      championId: champ, cupWinnerId: s.cup.champion ?? null,
      promoted: myNewLeague === 'zirve' && lid !== 'zirve' || (lid === 'kok' && myNewLeague === 'gecit'),
      relegated: (lid === 'zirve' && myNewLeague === 'gecit') || (lid === 'gecit' && myNewLeague === 'kok'),
      champion: champ === s.career.clubId,
      cupWon: s.cup.champion === s.career.clubId,
      // Dalga 4: ödüller — playerStats aşağıda sıfırlanmadan ÖNCE hesaplanır
      awards: computeSeasonAwards(s.playerStats ?? {}, (pid) => playerOf(pid)?.age ?? null),
    };

    const newSeasonNo = s.seasonNo + 1;
    notes.push(`${2026 + s.seasonNo}–${26 + newSeasonNo} sezonu fikstürleri yenilendi; kamp ve transfer dönemi açıldı.`);
    const cup = buildCup(worldSeed + newSeasonNo * 31);
    const previousInternational = s.international;
    const internationalArchive = [...(s.internationalArchive ?? []), ...archiveInternationalSeason(previousInternational)].slice(-64);
    const international = buildInternationalSeason({ seasonNo: newSeasonNo, seed: worldSeed + newSeasonNo * 97, tables: s.table, domesticCup: s.cup });
    notes.push(`Uluslararası kura tamamlandı: ${international.cups.map((competition) => `${competition.name} (${competition.qualifiers.length}/16)`).join(' · ')}.`);

    // ── Aşama 2 sezon geçiş gelişimi: yaşlanma/gelişim/emeklilik + genç katılım (§8.3, §14) ──
    const rngAge = mulberry32(worldSeed + newSeasonNo * 4243);
    const playerPatch = { ...s.playerPatch };
    const removedPlayers = [...s.removedPlayers];
    const extraPlayers = [...s.extraPlayers];
    const clampAge = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    let retirees = 0, youths: { cid: string; p: Player }[] = [];
    // Dalga 3: kiralık dönüşleri (önce kiralık iade; sonra Bosman serbestleri)
    const loansBefore = s.loans ?? [];
    const backHome: Record<string, string> = {};
    const returnedLoans: { id: string; name: string }[] = [];
    expiringLoans(loansBefore, newSeasonNo).forEach((l) => {
      backHome[l.playerId] = l.fromClub;
      const nm = playerPatch[l.playerId]?.name ?? squads[l.toClub]?.find((x) => x.id === l.playerId)?.name ?? l.playerId;
      returnedLoans.push({ id: l.playerId, name: String(nm) });
    });
    const myReturners = returnedLoans.filter((l) => (loansBefore.find((x) => x.playerId === l.id)?.toClub) === s.career.clubId);
    if (myReturners.length) notes.push(`🔁 Kiralık dönüşü: ${myReturners.map((l) => l.name).join(', ')} kulüplerine geri döndü.`);
    const myLoanOutBack = returnedLoans.filter((l) => (loansBefore.find((x) => x.playerId === l.id)?.fromClub) === s.career.clubId);
    if (myLoanOutBack.length) notes.push(`🔁 Kiralık oyuncuların kadroya döndü: ${myLoanOutBack.map((l) => l.name).join(', ')}.`);
    // Dalga 3: Bosman — sözleşmesi 0'a düşenler serbest
    const bosmanFA: Record<string, string> = {};
    const myLeavers: string[] = [];
    const allLeavers: { cid: string; name: string }[] = [];
    Object.entries(squads).forEach(([cid, arr]) => {
      arr.forEach((p0) => {
        if (removedPlayers.includes(p0.id)) return;
        const cur = { ...p0, ...(playerPatch[p0.id] ?? {}) };
        if (cur.clubId !== cid) return;
        const age = cur.age + 1;
        const r = { ...cur.ratings };
        // Gelişim: <24 potansiyele doğru; 31+ doğal düşüş (§8.6)
        if (age < 24 && cur.potential > r.gen) {
          const grow = Math.min(cur.potential - r.gen, 1 + Math.floor(rngAge() * 3));
          r.gen = clampAge(r.gen + grow, 35, 97);
          r.tek = clampAge(r.tek + Math.floor(grow * 0.8), 35, 97);
          r.men = clampAge((r.men ?? 50) + Math.floor(grow * 0.5), 35, 97);
          r.fiz = clampAge(r.fiz + Math.floor(grow * 0.6), 35, 97);
        } else if (age >= 31) {
          const drop = age >= 34 ? 2 + Math.floor(rngAge() * 3) : age >= 32 ? Math.floor(rngAge() * 2) : Math.floor(rngAge() * 1.4);
          r.gen = clampAge(r.gen - drop, 30, 97); r.fiz = clampAge(r.fiz - drop - 1, 30, 97);
          r.att = clampAge((r.att ?? 50) - Math.floor(drop * 0.7), 30, 97);
        }
        const cy = Math.max(0, (cur.contractYears ?? 3) - 1);
        // Dalga 3 (Bosman): sözleşme bitti → bedelsiz serbest (transferListed temizliği aşağıda)
        if (cy === 0 && !backHome[p0.id]) {
          bosmanFA[p0.id] = FREE_CLUB;
          allLeavers.push({ cid, name: cur.name });
          if (cid === s.career.clubId) myLeavers.push(cur.name);
          // serbest oyuncu yaşlanmaya devam eder; formu piyasaya göre düşer
          playerPatch[p0.id] = { ...(playerPatch[p0.id] ?? {}), age: cur.age + 1, contractYears: 0, form: Math.max(45, cur.form - 8), fitness: Math.max(70, cur.fitness - 10), clubId: FREE_CLUB };
          return;
        }
        // Emeklilik: 36+ kesin-ish, 34-35 olasılıklı
        const retire = age >= 36 || (age >= 34 && rngAge() < 0.35);
        if (retire && !cur.important && age >= 34) {
          removedPlayers.push(p0.id);
          retirees++;
          return;
        }
        playerPatch[p0.id] = {
          ...(playerPatch[p0.id] ?? {}),
          age, contractYears: cy, ratings: r,
          form: 62 + Math.floor(rngAge() * 25), fitness: 88 + Math.floor(rngAge() * 10), sharpness: 35 + Math.floor(rngAge() * 30),
          injuredDays: 0, suspendedMatches: 0,
        };
      });
      // Emekli/sözleşme boşluğu gençle dolar: kadro < 19 ise gençler üret
      const alive = arr.filter((p0) => !removedPlayers.includes(p0.id));
      if (alive.length < 19) {
        const club = clubById(cid);
        for (let i = 0; i < 19 - alive.length; i++) {
          const y = genYouthRegen(club, worldSeed, newSeasonNo, i);
          extraPlayers.push(y);
          youths.push({ cid, p: y });
        }
      }
    });
    if (retirees) notes.push(`👴 Sezon sonunda ${retirees} oyuncu profesyonel futbolu bıraktı; boşluklar altyapıdan gençlerle doldu.`);
    if (allLeavers.length) notes.push(`📝 Bosman: ${allLeavers.length} oyuncunun sözleşmesi bitti — bedelsiz serbest piyasasında; ${allLeavers.slice(0, 3).map((l) => `${l.name} (${clubById(l.cid)?.short ?? l.cid})`).join(', ')}${allLeavers.length > 3 ? '…' : ''}`);
    if (myLeavers.length) notes.push(`⚠️ Yenileme yapmadığın ${myLeavers.length} oyuncun serbest kaldı: ${myLeavers.join(', ')} — tekrar almak istersen bedelsiz ama piyasada kapışılır.`);
    const myYouths = youths.filter((y) => y.cid === s.career.clubId);
    if (myYouths.length) notes.push(`🎓 Akademiden ${myYouths.length} genç A takıma çıktı: ${myYouths.slice(0, 2).map((y) => y.p.name).join(', ')}${myYouths.length > 2 ? '…' : ''}`);
    // extraPlayers içindeki önceki regen'ler de yaşlanır (patch iledier)
    extraPlayers.forEach((y) => {
      if (removedPlayers.includes(y.id)) return;
      const cur = { ...y, ...(playerPatch[y.id] ?? {}) };
      playerPatch[y.id] = { ...(playerPatch[y.id] ?? {}), age: cur.age + 1, contractYears: Math.max(1, (cur.contractYears ?? 3) - 1) };
    });
    // v0.9.5 Şartname FAZ A: kariyer dökümü arşivi — sezon istatistikleri sıfırlanmadan oyuncu yamalarına yaz
    // (sahte veri yok: sadece maça çıkmış (apps>0) oyuncu satır alır)
    Object.values(s.playerStats ?? {}).forEach((row) => {
      if (!row.apps) return;
      const prev = playerPatch[row.playerId] ?? {};
      const hist = [...(prev.careerHistory ?? [])];
      hist.push({
        season: s.seasonNo, clubId: row.clubId,
        apps: row.apps, goals: row.goals, assists: row.assists,
        conceded: (row.conceded ?? 0) || undefined,
        cleanSheets: (row.cleanSheets ?? 0) || undefined,
        avgRating: +(row.ratingSum / row.apps).toFixed(2),
      });
      playerPatch[row.playerId] = { ...prev, careerHistory: hist };
    });
    return {
      s: {
        ...s,
        leagueOf,
        seasonNo: newSeasonNo,
        seasonHistory: history,
      playerStats: {},
        seasonFinale,
        table: initTables(leagueOf),
        fixtures: buildLeagueFixtures(leagueOf),
        friendlies: buildFriendlies(s.career.clubId, worldSeed + newSeasonNo * 31),
        cup,
        international, internationalArchive,
        budget: { ...s.budget, tb: Math.round((s.budget.tb + prize) * 10) / 10 },
        playerPatch, removedPlayers, extraPlayers,
        playerClub: { ...s.playerClub, ...backHome, ...bosmanFA },
        transferListed: s.transferListed.filter((id) => !bosmanFA[id]),
        loans: activeLoans(loansBefore, newSeasonNo),
        career: {
          ...s.career, day: 1, week: 1, managerYellowCards: 0, academyIntake: undefined,
          culture: addSeasonCultureHonors(normalizeClubCulture(s.career.culture, s.career.seed, s.career.clubId, clubById(s.career.clubId).rivalIds ?? []), newSeasonNo, s.career.day),
        },
        inbox: [...s.inbox,
          { id: `szn-${newSeasonNo}`, kind: 'lig', title: `Yeni sezon: ${2026 + s.seasonNo}–${26 + newSeasonNo}`, body: `${season} arşivi kaydedildi. Yeni fikstürler, yeni Miras Kupası kuraları hazır. Hedef yenilendi: yönetim brifingini bekle. Geçen sezon: ${myRank}. sıra, ${myPts}p, kupa: ${cupReach}.`, day: 1, read: false },
        ],
      },
      notes,
    };
  }, [worldSeed, squads]);

  // ── GÜN İLERLETME MOTORU ──
  const clearSeasonFinale = useCallback(() => { setSt((s) => ({ ...s, seasonFinale: null })); setTimeout(() => { void saveNow(); }, 150); }, [saveNow]);

  const advanceDay = useCallback((): AdvanceResult => {
    const s = stateRef.current;
    const stDay = s.career.day;
    const todayFixtures = allMyFixtures.filter((f) => !f.played && f.day === stDay);
    const jobless = !!s.career.jobSearch; // Dalga 1 (v0.5): işsiz menajer günü maç engeli olmadan geçirir
    // §5.4 — Kritik karar varsa ilerleme engellenir ve sebep girer
    if (todayFixtures.length > 0 && !jobless) {
      const fixture = todayFixtures[0];
      const matchName = fixture.comp === 'hazirlik' ? 'hazırlık maçın' : fixture.comp === 'lig' ? 'lig maçın' : fixture.comp.startsWith('intl-') ? `${s.international.cups.find((competition) => competition.id === fixture.internationalCupId)?.name ?? 'Uluslararası kupa'} maçın` : 'Miras Kupası maçın';
      return { blocked: true, reason: `Bugün ${matchName} var — Maç Merkezinden sonucu işlemeden gün ilerlemez.`, summary: [] };
    }
    const summary: string[] = [];
    let next: PersistedState = { ...s, career: { ...s.career, day: stDay + 1, week: Math.ceil((stDay + 1) / 7) } };
    const academyIntake = next.career.academyIntake;
    if (academyIntake && academyIntakeExpired(academyIntake, next.career.day)) {
      const decided = new Set([...academyIntake.signed, ...academyIntake.passed]);
      const passed = [...academyIntake.passed, ...academyIntake.candidates.map((candidate) => candidate.id).filter((id) => !decided.has(id))];
      next = { ...next, career: { ...next.career, academyIntake: { ...academyIntake, passed } }, inbox: [{ id: `academy-expired-${academyIntake.seasonNo}`, kind: 'kadro', title: 'Akademi seçmeleri kapandı', body: 'Teklif süresi doldu; imza almayan adaylar başka kulüplere yöneldi. Altyapıya katılan gençler kadro ve kayıt geçmişinde tutuluyor.', day: next.career.day, read: false }, ...next.inbox] };
      summary.push('Akademi adayları için 10 günlük teklif süresi kapandı; kararsız adaylar ayrıldı.');
    }
    const culture = normalizeClubCulture(next.career.culture, next.career.seed, next.career.clubId, clubById(next.career.clubId).rivalIds ?? []);
    if (!next.career.pendingCultureIssue) {
      const club = clubById(next.career.clubId);
      const squad = squads[next.career.clubId] ?? [];
      const payrollM = squad.reduce((sum, player) => sum + (player.wage ?? 0), 0) / 1000;
      const wageCapM = club.wageBudget + (next.budget.wbExtra ?? 0);
      const seasonTransfers = next.transferLog.filter((entry) => entry.seasonNo === next.seasonNo);
      const ffp = assessFfp({ payrollM, wageCapM, transferSpendM: seasonTransfers.filter((entry) => entry.kind === 'in').reduce((sum, entry) => sum + entry.fee, 0), transferIncomeM: seasonTransfers.filter((entry) => entry.kind === 'out').reduce((sum, entry) => sum + entry.fee, 0), baseBudgetM: club.transferBudget });
      let issue: Career['pendingCultureIssue'];
      if (next.career.day % 30 === 0 && ffp.status === 'breach' && culture.lastFfpReviewSeason !== next.seasonNo) {
        issue = { id: `ffp-${next.seasonNo}`, kind: 'ffp', day: next.career.day, headline: 'Mali uyum incelemesi', body: `Kayıtlı maaş oranı %${Math.round(ffp.payrollRatio * 100)}, net transfer harcaması ₺${ffp.netSpendM.toFixed(2)}M. Kurul iki seçenekli mali inceleme talep ediyor.` };
      } else if (next.career.day % 60 === 0) {
        issue = { id: `community-${next.seasonNo}-${next.career.day}`, kind: 'community', day: next.career.day, headline: 'Mahalle futbol günü', body: 'Kulüp yönetimi akademi sahasını çocuklara açma veya etkinliği ileri tarihe bırakma kararı istiyor.' };
      }
      if (issue) {
        next = { ...next, career: { ...next.career, culture, pendingCultureIssue: issue }, inbox: [{ id: issue.id, kind: 'yonetim', title: issue.headline, body: issue.body, day: next.career.day, read: false }, ...next.inbox] };
        summary.push(`${issue.headline}: kulüp kültürü kararını bekliyor.`);
      } else next = { ...next, career: { ...next.career, culture } };
    }
    summary.push(`Yeni gün: ${dayToDate(next.career.day)}.`);

    // AI simülasyonu (yeni günün fikstürleri)
    const sim = simulateDayFixtures(next, next.career.day, 0, jobless);
    next = sim.s;

    // Kupa grup sonu eleme kurulumu
    const ko = buildKnockouts(next);
    if (ko.notes.length) summary.push(...ko.notes);
    next = ko.s;
    const adv = advanceKnockouts(next);
    if (adv.notes.length) summary.push(...adv.notes);
    next = adv.s;

    const priorInternational = next.international;
    const nextInternational = advanceInternationalSeason(priorInternational, worldSeed + next.seasonNo * 613);
    next = { ...next, international: nextInternational };
    nextInternational.cups.forEach((competition) => {
      const prior = priorInternational.cups.find((candidate) => candidate.id === competition.id);
      if ((prior?.rounds.length ?? 0) < competition.rounds.length) {
        const latestRound = competition.rounds[competition.rounds.length - 1];
        summary.push(`${competition.name}: ${latestRound?.name} eşleşmeleri belli oldu.`);
      }
      if (!prior?.champion && competition.champion) summary.push(`${clubById(competition.champion).name}, ${competition.name}'nı kazandı!`);
    });

    // Aşama 2: dinamik durum evrimi (yeni gün; bugün maç oynandıysa kondisyon düşümü)
    next = { ...next, playerPatch: evolvePlayers(next, next.career.day, null) };

    // Aşama 2: teklif yaşam döngüsü — süresi dolanlar 'expired'
    const expired = next.incomingOffers.filter((o) => o.state === 'open' && o.expiresDay < next.career.day);
    if (expired.length) {
      next = { ...next, incomingOffers: next.incomingOffers.map((o) => (expired.includes(o) ? { ...o, state: 'expired' as const } : o)) };
    }
    const spawned = maybeSpawnOffer(next, next.career.day);
    if (spawned.offers !== next.incomingOffers || spawned.notes.length) {
      next = { ...next, incomingOffers: spawned.offers, inbox: spawned.notes.length ? [{ id: `ofm-${next.career.day}`, kind: 'transfer', title: 'Yeni transfer teklifi', body: spawned.notes[0], day: next.career.day, read: false }, ...next.inbox] : next.inbox };
      summary.push(...spawned.notes);
    }

    // Proje gün sayacı (P1 SPEC Böl.I/3: bitişte seviye career.clubFacilities'e işlenir)
    if (next.career.pending.activeProject) {
      const proj = next.career.pending.activeProject;
      const left = proj.daysLeft - 1;
      if (left <= 0) {
        const facs = { ...(next.career.clubFacilities ?? { ...clubById(next.career.clubId).facilities }) };
        if (proj.kind !== 'stadium') facs[proj.kind] = Math.min(5, (facs[proj.kind] ?? 1) + 1);
        next = { ...next, career: { ...next.career, clubFacilities: facs, pending: { ...next.career.pending, activeProject: null } } };
        summary.push(`Tesis yatırımı tamamlandı: ${proj.fromTo} — yeni seviye canlıda.`);
      } else {
        next = { ...next, career: { ...next.career, pending: { ...next.career.pending, activeProject: { ...proj, daysLeft: left } } } };
        summary.push(`Proje ilerliyor: ${proj.fromTo} — kalan ${left} gün.`);
      }
    }

    // Dalga 1 (v0.5) — Haftalık antrenman (pazartesi): odak × yoğunluk × tesis gerçek rating gelişimi üretir
    if (weekdayOf(next.career.day) === 'Pazartesi' && !next.career.jobSearch) {
      const focus: TrainingFocus = next.career.trainingFocus ?? { area: 'Teknik', intensity: 'normal', sinceDay: 1 };
      const facs = next.career.clubFacilities ?? clubById(next.career.clubId).facilities;
      const myTeam = squads[next.career.clubId] ?? [];
      const tr = applyTrainingWeek(myTeam, focus, facs.training ?? 2, next.career.seed, next.career.day);
      const patchAcc = { ...next.playerPatch };
      for (const [pid, pp] of Object.entries(tr.patches)) patchAcc[pid] = { ...(patchAcc[pid] ?? {}), ...pp };
      next = {
        ...next,
        playerPatch: patchAcc,
        inbox: [{ id: `tr-${next.career.day}`, kind: 'kadro', title: `Haftalık antrenman raporu — ${focus.area} (${focus.intensity})`, body: `Tesis lev.${facs.training} · Gelişen: ${tr.improved} oyuncu${tr.strained ? ` · Zorlanan: ${tr.strained}` : ''}. ${tr.noteLines.slice(0, 2).join(' ')}`, day: next.career.day, read: false }, ...next.inbox],
      };
      summary.push(`Antrenman haftası işlendi: ${focus.area}/${focus.intensity} — ${tr.improved} gelişim${tr.strained ? `, ${tr.strained} zorlanma` : ''}.`);

      // Dalga 6: Dakika memnuniyeti haftalık değerlendirmesi + süre sözleri
      {
        const myId2 = next.career.clubId;
        const byGen = [...(squads[myId2] ?? [])].sort((a, b) => b.ratings.gen - a.ratings.gen);
        const playedLeague = next.fixtures.filter((f) => f.played && f.comp === 'lig' && (f.homeId === myId2 || f.awayId === myId2)).length;
        const stats = next.playerStats ?? {};
        let promises = { ...(next.promises ?? {}) };
        const noted = { ...(next.minuteNoted ?? {}) };
        let patchAcc2 = { ...next.playerPatch };
        const msgs: InboxMsg[] = [];
        byGen.forEach((p, rank) => {
          // (a) aktif sözler
          const pr = promises[p.id];
          if (pr) {
            const ev = evalPromise(pr, playedLeague, stats[p.id]?.apps ?? 0);
            if (ev === 'kept') {
              delete promises[p.id];
              patchAcc2[p.id] = { ...(patchAcc2[p.id] ?? {}), form: Math.min(99, (patchAcc2[p.id]?.form ?? p.form) + 4) };
              msgs.push({ id: `pm-k-${p.id}-${next.career.day}`, kind: 'kadro', title: `Söz tutuldu: ${p.name}`, body: `${p.name}, söz verilen ${pr.window} maçlık pencerede yeterli süre buldu. Soyunma odası güveni yükseldi (+form).`, day: next.career.day, read: false });
            } else if (ev === 'broken') {
              delete promises[p.id];
              patchAcc2[p.id] = { ...(patchAcc2[p.id] ?? {}), form: Math.max(20, (patchAcc2[p.id]?.form ?? p.form) - 6) };
              msgs.push({ id: `pm-b-${p.id}-${next.career.day}`, kind: 'kadro', title: `⚠ Söz bozuldu: ${p.name}`, body: `${p.name}'e verilen süre sözü tutulmadı (${pr.window} maç penceresinde hedef %${Math.round(pr.share * 100)}). Oyuncu kırgın — form kaybı yaşadı; yenileme görüşmeleri zorlaştı.`, day: next.career.day, read: false });
            }
          }
          // (b) şikayet üretimi — 30 gün soğumayla
          const g = minuteGrievance(rank, p.age, stats[p.id]?.apps ?? 0, playedLeague);
          if (grievanceLabel(g) === 'kırgın' && !promises[p.id] && (noted[p.id] ?? -99) + 30 < next.career.day) {
            noted[p.id] = next.career.day;
            patchAcc2[p.id] = { ...(patchAcc2[p.id] ?? {}), form: Math.max(20, (patchAcc2[p.id]?.form ?? p.form) - 3) };
            msgs.push({ id: `pm-n-${p.id}-${next.career.day}`, kind: 'kadro', title: `Dakika şikayeti: ${p.name}`, body: `${p.name} (${minuteRole(rank, p.age) === 'key' ? 'kilit rol beklentisi' : 'rotasyon beklentisi'}) yeterli süre bulamıyor. Profilinden "Süre Sözü Ver" ile durumu yönetebilir ya da rolüne uygun pay verebilirsin. Görmezden gelmek forma çeker.`, day: next.career.day, read: false });
          }
        });
        if (msgs.length) next = { ...next, inbox: [...msgs, ...next.inbox] };
        next = { ...next, promises, minuteNoted: noted, playerPatch: patchAcc2 };
      }
    }

    // Dalga 1 (v0.5) — Akademi günü (sezon başı Temmuz 2. hafta): 2–6 aday listelenir
    if (next.career.day === ACADEMY_INTAKE_DAY && !next.career.jobSearch) {
      const cObj2 = clubById(next.career.clubId);
      const facs = next.career.clubFacilities ?? cObj2.facilities;
      const candidates = genAcademyDay(cObj2, next.career.seed, next.seasonNo, facs.academy ?? 2);
      next = {
        ...next,
        career: { ...next.career, academyIntake: { day: next.career.day, expiresDay: next.career.day + 10, seasonNo: next.seasonNo, academyLevel: facs.academy ?? 2, candidates, signed: [], passed: [], signingFees: {} } },
        inbox: [{ id: `aka-${next.career.day}`, kind: 'kadro', title: `Akademi günü: ${candidates.length} aday`, body: `Akademi (seviye ${facs.academy}) ${candidates.length} genç üretti. En potansiyelli: ${candidates[0]?.name} (Pot ${candidates[0]?.potential}). Kulüp > Akademi sekmesinden sözleşme teklifi yapılabilir. Teklif aralığı ~10 gün.`, day: next.career.day, read: false }, ...next.inbox],
      };
      summary.push(`Akademi günü: ${candidates.length} aday listede (en yüksek potansiyel ${candidates[0]?.potential}).`);
    }

    // Piyasa güncellemesini not et (§11.1 ritmi)
    const cycle = next.career.settings.marketRefresh === 'sakin' ? 30 : next.career.settings.marketRefresh === 'yogun' ? 7 : 14;
    if (next.career.day % cycle === 1) summary.push(`Piyasa yenilendi (${cycle} gün döngüsü); yeni fırsatlar Fırsatlar sekmesinde.`);

    // Transfer penceresi haberi
    if (inWindow(next.career.day) && !inWindow(next.career.day - 1)) summary.push('Transfer penceresi açıldı — Piyasa akışı serbest.');

    // Sistem A — Aylık finansal nakit akışı (her 30 günde bir)
    if (next.career.day % 30 === 0 && next.career.day > 1) {
      const cObj = clubById(next.career.clubId);
      const facs = next.career.clubFacilities ?? cObj.facilities;
      const totalWageM = (squads[next.career.clubId] ?? []).concat(next.extraSquads[next.career.clubId] ?? []).reduce((sum, p) => sum + (p.wage ?? 0), 0) / 1000;
      const facCostM = Object.values(facs).reduce((sum, l) => sum + (l ?? 1) * 0.05, 0);
      const expenses = totalWageM + facCostM;
      const sponsorM = cObj.strength * 0.02;
      const net = Math.round((sponsorM - expenses) * 100) / 100;
      const tbNew = Math.round((next.budget.tb + net) * 10) / 10;
      next = {
        ...next,
        budget: { ...next.budget, tb: tbNew },
        inbox: [{ id: `fin-${next.career.day}`, kind: 'yonetim', title: `Aylık Finans Raporu`, body: `Gelirler: ₺${sponsorM.toFixed(2)}M · Giderler (Maaş+Tesis): ₺${expenses.toFixed(2)}M · Net: ${net >= 0 ? '+' : ''}₺${net.toFixed(2)}M. Kasa: ₺${tbNew.toFixed(1)}M.`, day: next.career.day, read: false }, ...next.inbox],
      };
      summary.push(`Nakit akışı: ${net >= 0 ? '+' : ''}₺${net.toFixed(2)}M (maaş+tesis ödendi).`);
      if (tbNew < 0) summary.push('UYARI: kasa negatif — transfer kısıtlaması etkinleşti.');
    }

    // Sezon sonu tetikleyici: lig bitti + kupa final oynandı
    const leagueDone = next.fixtures.every((f) => f.played || !(f.homeId === next.career.clubId || f.awayId === next.career.clubId));
    const internationalDone = next.international.cups.every((competition) => !!competition.champion);
    if (leagueDone && next.cup.champion && internationalDone) {
      const nw = startNewSeason(next);
      summary.push(...nw.notes);
      next = nw.s;
    } else {
      const myLeagueDone = next.fixtures.filter((f) => f.league === next.leagueOf[next.career.clubId]).every((f) => f.played);
      if (myLeagueDone && next.cup.fixtures.every((f) => f.played) && next.cup.rounds.every((r) => r.ties.every((t) => t.winner)) && internationalDone) {
        const nw = startNewSeason(next);
        summary.push(...nw.notes);
        next = nw.s;
      }
    }

    setSt(next);
    stateRef.current = next;
    setTimeout(() => { void saveNow(); }, 150);
    return { blocked: false, summary };
  }, [allMyFixtures, simulateDayFixtures, buildKnockouts, advanceKnockouts, startNewSeason, saveNow, evolvePlayers, maybeSpawnOffer, squads]);

  // ── Hızlı maç sonucu üretici: MatchSession sonucu, post-score müdahalesi olmadan ──
  const buildDemoMatch = useCallback((homeId: string, awayId: string, tacticName: string): DemoMatchResult => {
    const homeClub0 = clubById(homeId), awayClub0 = clubById(awayId);
    const career = stateRef.current.career;
    const tacNameHome = homeId === career.clubId ? tacticName : undefined;
    const homeTactic = stateRef.current.tactics.find((t) => t.name === tacNameHome) ?? stateRef.current.tactics[0];
    // Dayanıklı maç seed'i: her gün + her rakip çifti deterministic
    const seed = worldSeed + homeId.length * 13 + awayId.length * 17 + career.day * 101;
    const input = buildEngineInput({
      homeClub: { ...homeClub0, league: stateRef.current.leagueOf[homeId] ?? homeClub0.league },
      awayClub: { ...awayClub0, league: stateRef.current.leagueOf[awayId] ?? awayClub0.league },
      homeSquad: squads[homeId] ?? [],
      awaySquad: squads[awayId] ?? [],
      homeTactic,
      seed,
      settings: career.settings,
      derby: homeClub0.derby === awayId || awayClub0.derby === homeId,
      challengeClubId: career.clubId,
      challengePoints: career.manager.challengePoints,
    });
    // challengePoints are not allowed to alter a completed score. All quick-result fields
    // come from the same deterministic engine result and its event-derived statistics.
    return buildQuickMatchResult(input, homeId, awayId);
  }, [worldSeed, squads, stateRef]);

  const playLeagueMatch = useCallback((fx: DemoFixture, overrideResult?: DemoMatchResult): DemoMatchResult => {
    // P0 (SPEC Böl.I/1): canlı maçtan gelen sonuç varsa DIRECT kullan — aksi halde bağımsız re-simülasyon skoru çöpe atardı
    const res = overrideResult ?? buildDemoMatch(fx.homeId, fx.awayId, stateRef.current.tactics[0]?.name ?? 'Ana Plan');
    setSt((s) => {
      let next = finishUserFixture(s, fx, res.hg, res.ag);
      // Wave 13: exact engine/player-row evidence is now read from the adapter's public projection (legacy nested result remains supported).
      const engineRows = (res as unknown as { engine?: { playerRows: Record<string, { min: number; g: number; a: number; yellow: number; red: number; rating: number; conceded?: number; posGroup?: string }> } }).engine?.playerRows
        ?? res.playerRows;
      if ((fx.comp === 'intl-grup' || fx.comp === 'intl-ko') && engineRows) {
        const scorerLines = Object.entries(engineRows).filter(([, row]) => row.g > 0).map(([playerId, row]) => ({ playerId, clubId: (squads[fx.homeId] ?? []).some((player) => player.id === playerId) ? fx.homeId : fx.awayId, goals: row.g }));
        next = { ...next, international: { ...next.international, cups: recordInternationalScorers(next.international.cups, fx.internationalCupId, scorerLines) } };
      }
      if (engineRows && Object.keys(engineRows).length) {
        const st0 = next.playerStats ?? {};
        next = { ...next, playerStats: digestEngineRows(st0, engineRows, fx.homeId, squads[fx.homeId] ?? [], squads[fx.awayId] ?? []) };
      }
      const playerClubIds = Object.fromEntries(Object.keys(engineRows ?? {}).map((playerId) => [playerId,
        (squads[fx.homeId] ?? []).some((player) => player.id === playerId) ? fx.homeId : fx.awayId]));
      const playerRows = Object.fromEntries(Object.entries(engineRows ?? {}).map(([playerId, row]) => [playerId, {
        min: row.min, g: row.g, a: row.a, yellow: row.yellow, red: row.red, rating: row.rating, posGroup: row.posGroup ?? '',
      }]));
      const matchReport: MatchArchiveEntry = {
        id: `report-${fx.comp}-${fx.day}-${fx.homeId}-${fx.awayId}`, day: s.career.day, seasonNo: s.seasonNo, comp: fx.comp,
        homeId: fx.homeId, awayId: fx.awayId, hg: res.hg, ag: res.ag, xgHome: res.xgHome, xgAway: res.xgAway,
        foulsHome: res.foulsH, foulsAway: res.foulsA, yellowsHome: res.yellowH, yellowsAway: res.yellowA, redsHome: res.redH, redsAway: res.redA,
        ...(res.referee ? { referee: res.referee } : {}), playerRows, playerClubIds,
      };
      next = { ...next, matchReports: [matchReport, ...(next.matchReports ?? []).filter((report) => report.id !== matchReport.id)].slice(0, 256) };
      // Aşama 2: maç günü yorgunluk/sakatlık evrimi; gerçek dakikalar iğneyle oynayanları da kapsar.
      const actualPlayedIds = engineRows ? Object.entries(engineRows).filter(([, r]) => r.min > 0).map(([id]) => id) : undefined;
      next = { ...next, playerPatch: evolvePlayers(next, s.career.day, s.career.clubId, actualPlayedIds) };
      // Maç sonu otomatik kayıt (§3.3)
      next = { ...next, inbox: [{ id: `ms-${fx.day}-${fx.homeId}`, kind: 'lig', title: `Maç sonucu: ${clubById(fx.homeId).short} ${res.hg}–${res.ag} ${clubById(fx.awayId).short}`, body: `xG ${res.xgHome.toFixed(2)}–${res.xgAway.toFixed(2)} · topa sahip olma ${res.posHome}% . ${res.insights[0]} Maç raporu arşive işlendi.`, day: s.career.day, read: false }, ...next.inbox] };
      // Sistem B — Yönetim Güveni (başl. 70): sonuca göre güncelle, ültimatom eşikleri
      const myGoals = fx.homeId === s.career.clubId ? res.hg : res.ag;
      const oppGoals = fx.homeId === s.career.clubId ? res.ag : res.hg;
      const oppStr = clubById(fx.homeId === s.career.clubId ? fx.awayId : fx.homeId).strength;
      const myStr = clubById(s.career.clubId).strength;
      const isDerby = (clubById(fx.homeId).rivalIds ?? []).includes(fx.awayId) || (clubById(fx.awayId).rivalIds ?? []).includes(fx.homeId); // Derby identity uses fictional club ids.
      const opponentId = fx.homeId === s.career.clubId ? fx.awayId : fx.homeId;
      const myReds = fx.homeId === s.career.clubId ? res.redH : res.redA;
      const culture = normalizeClubCulture(next.career.culture, next.career.seed, next.career.clubId, clubById(next.career.clubId).rivalIds ?? []);
      const nextCulture = { ...culture, honors: [...culture.honors] };
      const pendingCultureIssue = next.career.pendingCultureIssue;
      let cultureIssue = pendingCultureIssue;
      if (myReds > 0) nextCulture.discipline = Math.max(0, nextCulture.discipline - Math.min(8, myReds * 4));
      if (isDerby && myGoals < oppGoals) {
        nextCulture.nemesisClubId = opponentId;
        nextCulture.fanTrust = Math.max(0, nextCulture.fanTrust - 4);
        nextCulture.ultrasHeat = Math.min(100, nextCulture.ultrasHeat + 12);
        if (!cultureIssue) cultureIssue = { id: `ultras-${fx.day}-${opponentId}`, kind: 'ultras', day: s.career.day, headline: 'Derbi sonrası taraftar toplantısı', body: `${clubById(opponentId).short} karşısındaki ${myGoals}–${oppGoals} yenilginin ardından tribün temsilcileri açıklama bekliyor.` };
      } else if (isDerby && myGoals > oppGoals && culture.nemesisClubId === opponentId) {
        nextCulture.fanTrust = Math.min(100, nextCulture.fanTrust + 4);
        nextCulture.ultrasHeat = Math.max(0, nextCulture.ultrasHeat - 6);
        const honorId = `derby-honor-${opponentId}`;
        if (!nextCulture.honors.some((honor) => honor.id === honorId)) nextCulture.honors.push({ id: honorId, title: `${clubById(opponentId).short} derbisi zaferi`, seasonNo: s.seasonNo, earnedDay: s.career.day });
      }
      if (myReds > 0 && !cultureIssue) {
        const scandal = myReds >= 2 || isDerby;
        cultureIssue = { id: `${scandal ? 'scandal' : 'discipline'}-${fx.day}-${fx.homeId}-${fx.awayId}`, kind: scandal ? 'scandal' : 'discipline', day: s.career.day, headline: scandal ? 'Maç sonrası disiplin skandalı' : 'Disiplin kurulu açıklama bekliyor', body: `${clubById(s.career.clubId).short} maçında ${myReds} kırmızı kart gösterildi${isDerby ? ' (derbi)' : ''}. Kulüp özür/disiplin planı açıklayabilir veya oyuncuların arkasında durabilir.` };
      }
      next = { ...next, career: { ...next.career, culture: nextCulture, pendingCultureIssue: cultureIssue } };
      if (cultureIssue && cultureIssue.id !== pendingCultureIssue?.id) next = { ...next, inbox: [{ id: cultureIssue.id, kind: 'yonetim', title: cultureIssue.headline, body: cultureIssue.body, day: s.career.day, read: false }, ...next.inbox] };
      const isCupKo = fx.comp === 'kupa-ko' || fx.comp === 'intl-ko';
      let conf = next.career.boardConfidence ?? 70;
      let delta = 0; let note: string | null = null;
      if (myGoals > oppGoals) {
        delta = oppStr > myStr + 8 ? 5 : 2;
        if (isDerby) delta = 6;
        if (isCupKo) delta += 3;
        note = `Galibiyet (${myGoals}–${oppGoals}) yönetimi memnun etti.`;
      } else if (myGoals === oppGoals) {
        delta = oppStr > myStr ? 1 : -1;
      } else {
        delta = myStr > oppStr + 8 ? -4 : -2;
        if (isDerby) delta = -6;
        if (isCupKo) delta -= 3;
        note = isDerby ? 'Derbi mağlubiyeti yönetimde sarsıntı yarattı.' : 'Mağlubiyet yönetimi düşündürdü.';
      }
      conf = Math.max(0, Math.min(100, conf + delta));
      next = { ...next, career: { ...next.career, boardConfidence: conf } };
      if (delta !== 0) {
        next = { ...next, inbox: [{ id: `brd-${fx.day}-${fx.homeId}`, kind: 'yonetim', title: `Yönetim güveni: %${conf} (${delta > 0 ? '+' : ''}${delta})`, body: note ?? (delta > 0 ? 'Kulüpten iyi sinyaller geliyor.' : 'Tempo düşüşü hissediliyor; sonuç beklentisi artıyor.'), day: s.career.day, read: false }, ...next.inbox] };
      }
      // Dalga 1 (v0.5) — Ültimatom gerçek sayaç: aktifse her resmi maç +puan işlenir, bittiğinde kader belli
      let ult = next.career.ultimatum ? { ...next.career.ultimatum } : null;
      if (ult && (fx.comp === 'lig' || fx.comp === 'kupa' || fx.comp === 'kupa-ko' || fx.comp === 'intl-grup' || fx.comp === 'intl-ko')) {
        const pts = myGoals > oppGoals ? 3 : myGoals === oppGoals ? 1 : 0;
        ult = { ...ult, left: ult.left - 1, got: ult.got + pts };
        const verdict = evaluateUltimatum(ult.left, ult.got, ult.need);
        if (verdict === 'fired') {
          const offerIds = computeJobOffers(CLUBS, next.leagueOf, next.career.clubId, next.career.seed, next.career.day).map((o) => o.club.id);
          next = {
            ...next,
            career: {
              ...next.career, ultimatum: undefined, boardConfidence: 0,
              jobSearch: { sinceDay: next.career.day, offers: offerIds, firedFrom: next.career.clubId, firedFromLeague: next.leagueOf[next.career.clubId], reason: `Ültimatom karşılanamadı (${ult.got}/${ult.need} puan)` },
            },
            inbox: [{ id: `sack-${next.career.day}`, kind: 'kritik', title: 'Görevden alındın', body: `${clubById(next.career.clubId).name} yönetimi sözleşmeyi feshetti: “${ult.got}/${ult.need} puan” eşiği tutmadı. Kariyerin bitmedi — Ana Merkez'deki iş tekliflerini değerlendir (${offerIds.length} kulüp kapıda). İşsizken kendi maçların AI'ya devredilir.`, day: next.career.day, read: false }, ...next.inbox],
          };
        } else if (verdict === 'saved') {
          const conf2 = Math.min(100, conf + 20);
          next = {
            ...next,
            career: { ...next.career, ultimatum: undefined, boardConfidence: conf2 },
            inbox: [{ id: `ultok-${next.career.day}`, kind: 'yonetim', title: 'Ültimatom aşıldı', body: `${ult.got}/${ult.need} puan toplandı — yönetim güveni toparlandı (%${conf2}).`, day: next.career.day, read: false }, ...next.inbox],
          };
        } else {
          next = { ...next, career: { ...next.career, ultimatum: ult }, inbox: [{ id: `ultp-${next.career.day}-${fx.homeId}`, kind: 'kritik', title: `Ültimatom: ${ult.left} maç kaldı`, body: `Şu ana kadar ${ult.got}/${ult.need} puan toplandı. ${ult.left} resmi maç hakkın kaldı.`, day: next.career.day, read: false }, ...next.inbox] };
        }
      } else if (!next.career.jobSearch && conf < 25) {
        // Ültimatomu başlat (tek sefer)
        next = {
          ...next,
          career: { ...next.career, ultimatum: { left: 3, need: 4, got: 0, startDay: next.career.day } },
          inbox: [{ id: `ult-${fx.day}`, kind: 'kritik', title: '3 Maçlık Ültimatom', body: 'Önümüzdeki 3 resmi maçtan en az 4 puan bekleniyor. Aksi halde sözleşme feshedilir ve iş piyasasına çıkarsın.', day: s.career.day, read: false }, ...next.inbox],
        };
      } else if (conf < 40) {
        next = { ...next, inbox: [{ id: `wrn-${fx.day}`, kind: 'yonetim', title: 'İş Güvenliği Uyarısı', body: 'Yönetim sonuçlardan memnun değil. Yakın dönemde iyileşme bekleniyor.', day: s.career.day, read: false }, ...next.inbox] };
      }
      stateRef.current = next;
      return next;
    });
    setTimeout(() => { void saveNow(); }, 200);
    return res;
  }, [buildDemoMatch, finishUserFixture, saveNow, digestEngineRows, squads]);

  const updateTactic = useCallback((idx: number, t: TacticPlan) => {
    setSt((s) => ({ ...s, tactics: s.tactics.map((x, i) => (i === idx ? t : x)) }));
    setTimeout(() => { void saveNow(); }, 300);
  }, [saveNow]);


  const setInbox = useCallback((fn: (m: InboxMsg[]) => InboxMsg[]) => {
    setSt((s) => ({ ...s, inbox: fn(s.inbox) }));
  }, []);

  const setCareer = useCallback((fn: (c: Career) => Career) => {
    setSt((s) => ({ ...s, career: fn(s.career) }));
  }, []);

  const updateMarketShortlist = useCallback((playerIds: string[], players: Player[]) => {
    const s = stateRef.current;
    const ids = [...new Set(playerIds)];
    const unique = [...new Map(players.filter((player) => ids.includes(player.id)).map((player) => [player.id, player])).values()];
    const next: PersistedState = {
      ...s,
      career: { ...s.career, pending: { ...s.career.pending, marketShortlist: ids, marketShortlistPlayers: unique } },
    };
    stateRef.current = next; setSt(next);
    setTimeout(() => { void saveNow(); }, 120);
  }, [saveNow]);

  const recordManagerYellow = useCallback(() => {
    const cur = stateRef.current;
    const discipline = registerManagerYellowRule(cur.career.managerYellowCards ?? 0, cur.career.managerSuspendedMatches ?? 0);
    const next = { ...cur, career: { ...cur.career, managerYellowCards: discipline.managerYellowCards, managerSuspendedMatches: discipline.managerSuspendedMatches } };
    stateRef.current = next; setSt(next);
    setTimeout(() => { void saveNow(); }, 120);
    return { yellows: discipline.managerYellowCards, banned: discipline.banned };
  }, [saveNow]);

  const consumeManagerSuspension = useCallback((wasSuspended: boolean) => {
    if (!wasSuspended) return;
    const cur = stateRef.current;
    const next = { ...cur, career: { ...cur.career, managerSuspendedMatches: consumeManagerBan(cur.career.managerSuspendedMatches ?? 0, wasSuspended) } };
    stateRef.current = next; setSt(next);
    setTimeout(() => { void saveNow(); }, 120);
  }, [saveNow]);

  const setBudget = useCallback((fn: (b: { tb: number; wbExtra?: number }) => { tb: number; wbExtra?: number }) => {
    setSt((s) => ({ ...s, budget: fn(s.budget) }));
  }, []);

  const resolveCultureIssue = useCallback((issueId: string, choice: CultureChoice): { ok: boolean; reason?: string } => {
    const s = stateRef.current;
    const issue = s.career.pendingCultureIssue;
    if (!issue || issue.id !== issueId) return { ok: false, reason: 'Bu kulüp kültürü kararı artık beklemede değil.' };
    const culture = normalizeClubCulture(s.career.culture, s.career.seed, s.career.clubId, clubById(s.career.clubId).rivalIds ?? []);
    const resolution = resolveCultureChoice({ culture, kind: issue.kind, choice, transferBudgetM: s.budget.tb, seasonNo: s.seasonNo, day: s.career.day });
    if (!resolution.ok || !resolution.culture || resolution.budget === undefined) return { ok: false, reason: resolution.reason ?? 'Karar uygulanamadı.' };
    const history = [...(s.career.cultureHistory ?? []), { id: issue.id, kind: issue.kind, day: issue.day, choice }].slice(-100);
    const boardConfidence = Math.max(0, Math.min(100, (s.career.boardConfidence ?? 70) + (resolution.boardDelta ?? 0)));
    const next: PersistedState = {
      ...s,
      budget: { ...s.budget, tb: resolution.budget },
      career: { ...s.career, culture: resolution.culture, pendingCultureIssue: undefined, cultureHistory: history, boardConfidence },
      inbox: [{ id: `culture-choice-${issue.id}`, kind: 'yonetim', title: 'Kulüp kültürü kararı uygulandı', body: resolution.message ?? 'Karar kayda geçti.', day: s.career.day, read: false }, ...s.inbox],
    };
    stateRef.current = next; setSt(next);
    setTimeout(() => { void saveNow(); }, 120);
    return { ok: true };
  }, [saveNow]);

  const addSquadPlayer = useCallback((p: Player, fee: number) => {
    setSt((s) => ({ ...s, extraSquads: { ...s.extraSquads, [s.career.clubId]: [...(s.extraSquads[s.career.clubId] ?? []), p] }, budget: { ...s.budget, tb: Math.round((s.budget.tb - fee) * 10) / 10 }, transfers: [...s.transfers, { id: p.id, name: p.name, fee, wage: p.wage, day: s.career.day }] }));
    setTimeout(() => { void saveNow(); }, 150);
  }, [saveNow]);

  // Dalga 1 (v0.5) — Haftalık antrenman odağı
  const setTrainingFocus = useCallback((f: TrainingFocus) => {
    setSt((s) => ({ ...s, career: { ...s.career, trainingFocus: f } }));
    setTimeout(() => { void saveNow(); }, 200);
  }, [saveNow]);

  // Dalga 1 (v0.5) — Akademi adayına sözleşme (kadro 30 limiti geçerli)
  const signAcademyCandidate = useCallback((playerId: string): { ok: boolean; reason?: string } => {
    const s = stateRef.current;
    const intake = s.career.academyIntake;
    if (!intake) return { ok: false, reason: 'Aktif akademi günü yok' };
    if (academyIntakeExpired(intake, s.career.day)) return { ok: false, reason: 'Akademi sözleşme süresi doldu.' };
    const cand = intake.candidates.find((c) => c.id === playerId);
    if (!cand) return { ok: false, reason: 'Aday bulunamadı' };
    if (intake.signed.includes(playerId) || intake.passed.includes(playerId)) return { ok: false, reason: 'Bu aday için karar verilmiş' };
    const cur = squads[s.career.clubId] ?? [];
    if (cur.some((player) => player.id === playerId)) return { ok: false, reason: 'Aday zaten kulübün kayıtlı kadrosunda.' };
    const club = clubById(s.career.clubId);
    const wageCap = Math.round(((club.wageBudget + (s.budget.wbExtra ?? 0)) * 1000));
    const currentWage = cur.reduce((sum, player) => sum + (player.wage ?? 0), 0);
    const signing = evaluateAcademySigning({ player: cand, academyLevel: intake.academyLevel ?? (s.career.clubFacilities ?? club.facilities).academy, transferBudgetM: s.budget.tb, currentMonthlyWage: currentWage, monthlyWageCap: wageCap, rosterSize: cur.length });
    if (!signing.ok) return { ok: false, reason: signing.reason };
    const next: PersistedState = {
      ...s,
      extraSquads: { ...s.extraSquads, [s.career.clubId]: [...(s.extraSquads[s.career.clubId] ?? []), { ...cand, clubId: s.career.clubId }] },
      budget: { ...s.budget, tb: Math.round((s.budget.tb - signing.fee) * 100) / 100 },
      transferLog: [{ id: `academy-${playerId}`, day: s.career.day, seasonNo: s.seasonNo, playerName: cand.name, age: cand.age, group: cand.group, fromClubId: null, toClubId: s.career.clubId, fee: signing.fee, kind: 'youth' }, ...s.transferLog],
      career: { ...s.career, academyIntake: { ...intake, signed: [...intake.signed, playerId], signingFees: { ...(intake.signingFees ?? {}), [playerId]: signing.fee } } },
      inbox: [{ id: `aks-${playerId}`, kind: 'kadro', title: 'Akademi sözleşmesi', body: `${cand.name} (${cand.age}) profesyonel sözleşmeyle kadroya katıldı. Pot ${cand.potential} · Gen ${cand.ratings.gen}. Kayıt bedeli ₺${signing.fee.toFixed(2)}M; maaş ₺${cand.wage}B/ay.`, day: s.career.day, read: false }, ...s.inbox],
    };
    setSt(next); stateRef.current = next;
    setTimeout(() => { void saveNow(); }, 150);
    return { ok: true };
  }, [squads, saveNow]);

  const passAcademyCandidate = useCallback((playerId: string) => {
    setSt((s) => {
      const intake = s.career.academyIntake;
      if (!intake || academyIntakeExpired(intake, s.career.day) || intake.signed.includes(playerId) || intake.passed.includes(playerId)) return s;
      return { ...s, career: { ...s.career, academyIntake: { ...intake, passed: [...intake.passed, playerId] } } };
    });
    setTimeout(() => { void saveNow(); }, 200);
  }, [saveNow]);

  // Dalga 1 (v0.5) — İş teklifini kabul et (kovulma sonrası kariyer devamı)
  const acceptJob = useCallback((clubId: string): { ok: boolean; reason?: string } => {
    const s = stateRef.current;
    const js = s.career.jobSearch;
    if (!js) return { ok: false, reason: 'Aktif iş araması yok' };
    if (!js.offers.includes(clubId)) return { ok: false, reason: 'Bu kulüpten teklif yok' };
    const nc = clubById(clubId);
    const next: PersistedState = {
      ...s,
      career: { ...s.career, clubId, boardConfidence: 60, jobSearch: undefined, ultimatum: undefined },
      inbox: [{ id: `job-${s.career.day}`, kind: 'yonetim', title: `${nc.short} ile sözleşme imzalandı`, body: `${nc.name} teknik direktörlüğüne getirildin. Yönetim güveni %60'tan başlar. Hedef: ${nc.boardGoal}. Kulüp kadrosu ve tesisleri devralındı — Hikâye: ${nc.story}`, day: s.career.day, read: false }, ...s.inbox],
    };
    setSt(next); stateRef.current = next;
    setTimeout(() => { void saveNow(); }, 150);
    return { ok: true };
  }, [saveNow]);


  // ── Aşama 2: Transfer aksiyonları ──
  const buyPlayer = useCallback((p: Player, fee: number, wage: number, years: number = 3, status: 'rotasyon' | 'ilk11' | 'yildiz' = 'ilk11', swapPlayerId?: string, sellOnPct: number = 0): { ok: boolean; reason?: string } => {
    const s = stateRef.current;
    const myId = s.career.clubId;
    const fromId = clubOfPlayer(p.id) ?? p.clubId;
    const inWin = inWindow(s.career.day);
    const already = fromId === myId;
    const isFree = !fromId || p.id.startsWith('fa_') || fromId === FREE_CLUB;
    const normalizedSellOnPct = Math.round(Number(sellOnPct) * 10) / 10;
    if (!Number.isFinite(fee) || fee < 0 || !Number.isFinite(wage) || wage < 0) return { ok: false, reason: 'Bonservis ve maaş geçerli, negatif olmayan tutarlar olmalı.' };
    if (![2, 3, 4, 5].includes(years)) return { ok: false, reason: 'Sözleşme süresi 2–5 yıl arasında olmalı.' };
    if (!Number.isFinite(normalizedSellOnPct) || normalizedSellOnPct < 0 || normalizedSellOnPct > 30) return { ok: false, reason: 'Satış payı %0–30 arasında olmalı.' };
    if (isFree && normalizedSellOnPct > 0) return { ok: false, reason: 'Serbest oyuncu için satış payı anlaşması yapılamaz.' };
    const priorClauses = normalizeSellOnClauses(s.sellOnClauses)[p.id] ?? [];
    if (priorClauses.reduce((sum, row) => sum + row.pct, 0) + normalizedSellOnPct > 50) return { ok: false, reason: 'Bu oyuncudaki toplam sonraki-satış payı %50 sınırını aşar.' };
    if (already) return { ok: false, reason: 'Oyuncu zaten kadronuzda.' };
    // Dalga 3: serbest statü genişletildi — 'FA' (Bosman serbesti) pencere dışında da alınabilir
    if (!inWin && fromId && fromId !== FREE_CLUB && !p.id.startsWith('fa_')) return { ok: false, reason: 'Transfer penceresi kapalı — pencere dışında yalnız serbest oyuncu alınabilir.' };
    // Dalga 3: kiralık oyuncu kalıcı alınamaz
    if (onLoan(s.loans ?? [], p.id)) return { ok: false, reason: 'Oyuncu şu an kiralık — sezon sonu kulübüne döner; kalıcı transfer konuşulamaz.' };
    if (s.budget.tb < fee) return { ok: false, reason: `Transfer bütçesi yetersiz: ₺${s.budget.tb.toFixed(1)}M < ₺${fee.toFixed(1)}M.` };
    if ((squads[myId]?.length ?? 0) >= 30 && !swapPlayerId) return { ok: false, reason: 'Kadro üst sınırı 30 — önce satış yapın (veya takasla yer açın).' };
    // v0.9.9 takas: verilecek oyuncu doğrulaması
    let swapP: Player | null = null;
    if (swapPlayerId) {
      const sp = playerOf(swapPlayerId);
      if (!sp || clubOfPlayer(swapPlayerId) !== myId && sp?.clubId !== myId) return { ok: false, reason: 'Takas oyuncusu kadronuzda değil.' };
      if (!fromId || fromId === FREE_CLUB) return { ok: false, reason: 'Serbest oyuncuyla takas olmaz — bedelsiz imzalanır.' };
      if (onLoan(s.loans ?? [], swapPlayerId)) return { ok: false, reason: 'Kiralık oyuncu takasa verilemez.' };
      swapP = sp;
    }
    // Kotayı takas sonrası kadroya göre denetle (yabancı oyuncu çıkıyorsa yeri açılır).
    const myLive = squads[myId] ?? [];
    const quotaSquad = swapP ? myLive.filter((x) => x.id !== swapP!.id) : myLive;
    const quotaChk = canAddForeign(quotaSquad, s.leagueOf[myId] ?? 'zirve', p);
    if (!quotaChk.ok) return { ok: false, reason: quotaChk.reason };
    const entry: TransferLogEntry = {
      id: `tr-${p.id}-${s.career.day}`, day: s.career.day, seasonNo: s.seasonNo,
      playerName: p.name, age: p.age, group: p.group,
      fromClubId: fromId, toClubId: myId, fee, kind: 'in',
      ...(normalizedSellOnPct > 0 ? { sellOnPct: normalizedSellOnPct } : {}),
      ...(swapP ? { exchangePlayerName: swapP.name } : {}),
    };
    setSt((cur) => {
      const patch = { ...cur.playerPatch };
      const currentSellOn = normalizeSellOnClauses(cur.sellOnClauses);
      const sellOnClauses = normalizedSellOnPct > 0 && fromId && fromId !== FREE_CLUB
        ? withSellOnClause(currentSellOn, p.id, { beneficiaryClubId: fromId, pct: normalizedSellOnPct, signedFee: fee, signedDay: cur.career.day })
        : currentSellOn;
      if (isFree && !cur.extraPlayers.some((x) => x.id === p.id)) {
        // serbest oyuncu kaydı: oyuncu zaten extraPlayers içinde (piyasa sekmesinden geldi) veya eklenmeli
      }
      patch[p.id] = { ...(patch[p.id] ?? {}), wage, clubId: myId, contractYears: years } as Partial<Player>;
      if (swapP && fromId) {
        // v0.9.9 takas: benim oyuncum satıcı kulübe gider
        patch[swapP.id] = { ...(cur.playerPatch[swapP.id] ?? {}), clubId: fromId } as Partial<Player>;
      }
      return {
        ...cur,
        playerClub: { ...cur.playerClub, [p.id]: myId, ...(swapP && fromId ? { [swapP.id]: fromId } : {}) },
        playerPatch: patch,
        sellOnClauses,
        extraPlayers: isFree && !cur.extraPlayers.some((x) => x.id === p.id) && !Object.values(baseSquads).some((a) => a.some((x) => x.id === p.id))
          ? [...cur.extraPlayers, { ...p, clubId: myId, contractYears: years }] : cur.extraPlayers,
        budget: { ...cur.budget, tb: Math.round((cur.budget.tb - fee) * 10) / 10 },
        transferLog: [...(swapP && fromId ? [{ id: `sw-${swapP.id}-${cur.career.day}`, day: cur.career.day, seasonNo: cur.seasonNo, playerName: swapP.name, age: swapP.age, group: swapP.group, fromClubId: myId, toClubId: fromId, fee: 0, kind: 'out' as const }] : []), entry, ...cur.transferLog],
        transfers: [...cur.transfers, { id: p.id, name: p.name, fee, wage, day: cur.career.day }],
        // Dalga 10 Pazarlık: statü + yıl; yıldız ise söz kaydı
        ...(status === 'yildiz' ? (() => {
          const playedLeague = cur.fixtures.filter((f) => f.played && f.comp === 'lig' && (f.homeId === cur.career.clubId || f.awayId === cur.career.clubId)).length;
          const apps = (cur.playerStats ?? {})[p.id]?.apps ?? 0;
          return { promises: { ...(cur.promises ?? {}), [p.id]: newPromise(cur.career.day, playedLeague, apps) } };
        })() : {}),
        inbox: [{ id: `ti-${p.id}`, kind: 'transfer', title: `Transfer: ${p.name}`, body: `${p.name}, ${fromId && clubByIdSafe(fromId) ? clubById(fromId).name + ' kulübünden' : 'serbest statüden'} ₺${fee.toFixed(1)}M bonservisle kadrona katıldı (${years} yıl). Statü: ${status === 'yildiz' ? '⭐ Yıldız (ilk 11 garantisi — 10 maçlık süre sözü kaydedildi)' : status === 'ilk11' ? 'İlk 11' : 'Rotasyon'}. Maaş: ₺${wage}B/ay.${swapP && fromId ? ` Takas: ${swapP.name} ${clubByIdSafe(fromId)?.name ?? fromId} kulübüne geçti.` : ''}${normalizedSellOnPct > 0 && fromId ? ` Sonraki satış gelirinin %${normalizedSellOnPct}’i ${clubByIdSafe(fromId)?.name ?? fromId} kulübüne ödenecek.` : ''}`, day: cur.career.day, read: false }, ...cur.inbox],
      };
    });
    setTimeout(() => { void saveNow(); }, 150);
    return { ok: true };
  }, [clubOfPlayer, playerOf, baseSquads, squads, saveNow]);

  // v0.9.9 — Avrupa Kliniği sevki (₺0,3M → 14 gün kısaltma, sakatlık başına 1 hakk)
  const clinicTreat = useCallback((playerId: string): { ok: boolean; reason?: string } => {
    const s = stateRef.current;
    const p = playerOf(playerId);
    if (!p || (p.injuredDays ?? 0) <= 0 || !p.injury) return { ok: false, reason: 'Oyuncu sakat değil.' };
    if (p.injury.clinicUsed || clinicInFlightRef.current.has(playerId)) return { ok: false, reason: 'Bu sakatlıkta klinik hakkı zaten kullanıldı.' };
    if (s.budget.tb < CLINIC_COST_M) return { ok: false, reason: 'Kasa yetersiz — klinik sevki ₺0,3M gerektirir.' };
    clinicInFlightRef.current.add(playerId);
    const newDays = clinicRemainingDays(p.injuredDays);
    setSt((cur) => ({
      ...cur,
      playerPatch: { ...cur.playerPatch, [playerId]: { ...(cur.playerPatch[playerId] ?? {}), injuredDays: newDays, injury: newDays > 0 ? { ...(cur.playerPatch[playerId]?.injury ?? p.injury!), daysRemaining: newDays, clinicUsed: true } : undefined } },
      budget: { ...cur.budget, tb: Math.round((cur.budget.tb - CLINIC_COST_M) * 100) / 100 },
      inbox: [{ id: `clin-${playerId}-${cur.career.day}`, kind: 'kadro', title: `Avrupa Kliniği: ${p.name}`, body: `${p.name}, özel kliniğe sevk edildi — tedavi süresi 14 gün kısaldı (kalan ≈${newDays} gün). Maliyet kasadan karşılandı: ₺0,3M.`, day: cur.career.day, read: false }, ...cur.inbox],
    }));
    setTimeout(() => { clinicInFlightRef.current.delete(playerId); void saveNow(); }, 150);
    return { ok: true };
  }, [playerOf, saveNow]);

  // v0.9.9 — İğneyle oynatma: risk izni verilen sakat oyuncu bir maçlığına kadroya girer
  const setRiskPlay = useCallback((playerId: string, on: boolean) => {
    if (on) {
      const p = playerOf(playerId);
      if (!p || p.clubId !== stateRef.current.career.clubId || !p.injury?.canPlayWithRisk) return;
    }
    setSt((cur) => {
      const cur0 = cur.riskPlayIds ?? [];
      const next = on ? [...new Set([...cur0, playerId])] : cur0.filter((x) => x !== playerId);
      return { ...cur, riskPlayIds: next };
    });
    setTimeout(() => { void saveNow(); }, 150);
  }, [playerOf, saveNow]);

  // v0.9.9 — İğne kumarı maç sonu çözümü: oynayan onaylılar %25 nüks (sakatlık 14-42g ekler)
  const applyRiskOutcome = useCallback((playedIds: string[]): string[] => {
    const s = stateRef.current;
    const approved = s.riskPlayIds ?? [];
    const played = approved.filter((id) => playedIds.includes(id));
    const aggravated: string[] = [];
    setSt((cur) => {
      const patch = { ...cur.playerPatch };
      const newInbox = [...cur.inbox];
      played.forEach((id, i) => {
        const result = needleOutcome(worldSeed + cur.career.day * 131 + i * 17);
        // after match-state commit, prefer patch values, then current player view
        const p = playerOf(id);
        const prev = patch[id] ?? {};
        if (result.aggravated) {
          const baseDays = prev.injuredDays ?? p?.injuredDays ?? 0;
          const add = result.extraDays;
          const nd = baseDays + add;
          const prevInj = prev.injury ?? p?.injury;
          patch[id] = { ...prev, injuredDays: nd, injury: prevInj ? { ...prevInj, daysRemaining: nd } : undefined };
          aggravated.push(id);
          newInbox.unshift({ id: `risk-${id}-${cur.career.day}`, kind: 'kritik', title: `💉 Nüks: ${prevInj?.name ?? 'Sakatlık'}`, body: `İğneyle oynatma kumarı tutmadı — sakatlık ${add} gün uzadı (toplam ~${nd} gün). Sağlık ekibi yoğun bakımda.`, day: cur.career.day, read: false });
        }
      });
      // Onay her durumda tek maçlıktır: oynamadıysa da izni sonraki maça taşıma.
      return { ...cur, playerPatch: patch, inbox: newInbox, riskPlayIds: (cur.riskPlayIds ?? []).filter((x) => !approved.includes(x)) };
    });
    setTimeout(() => { void saveNow(); }, 200);
    return aggravated;
  }, [playerOf, saveNow, worldSeed]);

  // v0.9.9 — Ağabeylik (mentoring): 29+ kurt ≤21 gence atanır
  const setMentor = useCallback((youngId: string, seniorId: string | null): { ok: boolean; reason?: string } => {
    const y = playerOf(youngId);
    const s0 = stateRef.current;
    if (!y || y.clubId !== s0.career.clubId) return { ok: false, reason: 'Genç oyuncu kulübünüzde değil.' };
    if (seniorId !== null) {
      const m = playerOf(seniorId);
      const s = stateRef.current;
      const mySq = squads[s.career.clubId] ?? [];
      if (!m || !mySq.some((x) => x.id === seniorId)) return { ok: false, reason: 'Ağabey adayının kadronuzda olması gerekir.' };
      if (m.age < 29) return { ok: false, reason: 'Ağabey en az 29 yaşında olmalı.' };
      if (y.age > 21) return { ok: false, reason: 'Mentorluk yalnızca 21 ve altı oyunculara atanır.' };
      if (seniorId === youngId) return { ok: false, reason: 'Oyuncu kendi kendine ağabey olamaz.' };
    }
    setSt((cur) => ({ ...cur, playerPatch: { ...cur.playerPatch, [youngId]: { ...(cur.playerPatch[youngId] ?? {}), mentorId: seniorId } } }));
    setTimeout(() => { void saveNow(); }, 150);
    return { ok: true };
  }, [playerOf, squads, saveNow]);

  const respondOffer = useCallback((offerId: string, accept: boolean, counterFee?: number) => {
    const s = stateRef.current;
    const of = s.incomingOffers.find((o) => o.id === offerId);
    if (!of || of.state !== 'open') return;
    // Dalga 3: kiralık oyuncu satış masasına çıkamaz
    if (onLoan(s.loans ?? [], of.playerId)) return;
    const p = playerOf(of.playerId);
    const buyer = clubById(of.fromClubId);
    if (accept || (counterFee !== undefined)) {
      const rng = mulberry32(worldSeed + of.day * 7 + of.fee * 100);
      if (accept) {
        setSt((cur) => {
          const settlement = calculateSellOnSettlement(of.fee, normalizeSellOnClauses(cur.sellOnClauses)[of.playerId] ?? []);
          const clauses = normalizeSellOnClauses(cur.sellOnClauses); delete clauses[of.playerId];
          const nextBudget = Math.round((cur.budget.tb + settlement.retainedFee) * 100) / 100;
          const entry: TransferLogEntry = { id: `to-${offerId}`, day: cur.career.day, seasonNo: cur.seasonNo, playerName: p!.name, age: p!.age, group: p!.group, fromClubId: cur.career.clubId, toClubId: of.fromClubId, fee: of.fee, kind: 'out', sellOnPaid: settlement.totalPaid };
          const paidTo = settlement.payouts.map((row) => `${clubByIdSafe(row.clubId)?.short ?? row.clubId} ₺${row.amount.toFixed(2)}M`).join(', ');
          return {
            ...cur,
            incomingOffers: cur.incomingOffers.map((o) => (o.id === offerId ? { ...o, state: 'accepted' as const } : o)),
            playerClub: { ...cur.playerClub, [of.playerId]: of.fromClubId },
            budget: { ...cur.budget, tb: nextBudget },
            sellOnClauses: clauses,
            transferLog: [entry, ...cur.transferLog],
            transferListed: cur.transferListed.filter((x) => x !== of.playerId),
            inbox: [{ id: `ts-${offerId}`, kind: 'transfer', title: `Satış: ${p!.name}`, body: `${p!.name}, ₺${of.fee.toFixed(1)}M brüt bedelle ${buyer.name} kulübüne satıldı.${settlement.totalPaid > 0 ? ` Önceki satış payı: ₺${settlement.totalPaid.toFixed(2)}M (${paidTo}); bütçeye net ₺${settlement.retainedFee.toFixed(2)}M eklendi.` : ''} Transfer bütçen ₺${nextBudget.toFixed(1)}M oldu.`, day: cur.career.day, read: false }, ...cur.inbox],
          };
        });
      } else {
        // Karşı teklif: alıcı değerlendirir (fee oranına göre deterministik)
        const acc = counterFee! <= of.fee * 1.25 || (of.negotiable && counterFee! <= of.fee * 1.6 && rng() < 0.5);
        setSt((cur) => {
          if (!acc) return { ...cur, incomingOffers: cur.incomingOffers.map((o) => (o.id === offerId ? { ...o, state: 'rejected' as const } : o)), inbox: [{ id: `trn-${offerId}`, kind: 'transfer', title: 'Karşı teklif reddedildi', body: `${buyer.name}, ${p!.name} için önerdiğin ₺${counterFee!.toFixed(1)}M bedeli çok yüksek buldu ve masadan kalktı.`, day: cur.career.day, read: false }, ...cur.inbox] };
          const settlement = calculateSellOnSettlement(counterFee!, normalizeSellOnClauses(cur.sellOnClauses)[of.playerId] ?? []);
          const clauses = normalizeSellOnClauses(cur.sellOnClauses); delete clauses[of.playerId];
          const nextBudget = Math.round((cur.budget.tb + settlement.retainedFee) * 100) / 100;
          const entry: TransferLogEntry = { id: `to-${offerId}-c`, day: cur.career.day, seasonNo: cur.seasonNo, playerName: p!.name, age: p!.age, group: p!.group, fromClubId: cur.career.clubId, toClubId: of.fromClubId, fee: counterFee!, kind: 'out', sellOnPaid: settlement.totalPaid };
          const paidTo = settlement.payouts.map((row) => `${clubByIdSafe(row.clubId)?.short ?? row.clubId} ₺${row.amount.toFixed(2)}M`).join(', ');
          return {
            ...cur,
            incomingOffers: cur.incomingOffers.map((o) => (o.id === offerId ? { ...o, state: 'accepted' as const, fee: counterFee! } : o)),
            playerClub: { ...cur.playerClub, [of.playerId]: of.fromClubId },
            budget: { ...cur.budget, tb: nextBudget },
            sellOnClauses: clauses,
            transferLog: [entry, ...cur.transferLog],
            transferListed: cur.transferListed.filter((x) => x !== of.playerId),
            inbox: [{ id: `trn-ok-${offerId}`, kind: 'transfer', title: 'Karşı teklif kabul!', body: `${buyer.name}, yükseltilmiş bedel ₺${counterFee!.toFixed(1)}M'yi kabul etti. ${p!.name} satıldı.${settlement.totalPaid > 0 ? ` Önceki satış payı: ₺${settlement.totalPaid.toFixed(2)}M (${paidTo}); bütçeye net ₺${settlement.retainedFee.toFixed(2)}M eklendi.` : ''}`, day: cur.career.day, read: false }, ...cur.inbox],
          };
        });
      }
    } else {
      setSt((cur) => ({ ...cur, incomingOffers: cur.incomingOffers.map((o) => (o.id === offerId ? { ...o, state: 'rejected' as const } : o)) }));
    }
    setTimeout(() => { void saveNow(); }, 150);
  }, [worldSeed, playerOf, saveNow]);

  const toggleTransferList = useCallback((playerId: string) => {
    setSt((cur) => {
      const listed = cur.transferListed.includes(playerId);
      const p = playerOf(playerId);
      return {
        ...cur,
        transferListed: listed ? cur.transferListed.filter((x) => x !== playerId) : [...cur.transferListed, playerId],
        inbox: listed ? cur.inbox : [{ id: `tl-${playerId}`, kind: 'transfer', title: 'Satış listesine eklendi', body: `${p?.name ?? 'Oyuncu'} satış listesine alındı — AI kulüpler pencere içinde teklifle gelebilir. Kadro ekranından geri alınabilir.`, day: cur.career.day, read: false }, ...cur.inbox],
      };
    });
  }, [playerOf]);

  const renewContract = useCallback((playerId: string, years: number): { ok: boolean; reason?: string } => {
    const s = stateRef.current;
    const p = playerOf(playerId);
    if (!p) return { ok: false, reason: 'Oyuncu bulunamadı.' };
    if (p.clubId !== s.career.clubId) return { ok: false, reason: 'Oyuncu kadronuzda değil.' };
    if ((p.contractYears ?? 3) > 2) return { ok: false, reason: 'Sözleşme yenileme son 2 yılda açılır.' };
    // Dalga 6: kırgın oyuncu süre sözü olmadan masaya oturmaz
    {
      const myId2 = s.career.clubId;
      const byGen = [...(squads[myId2] ?? [])].sort((a, b) => b.ratings.gen - a.ratings.gen);
      const rank = byGen.findIndex((x) => x.id === playerId);
      const playedLeague = s.fixtures.filter((f) => f.played && f.comp === 'lig' && (f.homeId === myId2 || f.awayId === myId2)).length;
      const apps = (s.playerStats ?? {})[playerId]?.apps ?? 0;
      const gv = minuteGrievance(rank < 0 ? 20 : rank, p.age, apps, playedLeague);
      if (grievanceLabel(gv) === 'kırgın' && !(s.promises ?? {})[playerId])
        return { ok: false, reason: `${p.name} kırgın: süre garantisi olmadan yeni sözleşme konuşmuyor. Profilinde "Süre Sözü Ver" (önümüzdeki 10 maçta ≥%55) ya da düzenli oynat.` };
    }
    const cost = Math.round(p.wage * 6) / 1000; // imza bonusu ≈ 6 maaş (₺M)
    if (s.budget.tb < cost) return { ok: false, reason: `İmza bonusu için bütçe yetersiz (₺${cost.toFixed(1)}M gerekli).` };
    setSt((cur) => ({
      ...cur,
      playerPatch: { ...cur.playerPatch, [playerId]: { ...(cur.playerPatch[playerId] ?? {}), contractYears: Math.max(years, 3), wage: Math.round(p.wage * 1.15) } },
      budget: { ...cur.budget, tb: Math.round((cur.budget.tb - cost) * 10) / 10 },
      inbox: [{ id: `rw-${playerId}-${cur.career.day}`, kind: 'transfer', title: 'Sözleşme yenilendi', body: `${p.name} ile ${years} yıllık yeni sözleşme imzalandı. İmza bonusu: ₺${cost.toFixed(1)}M. Yeni maaş ₺${Math.round(p.wage * 1.15)}B/ay (+%15).`, day: cur.career.day, read: false }, ...cur.inbox],
    }));
    setTimeout(() => { void saveNow(); }, 100);
    return { ok: true };
  }, [worldSeed, playerOf, saveNow]);

  // ── Dalga 3: Kiralık alma (AI kulübünden, pencere içinde, kapı ücreti yok, maaş yarı yarıya) ──
  const loanIn = useCallback((p: Player): { ok: boolean; reason?: string } => {
    const s = stateRef.current;
    const myId = s.career.clubId;
    const fromId = clubOfPlayer(p.id) ?? p.clubId;
    if (!fromId || fromId === myId) return { ok: false, reason: 'Oyuncu zaten kadronuzda veya kulüpsüz — kiralık olamaz.' };
    if (fromId === FREE_CLUB || p.id.startsWith('fa_')) return { ok: false, reason: 'Serbest oyuncu kiralık olmaz — direkt imzala.' };
    if (!inWindow(s.career.day)) return { ok: false, reason: 'Kiralık işlemi yalnız transfer penceresinde yapılır.' };
    if (onLoan(s.loans ?? [], p.id)) return { ok: false, reason: 'Oyuncu zaten kiralık (üst üste kiralık yok).' };
    if ((squads[myId]?.length ?? 0) >= 30) return { ok: false, reason: 'Kadro üst sınırı 30.' };
    const q = canAddForeign(squads[myId] ?? [], s.leagueOf[myId] ?? 'zirve', p);
    if (!q.ok) return { ok: false, reason: q.reason };
    const parent = clubById(fromId);
    if (!clubAcceptsLoan(parent.strength, squads[fromId]?.length ?? 0, p, false))
      return { ok: false, reason: `${parent.name} bu oyuncuyu kiralık vermiyor (ilk 11 önceliği veya kadro derinliği az).` };
    const wageShare = loanWage(p);
    setSt((cur) => ({
      ...cur,
      playerClub: { ...cur.playerClub, [p.id]: myId },
      playerPatch: { ...cur.playerPatch, [p.id]: { ...(cur.playerPatch[p.id] ?? {}), clubId: myId, wage: wageShare } },
      loans: [...(cur.loans ?? []), { playerId: p.id, fromClub: fromId, toClub: myId, seasonNo: cur.seasonNo }],
      inbox: [{ id: `ln-${p.id}-${cur.career.day}`, kind: 'transfer', title: `Kiralık: ${p.name}`, body: `${p.name}, ${parent.name} kulübünden sezon sonuna kadar kiralandı. Kapı ücreti ₺0; maaş yarı paylaşımı: ₺${wageShare}B/ay. Sezon bitiminde kulübüne döner.`, day: cur.career.day, read: false }, ...cur.inbox],
    }));
    setTimeout(() => { void saveNow(); }, 150);
    return { ok: true };
  }, [clubOfPlayer, squads, saveNow]);

  // ── Dalga 3: Kiralık gönderme (kendi oyuncum → alt/aynı lig AI kulübü, deterministik hedef) ──
  const loanOut = useCallback((playerId: string): { ok: boolean; reason?: string } => {
    const s = stateRef.current;
    const myId = s.career.clubId;
    const p = playerOf(playerId);
    if (!p || (clubOfPlayer(playerId) ?? p.clubId) !== myId) return { ok: false, reason: 'Oyuncu kadronuzda değil.' };
    if (!inWindow(s.career.day)) return { ok: false, reason: 'Kiralık işlemi yalnız transfer penceresinde yapılır.' };
    if (onLoan(s.loans ?? [], playerId)) return { ok: false, reason: 'Oyuncu zaten kiralık.' };
    if ((squads[myId]?.length ?? 0) <= 19) return { ok: false, reason: 'Kadro 19 oyuncunun altına düşemez.' };
    // hedef kulüp: aynı veya alt ligde, kadrosu yer olan ilk uygun kulüp (deterministik sıra: lig sırası + kulüp id)
    const ORDER: LeagueId[] = ['zirve', 'gecit', 'kok'];
    const myLeagueIx = ORDER.indexOf(s.leagueOf[myId] ?? 'zirve');
    const cands = CLUBS.filter((c) => c.id !== myId && ORDER.indexOf(s.leagueOf[c.id] ?? c.league) >= myLeagueIx)
      .sort((a, b) => a.id.localeCompare(b.id))
      .filter((c) => aiAcceptsInboundLoan(c.strength, squads[c.id]?.length ?? 22, p));
    const target = cands[0];
    if (!target) return { ok: false, reason: 'Uygun kulüp bulunamadı (kadro dolu veya oyuncu profili uymuyor).' };
    setSt((cur) => ({
      ...cur,
      transferListed: cur.transferListed.filter((x) => x !== playerId),
      playerClub: { ...cur.playerClub, [playerId]: target.id },
      playerPatch: { ...cur.playerPatch, [playerId]: { ...(cur.playerPatch[playerId] ?? {}), clubId: target.id } },
      loans: [...(cur.loans ?? []), { playerId, fromClub: myId, toClub: target.id, seasonNo: cur.seasonNo }],
      inbox: [{ id: `lo-${playerId}-${cur.career.day}`, kind: 'transfer', title: `Kiraya verildi: ${p.name}`, body: `${p.name}, sezon sonuna dek ${target.name} kulübüne kiralandı. Maç ritmi kazanacak; sezon bitiminde döner. Satış listesinden çıkarıldı.`, day: cur.career.day, read: false }, ...cur.inbox],
    }));
    setTimeout(() => { void saveNow(); }, 150);
    return { ok: true };
  }, [playerOf, clubOfPlayer, squads, saveNow]);

  // ── Dalga 6: Süre sözü ──
  const minuteState = useCallback((playerId: string, rank: number, age: number) => {
    const s = stateRef.current;
    const playedLeague = s.fixtures.filter((f) => f.played && f.comp === 'lig' && (f.homeId === s.career.clubId || f.awayId === s.career.clubId)).length;
    const apps = (s.playerStats ?? {})[playerId]?.apps ?? 0;
    const g = minuteGrievance(rank, age, apps, playedLeague);
    const pr = (s.promises ?? {})[playerId];
    const promise: 'active' | 'none' = pr && evalPromise(pr, playedLeague, apps) === 'active' ? 'active' : 'none';
    return { g, label: grievanceLabel(g), promise };
  }, []);

  const promiseMinutes = useCallback((playerId: string): { ok: boolean; reason?: string } => {
    const s = stateRef.current;
    const p = playerOf(playerId);
    if (!p || (clubOfPlayer(playerId) ?? p.clubId) !== s.career.clubId) return { ok: false, reason: 'Oyuncu kadronuzda değil.' };
    if ((s.promises ?? {})[playerId]) return { ok: false, reason: 'Bu oyuncuya hâlihazırda aktif bir söz verilmiş — pencere kapanmadan yeni söz verilemez.' };
    const playedLeague = s.fixtures.filter((f) => f.played && f.comp === 'lig' && (f.homeId === s.career.clubId || f.awayId === s.career.clubId)).length;
    const apps = (s.playerStats ?? {})[playerId]?.apps ?? 0;
    const pr = newPromise(s.career.day, playedLeague, apps);
    setSt((cur) => ({
      ...cur,
      promises: { ...(cur.promises ?? {}), [playerId]: pr },
      inbox: [{ id: `pm-v-${playerId}-${cur.career.day}`, kind: 'kadro', title: `Süre sözü: ${p.name}`, body: `${p.name}'e önümüzdeki ${pr.window} maçta en az %${Math.round(pr.share * 100)} kadro payı sözü verildi. Tutarsa güven + form yükselir; bozulursa oyuncu kırılır (form -6).`, day: cur.career.day, read: false }, ...cur.inbox],
    }));
    setTimeout(() => { void saveNow(); }, 150);
    return { ok: true };
  }, [playerOf, clubOfPlayer, saveNow]);

  const value: GameState & GameActions = {
    ...st,
    myClub, myLeague, mySquad, squads, nextFixture, unread,
    effectiveStrength, saveNow,
    advanceDay, buildDemoMatch, playLeagueMatch, updateTactic, setInbox, setCareer, updateMarketShortlist, recordManagerYellow, consumeManagerSuspension, setBudget, addSquadPlayer, clearSeasonFinale,
    setTrainingFocus, signAcademyCandidate, passAcademyCandidate, acceptJob,
    buyPlayer, clinicTreat, setRiskPlay, applyRiskOutcome, setMentor, respondOffer, toggleTransferList, playerOf, clubOfPlayer, renewContract,
    loanIn, loanOut, promiseMinutes, minuteState, resolveCultureIssue,
  };
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

