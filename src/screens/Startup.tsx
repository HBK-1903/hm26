// HM26 — UI/UX §5.1 Açılış + §5.2 Kariyer Yuvaları (Aşama 1: IndexedDB kalıcı slotlar)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Btn, Card, Sheet, useToast } from '../components/ui/kit';
import { Crest } from '../components/assets/Crest';
import { clubById, clubByIdSafe } from '../data/clubs';
import { ERAS } from '../data/meta';
import { listSaves, readSave, deleteSave, exportSaveFile, parseImportFile, writeSave, exportFileName, SaveMeta } from '../store/persist';
import { SaveBlob } from '../store/persist';
import { APP_VERSION } from '../version';

export const Splash: React.FC<{ onContinue: () => void; onQuickContinue?: (slot: number) => void; quick?: { slot: number; label: string } | null }> = ({ onContinue, onQuickContinue, quick }) => (
  <div className="h-full relative overflow-hidden safe-t safe-b" style={{ background: '#04070B' }}>
    {/* v0.6.6: tam ekran sinematik kapak — metin/çip blokları kaldırıldı, görsel konuşuyor */}
    <img
      src="/splash-cover.webp"
      alt="HM26 — tünelden sahaya bakan menajer"
      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
      style={{ objectPosition: 'center 30%' }}
      draggable={false}
    />
    {/* Buton okunabilirliği için alt bölge koyu geçiş */}
    <div className="absolute inset-x-0 bottom-0 h-64 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(4,7,11,0) 0%, rgba(4,7,11,0.55) 45%, rgba(4,7,11,0.92) 100%)' }} />
    <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
      {quick && onQuickContinue && (
        <Btn variant="amber" className="w-full mb-2" onClick={() => onQuickContinue(quick.slot)}>▶ Devam Et — {quick.label}</Btn>
      )}
      <Btn variant={quick ? 'secondary' : 'amber'} className="w-full" onClick={onContinue}>{quick ? 'Kayıt Yuvaları' : 'Başla'}</Btn>
      <p className="text-center text-[11px] text-muted mt-3">v{APP_VERSION} · 36 kulüp · 3 lig · Tamamen offline</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// Kariyer Yuvaları — §5.2 birebir: liste, 3 slot, yeni başlatma, silme ≤2 adım onay, dışa/içe aktarma (§5.17)
// ─────────────────────────────────────────────
export const CareerSlots: React.FC<{
  onNew: (slot: number) => void;
  onContinue: (slot: number, blob: SaveBlob) => void;
  onBack: () => void;
}> = ({ onNew, onContinue, onBack }) => {
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuSlot, setMenuSlot] = useState<SaveMeta | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SaveMeta | null>(null);
  const { show, ToastView } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const importTarget = useRef<number>(1);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setSaves(await listSaves()); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const continueSlot = async (slot: number) => {
    const r = await readSave(slot).catch((e: Error) => { show(e.message, 'warn'); return null; });
    if (!r) { show('Bu yuvada kayıt bulunamadı.', 'warn'); return; }
    onContinue(slot, r.blob);
  };

  const doExport = async (slot: number) => {
    const r = await readSave(slot);
    if (!r) return;
    const blob = exportSaveFile(r.blob, r.meta);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportFileName(r.meta.clubName || clubById(r.blob.career.clubId).name, r.blob.career.day);
    a.click();
    URL.revokeObjectURL(url);
    show('Kariyer dosyası indirildi (tek dosya).', 'ok');
  };

  const doImport = async (file: File) => {
    try {
      const text = await file.text();
      const { blob } = parseImportFile(text);
      const target = importTarget.current;
      const existing = saves.find((s) => s.slot === target);
      if (existing) { show(`Yuva ${target} dolu — önce sil veya boş yuva seç.`, 'warn'); return; }
      blob.career = { ...blob.career, slot: target };
      await writeSave(blob);
      show(`İçe aktarıldı → Yuva ${target}.`, 'ok');
      await refresh();
    } catch (e) {
      show(e instanceof Error ? e.message : 'Dosya okunamadı.', 'warn');
    }
  };

  const doDelete = async (slot: number) => {
    await deleteSave(slot);
    setConfirmDelete(null);
    show(`Yuva ${slot} kalıcı olarak silindi.`, 'ok');
    await refresh();
  };

  const meta = (slot: number) => saves.find((s) => s.slot === slot);
  const clubNameOf = (m: SaveMeta) => m.clubName?.trim() || clubByIdSafe(m.clubId)?.name || 'Kulüp';

  return (
    <div className="h-full flex flex-col safe-t safe-b">
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <Btn variant="secondary" onClick={onBack} className="!px-3">←</Btn>
        <div className="flex-1">
          <h1 className="font-display text-2xl text-primary">Kariyerler</h1>
          <div className="text-muted text-[11px]">3 bağımsız yuva · kayıtlar yalnızca bu cihazda</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6 space-y-3">
        {loading && <p className="text-muted text-sm text-center pt-8">Kayıtlar okunuyor…</p>}
        {!loading && [1, 2, 3].map((slot) => {
          const m = meta(slot);
          if (!m) {
            const empty = (
              <Card key={slot} onClick={() => onNew(slot)} className="border-dashed border-line/80">
                <div className="flex items-center justify-center gap-2 py-3 text-secondary">
                  <span className="text-xl">＋</span><span className="font-bold text-sm">Yeni Kariyer — Yuva {slot}</span>
                </div>
              </Card>
            );
            return (
              <div key={slot}>
                {empty}
                <div className="mt-1.5 flex justify-end">
                  <button className="text-[11px] text-muted underline underline-offset-2"
                    onClick={() => { importTarget.current = slot; fileRef.current?.click(); }}>
                    Buraya dosya içe aktar
                  </button>
                </div>
              </div>
            );
          }
          const c = clubById(m.clubId);
          return (
            <Card key={slot} accent={c.color1}>
              <div className="flex items-center gap-3">
                <Crest club={c} size={46} />
                <div className="flex-1 min-w-0">
                  <div className="text-primary font-bold truncate">{clubNameOf(m)}</div>
                  <div className="text-secondary text-[12px] mt-0.5">{m.season} · {m.day}. Gün · {ERAS.find((e) => e.id === m.eraName)?.name ?? m.eraName} · KZP {m.kzp}</div>
                  <div className="text-muted text-[11px] mt-0.5">
                    {m.managerName} · Son kayıt: {new Date(m.updatedAt).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button aria-label={`Yuva ${slot} yönet menüsü`} onClick={(e) => { e.stopPropagation(); setMenuSlot(m); }}
                  className="shrink-0 min-w-touch min-h-touch rounded-lg border border-line bg-surface text-secondary text-lg font-bold flex items-center justify-center">⋯</button>
              </div>
              <div className="mt-2.5 flex gap-2">
                <Btn variant="amber" className="flex-1 !min-h-[40px]" onClick={() => void continueSlot(slot)}>Devam Et</Btn>
                <button aria-label={`Yuva ${slot} kariyerini sil`} title="Kariyeri sil" onClick={(e) => { e.stopPropagation(); setConfirmDelete(m); }}
                  className="shrink-0 min-w-touch min-h-touch rounded-xl border border-danger/50 text-danger text-[15px] font-bold flex items-center justify-center bg-danger/5 active:scale-[0.96] transition-transform">🗑</button>
              </div>
            </Card>
          );
        })}
        <p className="text-[11px] text-muted leading-snug px-1">Her yuva kartında Devam Et / arşive taşımak için ⋯ menüsü (Dışa Aktar) / silmek için 🗑 (iki aşamalı onay) vardır. Dosya başka cihaza taşınabilir; aynı sürüm kuralı korunur.</p>
      </div>

      <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ''; }} />

      {/* Yönet menüsü */}
      <Sheet open={!!menuSlot} onClose={() => setMenuSlot(null)} title={menuSlot ? `Yuva ${menuSlot.slot} — ${clubNameOf(menuSlot)}` : ''}>
        {menuSlot && (
          <div className="space-y-2">
            <Btn variant="secondary" className="w-full justify-start" onClick={() => { void doExport(menuSlot.slot); setMenuSlot(null); }}>📤 Dışa Aktar — tek JSON dosyası</Btn>
            <Btn variant="secondary" className="w-full justify-start text-danger" onClick={() => { setConfirmDelete(menuSlot); setMenuSlot(null); }}>🗑 Kariyeri Sil</Btn>
            <Btn variant="secondary" className="w-full" onClick={() => setMenuSlot(null)}>Vazgeç</Btn>
          </div>
        )}
      </Sheet>

      {/* İki aşamalı silme onayı */}
      <Sheet open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Silme Onayı (2/2)">
        {confirmDelete && (
          <div className="space-y-3">
            <p className="text-secondary text-sm leading-relaxed">
              <b className="text-primary">{clubNameOf(confirmDelete)}</b> kariyeri kalıcı silinecek. Bu işlem geri alınamaz; ihtiyaç varsa önce dışa aktar.
            </p>
            <Btn variant="danger" className="w-full" onClick={() => void doDelete(confirmDelete.slot)}>Evet, Kalıcı Olarak Sil</Btn>
            <Btn variant="secondary" className="w-full" onClick={() => setConfirmDelete(null)}>Vazgeç</Btn>
          </div>
        )}
      </Sheet>
      {ToastView}
    </div>
  );
};
