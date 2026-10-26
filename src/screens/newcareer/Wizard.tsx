// HM26 — UI/UX §5.3 Yeni Kariyer Sihirbazı (5 adım birebir)
import React, { useMemo, useState } from 'react';
import { Btn, Card, Badge, StatBar } from '../../components/ui/kit';
import { ManagerPortrait, MANAGER_FACE_PALETTE } from '../../components/assets/Portrait';
import { ICONS } from '../../components/icons';
import { HAIR_NAMES, EYE_NAMES, OUTFIT_NAMES, BEARD_NAMES, GLASSES_NAMES, EYE_COLORS, EYE_COLOR_NAMES, normalizeFace, presetFace } from '../../components/assets/kit';
import { ManagerFace } from '../../types';
import { Crest } from '../../components/assets/Crest';
import { StadiumArt } from '../../components/assets/Stadium';
import { CLUBS, LEAGUES, RECOMMENDED_CLUB } from '../../data/clubs';
import { genSquad } from '../../data/gen';
import { ERAS, MANAGER_BACKGROUNDS, DIFFICULTIES } from '../../data/meta';
import { Career, CareerSettings, LeagueId, ManagerDraft } from '../../types';
import { applyComfortSettings, loadLocalComfort, saveLocalComfort } from '../../utils/comfort';
import { SEED_BASE } from '../../store/game';

const STEPS = ['Menajer', 'Dünya Dönemi', 'Zorluk', 'Kulüp', 'Brifing'];

export const Wizard: React.FC<{ slot: number; onDone: (c: Career) => void; onBack: () => void }> = ({ slot, onDone, onBack }) => {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ManagerDraft>({ name: '', portrait: 0, background: null, era: 'gecis', difficulty: 'dengeli', challengePoints: 45 });
  const [clubId, setClubId] = useState<string | null>(null);
  const [leagueTab, setLeagueTab] = useState<LeagueId>('gecit');
  const [briefPhase, setBriefPhase] = useState(0); // sinematik şerit
  const [settings, setSettings] = useState<CareerSettings>(() => ({
    goalPace: 'dengeli', randomness: 'normal', marketRefresh: 'dengeli',
    boardPressure: 'orta', injuryRate: 'normal',
    textSize: 'normal', highContrast: false, reduceMotion: false,
    matchSpeed: 'normal', suggestions: true,
    ...(loadLocalComfort() ?? {}),
  }));

  const club = clubId ? CLUBS.find((c) => c.id === clubId)! : null;
  const canNext = step === 0 ? draft.name.trim().length >= 2 && draft.background !== null : step === 3 ? club !== null : true;

  const finish = () => {
    if (!club || !draft.background) return;
    const seed = (SEED_BASE + draft.portrait * 17 + club.id.length * 31 + draft.name.length * 7) >>> 0;
    saveLocalComfort(settings); applyComfortSettings(settings);
    onDone({
      slot,
      manager: { ...draft, name: draft.name.trim(), background: draft.background },
      clubId: club.id, seed, day: 1, week: 1, settings,
      pending: { marketShortlist: [], activeProject: null },
    });
  };

  return (
    <div className="h-full flex flex-col safe-t safe-b">
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <Btn variant="secondary" onClick={() => (step === 0 ? onBack() : setStep(step - 1))} className="!px-3">←</Btn>
        <div className="flex-1">
          <div className="text-primary font-bold text-[15px]">Yeni Kariyer</div>
          <div className="text-muted text-[11px]">Adım {step + 1}/5 · {STEPS[step]}</div>
        </div>
      </div>
      <div className="px-5 flex gap-1.5 pb-3">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-amber' : 'bg-line'}`} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4" key={step}>
        {step === 0 && <StepManager draft={draft} setDraft={setDraft} />}
        {step === 1 && <StepEra draft={draft} setDraft={setDraft} />}
        {step === 2 && <StepDifficulty draft={draft} setDraft={setDraft} settings={settings} setSettings={setSettings} />}
        {step === 3 && <StepClub leagueTab={leagueTab} setLeagueTab={setLeagueTab} clubId={clubId} setClubId={setClubId} />}
        {step === 4 && club && <StepBrief club={club} draft={draft} phase={briefPhase} setPhase={setBriefPhase} />}
      </div>

      <div className="px-5 pb-5 pt-2 border-t border-line/50">
        {step < 4 ? (
          <Btn variant="amber" className="w-full" onClick={() => setStep(step + 1)} disabled={!canNext}>
            {step === 3 ? 'Kulüp Brifingine Git' : 'Devam'}
          </Btn>
        ) : (
          <Btn variant="amber" className="w-full" onClick={finish}>
            Kariyeri Başlat
          </Btn>
        )}
        {step === 3 && !clubId && <p className="text-center text-[11px] text-warn mt-2">Devam için bir kulüp seç.</p>}
      </div>
    </div>
  );
};

const StepManager: React.FC<{ draft: ManagerDraft; setDraft: (d: ManagerDraft) => void }> = ({ draft, setDraft }) => (
  <div className="m26-in space-y-4">
    <div>
      <label className="text-secondary text-[12px] font-bold">Menajer Adı *</label>
      <input
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        placeholder="örn. Hasan Demir"
        className="mt-2 w-full bg-surface border border-line rounded-xl px-4 min-h-touch text-primary text-[15px] focus:outline-none focus:border-amber placeholder:text-muted"
      />
    </div>
    <div>
      <div className="flex items-center justify-between">
        <label className="text-secondary text-[12px] font-bold">Stilize Portre</label>
        <button onClick={() => setDraft({ ...draft, face: draft.face ? null : presetFace(draft.portrait ?? 0) })}
          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${draft.face ? 'bg-amber text-base border-amber' : 'bg-surface text-secondary border-line'}`}>
          {draft.face ? '✓ Özel Yüz Aktif' : 'Özel Tasarla'}
        </button>
      </div>
      {!draft.face ? (
        <div className="grid grid-cols-6 gap-2.5 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <button key={i} onClick={() => setDraft({ ...draft, portrait: i, face: null })} className={`min-h-touch min-w-touch rounded-full flex items-center justify-center ${draft.portrait === i ? 'ring-2 ring-amber ring-offset-2 ring-offset-base' : ''}`}>
              <ManagerPortrait index={i} size={52} selected={draft.portrait === i} />
            </button>
          ))}
        </div>
      ) : (
        <CharacterEditor draft={draft} setDraft={setDraft} />
      )}
    </div>
    <div>
      <label className="text-secondary text-[12px] font-bold">Menajer Geçmişi * <span className="text-muted font-normal">(etki yalnızca ilk sezonda —)</span></label>
      <div className="space-y-2 mt-2">
        {MANAGER_BACKGROUNDS.map((b) => (
          <Card key={b.id} onClick={() => setDraft({ ...draft, background: b.id })} className={draft.background === b.id ? 'border-amber' : ''}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-primary font-bold text-[14px]">{b.name}</div>
                <div className="text-secondary text-[12px] mt-0.5">{b.desc}</div>
                <div className="text-amber text-[11.5px] mt-1 leading-snug">⚑ {b.bonus}</div>
              </div>
              {draft.background === b.id && <Badge kind="ok">Seçildi</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  </div>
);

const StepEra: React.FC<{ draft: ManagerDraft; setDraft: (d: ManagerDraft) => void }> = ({ draft, setDraft }) => (
  <div className="m26-in space-y-2">
    <p className="text-secondary text-[13px] leading-snug mb-3">Dünya Dönemi kulüplerin güç dengesi ve piyasa hareketliliğini belirler. Alt parametreler Özel Kariyerde değiştirilebilir.</p>
    {ERAS.map((e) => (
      <Card key={e.id} onClick={() => setDraft({ ...draft, era: e.id })} className={draft.era === e.id ? 'border-amber' : ''}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-primary font-bold">{e.name}</div>
            <div className="text-secondary text-[12px] mt-1 leading-snug">{e.desc}</div>
          </div>
          {draft.era === e.id && <Badge kind="ok">✓</Badge>}
        </div>
      </Card>
    ))}
    <button className="w-full min-h-touch text-secondary text-[13px] underline underline-offset-2 mt-1">Gelişmiş dünya ayarını aç (Aşama 1)</button>
  </div>
);

const StepDifficulty: React.FC<{ draft: ManagerDraft; setDraft: (d: ManagerDraft) => void; settings: CareerSettings; setSettings: (s: CareerSettings) => void }> = ({ draft, setDraft, settings, setSettings }) => {
  const [open, setOpen] = useState<string | null>(null);
  const Option: React.FC<{ label: string; value: string; options: [string, string][]; onPick: (v: string) => void; locked?: boolean }> = ({ label, value, options, onPick, locked }) => (
    <div className="px-4 py-3 border-b border-line/40 last:border-0">
      <div className="flex items-center justify-between text-[13px] mb-2">
        <span className="text-primary font-semibold">{label} {locked && <span className="text-muted text-[10.5px]">🔒 kariyerde kilitli</span>}</span>
      </div>
      <div className="flex gap-1.5">
        {options.map(([v, t]) => (
          <button key={v} onClick={() => onPick(v)}
            className={`flex-1 min-h-[40px] rounded-lg text-[12px] font-bold border transition-colors ${value === v ? 'bg-amber/15 border-amber text-amber' : 'bg-base border-line text-secondary'}`}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="m26-in space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-secondary text-[12px] font-bold">Kariyer Zorluk Puanı</span>
        <span className="num text-amber text-lg font-bold">{draft.challengePoints}<span className="text-muted text-[12px]">/100</span></span>
      </div>
      <StatBar value={draft.challengePoints} color={draft.challengePoints >= 70 ? 'var(--c-danger)' : draft.challengePoints >= 45 ? 'var(--c-accent)' : 'var(--c-ok)'} />
      {DIFFICULTIES.map((d) => (
        <Card key={d.id} onClick={() => setDraft({ ...draft, difficulty: d.id, challengePoints: d.kzp })} className={draft.difficulty === d.id ? 'border-amber' : ''}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-primary font-bold text-[14px]">{d.name} {d.id === 'dengeli' && <Badge kind="info">Öneri</Badge>}</div>
              <div className="text-secondary text-[12px] mt-0.5">{d.desc}</div>
            </div>
            {draft.difficulty === d.id && <Badge kind="ok">✓</Badge>}
          </div>
        </Card>
      ))}
      {draft.difficulty === 'ozel' && (
        <div className="space-y-1.5">
          {([
            ['ikisler', 'Maç Gerçekçiliği'],
            ['dunya', '🌍 Kariyer Dünyası'],
            ['piyasa', 'Piyasa & Yönetim'],
            ['konfor', '👁 Konfor (sonradan değişir)'],
          ] as const).map(([key, title]) => (
            <div key={key} className="bg-surface border border-line rounded-xl overflow-hidden">
              <button onClick={() => setOpen(open === key ? null : key)} className="w-full px-4 min-h-touch flex items-center justify-between">
                <span className="text-[13.5px] text-primary font-semibold">{title}</span>
                <span className="text-muted">{open === key ? '▲' : '▼'}</span>
              </button>
              {open === key && (
                <div className="border-t border-line/50">
                  {key === 'ikisler' && <>
                    <Option label="Gol ritmi" value={settings.goalPace} locked options={[['dusuk', 'Düşük'], ['dengeli', 'Dengeli'], ['yuksek', 'Yüksek']]}
                      onPick={(v) => setSettings({ ...settings, goalPace: v as CareerSettings['goalPace'] })} />
                    <Option label="Maç hızı varsayılanı" value={settings.matchSpeed} options={[['yavas', 'Yavaş'], ['normal', 'Normal'], ['hizli', 'Hızlı']]}
                      onPick={(v) => setSettings({ ...settings, matchSpeed: v as CareerSettings['matchSpeed'] })} />
                  </>}
                  {key === 'dunya' && <>
                    <Option label="Şaşırtıcılık / rastgelelik" value={settings.randomness} locked options={[['low', 'Tahmin edilebilir'], ['normal', 'Dengeli'], ['high', 'Kaotik']]}
                      onPick={(v) => setSettings({ ...settings, randomness: v as CareerSettings['randomness'] })} />
                    <Option label="Sakatlık sıklığı" value={settings.injuryRate} options={[['dusuk', 'Düşük'], ['normal', 'Normal'], ['yuksek', 'Yüksek']]}
                      onPick={(v) => setSettings({ ...settings, injuryRate: v as CareerSettings['injuryRate'] })} />
                  </>}
                  {key === 'piyasa' && <>
                    <Option label="Piyasa yenilenme ritmi" value={settings.marketRefresh} options={[['sakin', 'Sakin'], ['dengeli', 'Dengeli'], ['yogun', 'Yoğun']]}
                      onPick={(v) => setSettings({ ...settings, marketRefresh: v as CareerSettings['marketRefresh'] })} />
                    <Option label="Yönetim baskısı" value={settings.boardPressure} options={[['dusuk', 'Düşük'], ['orta', 'Orta'], ['yuksek', 'Yüksek']]}
                      onPick={(v) => setSettings({ ...settings, boardPressure: v as CareerSettings['boardPressure'] })} />
                  </>}
                  {key === 'konfor' && <>
                    <Option label="Metin boyutu" value={settings.textSize} options={[['kucuk', 'Küçük'], ['normal', 'Normal'], ['buyuk', 'Büyük']]}
                      onPick={(v) => setSettings({ ...settings, textSize: v as CareerSettings['textSize'] })} />
                    <Option label="Akış önerileri" value={settings.suggestions ? 'evet' : 'hayir'} options={[['evet', 'Açık'], ['hayir', 'Kapalı']]}
                      onPick={(v) => setSettings({ ...settings, suggestions: v === 'evet' })} />
                  </>}
                </div>
              )}
            </div>
          ))}
          <p className="text-[12px] text-secondary leading-snug px-1">🔒 işaretli ayarlar kuralı gereği kariyer başladıktan sonra kilitlenir; Konfor grubu istediğinizde Ayarlar'dan değiştirilebilir.</p>
        </div>
      )}
    </div>
  );
};

// v0.4.1: kulüp seçimi filtre odakları (Hızlı seçim)
let PREVIEW_SQUADS: Record<string, { count: number; avgAge: number; foreign: number }> | null = null;
function previewSquad(club: (typeof CLUBS)[number]) {
  if (!PREVIEW_SQUADS) {
    PREVIEW_SQUADS = {};
    for (const c of CLUBS) {
      const sq = genSquad(c, 20261024); // sabit önizleme seed'i — sihirbaz bitince asıl kariyer seed'i kadroyu üretir
      const ages = sq.reduce((x, p) => x + p.age, 0) / sq.length;
      PREVIEW_SQUADS[c.id] = { count: sq.length, avgAge: Math.round(ages * 10) / 10, foreign: sq.filter((p) => p.foreign).length };
    }
  }
  return PREVIEW_SQUADS[club.id];
}

type ClubFilter = 'all' | 'rich' | 'akademi' | 'dev' | 'dusme';
const FILTERS: { v: ClubFilter; label: string; desc: string }[] = [
  { v: 'all', label: 'Tümü', desc: '' },
  { v: 'rich', label: 'Zengin Kulüpler', desc: 'En yüksek transfer bütçeli 6 kulüp' },
  { v: 'akademi', label: 'Akademi Projeleri', desc: 'Akademi seviyesi ≥3 — genç yetenek deneyimi' },
  { v: 'dev', label: 'Köklü Devler', desc: 'Güç ≥68, lig veya miras hedefli' },
  { v: 'dusme', label: 'Düşme Hattı', desc: 'Zayıf kadro + dar bütçe — zorlayıcı kariyer' },
];

const StepClub: React.FC<{ leagueTab: LeagueId; setLeagueTab: (l: LeagueId) => void; clubId: string | null; setClubId: (c: string) => void }> = ({ leagueTab, setLeagueTab, clubId, setClubId }) => {
  const [f, setF] = useState<ClubFilter>('all');
  const all = useMemo(() => CLUBS.filter((c) => c.league === leagueTab), [leagueTab]);
  const list = useMemo(() => {
    if (f === 'rich') return [...all].sort((a, b) => b.transferBudget - a.transferBudget).slice(0, 6);
    if (f === 'akademi') return all.filter((c) => c.facilities.academy >= 3);
    if (f === 'dev') return all.filter((c) => c.strength >= 68);
    if (f === 'dusme') return all.filter((c) => c.strength < 60 && c.transferBudget < all.reduce((x, c) => x + c.transferBudget, 0) / all.length && c.facilities.academy <= 2).sort((a, b) => a.strength - b.strength);
    return all;
  }, [all, f]);
  return (
    <div className="m26-in">
      <div className="flex bg-base rounded-xl p-1 gap-1 mb-3 sticky top-0 z-10">
        {(Object.keys(LEAGUES) as LeagueId[]).map((l) => (
          <button key={l} onClick={() => setLeagueTab(l)} className={`flex-1 min-h-touch rounded-lg text-[12px] font-bold ${leagueTab === l ? 'bg-elevated text-amber' : 'text-secondary'}`}>
            S{l === 'zirve' ? 1 : l === 'gecit' ? 2 : 3}
          </button>
        ))}
      </div>
      {/* Hızlı filtre odakları */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar mb-2.5 pb-0.5">
        {FILTERS.map((fl) => (
          <button key={fl.v} onClick={() => setF(fl.v)} className={`px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold border shrink-0 ${f === fl.v ? 'bg-accent text-[var(--c-on-accent)] border-transparent' : 'bg-surface text-secondary border-line'}`}>{fl.label}</button>
        ))}
      </div>
      <div className="text-[11.5px] text-muted mb-2 px-0.5">
        {LEAGUES[leagueTab].name} · {list.length} kulüp{f !== 'all' ? ` · ${FILTERS.find((x) => x.v === f)?.desc ?? ''}` : ''}
      </div>
      <div className="space-y-2.5">
        {list.map((c) => (
          <Card key={c.id} onClick={() => setClubId(c.id)} accent={c.color1} className={clubId === c.id ? 'border-amber' : ''}>
            <div className="flex items-center gap-3">
              <Crest club={c} size={44} variant="full" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-primary font-bold text-[14px] truncate">{c.name}</span>
                  {c.id === RECOMMENDED_CLUB && <Badge kind="ok">Başlangıç önerisi</Badge>}
                </div>
                <div className="text-secondary text-[11.5px] mt-0.5">{c.city} · Kuruluş {c.founded} · {c.stadium} ({(c.capacity / 1000).toFixed(0)}B)</div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                  <span className="text-muted">Güç <b className="text-primary num">{c.strength}</b></span>
                  <span className="text-muted">TB <b className="text-amber num">₺{c.transferBudget}M</b></span>
                  <span className="text-muted truncate">Hedef: <b className="text-primary">{c.boardGoal}</b></span>
                </div>
                {/* v0.4.1: mini kadro özeti */}
                {(() => { const sq = previewSquad(c); return (
                  <div className="flex items-center gap-2 mt-1 text-[10.5px] text-muted">
                    <span>👥 {sq.count} oyuncu</span>
                    <span>· Yaş ort. <b className="text-secondary num">{sq.avgAge}</b></span>
                    <span>· Yabancı <b className="text-secondary num">{sq.foreign}</b></span>
                    <span>· Akademi <b className="text-secondary num">{c.facilities.academy}/5</b></span>
                  </div>
                ); })()}
              </div>
              {clubId === c.id && <Badge kind="ok">✓</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const StepBrief: React.FC<{ club: NonNullable<ReturnType<typeof CLUBS.find>>; draft: ManagerDraft; phase: number; setPhase: (p: number) => void }> = ({ club, draft, phase, setPhase }) => (
  <div className="m26-in">
    <div className="relative rounded-card overflow-hidden border border-line">
      <StadiumArt club={club} className="w-full h-36" />
      <div className="absolute inset-0 bg-gradient-to-t from-base via-transparent to-transparent" />
      <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-end gap-2.5">
        <Crest club={club} size={50} variant="full" />
        <div className="min-w-0">
          <div className="font-display text-primary text-lg leading-tight truncate">{club.name}</div>
          <div className="text-secondary text-[11.5px]">{club.city} · {LEAGUES[club.league].name} · Est. {club.founded}</div>
        </div>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 mt-3">
      {[
        ['Kadro Gücü', `${club.strength}`, ''],
        ['Transfer Bütçesi', `₺${club.transferBudget}M`, ''],
        ['Aylık Maaş', `₺${club.wageBudget}M`, ''],
      ].map(([k, v]) => (
        <div key={k} className="bg-surface rounded-xl border border-line/60 p-2.5 text-center">
          <div className="num text-amber text-[15px] font-bold">{v}</div>
          <div className="text-muted text-[9.5px] uppercase mt-0.5">{k}</div>
        </div>
      ))}
    </div>
    <Card className="mt-3">
      <div className="text-amber text-[11px] font-bold uppercase tracking-wide">Yönetim Hedefi — 2026–27</div>
      <div className="text-primary font-bold text-[15px] mt-1">{club.boardGoal}</div>
      <p className="text-secondary text-[12.5px] leading-snug mt-2">{club.story}</p>
      <div className="flex items-center gap-4 mt-2.5 text-[11.5px] text-muted">
        <span>{club.stadium} · {club.capacity.toLocaleString('tr-TR')}</span>
        <span>T/S/A/AN: {club.facilities.training}/{club.facilities.health}/{club.facilities.academy}/{club.facilities.analysis}</span>
      </div>
    </Card>
    {/* §5.3 - 20-30sn sinematik: kısa kaydırmalı metin (sonraki kariyerde atlanabilir) */}
    <div className="mt-3 bg-elevated rounded-card border border-line p-4">
      <div className="text-[11px] text-muted uppercase tracking-wide">Sezon öncesi geçiş — {phase + 1}/3</div>
      {phase === 0 && <p className="text-[13.5px] text-primary leading-snug mt-2 m26-in">Şehir sabaha karşı {club.stadium}’ya akıyor. Gitmeyeceğim bu son maçta... Yeni sezon afişleri asılmış: “<b>{club.boardGoal}</b>”.</p>}
      {phase === 1 && <p className="text-[13.5px] text-primary leading-snug mt-2 m26-in">Basın odasında tek soru var: <b>{draft.name}</b> bu kadroyla nereye gider? Yönetim brifingi masada: sportif hedef iş güvenliğinde öndedir.</p>}
      {phase === 2 && <p className="text-[13.5px] text-primary leading-snug mt-2 m26-in">Soyunma odası sessiz. Önemli oyuncular hazır, plan defteri açık. İlk resmî maç bu hafta sonu — <b>Ana Merkez</b> seni bekliyor.</p>}
      <button onClick={() => setPhase((phase + 1) % 3)} className="mt-2.5 text-amber text-[12.5px] font-bold">Sonraki kare →</button>
    </div>
  </div>
);

// Dalga 9: özel yüz kurulum satırı — etiket + (swatch | text) seçenekleri
type FaceTab = 'hair' | 'face' | 'outfit';
const FACE_TABS: { id: FaceTab; label: string; icon: string }[] = [
  { id: 'hair', label: 'Saç', icon: 'hair' },
  { id: 'face', label: 'Yüz & Göz', icon: 'eyes' },
  { id: 'outfit', label: 'Kıyafet', icon: 'wardrobe' },
];

// v0.9.0 Karakter Atölyesi — Karakter & Simge Kiti v1 (src/components/assets/kit.ts)
const CharacterEditor: React.FC<{ draft: ManagerDraft; setDraft: (d: ManagerDraft) => void }> = ({ draft, setDraft }) => {
  const [tab, setTab] = useState<FaceTab>('hair');
  const face = normalizeFace(draft.face ?? {}) as ManagerFace;
  const change = (key: keyof ManagerFace, v: number) =>
    setDraft({ ...draft, face: ({ ...face, [key]: v, ...(key === 'beardStyle' ? { beard: v > 0 } : {}) } as ManagerFace) });
  const resetFace = () => setDraft({ ...draft, face: presetFace(draft.portrait ?? 0) as ManagerFace });
  return (
    <section className="mt-2 bg-surface border border-line rounded-xl p-3" aria-label="Karakter atölyesi">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-16 h-16 rounded-full bg-base flex items-center justify-center overflow-hidden shrink-0">
          <ManagerPortrait index={draft.portrait} size={60} face={face} selected />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-muted text-[9.5px] font-bold tracking-wider">KARAKTER ATÖLYESİ</div>
          <div className="text-primary text-[12.5px] font-bold truncate">{OUTFIT_NAMES[face.outfit ?? 0]}</div>
          <button type="button" onClick={resetFace} aria-label="Görünümü sıfırla"
            className="mt-1 inline-flex items-center gap-1 text-[10.5px] font-bold text-secondary bg-base border border-line rounded-lg px-2 py-1">
            <span className="w-3 h-3 inline-block"><ICONS.reset /></span>Görünümü sıfırla
          </button>
        </div>
      </div>
      <div className="flex gap-1.5 mb-2" role="group" aria-label="Görünüm bölümleri">
        {FACE_TABS.map((t) => {
          const Ic = ICONS[t.icon];
          return (
            <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}
              className={`flex-1 min-h-touch rounded-lg border text-[11px] font-bold flex items-center justify-center gap-1.5 ${tab === t.id ? 'border-amber bg-amber/10 text-primary' : 'border-line bg-base text-secondary'}`}>
              <span className="w-3.5 h-3.5 inline-block">{Ic && <Ic />}</span>{t.label}
            </button>
          );
        })}
      </div>
      {tab === 'hair' && (
        <div>
          <FaceRow label="Saç stili" values={[...HAIR_NAMES]} current={face.hairStyle} onPick={(v) => change('hairStyle', v)} />
          <FaceRow label="Saç rengi" swatches={[...MANAGER_FACE_PALETTE.hairColor]} current={face.hairColor} onPick={(v) => change('hairColor', v)} />
        </div>
      )}
      {tab === 'face' && (
        <div>
          <FaceRow label="Göz şekli" values={[...EYE_NAMES]} current={face.eyeStyle ?? 0} onPick={(v) => change('eyeStyle', v)} />
          <FaceRow label="Göz rengi" swatches={[...EYE_COLORS]} current={face.eyeColor ?? 0} onPick={(v) => change('eyeColor', v)} ariaNames={[...EYE_COLOR_NAMES]} />
          <FaceRow label="Ten" swatches={[...MANAGER_FACE_PALETTE.skin]} current={face.skin} onPick={(v) => change('skin', v)} />
          <FaceRow label="Sakal" values={[...BEARD_NAMES]} current={face.beardStyle ?? 0} onPick={(v) => change('beardStyle', v)} />
          <FaceRow label="Gözlük" values={[...GLASSES_NAMES]} current={face.glasses ?? 0} onPick={(v) => change('glasses', v)} />
        </div>
      )}
      {tab === 'outfit' && (
        <div>
          <FaceRow label="Kıyafet" values={[...OUTFIT_NAMES]} current={face.outfit ?? 0} onPick={(v) => change('outfit', v)} />
          <FaceRow label="Kıyafet rengi" swatches={[...MANAGER_FACE_PALETTE.suit]} current={face.suit} onPick={(v) => change('suit', v)} />
          <FaceRow label={face.outfit === 0 ? 'Kravat / vurgu' : 'Vurgu'} swatches={[...MANAGER_FACE_PALETTE.accent]} current={face.accent} onPick={(v) => change('accent', v)} />
        </div>
      )}
      <p className="text-muted text-[10px] leading-snug mt-2">Yalnızca görünüm değişir; oyuncu puanlarını ve oyun özelliklerini etkilemez. Kariyer başlatıldığında görünüm kayda alınır.</p>
    </section>
  );
};

const FaceRow: React.FC<{ label: string; values?: string[]; swatches?: string[]; current: number; onPick: (v: number) => void; ariaNames?: string[] }> = ({ label, values, swatches, current, onPick, ariaNames }) => {
  const list = (values ?? (swatches ?? [])).length;
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-line/40 last:border-0">
      <span className="text-muted text-[11px] w-16 shrink-0">{label}</span>
      <div className="flex gap-1.5 flex-1 overflow-x-auto no-scrollbar">
        {Array.from({ length: list }).map((_, i) => (
          <button key={i} onClick={() => onPick(i)} aria-label={`${label}: ${(ariaNames ?? values)?.[i] ?? `Seçenek ${i + 1}`}`} aria-pressed={current === i}
            className={`shrink-0 min-w-touch min-h-touch rounded-lg border flex items-center justify-center text-[10px] font-bold ${current === i ? 'border-amber ring-1 ring-amber' : 'border-line bg-base'}`}
            style={swatches ? { background: swatches[i] } : undefined}>
            {values ? values[i] : ''}
          </button>
        ))}
      </div>
    </div>
  );
};
