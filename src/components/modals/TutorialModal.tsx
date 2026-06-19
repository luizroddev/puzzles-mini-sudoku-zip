import { Btn } from '../../ui/atoms';
import type { GameType } from '../../core/factory';

const STEPS: Record<GameType, { title: string; steps: string[] }> = {
  sudoku: {
    title: 'How to play Mini Sudoku',
    steps: [
      'Fill every row, column and box with the digits 1–N, no repeats.',
      'Tap a cell, then tap a number to place it.',
      'Use Notes (✐) to pencil in candidates.',
      'In Classic mode you have 3 mistakes; Relaxed just highlights conflicts.',
      'Stuck? A Hint reveals one cell.',
    ],
  },
  zip: {
    title: 'How to play Zip',
    steps: [
      'Draw one continuous path that fills every cell.',
      'Start at 1 and pass through the numbers in order.',
      'Drag from cell to cell — you can back up along your own path.',
      'You cannot cross walls (the red edges) or reuse a cell.',
      'Fill the whole board in order to win.',
    ],
  },
};

export function TutorialModal({ game, onClose }: { game: GameType; onClose: () => void }) {
  const t = STEPS[game];
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.title}>
      <div className="modal col">
        <h2 className="h2">{t.title}</h2>
        <ol className="tutorial-steps">
          {t.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <Btn variant="primary" block onClick={onClose}>
          Got it
        </Btn>
      </div>
    </div>
  );
}
