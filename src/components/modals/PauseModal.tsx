import { Btn } from '../../ui/atoms';

export function PauseModal({
  onResume,
  onRestart,
  onQuit,
}: {
  onResume: () => void;
  onRestart: () => void;
  onQuit: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Paused">
      <div className="modal col">
        <h2 className="h2">Paused</h2>
        <p className="muted">The timer is stopped.</p>
        <Btn variant="primary" block onClick={onResume}>
          Resume
        </Btn>
        <Btn block onClick={onRestart}>
          Restart puzzle
        </Btn>
        <Btn variant="ghost" block onClick={onQuit}>
          Quit to home
        </Btn>
      </div>
    </div>
  );
}
