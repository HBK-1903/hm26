// Presentation-only geometry: real engine slot ordering, directions and bounded motion.
import { FORMATION_SLOTS } from '../src/engine/profiles';
import { toStadiumPoint } from '../src/engine/pitch-ai';
import { pitchFormationSlots, pitchPlayerTarget, pitchTeamColors, pitchTransitionMs } from '../src/components/assets/pitchPresentation';
import type { Formation } from '../src/types';

let count = 0;
const errors: string[] = [];
function check(name: string, passed: boolean) {
  count++; console.log(`${passed ? '✅' : '❌'} ${name}`);
  if (!passed) errors.push(name);
}
for (const formation of Object.keys(FORMATION_SLOTS) as Formation[]) {
  const slots = pitchFormationSlots(formation, 50, 'normal');
  check(`${formation}: motor sırasına uygun 11 konum ve saha sınırları`, slots.length === FORMATION_SLOTS[formation].length && slots.every((p) => p.x >= 8 && p.x <= 92 && p.y >= 6 && p.y <= 94) && slots[0].y > 85);
}
const shape4141 = pitchFormationSlots('4-1-4-1', 50, 'normal');
check('4-1-4-1: tek ön libero ile tek santrfor birbirine karışmaz', shape4141[5].x === 50 && shape4141[5].y > shape4141[6].y && shape4141[10].y < shape4141[6].y && shape4141[10].x === 50);
const shape442 = pitchFormationSlots('4-4-2', 50, 'normal');
check('4-4-2: kanatlar iki merkez oyuncusunun dışında', shape442[7].x < shape442[5].x && shape442[8].x > shape442[6].x);
const shape352 = pitchFormationSlots('3-5-2', 50, 'normal');
check('3-5-2: iki kanat bek ve üç merkez oyuncusu doğru sırada', shape352[4].x < shape352[6].x && shape352[5].x > shape352[8].x && shape352[7].x === 50);
const shape532 = pitchFormationSlots('5-3-2', 50, 'normal');
check('5-3-2: iki bek üç stoperin dışına yerleşir', shape532[4].x < shape532[1].x && shape532[5].x > shape532[3].x);
const shape4231 = pitchFormationSlots('4-2-3-1', 50, 'normal');
check('4-2-3-1: motorun tek kanat oyuncusu merkezde çizilmez', shape4231[8].x > shape4231[9].x && shape4231[8].x > shape4231[7].x);
const narrow = pitchFormationSlots('4-4-2', 0, 'normal');
const wide = pitchFormationSlots('4-4-2', 100, 'normal');
check('Genişlik tercihi gerçek dizilişte korunur', wide[7].x < narrow[7].x && wide[8].x > narrow[8].x);
check('Bilinmeyen eski diziliş ve geçersiz genişlik güvenle tamamlanır', pitchFormationSlots('legacy', NaN, 'normal').length === 11 && pitchFormationSlots('legacy', NaN, 'normal').every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
const homeBall = { x: 20, y: 18 }, awayBall = toStadiumPoint('away', homeBall);
const homeHolder = pitchPlayerTarget('WG', 'home', true, { x: 20, y: 30 }, homeBall, true, true);
const awayHolder = pitchPlayerTarget('WG', 'away', true, { x: 80, y: 70 }, awayBall, true, true);
check('Gerçek top sahibi topun yakınında ve iki hücum yönünde simetrik', homeHolder.x === 20 && homeHolder.y > homeBall.y && awayHolder.x === 80 && awayHolder.y < awayBall.y && Math.abs(homeHolder.y + awayHolder.y - 100) < 0.01);
const keeperHome = pitchPlayerTarget('GK', 'home', true, { x: 50, y: 92 }, { x: 10, y: 18 }, true, true);
const keeperAway = pitchPlayerTarget('GK', 'away', true, { x: 50, y: 8 }, { x: 90, y: 82 }, true, true);
check('Kaleciler top sahibi olduğunda bile kale alanına yakın kalır', keeperHome.x >= 34 && keeperHome.y >= 80 && keeperAway.x <= 66 && keeperAway.y <= 20);
const idle = pitchPlayerTarget('CM', 'home', true, { x: 40, y: 55 }, { x: 80, y: 20 }, false, false);
const supporting = pitchPlayerTarget('CM', 'home', true, { x: 40, y: 55 }, { x: 80, y: 20 }, false, true);
check('Pozisyondaki diğer oyuncular topa ölçülü destek verir', supporting.x > idle.x && supporting.y < idle.y && Math.abs(supporting.x - idle.x) <= 5 && Math.abs(supporting.y - idle.y) <= 5);
check('Hareket uzunluğu seçilen 1×/2×/4× hızlarına uyarlanır', pitchTransitionMs(640) > pitchTransitionMs(260) && pitchTransitionMs(260) > pitchTransitionMs(90) && pitchTransitionMs(90) >= 70);
const similarKits = pitchTeamColors({ color1: '#08764F', color2: '#FFF3D9' }, { color1: '#14857D', color2: '#FFF1CE' });
check('Benzer yeşil formalarda deplasman gerçek ikinci kulüp rengiyle ayırt edilir', similarKits.alternateAway && similarKits.home.fill === '#08764F' && similarKits.away.fill === '#FFF1CE' && similarKits.away.outline === '#14857D' && similarKits.away.number === '#182c24');
const differentKits = pitchTeamColors({ color1: '#d33128', color2: '#fff0d4' }, { color1: '#305dd4', color2: '#fff0d4' });
check('Farklı forma renkleri gereksiz yere değiştirilmez', !differentKits.alternateAway && differentKits.away.fill === '#305dd4');
const equalKits = pitchTeamColors({ color1: '#eeeeee', color2: '#eeeeee' }, { color1: '#eeeeee', color2: '#eeeeee' });
check('İki rengin de çakıştığı eski paletler okunur yedeğe geçer', equalKits.alternateAway && equalKits.away.fill !== equalKits.home.fill && equalKits.home.outline !== equalKits.home.fill);
console.log(`\nPITCH-MOTION: ${count - errors.length}/${count}`);
if (errors.length) process.exit(1);
