/**
 * Home screen: daily challenge, continue-in-progress, play either game, and
 * access to stats / settings / how-to.
 */
import { useStore, type PlayConfig } from '../state/store';
import { dailyConfig, todayISO } from '../core/daily';
import { Btn, Pill, formatTime } from '../ui/atoms';
import type { SaveState } from '../state/models';

function saveToConfig(save: SaveState): PlayConfig {
  if (save.kind === 'sudoku') {
    return { game: 'sudoku', size: save.size, difficulty: save.difficulty, seed: save.seed, isDaily: save.isDaily };
  }
  return { game: 'zip', difficulty: save.difficulty, seed: save.seed, isDaily: save.isDaily };
}

export function Home() {
  const navigate = useStore((s) => s.navigate);
  const startGame = useStore((s) => s.startGame);
  const startDaily = useStore((s) => s.startDaily);
  const streak = useStore((s) => s.streak);
  const daily = useStore((s) => s.daily);
  const save = useStore((s) => s.currentSave);

  const today = todayISO(new Date());
  const dailyDone = daily.completed[today];
  const cfg = dailyConfig(today);
  const dailyLabel = cfg.type === 'sudoku' ? `Mini Sudoku ${cfg.size}×${cfg.size}` : 'Zip';

  return (
    <div className="screen">
      <div className="topbar">
        <h1 className="h1">Puzzles</h1>
        <div className="row">
          {streak.current > 0 && <Pill accent>🔥 {streak.current}</Pill>}
        </div>
      </div>

      {save && (
        <div className="card col">
          <div className="row">
            <strong>Continue</strong>
            <span className="spacer" />
            <Pill>{save.kind === 'sudoku' ? `Sudoku ${save.size}×${save.size}` : 'Zip'} · {formatTime(save.sec)}</Pill>
          </div>
          <Btn variant="primary" block onClick={() => startGame(saveToConfig(save))}>
            Resume game
          </Btn>
        </div>
      )}

      <button
        className="card col"
        style={{ textAlign: 'left', cursor: 'pointer', borderColor: 'var(--accent)' }}
        onClick={startDaily}
        aria-label={`Daily challenge: ${dailyLabel}`}
      >
        <div className="row">
          <strong>Daily challenge</strong>
          <span className="spacer" />
          {dailyDone ? <Pill accent>✓ {formatTime(dailyDone.timeSec)}</Pill> : <Pill>{cfg.difficulty}</Pill>}
        </div>
        <div className="muted">{dailyLabel} · {today}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {dailyDone ? 'Solved today — play again or come back tomorrow.' : 'One puzzle, everyone the same. Keep your streak alive.'}
        </div>
      </button>

      <div className="col">
        <Btn variant="primary" block onClick={() => navigate({ name: 'pregame', game: 'sudoku' })}>
          Play Mini Sudoku
        </Btn>
        <Btn variant="primary" block onClick={() => navigate({ name: 'pregame', game: 'zip' })}>
          Play Zip
        </Btn>
      </div>

      <div className="spacer" />

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <Btn variant="ghost" onClick={() => navigate({ name: 'stats' })}>📊 Stats</Btn>
        <Btn variant="ghost" onClick={() => navigate({ name: 'tutorial' })}>❔ How to play</Btn>
        <Btn variant="ghost" onClick={() => navigate({ name: 'settings' })}>⚙️ Settings</Btn>
      </div>
    </div>
  );
}
