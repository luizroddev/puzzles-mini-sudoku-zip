import { Btn } from '../../ui/atoms';

export function FailModal({
  reason,
  onRetry,
  onHome,
}: {
  reason: string;
  onRetry: () => void;
  onHome: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Out of guesses">
      <div className="modal col center">
        <div style={{ fontSize: 44 }} aria-hidden>
          💥
        </div>
        <h2 className="h2">Out of guesses</h2>
        <p className="muted">{reason}</p>
        <Btn variant="primary" block onClick={onRetry}>
          Try again
        </Btn>
        <Btn variant="ghost" block onClick={onHome}>
          Home
        </Btn>
      </div>
    </div>
  );
}
