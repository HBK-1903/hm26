// Saf transfer sahnesi sınırları, determinizm ve çevrimdışı konuşma envanteri.
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { respondToSellerOffer } from '../src/data/transferNegotiation';
import { playerToneHints, respondToPlayerWithTone, respondToSellerWithTone, sellerToneHints, transferRevealForGen, type TransferTone } from '../src/data/transferPresentation';
import { ALL_TRANSFER_VOICES, managerTransferLine, sellerTransferLine, transferAnnouncement, transferLeakLine } from '../src/data/transferVoices';

const failures: string[] = [];
let total = 0;
function check(name: string, condition: boolean, detail = '') { total++; console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`); if (!condition) failures.push(name); }
const eps = 1e-7;

check('GEN eşikleri; bonservis / serbest statüden bağımsız',
  transferRevealForGen(79) === 'press' && transferRevealForGen(80) === 'stadium' && transferRevealForGen(84) === 'stadium' && transferRevealForGen(85) === 'star' && transferRevealForGen(99) === 'star' && transferRevealForGen(Number.NaN) === 'press');

let deterministic = true, bounded = true, preservesBase = true, noExtraRepeat = true, honestHints = true;
let sellerDiscountHits = 0, sellerRiskHits = 0, checks = 0;
for (const price of [0.3, 0.5, 1, 10, 33.6, 100]) for (let seed = 0; seed < 250; seed++) for (const tone of ['calm', 'witty', 'firm'] as TransferTone[]) {
  let ask = Math.round(price * 120) / 100, patience = 3, used = 0, extraUsed = false, extras = 0;
  const floor = Math.round(price * 92) / 100;
  for (let round = 1; round <= 4; round++) {
    const input = { price, currentAsk: ask, floor, patience, offerValue: price * 0.7, tone, usedDiscount: used,
      usedExtraPatience: extraUsed, seed, day: 1, playerId: 'scene-test', round };
    const before = respondToSellerOffer(input);
    const result = respondToSellerWithTone(input);
    const again = respondToSellerWithTone(input);
    deterministic &&= JSON.stringify(result) === JSON.stringify(again);
    preservesBase &&= result.outcome === before.outcome && (tone !== 'calm' || (result.ask === before.ask && result.patience === before.patience));
    bounded &&= result.usedDiscount <= price * 0.03 + eps && result.discount >= 0 && result.patience >= 0
      && (result.outcome !== 'counter' || (result.ask + eps >= floor && result.ask <= before.ask + eps && before.ask - result.ask <= result.discount + eps));
    if (result.discount) sellerDiscountHits++;
    if (result.extraPatience) sellerRiskHits++;
    extras += result.extraPatience;
    noExtraRepeat &&= extras <= 1;
    const hints = sellerToneHints(input, tone).join(' ').toLocaleLowerCase('tr');
    if (!hints.includes('indirim ihtimali') && result.discount > 0) honestHints = false;
    if (!hints.includes('sabır riski') && result.extraPatience > 0) honestHints = false;
    used = result.usedDiscount; extraUsed = result.usedExtraPatience; ask = result.ask; patience = result.patience; checks++;
    if (result.outcome !== 'counter') break;
  }
}
check('Satıcı: aynı teklif/ton için deterministik, sakin seçim mevcut motoru korur', deterministic && preservesBase, `${checks} tur`);
check('Satıcı: toplam %3 sınırı, taban ve en fazla bir ek sabır kaybı', bounded && noExtraRepeat, `indirim=${sellerDiscountHits}, risk=${sellerRiskHits}`);
check('Satıcı ipuçları uygulanan gerçek indirim ve sabır riskini saklamaz', honestHints && sellerDiscountHits > 0 && sellerRiskHits > 0);

let playerBounded = true, playerRepeat = true, playerStable = true, playerHints = true, playerDiscountHits = 0;
for (const baseDemand of [1, 20, 99, 100, 108, 250, 1000]) for (let seed = 0; seed < 250; seed++) {
  let usedDiscount = 0;
  for (const tone of ['calm', 'witty', 'firm'] as TransferTone[]) {
    const input = { baseDemand, offeredWage: baseDemand - 1, usedDiscount, tone, alreadyTried: false, seed, day: 3, playerId: 'scene-test' };
    const result = respondToPlayerWithTone(input);
    const again = respondToPlayerWithTone(input);
    playerStable &&= JSON.stringify(result) === JSON.stringify(again);
    playerBounded &&= result.usedDiscount <= Math.floor(baseDemand * 0.03) && result.demand === baseDemand - result.usedDiscount
      && result.accepted === (input.offeredWage >= result.demand);
    const repeated = respondToPlayerWithTone({ ...input, usedDiscount: result.usedDiscount, alreadyTried: true });
    playerRepeat &&= repeated.discount === 0 && repeated.usedDiscount === result.usedDiscount;
    if (result.discount) playerDiscountHits++;
    const hints = playerToneHints(baseDemand, usedDiscount, tone, false).join(' ');
    if (!hints.includes('indirimi ihtimali') && result.discount > 0) playerHints = false;
    usedDiscount = result.usedDiscount;
  }
}
check('Oyuncu: kararlı, ücret beklentisinde toplam en fazla %3 indirim', playerBounded && playerStable && playerDiscountHits > 0, `indirim=${playerDiscountHits}`);
check('Oyuncu: aynı üslup yeniden indirim üretmez; seçenek ipuçları doğru', playerRepeat && playerHints);

const ids = new Set(ALL_TRANSFER_VOICES.map((line) => line.id));
const filesExist = ALL_TRANSFER_VOICES.every((line) => existsSync(resolve('public', `.${line.src}`)) && statSync(resolve('public', `.${line.src}`)).size > 1000 && line.text.length > 10);
check('40 özgün repliğin altyazı ve çevrimdışı ses dosyası var', ids.size === 40 && ALL_TRANSFER_VOICES.length === 40 && filesExist, `${ids.size} ayrı klip`);
const images = ['negotiation-room.webp', 'press-room.webp', 'stadium.webp'];
check('Önceki sürüm istemcileri için eski yerel görseller korunuyor', images.every((image) => existsSync(resolve('public/assets/transfer', image)) && statSync(resolve('public/assets/transfer', image)).size > 1000));
let contexts = true;
for (let i = 0; i < 250; i++) {
  const key = String(i);
  contexts &&= !/maaş/i.test(managerTransferLine('witty', 'seller', key).text);
  contexts &&= !/krampon|stadı/i.test(managerTransferLine('witty', 'player', key).text + managerTransferLine('firm', 'player', key).text);
  contexts &&= sellerTransferLine('walk', key).id !== transferLeakLine.id;
  contexts &&= transferAnnouncement('press', key).id !== 'announcer-3' && transferAnnouncement('stadium', key).id !== 'announcer-3';
  contexts &&= transferAnnouncement('star', key).id === 'announcer-3';
}
check('Replikler bağlama bağlı: maaş/kulüp, sızıntı ve yıldız anonsu', contexts);

console.log(`\nTRANSFER-SCENE: ${total - failures.length}/${total}`);
if (failures.length) process.exit(1);
