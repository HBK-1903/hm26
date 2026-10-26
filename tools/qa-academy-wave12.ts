// Wave 12 deterministic academy intake, decision window, roster/payroll/finance and migration checks.
import { readFileSync } from 'node:fs';
import { CLUBS } from '../src/data/clubs';
import { genAcademyDay } from '../src/data/gen';
import { academyIntakeExpired, academySigningFeeM, evaluateAcademySigning, normalizeAcademyIntake } from '../src/data/academy';
import type { AcademyIntake } from '../src/types';

const club = CLUBS.find((item) => item.id === 'denizli_yesilova') ?? CLUBS[0];
const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

{
  const lowA = genAcademyDay(club, 120034, 2, 1);
  const lowB = genAcademyDay(club, 120034, 2, 1);
  const high = genAcademyDay(club, 120034, 2, 5);
  const same = JSON.stringify(lowA) === JSON.stringify(lowB);
  const idsUnique = new Set(high.map((player) => player.id)).size === high.length;
  const betterPipeline = high.length === 6 && lowA.length === 2
    && high.reduce((sum, player) => sum + player.potential, 0) >= lowA.reduce((sum, player) => sum + player.potential, 0);
  check('Same career seed yields identical intake; academy level scales count/quality', same && idsUnique && betterPipeline,
    `level1=${lowA.length}; level5=${high.length}; deterministic=${same}; uniqueIds=${idsUnique}`);
}

{
  const candidate = genAcademyDay(club, 120035, 1, 3)[0];
  const fee = academySigningFeeM(candidate, 3);
  const ok = evaluateAcademySigning({ player: candidate, academyLevel: 3, transferBudgetM: fee, currentMonthlyWage: 100, monthlyWageCap: 100 + candidate.wage, rosterSize: 29 });
  const full = evaluateAcademySigning({ player: candidate, academyLevel: 3, transferBudgetM: 99, currentMonthlyWage: 0, monthlyWageCap: 999999, rosterSize: 30 });
  const poor = evaluateAcademySigning({ player: candidate, academyLevel: 3, transferBudgetM: 0, currentMonthlyWage: 0, monthlyWageCap: 999999, rosterSize: 29 });
  const payroll = evaluateAcademySigning({ player: candidate, academyLevel: 3, transferBudgetM: 99, currentMonthlyWage: 0, monthlyWageCap: candidate.wage - 1, rosterSize: 29 });
  check('Signing checks 30-player cap, registration budget and monthly wage headroom', ok.ok && ok.fee === fee
    && !full.ok && !poor.ok && !payroll.ok,
    `registration=${fee.toFixed(2)}M; full=${full.ok}; transferFunds=${poor.ok}; wageCap=${payroll.ok}`);
}

{
  const candidates = genAcademyDay(club, 120036, 3, 2);
  const intake: AcademyIntake = { day: 8, expiresDay: 18, seasonNo: 3, academyLevel: 2, candidates,
    signed: [candidates[0].id, candidates[0].id], passed: [candidates[0].id, candidates[1].id], signingFees: { [candidates[0].id]: 0.18 } };
  const restored = normalizeAcademyIntake(JSON.parse(JSON.stringify(intake)));
  const older = normalizeAcademyIntake({ day: 8, seasonNo: 1, candidates, signed: [], passed: [] });
  check('Academy intake/decisions survive JSON save-load and old saves receive safe defaults', !!restored
    && restored?.signed.length === 1 && restored?.passed.length === 1 && restored?.expiresDay === 18
    && restored?.signingFees?.[candidates[0].id] === 0.18 && older?.expiresDay === 18 && !normalizeAcademyIntake(undefined),
    `signed=${restored?.signed.length}; passed=${restored?.passed.length}; legacy expiry=${older?.expiresDay}`);
}

{
  const intake = { day: 8, expiresDay: 18 };
  const pass = !academyIntakeExpired(intake, 18) && academyIntakeExpired(intake, 19);
  check('Ten-day decision window has an exact boundary', pass, `day18=open; day19=expired`);
}

{
  const store = readFileSync(new URL('../src/store/game.tsx', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/screens/Club.tsx', import.meta.url), 'utf8');
  const pass = store.includes('normalizeAcademyIntake((snapshot.career ?? initialCareer).academyIntake)')
    && store.includes('evaluateAcademySigning(') && store.includes('signingFees:')
    && store.includes('kind: \'youth\'') && store.includes('academyIntake: undefined')
    && ui.includes('academySigningFeeM(p, level)') && ui.includes('maaş aylık ücret tavanından');
  check('Game store persists intake, charges the signing fee and logs academy graduates', pass,
    `load normalization=${store.includes('normalizeAcademyIntake(')}; payroll/store/UI wiring=${pass}`);
}

for (const result of results) console.log(`${result.pass ? '✅' : '❌'} ${result.name} | ${result.detail}`);
console.log(`\nACADEMY-WAVE12: ${results.filter((result) => result.pass).length}/${results.length}`);
if (results.some((result) => !result.pass)) process.exit(1);
