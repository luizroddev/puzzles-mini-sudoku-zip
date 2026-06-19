/**
 * Root navigation machine (PRD §3/§5). Hydrates persisted state on mount, then
 * renders the screen for the current route. Match screens receive a `resume`
 * save only when it matches the route's puzzle.
 */
import { useEffect } from 'react';
import { useStore, type PlayConfig } from '../state/store';
import type { SaveState, SudokuSave, ZipSave } from '../state/models';
import { ThemeEffect } from '../ui/theme';
import { Home } from './Home';
import { PreGame } from './PreGame';
import { SudokuMatch } from './SudokuMatch';
import { ZipMatch } from './ZipMatch';
import { StatsScreen } from './StatsScreen';
import { SettingsScreen } from './SettingsScreen';
import { TutorialScreen } from './TutorialScreen';

function matchingSave(save: SaveState | null, config: PlayConfig): SaveState | undefined {
  if (!save) return undefined;
  if (save.kind !== config.game) return undefined;
  if (save.seed !== config.seed || save.difficulty !== config.difficulty) return undefined;
  return save;
}

export function App() {
  const hydrated = useStore((s) => s.hydrated);
  const hydrate = useStore((s) => s.hydrate);
  const route = useStore((s) => s.route);
  const save = useStore((s) => s.currentSave);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <div className="app">
        <div className="screen center" style={{ justifyContent: 'center' }}>
          <h1 className="h1">Puzzles</h1>
          <p className="muted">Loading…</p>
        </div>
      </div>
    );
  }

  let screen;
  switch (route.name) {
    case 'home':
      screen = <Home />;
      break;
    case 'pregame':
      screen = <PreGame game={route.game} />;
      break;
    case 'play': {
      const resume = matchingSave(save, route.config);
      screen =
        route.config.game === 'sudoku' ? (
          <SudokuMatch key={route.config.seed} config={route.config} resume={resume as SudokuSave | undefined} />
        ) : (
          <ZipMatch key={route.config.seed} config={route.config} resume={resume as ZipSave | undefined} />
        );
      break;
    }
    case 'stats':
      screen = <StatsScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    case 'tutorial':
      screen = <TutorialScreen />;
      break;
  }

  return (
    <div className="app">
      <ThemeEffect />
      {screen}
    </div>
  );
}
