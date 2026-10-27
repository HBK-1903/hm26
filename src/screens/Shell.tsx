// HM26 — UI/UX §4 Global Kabuk (v0.7.0: UI Prototip entegrasyonu — HM26 header + alt nav + daybar + Daha paneli)
import React, { useState } from 'react';
import { Screen } from '../types';
import { GameIcon } from '../components/icons';
import { useGame, dayToDate } from '../store/game';
import { Hub } from './Hub';
import { SquadScreen } from './Squad';
import { TacticsScreen } from './Tactics';
import { MarketScreen } from './Market';
import { ClubScreen } from './Club';
import { CompsScreen } from './Comps';
import { StatsHub } from './StatsHub';
import { NewsroomScreen } from './Newsroom';
import { InboxScreen } from './Inbox';
import { PlaceholderScreen } from './Placeholder';
import { SeasonFinale } from './SeasonFinale';
import { VersionNote } from '../components/ui/InstallBanner';
import { MatchPrep } from './MatchPrep';
import { ScreenBoundary } from '../components/ui/ScreenBoundary';
import { Sheet, Btn } from '../components/ui/kit';
import { audio } from '../audio/engine';
import { useEffect } from 'react';

const NAV: { id: Screen | 'more'; label: string; icon: string }[] = [
  { id: 'hub', label: 'Merkez', icon: 'home' },
  { id: 'squad', label: 'Kadro', icon: 'squad' },
  { id: 'tactics', label: 'Taktik', icon: 'tactics' },
  { id: 'market', label: 'Piyasa', icon: 'market' },
  { id: 'more', label: 'Daha', icon: 'more' },
];
const MORE_MENU: { id: Screen; label: string; icon: string }[] = [
  { id: 'club', label: 'Kulüp', icon: 'club' },
  { id: 'comps', label: 'Müsabakalar', icon: 'comps' },
  { id: 'newsroom', label: 'Basın Odası', icon: 'news' },
  { id: 'stats', label: 'İstatistik', icon: 'chart' },

  { id: 'careerProfile', label: 'Kariyer Profili', icon: 'profile' },
  { id: 'settings', label: 'Ayarlar', icon: 'settings' },
  { id: 'backup', label: 'Yedekleme', icon: 'backup' },
];
const MORE_IDS: string[] = MORE_MENU.map((m) => m.id);

// v0.8.3 RISK-01: tarayıcı geri/ileri için yalnızca kalıcı ekranlar geçmişe yazılır (liveMatch/matchReport geçici)
const NAV_SCREENS = new Set<Screen>(['hub', 'squad', 'tactics', 'market', 'club', 'comps', 'stats', 'inbox', 'careerProfile', 'settings', 'backup', 'matchPrep', 'newsroom']);

// PWA kısayolları (#squad, #market …) ve yenileme sonrası derin link: bilinmeyen hash güvenle Merkez'e düşer
function screenFromHash(): Screen {
  try {
    const h = location.hash.replace(/^#/, '').split('?')[0] as Screen;
    return NAV_SCREENS.has(h) ? h : 'hub';
  } catch {
    return 'hub';
  }
}

export const AppShell: React.FC<{ pendingScreen: Screen | null; setPendingScreen: (s: Screen | null) => void }> = ({ pendingScreen, setPendingScreen }) => {
  const g = useGame();
  const [screen, setScreen] = useState<Screen>(screenFromHash);
  const [moreOpen, setMoreOpen] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<string[] | null>(null);

  // §15.1: ilk kullanıcı temasında sesi aç + tercihleri yükle
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem('m26_audio') ?? 'null');
      if (prefs) audio.init(prefs);
    } catch { /* noop */ }
    const unlock = () => { audio.unlock(); document.removeEventListener('pointerdown', unlock); };
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  // v0.8.3 RISK-01: popstate → SPA içinde geri/ileri; bilinmeyen hash güvenli şekilde Merkez'e düşer
  useEffect(() => {
    try {
      // İlk derin linki (PWA kısayolu/yenilenen sekme) koru; yalnız durum nesnesi eksikse ekranı hash'ten bağla
      if (!(history.state as { hm26s?: Screen } | null)?.hm26s) {
        const initial = screenFromHash();
        history.replaceState({ hm26s: initial }, '', '#' + initial);
      }
    } catch { /* file:// fallback */ }
    const onPop = (e: PopStateEvent) => {
      const fromState = (e.state as { hm26s?: Screen } | null)?.hm26s;
      const fromHash = location.hash.replace(/^#/, '') as Screen;
      const target: Screen = NAV_SCREENS.has(fromState as Screen) ? (fromState as Screen)
        : NAV_SCREENS.has(fromHash) ? fromHash : 'hub';
      setPendingScreen(null);
      setMoreOpen(false);
      setScreen(target);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setPendingScreen]);

  const current: Screen = pendingScreen ?? screen;
  const go = (s: Screen) => {
    setPendingScreen(null);
    setScreen(s);
    setMoreOpen(false);
    // RISK-01: gerçek ekran geçişi tarayıcı geçmişine yazılır — geri tuşu siteden çıkarmaz
    try {
      if (NAV_SCREENS.has(s)) {
        const h = '#' + s;
        if (location.hash !== h) history.pushState({ hm26s: s }, '', h);
      }
    } catch { /* file:// fallback */ }
  };
  // Jr-09 QA: "İlk 11'e Al" akışı — kadro → taktik köprüsü
  const [pendingXI, setPendingXI] = useState<string | null>(null);
  const goXI = (p: { id: string }) => { setPendingXI(p.id); go('tactics'); };

  // Daybar (prototip): sadece Merkez'de; maç günü "Maç Merkezine Git" olur
  const next = g.nextFixture;
  const daysLeft = next ? Math.max(0, next.day - g.career.day) : 0;
  const isMatchday = !!next && daysLeft === 0;
  const advance = () => {
    if (isMatchday) { go('matchPrep'); return; }
    // §5.4 — kritik zorunlu karar varken ilerleme engellenir, sebep bildirilir
    const res = g.advanceDay();
    if (res.blocked) {
      setBlockedReason(res.reason ?? 'Bugün kritik bir karar bekleniyor.');
      return;
    }
    g.setInbox((ms) => ms.map((m) => ({ ...m, read: true })));
    setBlockedReason(null);
    setLastSummary(res.summary.length ? res.summary : ['Gün sakin geçti.']);
  };

  const Icon = ({ id, className }: { id: string; className?: string }) => <GameIcon id={id} className={className ?? 'w-5 h-5'} />;

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Prototip §header: HM26 marka + tarih rozeti + inbox badge */}
      <header className="shrink-0 z-30 flex items-center justify-between gap-2.5 px-4 pt-[calc(8px+env(safe-area-inset-top))] pb-2 border-b border-line/60 bg-base/95">
        <button onClick={() => go('hub')} aria-label="HM26 ana merkez" className="min-h-touch flex items-center -ml-1">
          <img src="/assets/brand/HM26_Seffaf.webp" alt="HM26" className="h-[30px] w-auto select-none pointer-events-none" draggable={false} onError={(e) => { const im = e.currentTarget; if (!im.src.endsWith("/icon-transparent.svg")) im.src = "/icon-transparent.svg"; }} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-muted text-[10px] font-bold tracking-wide border border-line rounded-md px-2 py-1.5 num">{dayToDate(g.career.day)}</span>
          <button onClick={() => go('inbox')} className="relative min-w-touch min-h-touch flex items-center justify-center border border-line rounded-xl text-primary" aria-label={`Gelen kutusu${g.unread > 0 ? `, ${g.unread} okunmamış ileti` : ''}`}>
            <Icon id="inbox" />
            {g.unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber text-base border-2 border-base text-[10px] font-extrabold min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center num">{g.unread}</span>
            )}
          </button>
        </div>
      </header>

      {/* İçerik */}
      <div className="flex-1 min-h-0 relative">
        {/* FIX P0/3: ekran-seviye hata sınırı — bölüm çökerse hub canlı kalır */}
        <ScreenBoundary key={current} screenName={current} onBackToHub={() => { setPendingScreen('hub'); setScreen('hub'); }}>
          {current === 'hub' && <Hub go={go} />}
          {current === 'squad' && <SquadScreen goXI={goXI} />}
          {current === 'tactics' && <TacticsScreen pendingXI={pendingXI ? (g.playerOf(pendingXI) ?? null) : null} onClearXI={() => setPendingXI(null)} />}
          {current === 'market' && <MarketScreen go={go} />}
          {current === 'club' && <ClubScreen />}
          {current === 'comps' && <CompsScreen />}
          {current === 'inbox' && <InboxScreen go={go} />}
          {current === 'stats' && <StatsHub />}
          {current === 'newsroom' && <NewsroomScreen />}
          {current === 'matchPrep' && <MatchPrep go={go} />}
          {(current === 'careerProfile' || current === 'settings' || current === 'backup') && <PlaceholderScreen id={current} />}
        </ScreenBoundary>
      </div>

      {/* Prototip §daybar: Merkez'de büyük altın CTA */}
      {current === 'hub' && (
        <div className="shrink-0 px-4 pt-2 pb-2 bg-base/95">
          {blockedReason && (
            <div className="mb-2 text-center text-[12px] text-danger font-semibold bg-danger/10 border border-danger/40 rounded-lg px-3 py-2 m26-in">
              <span className="inline-flex items-center justify-center gap-1.5"><Icon id="shield" className="w-4 h-4" />{blockedReason}</span>
            </div>
          )}
          <Btn variant="amber" className="w-full !min-h-[50px] text-[14px]" onClick={advance}>
            {isMatchday ? 'Maç Merkezine Git' : 'Sonraki Gün'} →
          </Btn>
        </div>
      )}

      {/* Prototip §bottom-nav: 5 sekme */}
      <nav className="shrink-0 z-30 grid grid-cols-5 border-t border-line bg-elevated safe-b" aria-label="Ana gezinme">
        {NAV.map((n) => {
          const active = n.id === 'more' ? MORE_IDS.includes(current) : current === n.id;
          return (
            <button
              key={n.id}
              onClick={() => (n.id === 'more' ? setMoreOpen(true) : go(n.id as Screen))}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[58px] text-[11px] font-bold ${active ? 'text-amber bg-amber/5' : 'text-muted'}`}
            >
              {active && <span className="absolute top-0 left-[27%] right-[27%] h-[2px] bg-amber rounded-b" />}
              <Icon id={n.icon} />
              <span>{n.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Gün sonu özeti (advance Hub'dan Shell'e taşındı) */}
      <Sheet open={!!lastSummary} onClose={() => setLastSummary(null)} title="Gün Sonu Özeti">
        <div className="space-y-2.5 pb-2">
          {lastSummary?.map((s) => (
            <div key={s} className="flex items-start gap-2.5 text-[13px] text-primary/95 leading-snug">
              <span className="text-ok">✓</span><span>{s}</span>
            </div>
          ))}
          <Btn variant="primary" className="w-full mt-2" onClick={() => setLastSummary(null)}>Tamam</Btn>
        </div>
      </Sheet>

      {/* Prototip §"Daha" paneli: kulüp ve kariyer bölümleri */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Kulüp ve kariyer">
        <div className="pb-2">
          {MORE_MENU.map((m) => (
            <button key={m.id} onClick={() => go(m.id)} className="w-full min-h-[48px] flex items-center gap-3 text-left text-[13.5px] text-primary border-b border-line/40">
              <Icon id={m.icon} className="w-5 h-5 text-secondary" />
              <span className="flex-1">{m.label}</span>
              <Icon id="chevron" className="w-4 h-4 text-muted" />
            </button>
          ))}
          <button onClick={() => { setMoreOpen(false); window.location.reload(); }} className="w-full min-h-[48px] flex items-center gap-3 text-left text-[13.5px] text-secondary">
            <Icon id="home" className="w-5 h-5" />
            <span className="flex-1">Ana Menü</span>
            <Icon id="chevron" className="w-4 h-4 text-muted" />
          </button>
          <p className="text-muted text-[10.5px] leading-snug mt-3">Ana işlemler alt menüde tek dokunuşta; diğer tüm bölümler bu panelde korunur.</p>
        </div>
      </Sheet>

      {/* Aşama 4: sezon sonu sinematiği */}
      <VersionNote />
      {g.seasonFinale && (
        <div className="fixed inset-0 z-[70]">
          <SeasonFinale
            record={{ season: g.seasonFinale.season, clubId: g.seasonFinale.clubId, leagueId: g.seasonFinale.leagueId, rank: g.seasonFinale.rank, pts: g.seasonFinale.pts, cup: g.seasonFinale.cup }}
            myClub={g.myClub}
            championId={g.seasonFinale.championId}
            cupWinnerId={g.seasonFinale.cupWinnerId}
            promoted={g.seasonFinale.promoted}
            relegated={g.seasonFinale.relegated}
            champion={g.seasonFinale.champion}
            cupWon={g.seasonFinale.cupWon}
            awards={g.seasonFinale.awards ?? null}
            onDone={g.clearSeasonFinale}
          />
        </div>
      )}
    </div>
  );
};
