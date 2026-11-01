/** One seekable timeline drives every moving piece of the arrival scene. */
export const ARRIVAL_DURATION = 24_000;
export const ARRIVAL_PASSENGERS = 6;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const n = clamp(value); return n * n * (3 - 2 * n); };
const lerp = (start: number, end: number, amount: number) => start + (end - start) * amount;

export interface ArrivalPassengerFrame {
  index: number;
  progress: number;
  opacity: number;
  x: number;
  y: number;
  scale: number;
  stride: number;
  bounce: number;
}

/** Pure and deterministic: paused and manually selected frames never drift. */
export function arrivalFrame(milliseconds: number, playerCount: number) {
  const time = Number.isFinite(milliseconds) ? Math.max(0, Math.min(ARRIVAL_DURATION, milliseconds)) : 0;
  const t = time / ARRIVAL_DURATION;
  const journey = smooth(t / .32);
  const busX = lerp(-240, 114, journey);
  const busBounce = Math.sin(time / 125) * 1.2 * Math.sin(journey * Math.PI);
  const wheelAngle = (busX + 240) / 15 * 180 / Math.PI;
  const barrier = smooth((t - .11) / .13);
  const door = smooth((t - .34) / .07);
  const gate = smooth((t - .48) / .12);
  const zoom = 1 + .09 * smooth(t / .35) - .04 * smooth((t - .78) / .22);
  const viewWidth = 640 / zoom, viewHeight = 340 / zoom;
  const cameraX = Math.max(0, Math.min(640 - viewWidth, 320 + 20 * smooth((t - .25) / .5) - viewWidth / 2));
  const cameraY = Math.max(0, Math.min(340 - viewHeight, 175 - viewHeight / 2));
  const count = Number.isFinite(playerCount) ? Math.min(ARRIVAL_PASSENGERS, Math.max(0, Math.floor(playerCount))) : 0;
  const passengers: ArrivalPassengerFrame[] = [];
  for (let index = 0; index < count; index++) {
    const progress = clamp((t - (.43 + index * .065)) / .205);
    if (progress <= 0) continue;
    const exit = smooth(progress / .24);
    const walk = smooth((progress - .16) / .84);
    const walking = progress > .16 && progress < 1;
    const stride = walking ? Math.sin(time / 145 + index * 1.4) * 19 : 0;
    passengers.push({
      index,
      progress,
      opacity: smooth(progress / .12),
      x: lerp(busX + 174 + 9 * exit, 495 + index * 10, walk),
      y: lerp(247 + 20 * exit, 243 + (index % 2) * 3, walk),
      scale: lerp(1.08, .9, walk),
      stride,
      bounce: walking ? Math.abs(Math.sin(time / 145 + index * 1.4)) * 2 : 0,
    });
  }
  const arrived = t >= (count ? .43 + (count - 1) * .065 + .205 : .43);
  const chapter = t < .16 ? 0 : t < .34 ? 1 : arrived ? 3 : 2;
  const phase = t < .16 ? 'Takım otobüsü yolda'
    : t < .34 ? 'Stadyum kapısına yaklaşıyor'
    : t < .43 ? 'Otobüs durdu, kapılar açılıyor'
    : !arrived ? 'Oyuncular stadyuma yürüyor'
    : count ? 'Takım stadyum girişinde' : 'Takım otobüsü stadyum girişinde';
  const detail = t < .16 ? 'Otobüs maç günü yolculuğunda.'
    : t < .34 ? 'Taraftarlar karşılıyor, güvenlik geçişi açılıyor.'
    : t < .43 ? 'Otobüs park ediyor ve oyuncu kapısı açılıyor.'
    : !arrived ? 'Seçili ilk 11’den oyuncular sırayla iniyor.'
    : count ? 'Takım girişte. Maça ne zaman geçileceğine sen karar verirsin.' : 'Otobüs girişte. Maça geçiş senin kontrolünde.';
  return { time, t, journey, busX, busBounce, wheelAngle, barrier, door, gate, zoom, cameraX, cameraY, viewWidth, viewHeight, passengers, chapter, phase, detail };
}
