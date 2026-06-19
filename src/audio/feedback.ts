/**
 * Lightweight Web Audio feedback (short beeps) plus haptics. Lazily creates the
 * AudioContext on first use (after a user gesture) and respects the sound/haptic
 * settings passed in by callers. Never throws.
 */
type Tone = 'place' | 'erase' | 'complete' | 'error' | 'win' | 'fail' | 'tap';

let ctx: AudioContext | null = null;

function audioCtx(): AudioContext | null {
  try {
    if (ctx) return ctx;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

const TONES: Record<Tone, { freq: number; dur: number; type: OscillatorType }> = {
  tap: { freq: 220, dur: 0.03, type: 'sine' },
  place: { freq: 440, dur: 0.05, type: 'sine' },
  erase: { freq: 180, dur: 0.05, type: 'sine' },
  complete: { freq: 660, dur: 0.12, type: 'triangle' },
  error: { freq: 120, dur: 0.18, type: 'sawtooth' },
  win: { freq: 880, dur: 0.18, type: 'triangle' },
  fail: { freq: 100, dur: 0.3, type: 'sawtooth' },
};

export function playTone(tone: Tone, soundOn: boolean): void {
  if (!soundOn) return;
  const c = audioCtx();
  if (!c) return;
  try {
    if (c.state === 'suspended') void c.resume();
    const { freq, dur, type } = TONES[tone];
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(gain).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur + 0.02);
    if (tone === 'win') {
      // little arpeggio
      [1.25, 1.5].forEach((mult, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'triangle';
        o.frequency.value = freq * mult;
        const t0 = c.currentTime + 0.12 * (i + 1);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
        o.connect(g).connect(c.destination);
        o.start(t0);
        o.stop(t0 + 0.16);
      });
    }
  } catch {
    /* ignore */
  }
}

export function haptic(pattern: number | number[], hapticsOn: boolean): void {
  if (!hapticsOn) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}
