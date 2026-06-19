/**
 * Analytics hook (PRD §13). A logable no-op in this build; swap the sink for a
 * real provider in production. Never throws.
 */
export type AnalyticsEvent =
  | 'app_open'
  | 'game_start'
  | 'game_win'
  | 'game_fail'
  | 'game_abandon'
  | 'hint_used'
  | 'daily_start'
  | 'daily_complete'
  | 'theme_change'
  | 'setting_change';

let enabled = true;

export function setAnalyticsEnabled(v: boolean): void {
  enabled = v;
}

export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}): void {
  if (!enabled) return;
  try {
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) console.debug('[track]', event, props);
    // production: window.analytics?.track(event, props)
  } catch {
    /* analytics must never break the app */
  }
}
