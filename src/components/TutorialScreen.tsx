import { useState } from 'react';
import { useStore } from '../state/store';
import { Btn, Segmented } from '../ui/atoms';
import type { GameType } from '../core/factory';
import { TutorialModal } from './modals/TutorialModal';

export function TutorialScreen() {
  const goHome = useStore((s) => s.goHome);
  const [game, setGame] = useState<GameType>('sudoku');
  return (
    <div className="screen">
      <div className="topbar">
        <Btn variant="ghost" onClick={goHome} aria-label="Back">←</Btn>
        <div className="title">How to play</div>
        <span style={{ width: 44 }} />
      </div>
      <div className="card col">
        <Segmented
          ariaLabel="Game"
          value={game}
          options={[
            { value: 'sudoku', label: 'Mini Sudoku' },
            { value: 'zip', label: 'Zip' },
          ]}
          onChange={setGame}
        />
      </div>
      <TutorialModal game={game} onClose={goHome} />
    </div>
  );
}
