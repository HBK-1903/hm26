// HM26 — Kullanıcının seçtiği özgün Türkçe seslerle çevrimdışı replikler.
// Dinamik isim/rakamlar ayrıca ekranda gösterilir; ses kaydı ile altyazı aynı cümledir.
import { transferDialogueHash, type TransferReveal, type TransferTone } from './transferPresentation';

export type TransferSpeaker = 'manager' | 'representative' | 'player' | 'announcer';
export interface TransferVoiceLine { id: string; text: string; speaker: TransferSpeaker; src: string }
const line = (id: string, speaker: TransferSpeaker, text: string): TransferVoiceLine => ({
  id, text, speaker, src: `/assets/transfer/voice/${id}.mp3`,
});

const calm: TransferVoiceLine[] = [
  line('manager-calm-1', 'manager', 'İki tarafı da memnun edecek bir yol bulalım.'),
  line('manager-calm-2', 'manager', 'Şartları konuşup ortak noktayı bulalım.'),
  line('manager-calm-3', 'manager', 'Teklifimizi dikkatle değerlendirin lütfen.'),
  line('manager-calm-4', 'manager', 'Sakin sakin konuşup anlaşmaya varalım.'),
];
const witty: TransferVoiceLine[] = [
  line('manager-witty-1', 'manager', 'Krampon sizde kalsın hocam, futbolcuyu gönderin yeter.'),
  line('manager-witty-2', 'manager', 'Maaşla birlikte benim tansiyonu da biraz yükselttin hocam.'),
  line('manager-witty-3', 'manager', "Şu rakamı VAR'a gönderelim, hakem karar versin."),
  line('manager-witty-4', 'manager', 'Hocam bu pazarlık uzarsa çayı da takasa koyacağım.'),
];
const firm: TransferVoiceLine[] = [
  line('manager-firm-1', 'manager', 'Bu şartlarda devam edemeyiz hocam, biraz yaklaşalım.'),
  line('manager-firm-2', 'manager', 'Bütçemiz belli, daha fazlasını zor çıkarırız.'),
  line('manager-firm-3', 'manager', 'Ulan hocam, bu rakama stadı mı alıyoruz?'),
  line('manager-firm-4', 'manager', 'Masayı yıkmadan son bir kez şartları konuşalım.'),
];
const sellerCounter: TransferVoiceLine[] = [
  line('rep-counter-1', 'representative', 'Hocam biraz daha yaklaşın, ben de yönetimi ikna edeyim.'),
  line('rep-counter-2', 'representative', 'Teklifinizi gördük ama şartları biraz iyileştirmeniz gerekiyor.'),
  line('rep-counter-3', 'representative', 'Rakamlar yakın değil hocam, ortada buluşmayı deneyelim.'),
  line('rep-counter-4', 'representative', 'Kulüp biraz daha bekliyor, pazarlığa devam edebiliriz.'),
];
const sellerAccept: TransferVoiceLine[] = [
  line('rep-accept-1', 'representative', 'Tamam hocam, kulüp şartları kabul ediyor.'),
  line('rep-accept-2', 'representative', 'Anlaştık hocam, artık oyuncuyla görüşebilirsiniz.'),
  line('rep-accept-3', 'representative', 'Bu teklif bizim için uygun, şartları kabul ediyoruz.'),
  line('rep-accept-4', 'representative', 'Dosyayı kapatalım hocam, anlaşma sağlandı.'),
];
const sellerWalk: TransferVoiceLine[] = [
  line('rep-walk-1', 'representative', 'Bu şartlarda anlaşamayacağız hocam, görüşmeyi kapatıyoruz.'),
  line('rep-walk-2', 'representative', 'Bugün ortak nokta bulamadık, ben masadan kalkıyorum.'),
  line('rep-walk-3', 'representative', 'Kulüp bu rakamı kabul etmiyor, görüşme burada bitti.'),
];
export const transferLeakLine = line('rep-walk-4', 'representative', 'Görüşme basına sızmış, oyuncunun beklentisini yeniden konuşacağız.');
const playerAccept: TransferVoiceLine[] = [
  line('player-accept-1', 'player', 'Şartlar bana uyuyor hocam, imzaya hazırım.'),
  line('player-accept-2', 'player', 'Teklifiniz uygun hocam, sözleşmeyi görebilirim.'),
  line('player-accept-3', 'player', 'Bu şartlarla anlaşabiliriz, kulübe gelmek isterim.'),
  line('player-accept-4', 'player', 'Formayı hazırlayın hocam, imzam geliyor.'),
];
const playerReject: TransferVoiceLine[] = [
  line('player-reject-1', 'player', 'Hocam projeyi sevdim ama ücrette biraz daha buluşmamız gerek.'),
  line('player-reject-2', 'player', 'Maaş kısmında yazıcı mı bozulmuş hocam? Biraz daha yaklaşalım.'),
  line('player-reject-3', 'player', 'Bu rakama anlaşmamız zor, şartları gözden geçirelim.'),
  line('player-reject-4', 'player', 'Hocam bu teklif maaş mı, forma numaram mı?'),
];
const playerSigned: TransferVoiceLine[] = [
  line('player-sign-2', 'player', 'Tamamdır hocam, artık sahada konuşuruz.'),
  line('player-sign-3', 'player', 'Formayı giymek için sabırsızlanıyorum.'),
  line('player-sign-4', 'player', 'Hocam ışıklar güzel de kalemi görebiliyor muyuz?'),
];
const announcements: TransferVoiceLine[] = [
  line('announcer-1', 'announcer', 'Yeni transferimize hoş geldiniz diyelim.'),
  line('announcer-2', 'announcer', 'Kulübümüze yeni bir isim katıldı, hoş geldin.'),
  line('announcer-4', 'announcer', 'Kulübümüze yeni bir isim katıldı, forma törenine hoş geldiniz.'),
];
const starAnnouncement = line('announcer-3', 'announcer', 'Yıldız transferimizi taraftarımızın önünde karşılıyoruz.');

function pick(lines: TransferVoiceLine[], key: string): TransferVoiceLine {
  return lines[transferDialogueHash(key) % lines.length];
}

/** Seçenek üzerindeki cümle ile oynatılan ses her zaman aynı kaynaktandır. */
export function managerTransferLine(tone: TransferTone, phase: 'seller' | 'player', key: string): TransferVoiceLine {
  if (tone === 'calm') return pick(calm, `${key}|calm`);
  if (tone === 'witty') return pick(phase === 'seller' ? [witty[0], witty[2], witty[3]] : [witty[1], witty[2], witty[3]], `${key}|witty`);
  return pick(phase === 'seller' ? firm : [firm[0], firm[1], firm[3]], `${key}|firm`);
}
export function sellerTransferLine(outcome: 'accept' | 'counter' | 'walk', key: string): TransferVoiceLine {
  return pick(outcome === 'accept' ? sellerAccept : outcome === 'walk' ? sellerWalk : sellerCounter, `${key}|${outcome}`);
}
export function playerTransferLine(accepted: boolean, key: string): TransferVoiceLine {
  return pick(accepted ? playerAccept : playerReject, `${key}|${accepted ? 'accept' : 'reject'}`);
}
export const signingReadyLine = line('player-sign-1', 'player', 'Kalemi verin hocam, fikrimi değiştirmeden imzalayayım.');
export function signedTransferLine(key: string): TransferVoiceLine { return pick(playerSigned, `${key}|signed`); }
export function transferAnnouncement(reveal: TransferReveal, key: string): TransferVoiceLine {
  return reveal === 'star' ? starAnnouncement : pick(announcements, `${key}|announce`);
}

/** QA ve çevrimdışı envanter kontrolü. */
export const ALL_TRANSFER_VOICES = [...calm, ...witty, ...firm, ...sellerCounter, ...sellerAccept, ...sellerWalk,
  transferLeakLine, ...playerAccept, ...playerReject, signingReadyLine, ...playerSigned, ...announcements, starAnnouncement];
