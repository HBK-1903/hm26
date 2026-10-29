import React, { useMemo, useState } from 'react';
import type { Player } from '../../types';
import { useGame } from '../../store/game';
import { comparisonCandidates, comparisonClubName, comparisonPositionDetails, comparisonPositionSearchText, comparisonSearchKey, comparisonValues, marketRefreshDays } from '../../data/playerComparison';
import { PlayerPortrait } from '../assets/Portrait';
import { Sheet } from '../ui/kit';

const LABELS = ['GEN', 'POT', 'Yaş', 'Maaş', 'Kondisyon', 'Doğal mevki', 'Kulüp'];

/** Local-only selection: opening or closing this desk never writes a career save. */
export const ComparisonDesk: React.FC<{ initialPlayer?: Player | null; onClose: () => void }> = ({ initialPlayer, onClose }) => {
  const g = useGame();
  const [selectedIds, setSelectedIds] = useState<[string | null, string | null]>([initialPlayer?.id ?? null, null]);
  const [selecting, setSelecting] = useState<0 | 1 | null>(initialPlayer ? 1 : 0);
  const [query, setQuery] = useState('');
  const pool = useMemo(() => comparisonCandidates({
    squads: g.squads, ownClubId: g.career.clubId, seed: g.career.seed,
    cycleNo: Math.floor(g.career.day / marketRefreshDays(g.career.settings.marketRefresh)), league: g.myLeague,
    shortlistIds: g.career.pending.marketShortlist, shortlistSnapshots: g.career.pending.marketShortlistPlayers,
    initial: initialPlayer,
  }), [g.squads, g.career.clubId, g.career.seed, g.career.day, g.career.settings.marketRefresh, g.career.pending.marketShortlist, g.career.pending.marketShortlistPlayers, g.myLeague, initialPlayer]);
  const players = selectedIds.map((id) => pool.find((player) => player.id === id) ?? null) as [Player | null, Player | null];
  const search = comparisonSearchKey(query);
  const results = useMemo(() => pool.filter((player) => {
    if (!search) return true;
    return comparisonSearchKey(`${player.name} ${comparisonClubName(player)} ${comparisonPositionSearchText(player)}`).includes(search);
  }).slice(0, 8), [pool, search]);
  const choose = (index: 0 | 1, player: Player) => {
    if (selectedIds[index === 0 ? 1 : 0] === player.id) return;
    setSelectedIds((previous) => index === 0 ? [player.id, previous[1]] : [previous[0], player.id]);
    setQuery('');
    setSelecting(index === 0 && !selectedIds[1] ? 1 : index === 1 && !selectedIds[0] ? 0 : null);
  };
  const values = players.map(comparisonValues);
  const positions = players.map(comparisonPositionDetails);

  return <Sheet open onClose={onClose} title="Oyuncu Karşılaştırma Masası" tall>
    <div data-testid="comparison-desk" className="space-y-3">
      <p className="text-secondary text-[11.5px] leading-snug">Kadron, kulüpler ve güncel piyasadan iki oyuncu seç. Değerler yalnızca görüntülenir; herhangi bir işlem yapılmaz.</p>
      <div className="grid grid-cols-2 gap-2">
        {players.map((player, index) => <div key={index} className="min-w-0 rounded-xl border border-line bg-base/80 p-2.5 text-center" data-testid={`comparison-player-${index + 1}`} data-player-id={player?.id ?? ''}>
          <div className="text-[9px] font-black tracking-wider text-amber uppercase">{index + 1}. oyuncu</div>
          {player ? <>
            <div className="flex justify-center mt-1"><PlayerPortrait player={player} size={46} /></div>
            <div className="text-primary font-bold text-[12px] leading-tight mt-1 break-words">{player.name}</div>
            <div className="text-muted text-[10px] leading-tight mt-1 break-words">{comparisonClubName(player)}</div>
          </> : <div className="min-h-[76px] flex items-center justify-center text-secondary text-[11px]">Henüz seçilmedi</div>}
          <button type="button" onClick={() => { setSelecting(index as 0 | 1); setQuery(''); }} aria-label={`${index + 1}. oyuncu ${player ? 'değiştir' : 'seç'}`}
            aria-pressed={selecting === index} className="w-full min-h-[40px] mt-2 rounded-lg border border-line bg-elevated text-amber text-[11px] font-bold">
            {player ? 'Değiştir' : 'Oyuncu seç'}
          </button>
        </div>)}
      </div>

      {selecting !== null && <section aria-label={`${selecting + 1}. oyuncu seçimi`} className="rounded-xl border border-amber/40 bg-base p-2.5">
        <label htmlFor="comparison-search" className="block text-[10px] font-black text-amber uppercase mb-1.5">{selecting + 1}. oyuncuyu bul</label>
        <input id="comparison-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={`${selecting + 1}. oyuncu ara`}
          placeholder="Oyuncu, kulüp veya mevki ara…" className="w-full min-h-[44px] rounded-lg border border-line bg-elevated px-3 text-primary text-[14px] focus:outline-none focus:border-amber" />
        <p className="text-muted text-[10px] mt-1.5">İlk 8 eşleşme gösterilir; arayarak listeyi daraltabilirsin.</p>
        <div className="mt-1" aria-label="Eşleşen oyuncular">
          {results.length === 0 && <p className="text-secondary text-[11px] py-3">Eşleşen oyuncu bulunamadı.</p>}
          {results.map((player) => {
            const alreadySelected = selectedIds[selecting === 0 ? 1 : 0] === player.id;
            return <button type="button" key={player.id} onClick={() => choose(selecting, player)} disabled={alreadySelected}
              aria-label={`${player.name} seç${alreadySelected ? ', diğer tarafta seçili' : ''}`} data-testid="comparison-candidate" data-player-id={player.id}
              className="w-full min-h-[44px] flex items-center gap-2 text-left border-t border-line/50 py-1.5 disabled:opacity-45">
              <PlayerPortrait player={player} size={30} />
              <span className="flex-1 min-w-0"><span className="block text-primary text-[11.5px] font-bold truncate">{player.name}</span><span className="block text-muted text-[10px] truncate">{comparisonClubName(player)} · {player.group}</span></span>
              <span className="text-amber text-[10px] font-bold">{alreadySelected ? 'Seçili' : 'Seç'}</span>
            </button>;
          })}
        </div>
      </section>}

      <table className="w-full table-fixed border-collapse text-center" aria-label="Oyuncu değerleri karşılaştırması" data-testid="comparison-table">
        <colgroup><col className="w-[35%]" /><col className="w-[30%]" /><col className="w-[35%]" /></colgroup>
        <thead><tr className="text-muted text-[9px] uppercase"><th className="py-2" scope="col">1. oyuncu</th><th scope="col">Ölçüt</th><th scope="col">2. oyuncu</th></tr></thead>
        <tbody>{LABELS.map((label, row) => <tr key={label} className="border-t border-line/60">
          <td className="py-2 px-0.5 text-primary font-bold text-[11px] leading-tight break-words">{values[0][row]}
            {label === 'Doğal mevki' && players[0] && <span data-testid="comparison-position-1" className="block mt-1 text-muted font-normal text-[9px]">Taraf: {positions[0].side}<br />Diğer: {positions[0].secondary}</span>}
          </td>
          <th scope="row" className="py-2 px-0.5 text-muted font-bold text-[10px] leading-tight">{label}{label === 'Maaş' && <span className="block font-normal">₺ bin/ay</span>}</th>
          <td className="py-2 px-0.5 text-primary font-bold text-[11px] leading-tight break-words">{values[1][row]}
            {label === 'Doğal mevki' && players[1] && <span data-testid="comparison-position-2" className="block mt-1 text-muted font-normal text-[9px]">Taraf: {positions[1].side}<br />Diğer: {positions[1].secondary}</span>}
          </td>
        </tr>)}</tbody>
      </table>
      <p className="text-muted text-[10px] leading-snug">— işareti, eski kayıtta ilgili bilginin bulunmadığını gösterir. Maaş aylık bin TL cinsindendir.</p>
    </div>
  </Sheet>;
};
