/**
 * Seconds counter that ticks while `running` is true, seeded with an initial
 * value (for resuming a saved game). Returns the live count and a setter.
 */
import { useEffect, useRef, useState } from 'react';

export function useStopwatch(running: boolean, initialSec = 0): [number, (n: number) => void] {
  const [sec, setSec] = useState(initialSec);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSec((s) => s + 1), 1000);
      return () => {
        if (ref.current) clearInterval(ref.current);
      };
    }
    return undefined;
  }, [running]);

  return [sec, setSec];
}
