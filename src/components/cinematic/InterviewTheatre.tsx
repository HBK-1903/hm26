import React from 'react';
import type { Club, ManagerFace } from '../../types';
import { Crest } from '../assets/Crest';
import { presetFace } from '../assets/kit';
import { CinematicPuppet } from '../transfer/TransferTheatre';
import { useCinematicShot, type CameraCue } from './Cinematic';
import './interviewTheatre.css';

export const InterviewTheatre: React.FC<{
  home: Club; away: Club; homeGoals: number; awayGoals: number;
  manager: { name: string; portrait: number; face?: ManagerFace | null };
  speaking: 'reporter' | 'manager' | null;
  cameraCue: CameraCue;
}> = ({ home, away, homeGoals, awayGoals, manager, speaking, cameraCue }) => {
  const shot = useCinematicShot(cameraCue);
  return <div className="interview-theatre" data-testid="interview-theatre" data-shot={shot} data-speaking={speaking ?? 'none'}
    aria-label={`Maç sonu tüneli: ${home.name} ${homeGoals}–${awayGoals} ${away.name}`}>
    <div className="interview-theatre__world">
      <div className="interview-theatre__lights" aria-hidden="true" />
      <div className="interview-theatre__actors">
        <div className="interview-theatre__person">
          <CinematicPuppet face={manager.face ?? presetFace(manager.portrait)} talking={speaking === 'manager'} label={manager.name || 'Menajer'} side="manager" />
          <span>MENAJER</span>
        </div>
        <div className="interview-theatre__microphone" aria-hidden="true"><i /><b /></div>
        <div className="interview-theatre__person">
          <CinematicPuppet face={presetFace(4)} talking={speaking === 'reporter'} label="Muhabir" side="opponent" />
          <span>MUHABİR</span>
        </div>
      </div>
    </div>
    <div className="interview-theatre__heading"><div><span>MAÇ SONU · YAYIN</span><strong>{home.stadium}</strong></div><b>FLASH</b></div>
    <div className="interview-theatre__score" aria-label={`Maç sonucu ${home.name} ${homeGoals}, ${away.name} ${awayGoals}`}>
      <Crest club={home} size={26} /><strong>{homeGoals}–{awayGoals}</strong><Crest club={away} size={26} />
    </div>
    <div className="interview-theatre__foot" aria-hidden="true" />
  </div>;
};
