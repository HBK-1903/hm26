// HM26 — Aşama 0 kapsam notu olan yardımcı ekranlar (§5.17 Ayarlar / Yedekleme / Kariyer Profili brifingi)
import React, { useState } from 'react';
import { useGame } from '../store/game';
import { Card, Badge, Btn, Seg, Sheet } from '../components/ui/kit';
import { Crest } from '../components/assets/Crest';
import { ManagerPortrait } from '../components/assets/Portrait';
import { GameIcon } from '../components/icons';
import { MANAGER_BACKGROUNDS, ERAS, DIFFICULTIES } from '../data/meta';
import { CareerSettings } from '../types';
import { applyTheme, loadTheme, ThemePref } from '../utils/comfort';
import { applyComfortSettings, saveLocalComfort } from '../utils/comfort';
import { exportSaveFile, exportFileName, parseImportFile, SaveBlob, SaveMeta } from '../store/persist';
import { careerSeasonLabel } from '../data/careerTimeline';
import { clubByIdSafe } from '../data/clubs';
import { dayToDate } from '../data/calendar';
import { audio, AudioPrefs } from '../audio/engine';
import { buildPressProfile } from '../engine/pressProfile';
import { CareerTimeline } from '../components/CareerTimeline';

export const PlaceholderScreen: React.FC<{ id: 'careerProfile' | 'settings' | 'backup' }> = ({ id }) => {
  const [theme, setTheme] = React.useState<ThemePref>(loadTheme());
  const [backupMsg, setBackupMsg] = useState<{ text: string; kind: 'ok' | 'error' } | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState<SaveBlob | null>(null);
  const [importComplete, setImportComplete] = useState(false);
  const backupInputRef = React.useRef<HTMLInputElement>(null);
  const g = useGame();
  const st = g.career.settings;
  const [prefs, setPrefsState] = useState<AudioPrefs>(() => {
    try { return JSON.parse(localStorage.getItem('m26_audio') ?? '') ?? { master: 0.8, crowd: 0.7, fx: 0.9, music: 0.45 }; } catch { return { master: 0.8, crowd: 0.7, fx: 0.9, music: 0.45 }; }
  });
  const setPrefs = (up: (p: AudioPrefs) => AudioPrefs) => {
    setPrefsState((p) => { const n = up(p); try { localStorage.setItem('m26_audio', JSON.stringify(n)); } catch { /* noop */ } return n; });
  };
  React.useEffect(() => { audio.init(prefs); audio.setPrefs(prefs); }, []);
  const patch = <K extends keyof CareerSettings>(k: K, v: CareerSettings[K]) => {
    g.setCareer((c) => { const n = { ...c, settings: { ...c.settings, [k]: v } }; applyComfortSettings(n.settings); saveLocalComfort(n.settings); return n; });
  };

  if (id === 'careerProfile') {
    const bg = MANAGER_BACKGROUNDS.find((b) => b.id === g.career.manager.background)!;
    const era = ERAS.find((e) => e.id === g.career.manager.era)!;
    const diff = DIFFICULTIES.find((d) => d.id === g.career.manager.difficulty)!;
    return (
      <div className="h-full overflow-y-auto no-scrollbar px-4 pt-3 pb-6 space-y-2.5">
        <Card>
          <div className="flex items-center gap-4">
            <ManagerPortrait index={g.career.manager.portrait} size={64} selected face={(g.career.manager as any).face ?? null} />
            <div>
              <div className="text-primary font-display text-lg">{g.career.manager.name}</div>
              <div className="text-secondary text-[12px] mt-0.5">{bg.name} · {g.myClub.name}</div>
            </div>
          </div>
        </Card>
        <CareerTimeline seasonNo={g.seasonNo} day={g.career.day} reports={g.matchReports} transfers={g.transferLog} trophies={g.career.trophyCabinet} />
        <Card>
          <div className="m26-overline mb-2">Kariyer Kurulumu</div>
          {[['Dünya Dönemi', era.name], ['Zorluk', `${diff.name} (KZP ${g.career.manager.challengePoints})`], ['İlk Sezon Kaynağı', bg.bonus], ['Kulüp', `${g.myClub.name} — ${g.myClub.stadium}`]].map(([k, v]) => (
            <div key={k} className="flex justify-between items-start py-1.5 text-[12.5px]">
              <span className="text-secondary">{k}</span>
              <span className="text-primary font-semibold text-right max-w-[60%]">{v}</span>
            </div>
          ))}
        </Card>
        <Card>
          <div className="m26-overline mb-2">Teknik Direktör CV'si</div>
          {g.seasonHistory.length === 0 ? (
            <p className="text-secondary text-[12px] leading-snug">İlk sezon devam ediyor. Sezon kapandıkça bu satıra sezonlar ve başarılar eklenecek.</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5 mb-1">
                {[
                  ['Sezon', g.seasonHistory.length],
                  ['Yükselme', g.seasonHistory.filter((h) => h.rank <= 2 && h.leagueId !== 'zirve').length],
                  ['Şampiyonluk', g.seasonHistory.filter((h) => h.rank === 1).length],
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-base rounded-xl p-2 text-center">
                    <div className="num text-amber font-bold text-[16px]">{v}</div>
                    <div className="text-muted text-[9.5px] uppercase">{k}</div>
                  </div>
                ))}
              </div>
              {[...g.seasonHistory].reverse().map((h) => (
                <div key={h.season} className="text-[12px] bg-base/60 rounded-lg px-2.5 py-2" data-season-row={h.season}>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary num">{h.season}</span>
                    <span className="text-primary font-semibold">{h.rank}. sıra · {h.pts}p</span>
                    <span className="text-muted text-[10.5px]">{h.cup}</span>
                  </div>
                  {typeof h.xgf === 'number' && typeof h.xga === 'number' && (
                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-line/40 text-[10.5px] text-muted num">
                      <span>xG {h.xgf} – {h.xga}</span>
                      <span>Şut isabeti: {h.shotAccuracy === null || h.shotAccuracy === undefined ? '—' : `%${h.shotAccuracy}`}</span>
                      <span>Maç başı korner: {h.cornersPerMatch ?? '—'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
        {(() => {
          const press = buildPressProfile(g.inbox);
          return (
            <Card>
              <div data-testid="career-press-profile">
              <div className="m26-overline mb-2">Basın Profili</div>
              {press.total === 0 ? (
                <p className="text-secondary text-[12px] leading-snug">Henüz röportaj vermedin. Maç sonu röportajlarındaki tonun burada özetlenir.</p>
              ) : (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-primary text-[20px] font-black num">{press.total}</span>
                    <span className="text-secondary text-[12px]">röportajda konuştun</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-2.5 text-center">
                    {([['win', 'Galibiyet'], ['draw', 'Beraberlik'], ['loss', 'Mağlubiyet']] as const).map(([k, label]) => (
                      <div key={k} className="bg-base rounded-lg py-1.5">
                        <div className="num text-primary font-extrabold text-[14px]">{press.byOutcome[k]}</div>
                        <div className="text-muted text-[9px] uppercase">{label}</div>
                      </div>
                    ))}
                  </div>
                  {press.mostUsedTone && (
                    <p className="text-secondary text-[11.5px] mt-2.5 leading-snug">
                      En sık tercih ettiğin ton: <b className="text-amber">{press.mostUsedTone.label}</b> ({press.mostUsedTone.count} kez)
                    </p>
                  )}
                </>
              )}
              </div>
            </Card>
          );
        })()}
      </div>
    );
  }

  if (id === 'settings') {
    return (
      <div className="h-full overflow-y-auto no-scrollbar px-4 pt-3 pb-6 space-y-2.5">
        <Card>
          <div className="m26-overline mb-2.5">Tema</div>
          <div className="text-[13px] text-primary font-semibold mb-1.5">Görünüm</div>
          <Seg ariaLabel="Tema seçimi" options={[{ v: 'light', label: 'Açık' }, { v: 'dark', label: 'Koyu' }, { v: 'auto', label: 'Sistem' }]}
               value={theme} onChange={(v) => { const t = v as ThemePref; setTheme(t); applyTheme(t); }} />
          <p className="text-muted text-[12px] leading-relaxed mt-2">Açık tema: <b className="text-primary">Spor Gazetesi</b>. Sistem seçimi cihazının görünüm tercihine uyar; maç sahası gece yeşilinde kalır.</p>
        </Card>
        <Card>
          <div className="m26-overline mb-2.5">Konfor (sonradan değişebilir —)</div>
          <div className="space-y-3">
            <div>
              <div className="text-[12.5px] text-primary font-semibold mb-1.5">Metin boyutu</div>
              <Seg options={[{ v: 'kucuk', label: 'Küçük' }, { v: 'normal', label: 'Normal' }, { v: 'buyuk', label: 'Büyük' }]} value={st.textSize} onChange={(v) => patch('textSize', v as CareerSettings['textSize'])} />
            </div>
            <div>
              <div className="text-[12.5px] text-primary font-semibold mb-1.5">Varsayılan maç hızı</div>
              <Seg options={[{ v: 'yavas', label: 'Yavaş' }, { v: 'normal', label: 'Normal' }, { v: 'hizli', label: 'Hızlı' }]} value={st.matchSpeed} onChange={(v) => patch('matchSpeed', v as CareerSettings['matchSpeed'])} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="m26-overline mb-2.5">Erişilebilirlik</div>
          <Toggle label="Yüksek kontrast" note="Metin ve ikon kontrastı korunur" v={st.highContrast} set={(b) => patch('highContrast', b)} />
          <Toggle label="Azaltılmış hareket" note="Dekoratif hareketler kapatılır" v={st.reduceMotion} set={(b) => patch('reduceMotion', b)} />
          <Toggle label="Taktik önerileri" note="Maç içi kritik anlarda kısa öneri" v={st.suggestions} set={(b) => patch('suggestions', b)} />
          <p className="text-muted text-[10.5px] mt-1">Kariyerin maç/dünya ayarları (gol ritmi, rastgelelik, piyasa) buradan değiştirilemez; bu ayarlar kariyer başında belirlenir.</p>
        </Card>
        <Card>
          <div className="m26-overline mb-2.5">Ses ( kanallar ayrı)</div>
          <Toggle label="Ana ses" note="Tüm sesleri aç/kapat" v={prefs.master > 0} set={(b) => { audio.setPrefs({ master: b ? 0.8 : 0 }); setPrefs((p) => ({ ...p, master: b ? 0.8 : 0 })); }} />
          <Toggle label="Tribün atmosferi" note="Maçta dinamik yenen tribün" v={prefs.crowd > 0} set={(b) => { audio.setPrefs({ crowd: b ? 0.7 : 0 }); setPrefs((p) => ({ ...p, crowd: b ? 0.7 : 0 })); if (b) audio.unlock(); }} />
          <Toggle label="Efektler" note="Düdük, gol, kart, VAR sesleri" v={prefs.fx > 0} set={(b) => { audio.setPrefs({ fx: b ? 0.9 : 0 }); setPrefs((p) => ({ ...p, fx: b ? 0.9 : 0 })); if (b) audio.unlock(); }} />
          <Toggle label="Müzik (menü ambient)" note="Sakin arka plan (menüde)" v={prefs.music > 0} set={(b) => { audio.setPrefs({ music: b ? 0.45 : 0 }); setPrefs((p) => ({ ...p, music: b ? 0.45 : 0 })); }} />
          <div className="flex justify-between items-center">
            <span className="text-secondary text-[11.5px]">Ses testi</span>
            <Btn variant="secondary" className="min-h-touch !px-3 !text-[12px]" onClick={() => { audio.unlock(); audio.play('goal'); }}>Ses Dene</Btn>
          </div>
        </Card>
      </div>
    );
  }

  // ── Yedekleme ekranı (§5.17) ──
  const backupExport = async () => {
    if (backupBusy) return;
    setBackupBusy(true);
    try {
      const saved = await g.saveNow(true);
      // Export the current in-memory career, not a potentially stale IndexedDB record.
      // This also lets the player rescue progress if device storage is unavailable.
      const snapshot = g.snapshotForBackup();
      const career = snapshot.career;
      const clubName = clubByIdSafe(career.clubId)?.name ?? 'Kulüp';
      const meta: SaveMeta = {
        slot: career.slot, clubId: career.clubId, clubName, managerName: career.manager.name,
        eraName: career.manager.era, kzp: career.manager.challengePoints, day: career.day, week: career.week,
        season: careerSeasonLabel(snapshot.seasonNo ?? 1), updatedAt: Date.now(),
      };
      const file = exportSaveFile(snapshot, meta);
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url; a.download = exportFileName(clubName, career.day); a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setBackupMsg(saved
        ? { text: 'Güncel kariyer dosyası indirildi — başka cihaza taşınabilir.', kind: 'ok' }
        : { text: 'Güncel durum yedek dosyasına indirildi; cihaz kaydı başarısız. Dosyayı güvenli bir yerde sakla.', kind: 'error' });
    } catch {
      setBackupMsg({ text: 'Yedek dosyası oluşturulamadı. Lütfen yeniden dene.', kind: 'error' });
    } finally { setBackupBusy(false); }
  };
  const backupImport = async (file: File) => {
    try {
      const { blob } = parseImportFile(await file.text());
      setBackupMsg(null);
      setPendingImport({ ...blob, career: { ...blob.career, slot: g.career.slot } });
    } catch (e) {
      setBackupMsg({ text: e instanceof Error ? e.message : 'Dosya okunamadı.', kind: 'error' });
    }
  };
  const confirmImport = async () => {
    if (!pendingImport || backupBusy) return;
    setBackupBusy(true);
    const ok = await g.restoreBackup(pendingImport);
    setBackupBusy(false);
    if (ok) setImportComplete(true);
    else {
      setPendingImport(null);
      setBackupMsg({ text: 'Yedek yazılamadı; mevcut kariyer değiştirilmedi. Yukarıdaki uyarıyı kontrol et.', kind: 'error' });
    }
  };
  return (
    <div className="h-full overflow-y-auto no-scrollbar px-4 pt-3 pb-6 space-y-2.5">
      <Card>
        <div className="m26-overline">Kayıt Durumu</div>
        <div className="flex items-center gap-3 mt-2.5">
          <Crest club={g.myClub} size={38} />
          <div className="flex-1">
            <div className="text-primary font-bold text-[14px]">{g.myClub.name} kariyeri — Yuva {g.career.slot}</div>
            <div className="text-secondary text-[11.5px]">Gün {g.career.day} ({dayToDate(g.career.day)}) · Hafta {g.career.week} · Sezon {g.seasonNo} · Seed #{g.career.seed}</div>
          </div>
          <Badge kind={g.saveError ? 'danger' : 'ok'}>{g.saveError ? 'Kayıt hatası' : 'Otomatik'}</Badge>
        </div>
        <p className="text-muted text-[11px] mt-2.5 leading-relaxed">Otomatik kayıt: gün sonu, maç sonu, transfer, sezon geçişi ve uygulama kapanışı. Kayıtlar bu cihazın yerel hafızasında kalır; internet gerekmez.</p>
        <Btn variant="secondary" disabled={backupBusy} className="w-full mt-3 !text-[12.5px]" onClick={() => {
          setBackupBusy(true);
          void g.saveNow(false).then((ok) => setBackupMsg(ok
            ? { text: 'Şimdi kaydedildi ✓', kind: 'ok' }
            : { text: 'Kayıt başarısız; ilerlemeni korumak için yedek dosyası indirebilirsin.', kind: 'error' })).finally(() => setBackupBusy(false));
        }}>Şimdi Kaydet</Btn>
      </Card>
      <Card>
        <div className="text-primary text-[13px] font-bold">Dışa / İçe Aktarma</div>
        <p className="text-secondary text-[12px] mt-1.5 leading-snug">Tek dosya — kulüp adı ve gün etiketli JSON. İçe aktarımda dosya doğrulanır, sürüm uyumsuzsa reddedilir.</p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Btn variant="amber" disabled={backupBusy} className="!text-[12.5px]" onClick={() => void backupExport()}>Dışa Aktar</Btn>
          <Btn variant="secondary" disabled={backupBusy} className="!text-[12.5px]" onClick={() => backupInputRef.current?.click()}>İçe Aktar</Btn>
        </div>
        <input ref={backupInputRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void backupImport(f); e.target.value = ''; }} />
        {backupMsg && <p role={backupMsg.kind === 'error' ? 'alert' : 'status'} className={`text-[12px] mt-2.5 leading-snug ${backupMsg.kind === 'error' ? 'text-danger' : 'text-ok'}`}>{backupMsg.text}</p>}
      </Card>
      <Card className="border-dashed">
        <div className="text-secondary text-[12px] leading-snug">Yuva yönetimi (devam et / sil / içe aktar) açılıştaki Kariyerler ekranında. Silme iki aşamalı onay ister.</div>
      </Card>
      <Sheet open={!!pendingImport} dismissible={!backupBusy && !importComplete} onClose={() => setPendingImport(null)} title={importComplete ? 'Yedek hazır' : 'Yedeği yükle?'}>
        {importComplete ? (
          <div className="space-y-3">
            <p className="text-primary text-sm">Yedek bu yuvaya kaydedildi. Eski kariyerin üzerine tekrar yazılmaması için yedeği aç.</p>
            <Btn className="w-full" onClick={() => window.location.reload()}>Yedeği Aç</Btn>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-primary text-sm font-semibold">{clubByIdSafe(pendingImport?.career.clubId ?? '')?.name ?? 'Kulüp'} · {pendingImport?.career.manager.name} · Gün {pendingImport?.career.day}</p>
            <p className="text-secondary text-[12.5px] leading-relaxed">Bu yedek Yuva {g.career.slot} içindeki mevcut kariyerin üzerine yazılacak. Önce mevcut kariyerin yedeğini indir ve aynı kariyerin açık olduğu diğer sekmeleri kapat.</p>
            <Btn variant="danger" disabled={backupBusy} className="w-full" onClick={() => { void confirmImport(); }}>{backupBusy ? 'Yükleniyor…' : 'Evet, Yedeği Yükle'}</Btn>
            <Btn variant="secondary" disabled={backupBusy} className="w-full" onClick={() => setPendingImport(null)}>Vazgeç</Btn>
          </div>
        )}
      </Sheet>
    </div>
  );
};

const Toggle: React.FC<{ label: string; note: string; v: boolean; set: (b: boolean) => void }> = ({ label, note, v, set }) => (
  <div className="mb-3">
    <button type="button" role="switch" aria-checked={v} aria-label={label} onClick={() => set(!v)} className="w-full min-h-touch flex items-center justify-between">
      <span className="text-[13px] text-primary font-semibold">{label}</span>
      <span className={`w-11 h-6 rounded-full transition-colors relative ${v ? 'bg-amber' : 'bg-line'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-primary transition-all ${v ? 'left-5' : 'left-0.5'}`} />
      </span>
    </button>
    <p className="text-muted text-[10.5px] -mt-0.5">{note}</p>
  </div>
);
