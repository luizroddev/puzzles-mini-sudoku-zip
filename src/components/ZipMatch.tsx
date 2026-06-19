/**
 * Zip match screen. Pointer drag builds the path (with straight-line
 * interpolation so fast drags don't skip cells); arrow keys offer a keyboard
 * alternative. Renders the path as an SVG overlay and walls as red edges.
 */
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { buildZip } from '../core/factory';
import type { ZipDifficulty } from '../core/types';
import { wallKey, expectedNext } from '../core/zip';
import { useStore, type PlayConfig } from '../state/store';
import type { ZipSave } from '../state/models';
import { useStopwatch } from '../ui/useStopwatch';
import { Btn, ToolBtn, formatTime } from '../ui/atoms';
import { WinModal } from './modals/WinModal';
import { PauseModal } from './modals/PauseModal';
import { initZip, reduceZip, type ZipAction, type ZipCtx } from './zipReducer';
import { playTone, haptic } from '../audio/feedback';
import { track } from '../analytics/track';

export function ZipMatch({ config, resume }: { config: PlayConfig; resume?: ZipSave }) {
  const settings = useStore((s) => s.settings);
  const setSave = useStore((s) => s.setSave);
  const finishMatch = useStore((s) => s.finishMatch);
  const goHome = useStore((s) => s.goHome);

  const puzzle = useMemo(
    () => buildZip(config.difficulty as ZipDifficulty, config.seed),
    [config.difficulty, config.seed],
  );
  const { N } = puzzle;
  const ctx: ZipCtx = useMemo(() => ({ puzzle }), [puzzle]);

  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof initZip>, a: ZipAction) => reduceZip(s, a, ctx),
    resume ? initZip(ctx, { path: resume.path, hints: resume.hints, undoCount: resume.undoCount }) : initZip(ctx),
  );

  const running = state.status === 'Playing';
  const [sec] = useStopwatch(running, resume?.sec ?? 0);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const finished = useRef(false);
  const prevLen = useRef(state.path.length);

  // Feedback on path growth / shake.
  useEffect(() => {
    if (state.path.length > prevLen.current) {
      playTone('tap', settings.sound);
      haptic(8, settings.haptics);
    }
    prevLen.current = state.path.length;
  }, [state.path.length, settings.sound, settings.haptics]);

  useEffect(() => {
    if (state.shake != null) {
      playTone('error', settings.sound);
      haptic([0, 30], settings.haptics);
      const t = setTimeout(() => dispatch({ type: 'clearShake' }), 240);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [state.shake, settings.sound, settings.haptics]);

  const prevStatus = useRef(state.status);
  useEffect(() => {
    if (prevStatus.current === state.status) return;
    prevStatus.current = state.status;
    if (state.status === 'Won' && !finished.current) {
      finished.current = true;
      playTone('win', settings.sound);
      haptic([0, 60, 40, 80], settings.haptics);
      void finishMatch({
        game: 'zip',
        difficulty: config.difficulty,
        seed: config.seed,
        timeSec: sec,
        errors: 0,
        hints: state.hints,
        won: true,
        isDaily: config.isDaily,
        dateISO: config.dateISO,
        path: state.path,
      });
    }
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave.
  useEffect(() => {
    if (state.status !== 'Playing' && state.status !== 'Paused') return;
    const save: ZipSave = {
      kind: 'zip',
      difficulty: config.difficulty as ZipDifficulty,
      seed: config.seed,
      isDaily: config.isDaily,
      path: state.path,
      hints: state.hints,
      undoCount: state.undoCount,
      sec,
    };
    setSave(save);
  }, [state.path, state.hints, sec]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.status !== 'Playing') return;
      const map: Record<string, ZipAction> = {
        ArrowUp: { type: 'step', dir: 'up' },
        ArrowDown: { type: 'step', dir: 'down' },
        ArrowLeft: { type: 'step', dir: 'left' },
        ArrowRight: { type: 'step', dir: 'right' },
        Backspace: { type: 'undo' },
      };
      const a = map[e.key];
      if (a) {
        e.preventDefault();
        dispatch(a);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.status]);

  const cellFromPoint = (clientX: number, clientY: number): number | null => {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
    const c = Math.min(N - 1, Math.floor((x / rect.width) * N));
    const r = Math.min(N - 1, Math.floor((y / rect.height) * N));
    return r * N + c;
  };

  // Move toward a target with straight-line interpolation (PRD §8).
  const moveToward = (target: number) => {
    const head = state.path[state.path.length - 1];
    if (head == null) {
      dispatch({ type: 'enter', cell: target });
      return;
    }
    const hr = Math.floor(head / N);
    const hc = head % N;
    const tr = Math.floor(target / N);
    const tc = target % N;
    if (hr === tr) {
      const dir = tc > hc ? 1 : -1;
      for (let c = hc + dir; dir > 0 ? c <= tc : c >= tc; c += dir) dispatch({ type: 'enter', cell: hr * N + c });
    } else if (hc === tc) {
      const dir = tr > hr ? 1 : -1;
      for (let r = hr + dir; dir > 0 ? r <= tr : r >= tr; r += dir) dispatch({ type: 'enter', cell: r * N + tc });
    } else {
      dispatch({ type: 'enter', cell: target });
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (state.status !== 'Playing') return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell == null) return;
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dispatch({ type: 'enter', cell });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || state.status !== 'Playing') return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (cell != null) moveToward(cell);
  };
  const endDrag = () => {
    dragging.current = false;
  };

  const pathSet = useMemo(() => new Set(state.path), [state.path]);
  const next = expectedNext(puzzle.checkpoints, state.path);

  const cellPct = 100 / N;
  const center = (cell: number) => {
    const r = Math.floor(cell / N);
    const c = cell % N;
    return { x: (c + 0.5) * cellPct, y: (r + 0.5) * cellPct };
  };
  const pathD = state.path
    .map((cell, i) => {
      const { x, y } = center(cell);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  const handleExit = () => {
    if (state.status === 'Playing' || state.status === 'Paused') track('game_abandon', { game: 'zip' });
    goHome();
  };

  return (
    <div className="screen">
      <div className="topbar">
        <Btn variant="ghost" onClick={handleExit} aria-label="Back to home">
          ←
        </Btn>
        <div className="title">Zip · {N}×{N}</div>
        <div className="row" style={{ gap: 8 }}>
          <span className="pill" aria-label={`Next number ${next}`}>→ {next}</span>
          {settings.showTimer && <span className="pill">{formatTime(sec)}</span>}
          <Btn variant="ghost" onClick={() => dispatch({ type: 'pause' })} aria-label="Pause">
            ⏸
          </Btn>
        </div>
      </div>

      <div className="board-wrap">
        <div
          ref={boardRef}
          className="zip"
          style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
          role="application"
          aria-label={`Zip board, draw a path, next number ${next}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {Array.from({ length: N * N }, (_, i) => {
            const cp = puzzle.checkpoints[i];
            return (
              <div key={i} className={`zcell ${pathSet.has(i) ? 'on' : ''}`}>
                {cp !== undefined && (
                  <div className={`cp ${cp === next ? 'next' : ''}`} aria-label={`Checkpoint ${cp}`}>
                    {cp}
                  </div>
                )}
              </div>
            );
          })}

          <svg className="zip-path" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d={pathD} style={{ strokeWidth: cellPct * 0.34 }} />
          </svg>

          {[...puzzle.walls].map((key) => {
            const [a, b] = key.split('-').map(Number) as [number, number];
            const lo = Math.min(a, b);
            const horizontalNeighbors = Math.abs(a - b) === 1;
            const r = Math.floor(lo / N);
            const c = lo % N;
            const style: React.CSSProperties = horizontalNeighbors
              ? { left: `${(c + 1) * cellPct}%`, top: `${r * cellPct}%`, width: 4, height: `${cellPct}%`, transform: 'translateX(-50%)' }
              : { left: `${c * cellPct}%`, top: `${(r + 1) * cellPct}%`, width: `${cellPct}%`, height: 4, transform: 'translateY(-50%)' };
            return <div key={key} className="wall" style={style} aria-hidden />;
          })}
        </div>
      </div>

      <div className="bottombar">
        <ToolBtn icon="↺" label="Undo" disabled={!state.path.length} onClick={() => dispatch({ type: 'undo' })} />
        <ToolBtn icon="✕" label="Clear" disabled={!state.path.length} onClick={() => dispatch({ type: 'reset' })} />
        <ToolBtn icon="💡" label="Hint" onClick={() => dispatch({ type: 'hint' })} />
        <span className="pill">{state.path.length}/{N * N} cells</span>
      </div>

      {state.status === 'Paused' && (
        <PauseModal
          onResume={() => dispatch({ type: 'resume' })}
          onRestart={() => dispatch({ type: 'reset' })}
          onQuit={handleExit}
        />
      )}
      {state.status === 'Won' && (
        <WinModal
          game="zip"
          difficulty={config.difficulty}
          seed={config.seed}
          timeSec={sec}
          hints={state.hints}
          isDaily={config.isDaily}
          onHome={goHome}
        />
      )}
    </div>
  );
}

export { wallKey };
