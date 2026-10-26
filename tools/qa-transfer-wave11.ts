// Wave 11 focused transfer-negotiation, sell-on and compatibility checks.
import { readFileSync } from 'node:fs';
import {
  calculateSellOnSettlement, counterCashAsk, normalizeSellOnClauses, respondToSellerOffer,
  sellOnCredit, transferLeakRisk, transferOfferLeaks, withSellOnClause,
} from '../src/data/transferNegotiation';
import type { SellOnClause } from '../src/types';

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail: string) => results.push({ name, pass, detail });

{
  const first = respondToSellerOffer({ price: 10, currentAsk: 12, floor: 9.2, patience: 3, offerValue: 8.5 });
  const second = respondToSellerOffer({ price: 10, currentAsk: first.ask, floor: 9.2, patience: first.patience, offerValue: first.ask });
  const exhausted = respondToSellerOffer({ price: 10, currentAsk: 12, floor: 9.2, patience: 0, offerValue: 8.9 });
  check('Seller patience, counter value and reservation-price walk-away are deterministic', first.outcome === 'counter'
    && first.patience === 2 && first.ask < 12 && second.outcome === 'accept' && exhausted.outcome === 'walk',
    `first=${first.outcome}@${first.ask}/patience${first.patience}; second=${second.outcome}; low-final=${exhausted.outcome}`);
}

{
  const credit = sellOnCredit(20, 15);
  const cash = counterCashAsk(24, 3, credit);
  const risk = transferLeakRisk({ playerGen: 82, price: 20, offerValue: 12, round: 2 });
  const leakA = transferOfferLeaks({ seed: 2026, day: 31, playerId: 'fictional-player-7', round: 2, risk });
  const leakB = transferOfferLeaks({ seed: 2026, day: 31, playerId: 'fictional-player-7', round: 2, risk });
  check('Swap/sell-on terms affect negotiated consideration and transfer leaks are seeded', credit === 1.05
    && cash === 19.95 && risk > 30 && leakA === leakB,
    `sell-on credit=${credit}M; counter cash=${cash}M; leak risk=${risk}%; deterministic=${leakA === leakB}`);
}

{
  const clause: SellOnClause = { beneficiaryClubId: 'zirve_kulup_1', pct: 20, signedFee: 8.4, signedDay: 19 };
  const withClause = withSellOnClause({}, 'player-1', clause);
  const saved = JSON.parse(JSON.stringify(withClause));
  const restored = normalizeSellOnClauses(saved);
  const payout = calculateSellOnSettlement(10, restored['player-1']);
  const missingOldField = normalizeSellOnClauses(undefined);
  check('Sell-on clauses survive JSON save/load and settle only on a later sale', restored['player-1']?.[0]?.beneficiaryClubId === clause.beneficiaryClubId
    && payout.totalPaid === 2 && payout.retainedFee === 8 && missingOldField.player === undefined,
    `20% resale: prior club receives ₺${payout.totalPaid}M; current club retains ₺${payout.retainedFee}M`);
}

{
  const clauses: SellOnClause[] = [
    { beneficiaryClubId: 'club-a', pct: 30, signedFee: 5, signedDay: 1 },
    { beneficiaryClubId: 'club-b', pct: 30, signedFee: 7, signedDay: 9 },
  ];
  const capped = calculateSellOnSettlement(10, clauses);
  const bad = normalizeSellOnClauses({ player: [{ beneficiaryClubId: 'club-a', pct: 90, signedFee: 2, signedDay: 1 }, null] });
  check('Sell-on clauses are validated and aggregate payouts never exceed 50%', capped.totalPaid === 5
    && capped.retainedFee === 5 && bad.player === undefined,
    `combined cap=50%; payout=${capped.totalPaid}M retained=${capped.retainedFee}M; malformed legacy rows dropped`);
}

{
  const store = readFileSync(new URL('../src/store/game.tsx', import.meta.url), 'utf8');
  const market = readFileSync(new URL('../src/screens/Market.tsx', import.meta.url), 'utf8');
  const persistence = store.includes('sellOnClauses: normalizeSellOnClauses(pxAny.sellOnClauses)')
    && store.includes('sellOnClauses,') && store.includes('calculateSellOnSettlement(of.fee')
    && store.includes('calculateSellOnSettlement(counterFee!');
  const onlySwapAndNoBuyback = market.includes('Oyuncu + nakit takası') && market.includes('Geri alım')
    && market.includes('>Yok</div>') && !/buyBack|buyback|geriAlimHakki/i.test(market + store);
  check('Store persistence/settlement is wired; transfer table stays player+cash with no buy-back', persistence && onlySwapAndNoBuyback,
    `load migration=${persistence}; player+cash=${market.includes('Oyuncu + nakit takası')}; buy-back absent=${!/buyBack|buyback|geriAlimHakki/i.test(market + store)}`);
}

for (const result of results) console.log(`${result.pass ? '✅' : '❌'} ${result.name} | ${result.detail}`);
console.log(`\nTRANSFER-WAVE11: ${results.filter((result) => result.pass).length}/${results.length}`);
if (results.some((result) => !result.pass)) process.exit(1);
