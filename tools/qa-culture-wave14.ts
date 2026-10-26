// Wave 14 club-culture and FFP focused contract tests.
import { readFileSync } from 'node:fs';
import { CLUBS } from '../src/data/clubs';
import { addSeasonCultureHonors, assessFfp, createClubCulture, normalizeClubCulture, resolveCultureChoice } from '../src/data/culture';
import type { OffPitchCulture } from '../src/types';

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });
const club = CLUBS[0];

{
  const a = createClubCulture(140001, club.id, club.rivalIds ?? []);
  const b = createClubCulture(140001, club.id, club.rivalIds ?? []);
  const restored = normalizeClubCulture(JSON.parse(JSON.stringify(a)), 140001, club.id, club.rivalIds ?? []);
  const dirty = normalizeClubCulture({ fanTrust: 140, discipline: -5, ultrasHeat: 'high', chairmanStyle: 'unknown', honors: [{ id: 'ok', title: 'Test', seasonNo: 1, earnedDay: 8 }, null] }, 140001, club.id);
  check('Culture generation is deterministic; JSON normalization clamps and rejects malformed values', JSON.stringify(a) === JSON.stringify(b)
    && JSON.stringify(a) === JSON.stringify(restored) && dirty.fanTrust === 100 && dirty.discipline === 0
    && dirty.ultrasHeat === 22 && dirty.honors.length === 1 && dirty.chairmanStyle === a.chairmanStyle,
    `chair=${a.chairmanName}; range=${dirty.fanTrust}/${dirty.discipline}; honors=${dirty.honors.length}`);
}

{
  const ffpClear = assessFfp({ payrollM: 0.7, wageCapM: 1, transferSpendM: 0.5, transferIncomeM: 0.1, baseBudgetM: 1 });
  const ffpWatch = assessFfp({ payrollM: 0.92, wageCapM: 1, transferSpendM: 0.5, transferIncomeM: 0.1, baseBudgetM: 1 });
  const ffpBreach = assessFfp({ payrollM: 1.03, wageCapM: 1, transferSpendM: 2, transferIncomeM: 0.1, baseBudgetM: 1 });
  check('FFP status derives from payroll ceiling and net seasonal transfer spend', ffpClear.status === 'clear'
    && ffpWatch.status === 'watch' && ffpBreach.status === 'breach'
    && ffpBreach.netSpendM === 1.9 && Math.abs(ffpWatch.payrollRatio - 0.92) < 1e-8,
    `clear=${ffpClear.status}; watch=${ffpWatch.status}; breach=${ffpBreach.status}; net=${ffpBreach.netSpendM.toFixed(1)}M`);
}

{
  const original = createClubCulture(140002, club.id);
  const insufficient = resolveCultureChoice({ culture: original, kind: 'community', choice: 'open_day', transferBudgetM: 0.1, seasonNo: 1, day: 60 });
  const open = resolveCultureChoice({ culture: original, kind: 'community', choice: 'open_day', transferBudgetM: 0.2, seasonNo: 1, day: 60 });
  const invalid = resolveCultureChoice({ culture: original, kind: 'community', choice: 'audit', transferBudgetM: 10, seasonNo: 1, day: 60 });
  const scandal = resolveCultureChoice({ culture: original, kind: 'scandal', choice: 'apologize', transferBudgetM: 0.2, seasonNo: 1, day: 61 });
  check('Community and scandal choices enforce distinct costs/effects and reject mismatched options', !insufficient.ok
    && open.ok && open.culture?.communityTrust === original.communityTrust + 12 && open.culture.fanTrust === original.fanTrust + 4
    && open.budget === 0.08 && !invalid.ok && scandal.ok && scandal.culture?.communityTrust === original.communityTrust + 9
    && scandal.budget === 0.08,
    `community=${open.culture?.communityTrust}; scandal=${scandal.culture?.communityTrust}; remaining=${scandal.budget}; invalid=${invalid.ok}`);
}

{
  const original = createClubCulture(140003, club.id);
  const meeting = resolveCultureChoice({ culture: { ...original, ultrasHeat: 48 }, kind: 'ultras', choice: 'meet_ultras', transferBudgetM: 0.1, seasonNo: 2, day: 30 });
  const audit = resolveCultureChoice({ culture: original, kind: 'ffp', choice: 'audit', transferBudgetM: 0.2, seasonNo: 2, day: 30 });
  const appeal = resolveCultureChoice({ culture: original, kind: 'ffp', choice: 'appeal', transferBudgetM: 0.2, seasonNo: 2, day: 30 });
  check('Supporter and FFP decisions update indicators, review season, costs and governance trade-offs', meeting.ok
    && meeting.culture?.ultrasHeat === 33 && audit.ok && audit.culture?.lastFfpReviewSeason === 2
    && audit.budget === 0.05 && audit.boardDelta === 2 && appeal.ok && appeal.boardDelta === -3,
    `meetingHeat=${meeting.culture?.ultrasHeat}; auditBudget=${audit.budget}; board=${audit.boardDelta}/${appeal.boardDelta}`);
}

{
  const culture: OffPitchCulture = { ...createClubCulture(140004, club.id), discipline: 90, communityTrust: 90, fanTrust: 88, ultrasHeat: 20 };
  const first = addSeasonCultureHonors(culture, 1, 300);
  const repeated = addSeasonCultureHonors(first, 2, 600);
  check('Season honors are awarded from culture thresholds and stay deduplicated', first.honors.length === 3
    && repeated.honors.length === 3 && first.honors.every((honor) => honor.seasonNo === 1),
    `honors=${first.honors.map((honor) => honor.id).join(',')}; repeated=${repeated.honors.length}`);
}

{
  const store = readFileSync(new URL('../src/store/game.tsx', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/screens/Club.tsx', import.meta.url), 'utf8');
  const wired = store.includes('normalizeClubCulture((snapshot.career ?? initialCareer).culture')
    && store.includes('pendingCultureIssue') && store.includes('resolveCultureIssue')
    && store.includes('const scandal = myReds >= 2 || isDerby') && store.includes('isDerby && myGoals < oppGoals')
    && ui.includes("issue.kind === 'scandal'")
    && store.includes('addSeasonCultureHonors') && store.includes('assessFfp(')
    && ui.includes("['kultur', 'Kültür']") && ui.includes('g.resolveCultureIssue(issue.id, option.choice)')
    && ui.includes('Net harcama / sezon') && ui.includes('Sezon onurları');
  check('Store persists culture, generates match/calendar issues and Club UI resolves every issue family', wired,
    `persisting=${store.includes('normalizeClubCulture(')}; matchSignals=${store.includes('myReds > 0') && store.includes('isDerby && myGoals < oppGoals')}; ui=${wired}`);
}

for (const result of results) console.log(`${result.pass ? '✅' : '❌'} ${result.name} | ${result.detail}`);
console.log(`\nCULTURE-WAVE14: ${results.filter((result) => result.pass).length}/${results.length}`);
if (results.some((result) => !result.pass)) process.exit(1);
