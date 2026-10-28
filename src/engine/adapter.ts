// HM26 Maç Motoru — store/app köprüsü
// simulateMatch (saf TS) ↔ uygulamanın DemoMatchResult / oyun durumu şekilleri
import { Club, Player, TacticPlan, CareerSettings } from '../types';
import { MatchInput, MatchResult } from './engine';
import { ZONE_XY } from './zones';
import { DemoMatchEvent, DemoMatchResult, ShotDot } from '../store/game';

const KIND_MAP: Record<string, DemoMatchEvent['kind']> = {
  info: 'info', goal: 'goal', save: 'save', card: 'card', sub: 'sub',
  // v4: sakatlıklar gerçek türüyle korunur (canlı ekranın injury kararları ve arşiv olayları için)
  injury: 'injury', var: 'var', half: 'half', danger: 'chance', corner: 'chance',
};

export function matchEngineToDemo(res: MatchResult): DemoMatchResult & { engine: MatchResult } {
  const events: DemoMatchEvent[] = res.events.map((e) => ({
    minute: e.minute,
    text: e.text,
    kind: KIND_MAP[e.kind] ?? 'info',
    side: e.side,
    path: e.path,
    // C2: kalıcı olay sıkıştırması için oyuncu kimlikleri ve kart rengi korunur
    ...(e.playerId ? { playerId: e.playerId } : {}),
    ...(e.scorerId ? { scorerId: e.scorerId } : {}),
    ...(e.anim ? { anim: e.anim } : {}),
  }));
  // §5-D: şut günlüğü → yüzde koordinat (deplasman aynalı: rakip yarı alan alta)
  const shotsLog: ShotDot[] = (res.shotsLog ?? []).map((s) => {
    const z = ZONE_XY[s.zone] ?? ZONE_XY['C-M'];
    return s.side === 'home'
      ? { minute: s.minute, side: s.side, x: z.x, y: z.y, xg: s.xg, outcome: s.outcome }
      : { minute: s.minute, side: s.side, x: 100 - z.x, y: 100 - z.y, xg: s.xg, outcome: s.outcome };
  });
  const s = res.stats;
  return {
    homeId: '', awayId: '',
    hg: s.hg, ag: s.ag,
    events,
    xgHome: s.xgH, xgAway: s.xgA,
    posHome: s.posH,
    shotsH: s.shotsH, shotsA: s.shotsA,
    shotsOnH: s.onH, shotsOnA: s.onA,
    insights: res.insights,
    cornersH: s.cornersH, cornersA: s.cornersA, foulsH: s.foulsH, foulsA: s.foulsA,
    yellowH: s.yellowH, yellowA: s.yellowA, redH: s.redH, redA: s.redA, savesH: s.savesH, savesA: s.savesA,
    wideH: s.wideAttH, wideA: s.wideAttA, centralH: s.centralAttH, centralA: s.centralAttA,
    pressWinsH: s.pressWinsH, pressWinsA: s.pressWinsA,
    shotsLog,
    playerRows: JSON.parse(JSON.stringify(s.playerRows)),
    ...(res.referee ? { referee: { label: res.referee.label, strictness: res.referee.strictness } } : {}),
    engine: res,
  };
}

export function buildEngineInput(props: {
  homeClub: Club; awayClub: Club;
  homeSquad: Player[]; awaySquad: Player[];
  homeTactic: TacticPlan; awayTactic?: TacticPlan;
  seed: number; settings: CareerSettings; derby?: boolean;
  userSide?: 'home' | 'away';
  challengeClubId?: string;
  challengePoints?: number;
  riskIds?: string[];              // v0.9.9 iğneyle oynatma onaylı sakatlar
}): MatchInput {
  return {
    homeClub: props.homeClub,
    awayClub: props.awayClub,
    homeSquad: props.homeSquad,
    awaySquad: props.awaySquad,
    homeTactic: props.homeTactic,
    awayTactic: props.awayTactic,
    seed: props.seed,
    derby: props.derby,
    goalPace: props.settings.goalPace,
    randomness: props.settings.randomness,
    userSide: props.userSide,
    challengeClubId: props.challengeClubId,
    challengePoints: props.challengePoints,
    riskIds: props.riskIds,
  };
}
