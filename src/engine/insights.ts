// Match insights are factual projections of this result's recorded stats and selected plans.
import { Club, TacticPlan } from '../types';
import { MatchStats } from './engine';
import { TeamMatchProfile } from './profiles';

interface TeamsRef { home: Club; away: Club }
interface ProfRef { homeProf: TeamMatchProfile; awayProf: TeamMatchProfile; homeTac: TacticPlan; awayTac: TacticPlan }

const n = (value: number) => Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;

export function buildInsights(stats: MatchStats, clubs: TeamsRef, weather: string, prof: ProfRef): string[] {
  const out = [
    `${clubs.home.short} ${stats.hg}–${stats.ag} ${clubs.away.short} · xG ${n(stats.xgH)}–${n(stats.xgA)}.`,
    `Şut/isabet: ${clubs.home.short} ${stats.shotsH}/${stats.onH} · ${clubs.away.short} ${stats.shotsA}/${stats.onA}; kurtarış ${stats.savesH}–${stats.savesA}.`,
    `Topa sahip olma ${stats.posH}%–${100 - stats.posH}%; faul ${stats.foulsH}–${stats.foulsA}.`,
  ];

  const wideTotal = stats.wideAttH + stats.wideAttA;
  const centralTotal = stats.centralAttH + stats.centralAttA;
  if (wideTotal + centralTotal > 0) {
    out.push(`Hücum girişleri: kanat ${stats.wideAttH}–${stats.wideAttA}, merkez ${stats.centralAttH}–${stats.centralAttA}.`);
  }
  if (stats.pressWinsH + stats.pressWinsA > 0) {
    out.push(`Presle kazanılan top ${stats.pressWinsH}–${stats.pressWinsA}; kartlar sarı ${stats.yellowH}–${stats.yellowA}, kırmızı ${stats.redH}–${stats.redA}.`);
  }
  if (out.length < 5) {
    out.push(`Seçili planlar: ${clubs.home.short} “${prof.homeTac.name}”, ${clubs.away.short} “${prof.awayTac.name}”; koşullar: ${weather}.`);
  }
  return out.slice(0, 5);
}
