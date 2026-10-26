// HM26 Maç Motoru §12.3 — Canlı anlatım (v0.9.10: oyuncu zincirli, pozisyon-duyarlı yayın dili)
import { Club } from '../types';
import { Possession, PassStep } from './possession';
import { LineupSlot } from './profiles';
import { ZoneId } from './zones';

export type BroadcastVisual = 'free_kick' | 'brawl' | 'woodwork' | 'volley';

/** Pure presentation cue: stable hash only; never consumes simulation RNG or changes a resolved shot. */
export function shotVisualCue(seed: number, minute: number, playerId: string, zone: string, outcome: 'goal' | 'save' | 'miss', crossed: boolean): BroadcastVisual | undefined {
  const rollFor = (tag: string) => {
    const key = `${seed}:${minute}:${playerId}:${zone}:${tag}`;
    let hash = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 0x01000193);
    return (hash >>> 0) / 4294967296;
  };
  if (outcome === 'miss' && rollFor('woodwork') < 0.035) return 'woodwork';
  if (crossed && rollFor('volley') < 0.025) return 'volley';
  return undefined;
}

export interface NarrationEvent {
  minute: number;
  side?: 'home' | 'away';
  text: string;
  kind: 'info' | 'goal' | 'save' | 'card' | 'sub' | 'injury' | 'var' | 'half' | 'danger' | 'corner';
  path?: ZoneId[];
  /** Optional semantic actors for broadcast overlays; never used to recalculate match outcomes. */
  playerId?: string;
  scorerId?: string;
  assisterId?: string;
  /** Presentation-only cue; never changes the resolved outcome. */
  visualEvent?: BroadcastVisual;
  visualActors?: string[];
}

interface NarrCtx {
  rng: () => number;
  weather: string;
  homeClub: Club;
  awayClub: Club;
  jitter: number;
}

const ln = (full?: string | null): string => (full ?? '').split(' ').slice(-1)[0] || 'Oyuncu';
// Türkçe sesli uyumu: iyelik/çekim ekleri ismin son seslisine göre
const lastVowel = (w: string): string => { const m = w.toLowerCase().match(/[aeıioöuü](?!.*[aeıioöuü])/); return m ? m[0] : 'e'; };
const gen = (w: string): string => `${w}'${({ a: 'ın', 'ı': 'ın', e: 'in', i: 'in', o: 'un', u: 'un', 'ö': 'ün', 'ü': 'ün' } as Record<string, string>)[lastVowel(w)] ?? 'in'}`;
const acc = (w: string): string => `${w}'${({ a: 'ı', 'ı': 'ı', e: 'i', i: 'i', o: 'u', u: 'u', 'ö': 'ü', 'ü': 'ü' } as Record<string, string>)[lastVowel(w)] ?? 'i'}`;
const pick = <T>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const laneTxt = (p: Partial<Possession> | undefined): string => {
  if (!p?.channel) return 'Merkezde';
  return p.channel === 'wide' ? (p.path?.[p.path.length - 1]?.[0] === 'L' ? 'Sol kanatta' : 'Sağ kanatta') : 'Merkezde';
};

/** Zincirin okunabilir özeti: "Yıldırımçı → Oruç → Tanrıkulu" (son 3 halka) */
function chainArrow(pos: Possession, max = 3): string {
  const names: string[] = [];
  const steps = pos.chain.filter((s) => s.toName && s.toName !== s.fromName); // kendi-kendine pas düşürülür
  for (const s of steps.slice(-max)) {
    if (!names.length) names.push(ln(s.fromName));
    const t = ln(s.toName);
    if (names[names.length - 1] !== t) names.push(t);
  }
  return names.length ? names.join(' → ') : '';
}

/** Zincirde öne çıkan niyet (nakil dili için) */
function dominant(pos: Possession): PassStep | null {
  const order: PassStep['intent'][] = ['through', 'cross', 'switch', 'long', 'progressive', 'carry', 'short', 'distribute', 'backpass'];
  for (const it of order) {
    const s = [...pos.chain].reverse().find((x) => x.intent === it && x.toName && x.toName !== x.fromName);
    if (s) return s;
  }
  return null;
}

/** Zincirden asist cümlesi — son pas veren ≠ vuran ise */
function assistClause(pos: Possession, shooterName: string): string {
  const lp = pos.lastPasser;
  if (!lp || ln(lp.player.name) === shooterName) return '';
  const last = [...pos.chain].reverse().find((s) => s.toId === pos.ballHolder?.player.id);
  if (last?.intent === 'cross') return ` ${ln(lp.player.name)} ortaladı,`;
  if (last?.intent === 'through') return ` ${ln(lp.player.name)} ara pası bıraktı,`;
  if (last?.intent === 'switch') return ` ${ln(lp.player.name)} ters topu açtı,`;
  if (last?.intent === 'long') return ` ${ln(lp.player.name)} uzun gönderdi,`;
  if (last && last.intent !== 'carry') return ` ${ln(lp.player.name)} pasını verdi,`;
  return '';
}

export function narrate(
  events: NarrationEvent[],
  pos: Possession,
  club: Club,
  shooter: LineupSlot | null,
  minute: number,
  mode: 'goal' | 'save' | 'miss' | 'corner' | 'dangerous' | 'buildup' | 'time' | 'varNo' | 'loss' | 'foulTxt' | 'carry',
  ctx: NarrCtx,
  keeper?: LineupSlot
): void {
  const rng = ctx.rng;
  const sc = shooter ? ln(shooter.player.name) : 'Oyuncu';
  const kp = keeper ? ln(keeper.player.name) : 'kaleci';
  const wing = laneTxt(pos);
  const arrow = chainArrow(pos);
  const dom = dominant(pos);

  switch (mode) {
    case 'goal': {
      const asst = assistClause(pos, sc);
      const t = rng();
      const line = t < 0.25 ? `GOOOL!${asst} ${sc} boş durumda affetmedi!`
        : t < 0.5 ? `GOOOL!${asst} ${sc} sert vurdu, ağlar havalandı!`
        : t < 0.7 ? `GOOOL!${asst} ${sc} soğukkanlı bitirdi — tribünler ayakta!`
        : `GOOOL!${asst} ${sc} topu köşeye bıraktı!`;
      events.push({ minute, side: pos.owner, text: line, kind: 'goal', path: pos.path, scorerId: shooter?.player.id, assisterId: pos.lastPasser && pos.lastPasser.player.id !== shooter?.player.id ? pos.lastPasser.player.id : undefined });
      break;
    }
    case 'save': {
      const t = rng();
      const line = t < 0.3 ? `${wing} boşluk açıldı... ${sc} vurdu, ${kp} parmaklarının ucuyla çıkardı!`
        : t < 0.55 ? `${sc} yakın mesafeden vurdu — ${kp} gole izin vermedi!`
        : t < 0.8 ? `${sc} köşeye baktı ve vurdu... ${kp} müthiş uzandı!`
        : `${gen(sc)} şutunda ${kp} güçlükle tokatladı!`;
      events.push({ minute, side: pos.owner, text: line, kind: 'save', path: pos.path });
      break;
    }
    case 'miss': {
      const asst = assistClause(pos, sc);
      const t = rng();
      const line = t < 0.34 ? `${asst ? asst.trim() + ' ' : ''}${sc} vurdu — top az farkla yandan auta.`
        : t < 0.6 ? `${sc} şutunu çekti, meşin yuvarlak üstten dışarı.`
        : t < 0.85 ? `${sc} müsait durumda denedi ama isabet yok.`
        : `${sc} vurdu — savunmaya çarpıp kornere çıktı.`;
      events.push({ minute, side: pos.owner, text: line, kind: 'danger', path: pos.path });
      break;
    }
    case 'corner': {
      const t = rng();
      const line = t < 0.4 ? `Korner kullanıldı, ${club.short} içeri ortaladı — savunma uzaklaştırdı.`
        : t < 0.7 ? `Ön direğe kesildi, kafa geldi ama top kaleyi bulmadı.`
        : `Duran top sonrası ${club.short} yararlanamadı.`;
      events.push({ minute, side: pos.owner, text: line, kind: 'corner', path: pos.path });
      break;
    }
    case 'varNo': {
      events.push({ minute, side: pos.owner, text: `VAR incelemesi: ofsayt, gol iptal edildi.`, kind: 'var', path: pos.path });
      break;
    }
    case 'dangerous': {
      const thief = pos.dispossessedBy ? ln(pos.dispossessedBy.player.name) : null;
      const t = rng();
      const line = thief
        ? (t < 0.5 ? `${thief} presle topu kaptı — ${club.short} kontra tehlikesi yaşadı!` : `${club.short} riskli bölgede kaptırdı; ${thief} araya girip tehlikeyi kesti.`)
        : `${club.short} riskli bölgede topu kaptırdı — savunma son anda kapadı.`;
      events.push({ minute, side: pos.owner, text: line, kind: 'danger', path: pos.path });
      break;
    }
    case 'loss': {
      const loser = pos.ballHolder ? ln(pos.ballHolder.player.name) : null;
      const thief = pos.dispossessedBy ? ln(pos.dispossessedBy.player.name) : null;
      const t = rng();
      let line: string;
      if (loser && thief) {
        line = t < 0.4 ? `${loser} baskı altında kaptırdı — ${thief} araya girdi.`
          : t < 0.7 ? `${thief} güçlü ikili mücadelede topu ${gen(loser)}den söktü.`
          : `${loser} pasında isabet yok; ${thief} kesip bozdu.`;
      } else if (loser) {
        line = t < 0.25 ? `${gen(loser)} pası rakibe gitti.`
          : t < 0.5 ? `${loser} ağır kaldı, top kaybı.`
          : t < 0.75 ? `${loser} kapanan savunma karşısında çıkışı bulamadı.`
          : `${loser} kontrolünde top uzaklaştı — taç rakibin.`;
      } else {
        line = `${club.short} pas zinciri kırıldı — top kaybı.`;
      }
      events.push({ minute, side: pos.owner, text: line, kind: 'info', path: pos.path });
      break;
    }
    case 'foulTxt': {
      const fouler = pos.fouler ? ln(pos.fouler.player.name) : null;
      const fouled = pos.fouled ? ln(pos.fouled.player.name) : null;
      const t = rng();
      const line = fouler && fouled
        ? (t < 0.5 ? `${fouler}, ${acc(fouled)} durdurmak için faul yaptı — serbest vuruş.`
          : `${fouled} çalımı denedi, ${fouler} izin vermedi: faul.`)
        : fouler ? `${fouler} faulle durduruldu — serbest vuruş ${club.short} lehine.`
          : `Sert müdahale sonrası faul kararı ${club.short} lehine.`;
      events.push({ minute, side: pos.owner, text: line, kind: 'info', path: pos.path, visualEvent: pos.end.endsWith('-A') ? 'free_kick' : undefined, visualActors: pos.fouler ? [pos.fouler.player.id] : undefined });
      break;
    }
    case 'carry': {
      const c = pos.ballHolder ? ln(pos.ballHolder.player.name) : null;
      const t = rng();
      const line = c
        ? (t < 0.4 ? `${c} rakibini ekarte etti — ${wing} topu sürdü.`
          : t < 0.7 ? `${c} topu ayağında tutup takımını rahatlattı.`
          : `${c} driplingle öne taşıdı, destek bekledi.`)
        : `${club.short} kısa driplingle rakip baskıdan sıyrıldı.`;
      events.push({ minute, side: pos.owner, text: line, kind: 'info', path: pos.path });
      break;
    }
    case 'buildup': {
      const t = rng();
      let line: string;
      if (dom?.intent === 'switch' && dom.toName) {
        line = t < 0.5 ? `${ln(dom.fromName)} oyunu çevirdi — ${ln(dom.toName)} ters kanatta boşluğu gördü.`
          : `${club.short} yön değiştirdi: ${arrow}.`;
      } else if (dom?.intent === 'cross' && dom.toName) {
        line = `${ln(dom.fromName)} ${wing.toLowerCase()} bindirdi — ${ln(dom.toName)} ortaya hareketlendi.`;
      } else if (dom?.intent === 'through' && dom.toName) {
        line = `${ln(dom.fromName)} savunma arasına sokuldu — ara pası ${acc(ln(dom.toName))} aradı.`;
      } else if (dom?.intent === 'long' && dom.toName) {
        line = `${ln(dom.fromName)} uzun topla ${acc(ln(dom.toName))} kaçırdı.`;
      } else if (arrow && arrow.includes('→')) {
        line = t < 0.4 ? `${club.short} pas trafiği: ${arrow} — rakip pres çözülüyor.`
          : t < 0.7 ? `Geriden sabırla çıkıldı: ${arrow}.`
          : `${arrow} — ${club.short} merkezde üstünlük kuruyor.`;
      } else {
        line = pick(rng, [
          `${club.short} savunmadan kontrollü çıktı.`,
          `${club.short} ritmini buldu, hatlar arası bağlantı kuruluyor.`,
          `${club.short} düşük tempoda oyun kuruyor.`,
          `${wing} hareketlenme var — ${club.short} boşluk arıyor.`,
        ]);
      }
      events.push({ minute, side: pos.owner, text: line, kind: 'info', path: pos.path });
      break;
    }
    case 'time': {
      const t = rng();
      events.push({
        minute, side: pos.owner,
        text: t < 0.5 ? `${club.short} temposunu düşürüp zaman oyununa geçti.` : `${club.short} kenarları kullanarak dakika eritiyor.`,
        kind: 'info',
      });
      break;
    }
  }
}
