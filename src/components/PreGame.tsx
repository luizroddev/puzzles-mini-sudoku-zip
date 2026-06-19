/**
 * Pre-game setup: pick difficulty (both games), board size + error mode (sudoku),
 * then start with a fresh random seed.
 */
import { useState } from 'react';
import { useStore, type PlayConfig } from '../state/store';
import type { GameType, SudokuSize } from '../core/factory';
import type { SudokuDifficulty, SudokuErrorMode, ZipDifficulty } from '../core/types';
import { Btn, Segmented } from '../ui/atoms';

function randomSeed(): number {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      return crypto.getRandomValues(new Uint32Array(1))[0]! & 0x7fffffff;
    }
  } catch {
    /* fall through */
  }
  return Math.floor(Math.random() * 0x7fffffff);
}

const DIFFS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
] as const;

export function PreGame({ game }: { game: GameType }) {
  const goHome = useStore((s) => s.goHome);
  const startGame = useStore((s) => s.startGame);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const [difficulty, setDifficulty] = useState<SudokuDifficulty | ZipDifficulty>('easy');
  const [size, setSize] = useState<SudokuSize>(4);
  const [errorMode, setErrorMode] = useState<SudokuErrorMode>(settings.errorMode);

  const start = () => {
    if (game === 'sudoku') updateSettings({ errorMode });
    const config: PlayConfig = {
      game,
      size: game === 'sudoku' ? size : undefined,
      difficulty,
      seed: randomSeed(),
      isDaily: false,
    };
    startGame(config);
  };

  return (
    <div className="screen">
      <div className="topbar">
        <Btn variant="ghost" onClick={goHome} aria-label="Back">←</Btn>
        <div className="title">{game === 'sudoku' ? 'Mini Sudoku' : 'Zip'}</div>
        <span style={{ width: 44 }} />
      </div>

      <div className="card col">
        <span className="muted">Difficulty</span>
        <Segmented
          ariaLabel="Difficulty"
          value={difficulty}
          options={DIFFS as unknown as { value: typeof difficulty; label: string }[]}
          onChange={setDifficulty}
        />
      </div>

      {game === 'sudoku' && (
        <>
          <div className="card col">
            <span className="muted">Board size</span>
            <Segmented
              ariaLabel="Board size"
              value={String(size) as '4' | '6'}
              options={[
                { value: '4', label: '4 × 4' },
                { value: '6', label: '6 × 6' },
              ]}
              onChange={(v) => setSize(Number(v) as SudokuSize)}
            />
          </div>
          <div className="card col">
            <span className="muted">Mistakes</span>
            <Segmented
              ariaLabel="Error mode"
              value={errorMode}
              options={[
                { value: 'relaxed', label: 'Relaxed' },
                { value: 'classic', label: 'Classic' },
                { value: 'noHelp', label: 'No help' },
              ]}
              onChange={setErrorMode}
            />
            <span className="muted" style={{ fontSize: 13 }}>
              {errorMode === 'relaxed' && 'Conflicts are highlighted, no limit.'}
              {errorMode === 'classic' && '3 mistakes and the game ends.'}
              {errorMode === 'noHelp' && 'No hints about mistakes until the end.'}
            </span>
          </div>
        </>
      )}

      <div className="spacer" />
      <Btn variant="primary" block onClick={start}>
        Start
      </Btn>
    </div>
  );
}
