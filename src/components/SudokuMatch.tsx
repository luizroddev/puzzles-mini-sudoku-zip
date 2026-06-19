/**
 * Sudoku match screen. Owns match state via the pure reducer and wires it to the
 * board, number pad, toolbar, timer, autosave and end-of-game modals.
 */
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { buildSudoku, type SudokuSize } from '../core/factory';
import { SPEC_4, SPEC_6, peers as peersOf, findConflicts } from '../core/sudoku';
import type { SudokuDifficulty } from '../core/types';
import { useStore, type PlayConfig } from '../state/store';
import type { SudokuSave } from '../state/models';
import { useStopwatch } from '../ui/useStopwatch';
import { Btn, ToolBtn, formatTime } from '../ui/atoms';
import { NumberPad } from './NumberPad';
import { WinModal } from './modals/WinModal';
import { FailModal } from './modals/FailModal';
import { PauseModal } from './modals/PauseModal';
import {
  initSudoku,
  reduceSudoku,
  type SudokuAction,
  type SudokuCtx,
} from './sudokuReducer';
import { playTone, haptic } from '../audio/feedback';
import { track } from '../analytics/track';

export function SudokuMatch({ config, resume }: { config: PlayConfig; resume?: SudokuSave }) {
  const size = (config.size ?? 4) as SudokuSize;
  const spec = size === 4 ? SPEC_4 : SPEC_6;
  const settings = useStore((s) => s.settings);
  const setSave = useStore((s) => s.setSave);
  const finishMatch = useStore((s) => s.finishMatch);
  const goHome = useStore((s) => s.goHome);

  const puzzle = useMemo(
    () => buildSudoku(size, config.difficulty as SudokuDifficulty, config.seed),
    [size, config.difficulty, config.seed],
  );

  const ctx: SudokuCtx = useMemo(
    () => ({
      spec,
      solution: puzzle.solution,
      given: puzzle.given,
      errorMode: resume?.errorMode ?? settings.errorMode,
      maxErrors: 3,
    }),
    [spec, puzzle, settings.errorMode, resume],
  );

  const [state, dispatch] = useReducer(
    (s: ReturnType<typeof initSudoku>, a: SudokuAction) => reduceSudoku(s, a, ctx),
    resume
      ? initSudoku(ctx, { grid: resume.grid, notes: resume.notes, errors: resume.errors, hints: resume.hints })
      : initSudoku(ctx),
  );

  const running = state.status === 'Playing';
  const [sec] = useStopwatch(running, resume?.sec ?? 0);
  const finished = useRef(false);

  // Sound/haptic feedback on transitions.
  const prevStatus = useRef(state.status);
  useEffect(() => {
    if (state.flash.length) {
      playTone('complete', settings.sound);
      haptic(20, settings.haptics);
      const t = setTimeout(() => dispatch({ type: 'clearFlash' }), 680);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [state.flash, settings.sound, settings.haptics]);

  useEffect(() => {
    if (state.shake != null) {
      playTone('error', settings.sound);
      haptic([0, 40, 30, 40], settings.haptics);
      const t = setTimeout(() => dispatch({ type: 'clearShake' }), 240);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [state.shake, settings.sound, settings.haptics]);

  // End-of-game handling.
  useEffect(() => {
    if (prevStatus.current === state.status) return;
    prevStatus.current = state.status;
    if ((state.status === 'Won' || state.status === 'Failed') && !finished.current) {
      finished.current = true;
      playTone(state.status === 'Won' ? 'win' : 'fail', settings.sound);
      haptic(state.status === 'Won' ? [0, 60, 40, 80] : [0, 120], settings.haptics);
      void finishMatch({
        game: 'sudoku',
        difficulty: config.difficulty,
        size,
        seed: config.seed,
        timeSec: sec,
        errors: state.errors,
        hints: state.hints,
        won: state.status === 'Won',
        isDaily: config.isDaily,
        dateISO: config.dateISO,
        grid: state.grid,
      });
    }
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave while playing.
  useEffect(() => {
    if (state.status !== 'Playing' && state.status !== 'Paused') return;
    const save: SudokuSave = {
      kind: 'sudoku',
      size,
      difficulty: config.difficulty as SudokuDifficulty,
      seed: config.seed,
      isDaily: config.isDaily,
      grid: state.grid,
      notes: state.notes,
      errors: state.errors,
      hints: state.hints,
      sec,
      errorMode: ctx.errorMode,
    };
    setSave(save);
  }, [state.grid, state.notes, state.errors, state.hints, sec]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (state.status !== 'Playing') return;
      if (e.key === 'ArrowUp') dispatch({ type: 'move', dr: -1, dc: 0 });
      else if (e.key === 'ArrowDown') dispatch({ type: 'move', dr: 1, dc: 0 });
      else if (e.key === 'ArrowLeft') dispatch({ type: 'move', dr: 0, dc: -1 });
      else if (e.key === 'ArrowRight') dispatch({ type: 'move', dr: 0, dc: 1 });
      else if (e.key === 'Backspace' || e.key === 'Delete') dispatch({ type: 'erase' });
      else if (e.key.toLowerCase() === 'n') dispatch({ type: 'toggleNoteMode' });
      else if (/^[1-9]$/.test(e.key)) {
        const v = Number(e.key);
        if (v >= 1 && v <= spec.N) {
          dispatch({ type: 'input', value: v });
          playTone('place', settings.sound);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.status, spec.N, settings.sound]);

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const v of state.grid) if (v) c[v] = (c[v] ?? 0) + 1;
    return c;
  }, [state.grid]);

  const conflicts = useMemo(() => {
    if (ctx.errorMode === 'noHelp') return new Set<number>();
    if (ctx.errorMode === 'relaxed') return findConflicts(spec, state.grid);
    // classic: a filled non-given cell that differs from the solution
    const set = new Set<number>();
    for (let i = 0; i < state.grid.length; i++) {
      if (state.grid[i] && puzzle.given[i] === 0 && state.grid[i] !== puzzle.solution[i]) set.add(i);
    }
    return set;
  }, [state.grid, ctx.errorMode, spec, puzzle]);

  const selPeers = useMemo(
    () => (settings.highlightPeers && state.selected != null ? new Set(peersOf(spec, state.selected)) : new Set<number>()),
    [settings.highlightPeers, state.selected, spec],
  );
  const selValue = state.selected != null ? state.grid[state.selected] : 0;

  const onInput = (v: number) => {
    dispatch({ type: 'input', value: v });
    playTone('place', settings.sound);
  };

  const handleExit = () => {
    if (state.status === 'Playing' || state.status === 'Paused') {
      track('game_abandon', { game: 'sudoku' });
    }
    goHome();
  };

  return (
    <div className="screen">
      <div className="topbar">
        <Btn variant="ghost" onClick={handleExit} aria-label="Back to home">
          ←
        </Btn>
        <div className="title">Mini Sudoku · {size}×{size}</div>
        <div className="row" style={{ gap: 8 }}>
          {ctx.errorMode === 'classic' && (
            <span className="pill" aria-label={`${state.errors} of 3 mistakes`}>
              ✕ {state.errors}/3
            </span>
          )}
          {settings.showTimer && <span className="pill" aria-label={`Time ${formatTime(sec)}`}>{formatTime(sec)}</span>}
          <Btn variant="ghost" onClick={() => dispatch({ type: 'pause' })} aria-label="Pause">
            ⏸
          </Btn>
        </div>
      </div>

      <div className="board-wrap">
        <div
          className="sudoku"
          style={{ gridTemplateColumns: `repeat(${spec.N}, 1fr)` }}
          role="grid"
          aria-label="Sudoku board"
        >
          {state.grid.map((val, i) => {
            const r = Math.floor(i / spec.N);
            const c = i % spec.N;
            const isGiven = puzzle.given[i] !== 0;
            const cls = [
              'cell',
              isGiven ? 'given' : '',
              state.selected === i ? 'sel' : '',
              selPeers.has(i) ? 'peer' : '',
              selValue && val === selValue && state.selected !== i ? 'same' : '',
              conflicts.has(i) ? 'bad' : '',
              state.flash.includes(i) ? 'flash' : '',
              state.shake === i ? 'shake' : '',
              (c + 1) % spec.bc === 0 && c < spec.N - 1 ? 'rr' : '',
              (r + 1) % spec.br === 0 && r < spec.N - 1 ? 'br' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div
                key={i}
                className={cls}
                role="gridcell"
                tabIndex={0}
                aria-label={`Row ${r + 1} column ${c + 1}${val ? `, ${val}` : ', empty'}${isGiven ? ', clue' : ''}${conflicts.has(i) ? ', conflict' : ''}`}
                onClick={() => dispatch({ type: 'select', cell: i })}
                onFocus={() => dispatch({ type: 'select', cell: i })}
              >
                {val !== 0 ? (
                  val
                ) : state.notes[i]?.length ? (
                  <div className="notes" style={{ gridTemplateColumns: `repeat(${spec.bc}, 1fr)`, gridTemplateRows: `repeat(${spec.br}, 1fr)` }}>
                    {Array.from({ length: spec.N }, (_, n) => (
                      <span key={n}>{state.notes[i]?.includes(n + 1) ? n + 1 : ''}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <NumberPad N={spec.N} counts={counts} onInput={onInput} onErase={() => dispatch({ type: 'erase' })} />

      <div className="bottombar">
        <ToolBtn icon="↺" label="Undo" disabled={!state.past.length} onClick={() => dispatch({ type: 'undo' })} />
        <ToolBtn icon="↻" label="Redo" disabled={!state.future.length} onClick={() => dispatch({ type: 'redo' })} />
        <ToolBtn icon="⌫" label="Erase" onClick={() => dispatch({ type: 'erase' })} />
        <ToolBtn
          icon={state.noteMode ? '✏️' : '✐'}
          label={state.noteMode ? 'Notes on' : 'Notes'}
          className={state.noteMode ? 'primary' : ''}
          onClick={() => dispatch({ type: 'toggleNoteMode' })}
        />
        <ToolBtn icon="💡" label="Hint" onClick={() => dispatch({ type: 'hint' })} />
      </div>

      {state.status === 'Paused' && (
        <PauseModal
          onResume={() => dispatch({ type: 'resume' })}
          onRestart={() => window.location.reload()}
          onQuit={handleExit}
        />
      )}
      {state.status === 'Won' && (
        <WinModal
          game="sudoku"
          difficulty={config.difficulty}
          size={size}
          seed={config.seed}
          timeSec={sec}
          hints={state.hints}
          isDaily={config.isDaily}
          onHome={goHome}
        />
      )}
      {state.status === 'Failed' && (
        <FailModal reason={`${state.errors} mistakes`} onRetry={() => window.location.reload()} onHome={goHome} />
      )}
    </div>
  );
}
