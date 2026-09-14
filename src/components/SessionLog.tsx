import { useCallback, useEffect, useState } from 'react';
import { saveSession, listSessions, deleteSession, uid, type SessionLog as SessionLogType } from '../utils/db';

interface Props {
  lastHz: number;
  lastStrongHarmonic: number | null;
  lastCentsAbs: number;
  sessionStartedAt: number | null;
}

const emptyForm = {
  fundamentalHz: '' as string,
  durationSec: '' as string,
  strongestHarmonic: '' as string,
  pitchStability: 'stable',
  breathing: '',
  thetaTrack: false,
  subjectiveState: '',
  perceptualChanges: '',
  meditationDepth: 5,
  notes: '',
};

export function SessionLogPanel({ lastHz, lastStrongHarmonic, lastCentsAbs, sessionStartedAt }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [logs, setLogs] = useState<SessionLogType[]>([]);
  const [saved, setSaved] = useState(false);

  const refresh = useCallback(async () => {
    setLogs(await listSessions());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const prefill = () => {
    const dur =
      sessionStartedAt != null ? Math.round((Date.now() - sessionStartedAt) / 1000) : 0;
    const stability =
      lastCentsAbs < 5 ? 'very stable' : lastCentsAbs < 15 ? 'stable' : lastCentsAbs < 30 ? 'moderate' : 'unstable';
    setForm((f) => ({
      ...f,
      fundamentalHz: lastHz > 0 ? lastHz.toFixed(1) : f.fundamentalHz,
      durationSec: dur > 0 ? String(dur) : f.durationSec,
      strongestHarmonic: lastStrongHarmonic != null ? String(lastStrongHarmonic) : f.strongestHarmonic,
      pitchStability: stability,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const log: SessionLogType = {
      id: uid(),
      createdAt: Date.now(),
      fundamentalHz: form.fundamentalHz ? parseFloat(form.fundamentalHz) : null,
      durationSec: form.durationSec ? parseFloat(form.durationSec) : 0,
      strongestHarmonic: form.strongestHarmonic ? parseInt(form.strongestHarmonic, 10) : null,
      pitchStability: form.pitchStability,
      breathing: form.breathing,
      thetaTrack: form.thetaTrack,
      subjectiveState: form.subjectiveState,
      perceptualChanges: form.perceptualChanges,
      meditationDepth: form.meditationDepth,
      notes: form.notes,
    };
    await saveSession(log);
    setForm(emptyForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await refresh();
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Subjective State Log</h3>
        <span className="hint">Persists across reloads</span>
      </div>
      <button type="button" className="btn btn-ghost" onClick={prefill}>
        Prefill from current session
      </button>
      <form className="session-form" onSubmit={(e) => void submit(e)}>
        <div className="form-grid">
          <label>
            Fundamental (Hz)
            <input
              value={form.fundamentalHz}
              onChange={(e) => setForm({ ...form, fundamentalHz: e.target.value })}
              placeholder="e.g. 110"
            />
          </label>
          <label>
            Duration (sec)
            <input
              value={form.durationSec}
              onChange={(e) => setForm({ ...form, durationSec: e.target.value })}
              placeholder="e.g. 600"
            />
          </label>
          <label>
            Strongest harmonic #
            <input
              value={form.strongestHarmonic}
              onChange={(e) => setForm({ ...form, strongestHarmonic: e.target.value })}
              placeholder="e.g. 5"
            />
          </label>
          <label>
            Pitch stability
            <select
              value={form.pitchStability}
              onChange={(e) => setForm({ ...form, pitchStability: e.target.value })}
            >
              <option value="very stable">Very stable</option>
              <option value="stable">Stable</option>
              <option value="moderate">Moderate</option>
              <option value="unstable">Unstable</option>
            </select>
          </label>
        </div>
        <label>
          Breathing
          <input
            value={form.breathing}
            onChange={(e) => setForm({ ...form, breathing: e.target.value })}
            placeholder="slow / circular / held…"
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.thetaTrack}
            onChange={(e) => setForm({ ...form, thetaTrack: e.target.checked })}
          />
          Theta track / AM was used
        </label>
        <label>
          Subjective state
          <input
            value={form.subjectiveState}
            onChange={(e) => setForm({ ...form, subjectiveState: e.target.value })}
            placeholder="calm, focused, spacious…"
          />
        </label>
        <label>
          Perceptual changes
          <input
            value={form.perceptualChanges}
            onChange={(e) => setForm({ ...form, perceptualChanges: e.target.value })}
            placeholder="timbre shift, body buzz, time sense…"
          />
        </label>
        <label className="slider-row">
          <span>Meditation depth: {form.meditationDepth}/10</span>
          <input
            type="range"
            min={1}
            max={10}
            value={form.meditationDepth}
            onChange={(e) => setForm({ ...form, meditationDepth: +e.target.value })}
          />
        </label>
        <label>
          Notes
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Free notes for research / practice diary"
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Save session log
        </button>
        {saved && <span className="ok-msg">Saved</span>}
      </form>

      <ul className="session-list">
        {logs.map((l) => (
          <li key={l.id}>
            <div>
              <strong>{new Date(l.createdAt).toLocaleString()}</strong>
              <div className="hint">
                {l.fundamentalHz ?? '—'} Hz · {l.durationSec}s · H{l.strongestHarmonic ?? '—'} · depth{' '}
                {l.meditationDepth}/10
              </div>
              {l.subjectiveState && <div className="log-snip">{l.subjectiveState}</div>}
            </div>
            <button className="btn-icon" onClick={() => void deleteSession(l.id).then(refresh)}>
              ×
            </button>
          </li>
        ))}
        {logs.length === 0 && <li className="hint">No session logs yet</li>}
      </ul>
    </div>
  );
}
