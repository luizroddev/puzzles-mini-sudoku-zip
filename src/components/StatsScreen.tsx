/**
 * Stats screen: per-game totals, win rate, best times per difficulty, streak.
 */
import { useStore } from '../state/store';
import { Btn, formatTime } from '../ui/atoms';
import type { GameStats } from '../state/models';
import type { GameType } from '../core/factory';

const DIFFS = ['easy', 'medium', 'hard', 'expert'] as const;

function GameCard({ title, g }: { title: string; g: GameStats }) {
  const winRate = g.played ? Math.round((g.won / g.played) * 100) : 0;
  return (
    <div className="card col">
      <h2 className="h2">{title}</h2>
      <div className="stat-grid">
        <div className="stat"><div className="v">{g.played}</div><div className="k">Played</div></div>
        <div className="stat"><div className="v">{g.won}</div><div className="k">Won</div></div>
        <div className="stat"><div className="v">{winRate}%</div><div className="k">Win rate</div></div>
        <div className="stat"><div className="v">{formatTime(g.totalTimeSec)}</div><div className="k">Time played</div></div>
      </div>
      <div className="col" style={{ gap: 4 }}>
        {DIFFS.map((d) => (
          <div key={d} className="leader">
            <span style={{ textTransform: 'capitalize' }}>{d}</span>
            <span>{g.best[d] != null ? formatTime(g.best[d]!) : '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsScreen() {
  const goHome = useStore((s) => s.goHome);
  const stats = useStore((s) => s.stats);
  const streak = useStore((s) => s.streak);

  const titles: Record<GameType, string> = { sudoku: 'Mini Sudoku', zip: 'Zip' };

  return (
    <div className="screen">
      <div className="topbar">
        <Btn variant="ghost" onClick={goHome} aria-label="Back">←</Btn>
        <div className="title">Stats</div>
        <span style={{ width: 44 }} />
      </div>

      <div className="card row">
        <div className="stat grow"><div className="v">🔥 {streak.current}</div><div className="k">Current streak</div></div>
        <div className="stat grow"><div className="v">🏆 {streak.best}</div><div className="k">Best streak</div></div>
      </div>

      <GameCard title={titles.sudoku} g={stats.sudoku} />
      <GameCard title={titles.zip} g={stats.zip} />
    </div>
  );
}
