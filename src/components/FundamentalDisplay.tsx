import { formatHz } from '../utils/music';

interface Props {
  hz: number;
  note: string;
  confidence: number;
  active: boolean;
}

export function FundamentalDisplay({ hz, note, confidence, active }: Props) {
  return (
    <div className="panel panel-f0">
      <div className="panel-header">
        <h3>Fundamental Frequency</h3>
        <span className="hint">f₀ · YIN pitch detection</span>
      </div>
      <div className="f0-display">
        <div className="f0-hz">{active && hz > 0 ? formatHz(hz, 1) : '—'}</div>
        <div className="f0-unit">Hz</div>
      </div>
      <div className="f0-meta">
        <div className="note-display">
          <span className="label">Note</span>
          <span className="note-value">{active && hz > 0 ? note : '—'}</span>
        </div>
        <div className="conf-display">
          <span className="label">Confidence</span>
          <div className="conf-bar">
            <div className="conf-fill" style={{ width: `${Math.round(confidence * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
