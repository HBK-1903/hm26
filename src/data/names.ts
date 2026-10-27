// HM26 — özgün kurgusal isim havuzu (gerçek futbolcu adı kullanılmaz — §2.3)
export const MALE_FIRST = [
  'Arda', 'Baran', 'Cenk', 'Deniz', 'Efe', 'Ferhat', 'Gökhan', 'Hakan', 'Ilgaz', 'Kaan', 'Kerem', 'Levent',
  'Mert', 'Naci', 'Ozan', 'Polat', 'Rüzgar', 'Sarp', 'Tamer', 'Ulaş', 'Volkan', 'Yalçın', 'Zeki', 'Alper',
  'Batuhan', 'Cemal', 'Doruk', 'Emirhan', 'Furkan', 'Gürsel', 'Haluk', 'İbrahim', 'Koral', 'Müslüm', 'Nurettin',
  'Orkun', 'Poyraz', 'Rhit', 'Serkan', 'Tayfun', 'Umut', 'Yusuf', 'Ataç', 'Bora', 'Canberk', 'Demir', 'Ediz',
  'Fırat', 'Göktürk', 'Işık', 'Kuzey', 'Miran', 'Necip', 'Oğuz', 'Reha', 'Şenol', 'Talat', 'Uygar', 'Yadigar',
];
export const SURNAME = [
  'Aydın', 'Balta', 'Ceylan', 'Demirtaş', 'Ergin', 'Fidan', 'Güneş', 'Hancı', 'Işıklı', 'Kabadayı', 'Keskin',
  'Lök', 'Malkoç', 'Nalbant', 'Oruç', 'Pekgöz', 'Rüstem', 'Sancaktar', 'Taşdemir', 'Uçar', 'Yıldırımçı', 'Zaim',
  'Acaröz', 'Bozkurt', 'Cenkciler', 'Dalgıç', 'Erim', 'Feyzi', 'Gülcü', 'Horoz', 'Irmak', 'Karaer', 'Köksal',
  'Mardinli', 'Nasır', 'Okur', 'Perçem', 'Sağdıç', 'Tanrıkulu', 'Usta', 'Yörük', 'Zengin', 'Aksoy', 'Biler',
  'Cücük', 'Döndü', 'Ekinci', 'Giray', 'Hıra', 'Inanır', 'Kumcu', 'Mense', 'Okcu', 'Savur', 'Tekdal', 'Uzunyol',
];
// Yabancı kurgusal (§11.7 kuralı gereği azınlık; lisanslı gerçek ad YOK)
export const FOREIGN_FIRST = ['Mateo', 'Kwame', 'Igor', 'Dmitri', 'Samir', 'Bruno', 'Luka', 'Andrei', 'Kofi', 'Yannick', 'Ousmane', 'Jeandré', 'Marko', 'Ismael', 'Calvin', 'Dario'];
export const FOREIGN_SURNAME = ['Fontana', 'Osei', 'Petrenko', 'Volkov', 'Haddad', 'Costa', 'Mornar', 'Kovach', 'Sarpong', 'Ferrand', 'Diallo', 'Nascimento', 'Kralj', 'Hameed', 'Vidal', 'Moreno'];

// Lisanslı gerçek futbolcu adlarıyla çakışma engellenir (isim havuzu genişledikçe koruma katmanı).
// Üretilen adlar "Ad Soyad" tam eşleşmesiyle bu kümeye karşı kontrol edilir.
export const REAL_PLAYER_BLACKLIST = new Set<string>([
  'Luka Modric', 'Lionel Messi', 'Cristiano Ronaldo', 'Kylian Mbappe',
  'Erling Haaland', 'Karim Benzema', 'Robert Lewandowski', 'Kevin De Bruyne',
  'Arda Guler', 'Hakan Calhanoglu', 'Mauro Icardi', 'Edin Dzeko', 'Dusan Tadic',
  'Fernando Muslera', 'Alexandre Lacazette', 'Cengiz Under', 'Kenan Yildiz',
  'Luka Jovic', 'Marko Arnautovic', 'Dmitri Payet',
]);

export function isBlacklistedName(fullName: string): boolean {
  return REAL_PLAYER_BLACKLIST.has(fullName.trim());
}

// GDD §5 kulüp önemli oyuncuları — elle yazılmış (her kulüpten 2-3)
export interface KeyPlayerSeed { name: string; group: string; ovrBoost: number; bio: string; }
export const KEY_PLAYERS: Record<string, KeyPlayerSeed[]> = {
  denizli_yesilova: [
    { name: 'Sarp Aydın', group: 'ST', ovrBoost: 4, bio: 'Yeşilova’nın mahallelerinden yetişen bitirici. Şehir ona "Vadi’nin Vurucusu" diyor; iç sahada kritik gollerin adamı.' },
    { name: 'İbrahim Tanrıkulu', group: 'CM', ovrBoost: 3, bio: 'Orta alanın metronomu. 12 yıldır formayı sırtından çıkarmadı; gençlere yol gösteren kulüp kaptanı.' },
    { name: 'Ilgaz Horoz', group: 'GK', ovrBoost: 3, bio: 'Uzun refleksli kaleci; geçen sezon 9 gol yememe ile Geçit Ulusal rekorunu zorladı.' },
  ],
  ist_halic: [
    { name: 'Rüstem Kabadayı', group: 'ST', ovrBoost: 5, bio: 'Miras Zirve Ligi’nin son üç sezondaki en skorer isimlerinden; tersane tribünlerinin efsanesi.' },
    { name: 'Samir Haddad', group: 'AM', ovrBoost: 4, bio: 'Yaratıcı On Numara; kilit pas istatistiğinde ligin zirvesinde gezen yabancı koz.' },
  ],
  ank_hisar: [
    { name: 'Levent Yıldırımçı', group: 'CB', ovrBoost: 4, bio: 'Başkent savunmasının kale direği. Rakip forvetler ona "Hisar gölgesi" diyor.' },
  ],
  manisa_spil: [
    { name: 'Necip Gülcü', group: 'DM', ovrBoost: 3, bio: 'Spil savunmasının önündeki duvar. Kilidi çözmeden Manisa kalesine gitmek yıllardır dert.' },
  ],
};
