import { useEffect, useState } from 'react';
import { Btn, formatTime } from '../../ui/atoms';
import { useStore } from '../../state/store';
import { getLeaderboard, type LeaderboardEntry } from '../../api/client';
import type { GameType, SudokuSize } from '../../core/factory';

export function WinModal({
  game,
  difficulty,
  size,
  seed,
  timeSec,
  hints,
  isDaily,
  onHome,
}: {
  game: GameType;
  difficulty: string;
  size?: SudokuSize;
  seed: number;
  timeSec: number;
  hints: number;
  isDaily: boolean;
  onHome: () => void;
}) {
  const streak = useStore((s) => s.streak);
  const stats = useStore((s) => s.stats);
  const best = stats[game].best[difficulty];
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    let alive = true;
    void getLeaderboard({ type: game, difficulty, ...(isDaily ? { daily: 'today' } : {}) }).then((b) => {
      if (alive) setBoard(b);
    });
    return () => {
      alive = false;
    };
  }, [game, difficulty, isDaily]);

  const title = game === 'sudoku' ? `Mini Sudoku ${size}×${size}` : 'Zip';
  const shareText = `${isDaily ? 'Daily ' : ''}${title} (${difficulty}) solved in ${formatTime(timeSec)}${hints ? ` · ${hints} hints` : ''} 🧩`;

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setShared(true);
        setTimeout(() => setShared(false), 1500);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Solved">
      <div className="modal col">
        <div className="center">
          <div style={{ fontSize: 44 }} aria-hidden>
            🎉
          </div>
          <h2 className="h2">Solved!</h2>
          <p className="muted">{title} · {difficulty}{isDaily ? ' · Daily' : ''}</p>
        </div>

        <div className="stat-grid">
          <div className="stat" style={{ animationDelay: '40ms' }}>
            <div className="v">{formatTime(timeSec)}</div>
            <div className="k">Time</div>
          </div>
          <div className="stat" style={{ animationDelay: '120ms' }}>
            <div className="v">{best != null ? formatTime(best) : formatTime(timeSec)}</div>
            <div className="k">Best</div>
          </div>
          <div className="stat" style={{ animationDelay: '200ms' }}>
            <div className="v">{hints}</div>
            <div className="k">Hints</div>
          </div>
          <div className="stat" style={{ animationDelay: '280ms' }}>
            <div className="v">{isDaily ? `🔥 ${streak.current}` : seed.toString(36).slice(0, 4)}</div>
            <div className="k">{isDaily ? 'Day streak' : 'Seed'}</div>
          </div>
        </div>

        {board && board.length > 0 && (
          <div className="card" style={{ padding: 12 }}>
            <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Leaderboard</div>
            {board.slice(0, 5).map((e) => (
              <div key={e.rank} className={`leader ${e.isMe ? 'me' : ''}`}>
                <span>#{e.rank} {e.name}</span>
                <span>{formatTime(e.timeSec)}</span>
              </div>
            ))}
          </div>
        )}

        <Btn variant="primary" block onClick={share}>
          {shared ? 'Copied!' : 'Share result'}
        </Btn>
        <Btn variant="ghost" block onClick={onHome}>
          Home
        </Btn>
      </div>
    </div>
  );
}
