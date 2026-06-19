/**
 * Theme + motion plumbing. Resolves the theme choice (light/dark/system) and
 * applies `data-theme` and a `motion`/`no-motion` class to <html>. Motion is on
 * only when the setting is enabled AND the OS isn't asking to reduce motion.
 */
import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import type { ThemeChoice } from '../state/models';

function media(query: string): MediaQueryList | null {
  try {
    return typeof matchMedia !== 'undefined' ? matchMedia(query) : null;
  } catch {
    return null;
  }
}

export function prefersReducedMotion(): boolean {
  return media('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

function systemPrefersDark(): boolean {
  return media('(prefers-color-scheme: dark)')?.matches ?? true;
}

export function resolveTheme(choice: ThemeChoice, systemDark: boolean): 'light' | 'dark' {
  if (choice === 'system') return systemDark ? 'dark' : 'light';
  return choice;
}

/** Subscribe to system theme/motion changes so 'system' updates live. */
function useSystemFlags() {
  const [systemDark, setSystemDark] = useState(systemPrefersDark);
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    const dark = media('(prefers-color-scheme: dark)');
    const motion = media('(prefers-reduced-motion: reduce)');
    const onDark = () => setSystemDark(systemPrefersDark());
    const onMotion = () => setReduced(prefersReducedMotion());
    dark?.addEventListener('change', onDark);
    motion?.addEventListener('change', onMotion);
    return () => {
      dark?.removeEventListener('change', onDark);
      motion?.removeEventListener('change', onMotion);
    };
  }, []);
  return { systemDark, reduced };
}

export function useMotionEnabled(): boolean {
  const motionSetting = useStore((s) => s.settings.motion);
  const { reduced } = useSystemFlags();
  return motionSetting && !reduced;
}

/** Side-effect-only component: keeps <html> attributes in sync with settings. */
export function ThemeEffect() {
  const choice = useStore((s) => s.settings.theme);
  const motionSetting = useStore((s) => s.settings.motion);
  const { systemDark, reduced } = useSystemFlags();

  useEffect(() => {
    const theme = resolveTheme(choice, systemDark);
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    const motionOn = motionSetting && !reduced;
    root.classList.toggle('motion', motionOn);
    root.classList.toggle('no-motion', !motionOn);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f1115' : '#f7f8fa');
  }, [choice, systemDark, motionSetting, reduced]);

  return null;
}
