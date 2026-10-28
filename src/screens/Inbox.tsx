// HM26 — UI/UX §5.5 Gelen Kutusu + §4.3 filtreler
import { GameIcon } from '../components/icons';
import React, { useState } from 'react';
import { useGame } from '../store/game';
import { Card, Badge, Sheet, Btn } from '../components/ui/kit';
import { Screen } from '../types';
import { INTERVIEW_INBOX_TITLE } from '../data/interview';

const KINDS = [
  ['all', 'Tümü'], ['kritik', 'Kritik'], ['transfer', 'Transfer'], ['yonetim', 'Yönetim'], ['kadro', 'Kadro'], ['lig', 'Lig Haberleri'],
] as const;
const KIND_META: Record<string, { icon: string; label: string }> = {
  kritik: { icon: 'bell', label: 'Kritik' },
  transfer: { icon: 'market', label: 'Transfer' },
  yonetim: { icon: 'club', label: 'Yönetim' },
  kadro: { icon: 'medical', label: 'Kadro' },
  lig: { icon: 'comps', label: 'Lig Haberleri' },
};

// Dalga 9: mesaj kategorisi → ilgili bölüm haritası (Şimdi İncele butonu artık navigasyon yapar)
const KIND_ROUTE: Record<string, Screen> = {
  transfer: 'market',
  kadro: 'squad',
  yonetim: 'club',
  lig: 'comps',
  kritik: 'hub',
};

export const InboxScreen: React.FC<{ go: (s: Screen) => void }> = ({ go }) => {
  const g = useGame();
  const [filter, setFilter] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);
  const msgs = g.inbox.filter((m) => filter === 'all' || m.kind === filter).sort((a, b) => (a.kind === 'kritik' ? 0 : 1) - (b.kind === 'kritik' ? 0 : 1));

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 pt-3 pb-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {KINDS.map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`shrink-0 min-h-touch px-3 rounded-xl text-[12px] font-bold border ${filter === v ? 'bg-amber text-base border-amber' : 'bg-surface text-secondary border-line'}`}>{l}{v !== 'all' ? ` (${g.inbox.filter((m) => m.kind === v).length})` : ''}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-6 space-y-2">
        {msgs.map((m) => (
          <Card key={m.id} onClick={() => { setOpen(m.id); g.setInbox((ms) => ms.map((x) => (x.id === m.id ? { ...x, read: true } : x))); }} className={`!p-3 ${!m.read ? 'border-l-2 border-l-amber' : ''}`}>
            <div className="flex items-start gap-2.5">
              <span className="w-4.5 h-4.5 w-[18px] h-[18px] inline-block text-secondary"><GameIcon id={(KIND_META[m.kind]?.icon as string) as string} className="w-full h-full" /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className={`text-[13.5px] font-bold truncate ${m.read ? 'text-secondary' : 'text-primary'}`}>{m.title}</div>
                  <div className="text-muted text-[10px] shrink-0 num">G{m.day}</div>
                </div>
                <p className="text-secondary text-[12px] line-clamp-2 mt-0.5 leading-snug">{m.body}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge kind={m.kind === 'kritik' ? 'danger' : 'muted'}>{KIND_META[m.kind]?.label}</Badge>
                  {!m.read && <Badge kind="warn">Okunmadı</Badge>}
                </div>
              </div>
            </div>
          </Card>
        ))}
        {msgs.length === 0 && <div className="text-center text-secondary text-[13px] py-10">Bu kategoride mesaj yok.</div>}
        <Card className="!p-3.5 border-amber/30 bg-amber/5">
          <div className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber/10 text-amber border border-amber/20 flex items-center justify-center shrink-0"><GameIcon id="news" className="w-4 h-4" /></span>
            <div className="flex-1 min-w-0">
              <div className="text-primary text-[13px] font-bold">Basın Odası · Saha Defteri</div>
              <p className="text-secondary text-[11.5px] leading-snug mt-1">Gelen iletilerden ayrı olarak teyitli manşetler, lig nabzı, haftanın 11’i ve hakem raporlarına göz at.</p>
              <Btn variant="amber" className="mt-2 !min-h-[38px] !text-[11.5px]" onClick={() => go('newsroom')}>Basın Odasına Git →</Btn>
            </div>
          </div>
        </Card>
      </div>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? g.inbox.find((m) => m.id === open)?.title ?? '' : ''}>
        {open && (() => {
          const m = g.inbox.find((x) => x.id === open)!;
          return (
            <div className="m26-in">
              <div className="flex items-center gap-2 mb-2.5"><Badge kind={m.kind === 'kritik' ? 'danger' : 'info'}>{KIND_META[m.kind]?.label}</Badge><span className="text-muted text-[11px] num">Gün {m.day}</span></div>
              <p className="text-primary/95 text-[13.5px] leading-relaxed">{m.body}</p>
              <div className="grid grid-cols-2 gap-2 mt-5">
                <Btn variant="secondary" onClick={() => setOpen(null)}>Sonra Hatırlat</Btn>
                <Btn variant="amber" onClick={() => { setOpen(null); go(m.title === INTERVIEW_INBOX_TITLE ? 'newsroom' : (KIND_ROUTE[m.kind] ?? 'hub')); }}>İlgili Bölüme Git →</Btn>
              </div>
            </div>
          );
        })()}
      </Sheet>
    </div>
  );
};
