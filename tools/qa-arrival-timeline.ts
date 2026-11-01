import { ARRIVAL_DURATION, ARRIVAL_PASSENGERS, arrivalFrame } from '../src/components/match/arrivalTimeline';

let passed = 0, failed = 0;
function check(name: string, ok: unknown, detail = '') {
  if (ok) passed++; else failed++;
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` | ${detail}` : ''}`);
}
const at = (fraction: number, players = 11) => arrivalFrame(ARRIVAL_DURATION * fraction, players);
const first = at(0), approach = at(.2), parked = at(.33), doors = at(.38), boarding = at(.58), end = at(1);
check('Süre sınırları ve geçersiz zaman güvenle sınırlandırılır', arrivalFrame(-1, 11).time === 0 && arrivalFrame(NaN, 11).time === 0 && arrivalFrame(ARRIVAL_DURATION + 1, 11).time === ARRIVAL_DURATION);
check('Başlangıçta otobüs solda, kapılar ve bariyer kapalıdır', first.busX === -240 && first.door === 0 && first.barrier === 0 && first.gate === 0 && first.passengers.length === 0);
check('Otobüs stadyuma doğru ilerler ve park eder', first.busX < approach.busX && approach.busX < parked.busX && parked.busX === end.busX && end.busX === 114);
check('Yolculuk boyunca otobüs konumu hiçbir zaman geri gitmez', Array.from({ length: 101 }, (_, i) => at(i / 100).busX).every((x, i, all) => i === 0 || x >= all[i - 1]));
check('Teker açıları yola bağlı döner ve parkta durur', first.wheelAngle === 0 && approach.wheelAngle > first.wheelAngle && parked.wheelAngle === end.wheelAngle);
check('Bariyer otobüs gelmeden açılır ve tekrar kapanmaz', approach.barrier > 0 && at(.24).barrier === 1 && end.barrier === 1);
check('Otobüs durmadan yolcu kapısı açılmaz', at(.32).door === 0 && doors.door > 0 && doors.door < 1 && at(.41).door === 1);
check('Otobüs kapısı tamamen açılmadan oyuncu görünmez', at(.43).passengers.length === 0 && at(.44).passengers.length === 1 && at(.44).door === 1);
check('Stadyum kapısı yürüyüş sırasında açılır', at(.48).gate === 0 && boarding.gate > 0 && at(.61).gate === 1 && end.gate === 1);
check('Oyuncular sırayla iner, aynı anda ışınlanmaz', at(.5).passengers.length === 2 && at(.7).passengers.length === 5 && end.passengers.length === 6);
check('İnen oyuncuların her biri kapıdan girişe yol alır', boarding.passengers[0].x > at(.44).passengers[0].x && end.passengers[0].x > boarding.passengers[0].x && end.passengers.every((p) => p.progress === 1));
check('Oyuncular kapıda birden belirmek yerine görünür hâle gelir', at(.431).passengers[0].opacity < at(.44).passengers[0].opacity && at(.5).passengers[0].opacity === 1);
check('Oyuncuların bacak hareketi yürürken var, girişte sabittir', boarding.passengers.some((p) => Math.abs(p.stride) > 1) && end.passengers.every((p) => p.stride === 0 && p.bounce === 0));
check('Kamera yaklaşır ve her kare sahnenin sınırları içinde kalır', approach.zoom > 1 && end.zoom > 1 && [first, approach, boarding, end].every((f) => f.cameraX >= 0 && f.cameraY >= 0 && f.cameraX + f.viewWidth <= 640.000001 && f.cameraY + f.viewHeight <= 340.000001));
check('Aşamalar yol, karşılama, iniş ve giriş sırasındadır', [first, approach, doors, end].map((f) => f.chapter).join(',') === '0,1,2,3');
check('Son durum kullanıcının seçim yapmasını bekler', end.phase === 'Takım stadyum girişinde' && /sen karar verirsin/.test(end.detail));
check('Altıdan fazla isim için yalnız altı gerçek oyuncu gösterilir', end.passengers.length === ARRIVAL_PASSENGERS && end.passengers.map((p) => p.index).join(',') === '0,1,2,3,4,5');
check('Eksik kadroda olmayan oyuncular üretilmez', at(1, 3).passengers.length === 3 && at(1, 1).passengers.length === 1);
check('Eksik kadroda son oyuncu varınca aşama girişe geçer', at(.8, 3).phase === 'Takım stadyum girişinde' && at(.8, 3).chapter === 3);
check('Boş kadroda otobüs vardır ama oyuncu veya sahte takım gelmez', at(1, 0).passengers.length === 0 && at(1, 0).phase === 'Takım otobüsü stadyum girişinde' && !at(.65, 0).detail.includes('oyuncular'));
const selectedFrame = JSON.stringify(arrivalFrame(13608, 11));
at(.1); at(.9); // Seeking elsewhere cannot change a previously selected frame.
check('Aynı zamana dönmek aynı kamera, duruş ve dekor karesini verir', selectedFrame === JSON.stringify(arrivalFrame(13608, 11)));
check('Tüm karelerde konum, ölçek ve açılar sonludur', Array.from({ length: 101 }, (_, i) => at(i / 100)).every((f) => [f.busX, f.busBounce, f.wheelAngle, f.barrier, f.door, f.gate, f.zoom, f.cameraX, f.cameraY, ...f.passengers.flatMap((p) => [p.x, p.y, p.scale, p.stride, p.bounce, p.opacity])].every(Number.isFinite)));
console.log(`\nGeliş zaman çizelgesi: ${passed}/${passed + failed} geçti.`);
if (failed) process.exitCode = 1;
