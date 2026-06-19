/**
 * Settings: theme, animation/sound/haptics, timer visibility, peer highlight,
 * default mistake mode, and an online display name (best-effort backend).
 */
import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { Btn, Segmented, Switch } from '../ui/atoms';
import { getProfileName, setProfileName } from '../api/client';
import { setAnalyticsEnabled } from '../analytics/track';

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle">
      <span>{label}</span>
      <Switch on={on} onChange={onChange} label={label} />
    </div>
  );
}

export function SettingsScreen() {
  const goHome = useStore((s) => s.goHome);
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);

  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState(false);

  useEffect(() => {
    let alive = true;
    void getProfileName().then((n) => {
      if (alive && n) setName(n);
    });
    return () => {
      alive = false;
    };
  }, []);

  const saveName = async () => {
    const ok = await setProfileName(name.trim());
    if (ok) {
      setSavedName(true);
      setTimeout(() => setSavedName(false), 1500);
    }
  };

  return (
    <div className="screen">
      <div className="topbar">
        <Btn variant="ghost" onClick={goHome} aria-label="Back">←</Btn>
        <div className="title">Settings</div>
        <span style={{ width: 44 }} />
      </div>

      <div className="card col">
        <span className="muted">Theme</span>
        <Segmented
          ariaLabel="Theme"
          value={settings.theme}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
          onChange={(v) => update({ theme: v })}
        />
      </div>

      <div className="card col">
        <span className="muted">Default mistakes mode (Sudoku)</span>
        <Segmented
          ariaLabel="Default error mode"
          value={settings.errorMode}
          options={[
            { value: 'relaxed', label: 'Relaxed' },
            { value: 'classic', label: 'Classic' },
            { value: 'noHelp', label: 'No help' },
          ]}
          onChange={(v) => update({ errorMode: v })}
        />
      </div>

      <div className="card col" style={{ gap: 0 }}>
        <Toggle label="Animations" on={settings.motion} onChange={(v) => update({ motion: v })} />
        <Toggle label="Sound" on={settings.sound} onChange={(v) => update({ sound: v })} />
        <Toggle label="Haptics" on={settings.haptics} onChange={(v) => update({ haptics: v })} />
        <Toggle label="Show timer" on={settings.showTimer} onChange={(v) => update({ showTimer: v })} />
        <Toggle label="Highlight peers (Sudoku)" on={settings.highlightPeers} onChange={(v) => update({ highlightPeers: v })} />
      </div>

      <div className="card col">
        <span className="muted">Leaderboard name</span>
        <div className="row">
          <input
            className="btn"
            style={{ flex: 1, textAlign: 'left' }}
            value={name}
            maxLength={20}
            placeholder="Your name"
            onChange={(e) => setName(e.target.value)}
            aria-label="Leaderboard name"
          />
          <Btn variant="primary" onClick={saveName} disabled={!name.trim()}>
            {savedName ? 'Saved' : 'Save'}
          </Btn>
        </div>
        <span className="muted" style={{ fontSize: 12 }}>Used on the online leaderboard. Works only when the backend is reachable.</span>
      </div>

      <div className="card col" style={{ gap: 0 }}>
        <Toggle label="Anonymous analytics" on onChange={(v) => setAnalyticsEnabled(v)} />
      </div>
    </div>
  );
}
