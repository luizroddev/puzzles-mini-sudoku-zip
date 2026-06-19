/**
 * Sudoku number entry pad. Shows 1..N plus erase; greys out digits already used
 * N times so the player sees what's left.
 */
export function NumberPad({
  N,
  counts,
  onInput,
  onErase,
  disabled,
}: {
  N: number;
  counts: Record<number, number>;
  onInput: (v: number) => void;
  onErase: () => void;
  disabled?: boolean;
}) {
  const digits = Array.from({ length: N }, (_, i) => i + 1);
  return (
    <div className="pad" style={{ ['--cols' as string]: String(N + 1) }}>
      {digits.map((d) => (
        <button
          key={d}
          className={`pad-key ${(counts[d] ?? 0) >= N ? 'done' : ''}`}
          onClick={() => onInput(d)}
          disabled={disabled}
          aria-label={`Place ${d}`}
        >
          {d}
        </button>
      ))}
      <button className="pad-key" onClick={onErase} disabled={disabled} aria-label="Erase">
        ⌫
      </button>
    </div>
  );
}
