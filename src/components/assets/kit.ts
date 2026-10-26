// HM26 Karakter & Simge Kiti v1 — atölye paketinin kaynak (TS) portu (v0.9.0 Dalga 2)
// DOM-bağımsız SVG üretimi; oynanış/DB dokunmaz, eski face indeksleri aynen korunur.
export const HAIR_NAMES = ['Klasik', 'Düz', 'Saçaklı', 'Kısa', 'Kıvırcık', 'Uzun', 'Saçsız'] as const;
export const EYE_NAMES = ['Klasik', 'Badem', 'Keskin', 'Yuvarlak', 'Sakin'] as const;
export const OUTFIT_NAMES = ['Takım elbise', 'Polo', 'Antrenman', 'Kapüşonlu', 'Teknik direktör montu'] as const;
export const BEARD_NAMES = ['Yok', 'Kirli sakal', 'Dolgun'] as const;
export const GLASSES_NAMES = ['Yok', 'Köşeli', 'Yuvarlak'] as const;
export const EYE_COLORS = ['#654332', '#9A6A31', '#73713C', '#42745B', '#47799B', '#7A8791'] as const;
export const EYE_COLOR_NAMES = ['Kahve', 'Bal', 'Ela', 'Yeşil', 'Mavi', 'Gri'] as const;

export interface KitPalettes { skin: readonly string[]; hairColor: readonly string[]; suit: readonly string[]; accent: readonly string[]; }

export const BASE_PALETTES: KitPalettes = {
  skin: ['#C98A5B', '#B87A52', '#D9A276', '#C78A66', '#CE9268', '#E0AA80'],
  hairColor: ['#2B211A', '#151210', '#3B2F24', '#52565E', '#1E150E', '#6B6F78'],
  suit: ['#14294B', '#17191C', '#24384F', '#2E2A24', '#3A1D24', '#1D3A2E'],
  accent: ['#D6A34B', '#58B987', '#5F8FC9', '#D6A34B', '#DB6267', '#9B7BC9'],
};

// Genişletilmiş paletler: ten 6→9, saç rengi 6→10, ceket 6→10, vurgu 6→9 (ilk 6 indeks geriye uyumlu)
export function extendPalettes(base: KitPalettes = BASE_PALETTES): Required<KitPalettes> {
  return {
    skin: [...(base.skin || BASE_PALETTES.skin), '#F0C9A8', '#8D5A3E', '#5C392B'],
    hairColor: [...(base.hairColor || BASE_PALETTES.hairColor), '#A84B36', '#A4774D', '#C4A36C', '#DFD6C3'],
    suit: [...(base.suit || BASE_PALETTES.suit), '#D8CCB6', '#45667D', '#356657', '#693A46'],
    accent: [...(base.accent || BASE_PALETTES.accent), '#F3F1EA', '#253440', '#D78140'],
  };
}

const int = (v: unknown, n: number, f = 0): number => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < n ? (v as number) : f);
const hex = (v: unknown, f = '#273C48'): string => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : f);
const mix = (c: string, amount: number): string => {
  c = hex(c);
  const t = amount >= 0 ? 255 : 0;
  const a = Math.abs(amount);
  return '#' + [1, 3, 5].map((i) => Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - a) + t * a).toString(16).padStart(2, '0')).join('');
};
const path = (d: string, fill: string, extra = ''): string => `<path d="${d}" fill="${fill}" ${extra}/>`;

export type FaceLike = object | null | undefined;

export interface NormFace {
  skin: number; hairColor: number; hairStyle: number; suit: number; accent: number;
  beard: boolean; beardStyle: number; eyeStyle: number; eyeColor: number; outfit: number; glasses: number;
}

/** Eski kayıt (skin/hairColor/hairStyle/suit/accent/beard) → tam yüz; eksikler varsayılanı alır. */
export function normalizeFace(face: FaceLike = {}, palettes: Required<KitPalettes> = extendPalettes()): NormFace {
  const f: Record<string, unknown> = face && typeof face === 'object' ? (face as Record<string, unknown>) : {};
  return {
    skin: int(f.skin, palettes.skin.length),
    hairColor: int(f.hairColor, palettes.hairColor.length),
    hairStyle: int(f.hairStyle, HAIR_NAMES.length),
    suit: int(f.suit, palettes.suit.length),
    accent: int(f.accent, palettes.accent.length),
    beard: !!f.beard,
    beardStyle: int(f.beardStyle, BEARD_NAMES.length, f.beard ? 1 : 0),
    eyeStyle: int(f.eyeStyle, EYE_NAMES.length),
    eyeColor: int(f.eyeColor, EYE_COLORS.length),
    outfit: int(f.outfit, OUTFIT_NAMES.length),
    glasses: int(f.glasses, GLASSES_NAMES.length),
  };
}

/** 6 öncüllü hızlı portre seçimi (dizin → deterministik yüz) */
export function presetFace(index = 0): NormFace {
  const i = int(index, 6);
  return { skin: i, hairColor: i, suit: i, accent: i, hairStyle: i, beard: i % 3 === 0, beardStyle: i % 3 === 0 ? 1 : 0, eyeStyle: i % 5, eyeColor: i % 6, outfit: 0, glasses: 0 };
}

function bodyShape(fill: string): string {
  return path('M20 109Q29 94 51 89H77Q99 94 108 109A61 61 0 0 1 20 109Z', fill);
}

export function outfitLayer(style: number, suit: string, accent: string): string {
  suit = hex(suit); accent = hex(accent);
  const light = mix(suit, 0.23), dark = mix(suit, -0.22), shirt = '#F4F0E5';
  const body = bodyShape(suit);
  if (style === 0) return body + path('M51 89L64 99 77 89 76 109H52Z', shirt) + path('M60 98L64 95 68 98 66 105 68 122 64 127 60 122 62 105Z', accent) + path('M48 90L57 111 50 107 57 127 37 119 32 99Z', light) + path('M80 90L71 111 78 107 71 127 91 119 96 99Z', light) + path('M48 90L50 107 57 111M80 90L78 107 71 111', 'none', `stroke="${mix(suit, 0.4)}" stroke-width=".8"`);
  if (style === 1) return body + path('M51 89L64 97 77 89 74 101 66 97 64 103 61 97 54 101Z', light) + path('M63 99H66V116H63Z', dark) + `<circle cx="64.5" cy="105" r=".9" fill="${shirt}"/><circle cx="64.5" cy="111" r=".9" fill="${shirt}"/>` + path('M31 99L39 103M89 103L97 99', 'none', `stroke="${accent}" stroke-width="2.5"`) + path('M81 109l4-3 4 3-4 3Z', accent);
  if (style === 2) return body + path('M51 88L64 93 77 88 78 98 64 102 50 98Z', light) + path('M64 94V127', 'none', `stroke="${accent}" stroke-width="1.5"`) + path('M30 100L47 108M98 100L81 108', 'none', `stroke="${accent}" stroke-width="2.4"`) + `<rect x="62.5" y="103" width="3" height="5" rx="1" fill="${shirt}"/>` + path('M38 113L46 117M90 113L82 117', 'none', `stroke="${light}" stroke-width="1.2"`);
  if (style === 3) return body + path('M49 89Q41 87 39 99L50 107 64 101 78 107 89 99Q87 87 79 89L64 96Z', light) + path('M52 98L53 116M76 98L75 116', 'none', `stroke="${accent}" stroke-width="1.6" stroke-linecap="round"`) + path('M48 117Q64 112 80 117L77 124H51Z', dark) + path('M49 117L51 124M79 117L77 124', 'none', `stroke="${light}" stroke-width="1"`);
  return body + path('M50 89L64 101 78 89 77 109H51Z', shirt) + path('M47 90L57 107 50 106 57 127 35 116 32 101Z', light) + path('M81 90L71 107 78 106 71 127 93 116 96 101Z', light) + path('M64 104V127', 'none', `stroke="${dark}" stroke-width="1.8"`) + `<circle cx="59" cy="112" r="1.3" fill="${accent}"/><circle cx="69" cy="112" r="1.3" fill="${accent}"/><circle cx="59" cy="121" r="1.3" fill="${accent}"/><circle cx="69" cy="121" r="1.3" fill="${accent}"/>`;
}

export function hairLayer(style: number, color: string, back = false): string {
  color = hex(color);
  const shine = mix(color, 0.24), edge = mix(color, -0.2);
  if (back) return style === 5 ? path('M40 32Q45 12 64 12T88 33L94 81 82 88 78 49H49L46 87 33 80Z', color) : '';
  if (style === 6) return '';
  const shapes = [
    'M40 47Q34 22 49 16Q71 5 85 22Q94 33 87 49L82 42 79 30Q64 37 49 34L45 48Z',
    'M40 47L39 32Q39 13 64 13T89 32L87 48 82 39 82 31Q64 35 46 31L46 41Z',
    'M39 47L38 33Q40 14 64 13T90 31L88 47 81 38 76 42 70 36 62 44 56 38 49 43 45 39Z',
    'M41 43Q36 25 48 18Q64 9 80 18Q91 27 87 43L82 35Q64 30 46 35Z',
    'M39 46Q34 28 46 19Q65 7 82 20Q95 28 88 47L82 38 47 36 45 46Z',
    'M38 48Q34 22 52 15Q76 5 88 25L86 42 81 40 79 29Q63 46 45 42L44 53Z',
  ];
  let result = path(shapes[style] || shapes[0], color);
  if (style === 4) {
    for (const [x, y, r] of [[43, 30, 7], [47, 22, 8], [57, 18, 8], [68, 17, 8], [79, 22, 8], [85, 30, 7], [58, 28, 7], [72, 28, 7]] as const) {
      result += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="${shine}" stroke-width=".65"/>`;
    }
  } else if (style !== 3) {
    result += path(style === 1 ? 'M45 25Q62 19 83 25' : style === 2 ? 'M45 27Q59 19 78 23' : style === 5 ? 'M45 31Q58 17 77 21' : 'M45 28Q54 18 64 19M70 19Q80 21 84 30', 'none', `stroke="${shine}" stroke-width="1.7" stroke-linecap="round"`);
  } else {
    result += path('M46 28Q64 20 82 28', 'none', `stroke="${shine}" stroke-width="1.5"`);
  }
  return result + path('M43 42v7M85 42v7', 'none', `stroke="${edge}" stroke-width="2" stroke-linecap="round"`);
}

export function eyeLayer(style: number, color: string, hair: string): string {
  const iris = hex(color), brow = mix(hex(hair), -0.38);
  let eyes = '';
  for (const cx of [54, 74]) {
    let d: string, ry = 3;
    if (style === 1) d = `M${cx - 6} 54Q${cx} 48 ${cx + 6} 53Q${cx} 60 ${cx - 6} 54Z`;
    else if (style === 2) d = `M${cx - 6} 53L${cx - 1} 51 ${cx + 6} 54 ${cx + 1} 57 ${cx - 6} 55Z`;
    else if (style === 3) { d = `M${cx - 6} 54A6 4.3 0 0 1 ${cx + 6} 54A6 4.3 0 0 1 ${cx - 6} 54Z`; ry = 3.1; }
    else if (style === 4) { d = `M${cx - 6} 54Q${cx} 50 ${cx + 6} 54Q${cx} 57.5 ${cx - 6} 54Z`; ry = 2.1; }
    else d = `M${cx - 6} 54Q${cx} 48 ${cx + 6} 54Q${cx} 60 ${cx - 6} 54Z`;
    eyes += path(d, '#F8F5EB', `stroke="#523D34" stroke-width=".65"`) + `<ellipse cx="${cx}" cy="54" rx="2.65" ry="${ry}" fill="${iris}"/><circle cx="${cx}" cy="54" r="1.2" fill="#192329"/><circle cx="${cx + 0.8}" cy="${53.2}" r=".65" fill="#fff"/>`;
    const bd = style === 2 ? `M${cx - 6} 47L${cx + 5} 49` : style === 3 ? `M${cx - 6} 46Q${cx} 43 ${cx + 5} 47` : `M${cx - 6} 47Q${cx} 45 ${cx + 5} 47`;
    eyes += path(bd, 'none', `stroke="${brow}" stroke-width="2.1" stroke-linecap="round"`);
  }
  return eyes;
}

export function avatarParts(face: FaceLike = {}, base: KitPalettes = BASE_PALETTES): Record<string, string> {
  const p = extendPalettes(base), f = normalizeFace(face, p);
  const skin = p.skin[f.skin], hair = p.hairColor[f.hairColor], suit = p.suit[f.suit], accent = p.accent[f.accent];
  const background = '<circle cx="64" cy="64" r="62" fill="#182C43"/><circle cx="64" cy="64" r="53" fill="#20364A"/>';
  const neck = path('M53 75H75V94L64 102 53 94Z', mix(skin, -0.13));
  const head = `<ellipse cx="42" cy="55" rx="5" ry="8" fill="${mix(skin, -0.06)}"/><ellipse cx="86" cy="55" rx="5" ry="8" fill="${mix(skin, -0.13)}"/>` + path('M42 41Q41 21 64 20Q87 21 86 42V60Q86 76 64 85Q42 76 42 60Z', skin) + path('M78 28Q85 35 85 47V61Q84 73 66 82Q78 66 78 51Z', mix(skin, -0.12)) + path('M47 49Q45 58 49 64', 'none', `stroke="${mix(skin, 0.12)}" stroke-width="2" stroke-linecap="round"`);
  let beard = '';
  if (f.beardStyle === 1) beard = path('M44 63Q48 69 53 67L60 70H68L75 67Q80 69 84 63Q81 78 64 84Q47 78 44 63Z', hair, 'opacity=".55"');
  if (f.beardStyle === 2) beard = path('M43 60L49 64 54 65 60 69H68L74 65 79 64 85 60Q85 79 64 87Q43 79 43 60Z', hair) + path('M53 72Q64 78 75 72', 'none', `stroke="${mix(hair, 0.28)}" stroke-width="1"`);
  const features = path('M64 55L61 65Q64 68 67 65', 'none', `stroke="${mix(skin, -0.31)}" stroke-width="1.25" stroke-linecap="round"`) + path('M57 73Q64 77 71 73', 'none', `stroke="${f.beardStyle === 2 ? mix(skin, 0.3) : mix(skin, -0.44)}" stroke-width="1.65" stroke-linecap="round"`);
  let glasses = '';
  if (f.glasses === 1) glasses = '<g fill="#d9edf1" fill-opacity=".09" stroke="#23313b" stroke-width="1.7"><rect x="46" y="48" width="16" height="13" rx="3"/><rect x="66" y="48" width="16" height="13" rx="3"/><path d="M62 52Q64 50 66 52M42 50L46 51M82 51L86 50" fill="none"/></g>';
  if (f.glasses === 2) glasses = '<g fill="#d9edf1" fill-opacity=".09" stroke="#25333b" stroke-width="1.6"><circle cx="54" cy="54" r="8"/><circle cx="74" cy="54" r="8"/><path d="M62 52Q64 50 66 52M42 50L46 51M82 51L86 50" fill="none"/></g>';
  return { background, hairBack: hairLayer(f.hairStyle, hair, true), neck, outfit: outfitLayer(f.outfit, suit, accent), head, beard, eyes: eyeLayer(f.eyeStyle, EYE_COLORS[f.eyeColor], hair), features, hair: hairLayer(f.hairStyle, hair), glasses, border: `<circle cx="64" cy="64" r="62" fill="none" stroke="${accent}" stroke-width="2"/>` };
}

export function avatarInner(face: FaceLike = {}, base: KitPalettes = BASE_PALETTES): string {
  return Object.values(avatarParts(face, base)).join('');
}

/** Deterministik oyuncu yüzü — FNV-1a seed, kulüp renkleri forma olur */
export function playerFaceSeed(id: string): number {
  let seed = 2166136261;
  for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return seed;
}

export function playerFaceFromSeed(seed: number): NormFace {
  return {
    skin: (seed >>> 3) % 9, hairColor: (seed >>> 7) % 10, hairStyle: seed % 7,
    eyeStyle: (seed >>> 10) % 5, eyeColor: (seed >>> 13) % 6,
    outfit: 1, suit: 0, accent: 0, beard: false, beardStyle: (seed >>> 17) % 3, glasses: 0,
  };
}
