import type { MicStatus } from '../hooks/useAnalysis';

interface Props {
  status: MicStatus;
  error: string | null;
  onStart: () => void;
  onStop: () => void;
}

export function MicControls({ status, error, onStart, onStop }: Props) {
  return (
    <div className="panel panel-mic">
      <div className="panel-header">
        <h3>Microphone Input</h3>
        <span className={`status-dot status-${status}`} title={status} />
      </div>
      <div className="mic-actions">
        {status !== 'active' ? (
          <button className="btn btn-primary" onClick={onStart} disabled={status === 'requesting'}>
            {status === 'requesting' ? 'Requesting…' : 'Enable Microphone'}
          </button>
        ) : (
          <button className="btn btn-danger" onClick={onStop}>
            Stop Microphone
          </button>
        )}
        <span className="mic-status-text">
          {status === 'idle' && 'Ready — grant mic access to analyze voice'}
          {status === 'requesting' && 'Waiting for browser permission…'}
          {status === 'active' && 'Live — echo cancellation off for accuracy'}
          {status === 'denied' && 'Permission denied'}
          {status === 'error' && 'Error starting mic'}
        </span>
      </div>
      {error && <p className="error-msg">{error}</p>}
      <p className="edu-note">
        Use headphones when playing reference tones or binaural beats to avoid feedback into the mic.
      </p>
    </div>
  );
}
