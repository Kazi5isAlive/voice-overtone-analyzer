import { useCallback, useEffect, useRef, useState } from 'react';
import { audioEngine, type AnalysisFrame } from '../audio/AudioEngine';
import {
  blobToBase64,
  base64ToBlob,
  saveRecording,
  listRecordings,
  deleteRecording,
  uid,
  type RecordingRecord,
  type MetricSample,
} from '../utils/db';
import { formatHz, formatCents } from '../utils/music';

interface Props {
  frame: AnalysisFrame | null;
  micActive: boolean;
}

export function RecordingPanel({ frame, micActive }: Props) {
  const [recording, setRecording] = useState(false);
  const [records, setRecords] = useState<RecordingRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playTime, setPlayTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const metrics = useRef<MetricSample[]>([]);
  const startTs = useRef(0);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const rafPlay = useRef(0);

  const refresh = useCallback(async () => {
    setRecords(await listRecordings());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Collect metrics while recording
  useEffect(() => {
    if (!recording || !frame || frame.hz <= 0) return;
    metrics.current.push({
      t: performance.now() - startTs.current,
      hz: frame.hz,
      note: frame.note,
      cents: frame.cents,
      strongestHarmonic: frame.strongest?.n ?? 1,
      strongestHarmonicHz: frame.strongest?.hz ?? frame.hz,
    });
  }, [frame, recording]);

  const startRec = async () => {
    const stream = audioEngine.mediaStream;
    if (!stream || !micActive) return;
    chunks.current = [];
    metrics.current = [];
    startTs.current = performance.now();

    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    const mr = new MediaRecorder(stream, { mimeType: mime });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    mr.onstop = async () => {
      const blob = new Blob(chunks.current, { type: mime });
      const durationMs = performance.now() - startTs.current;
      const rec: RecordingRecord = {
        id: uid(),
        createdAt: Date.now(),
        durationMs,
        audioBase64: await blobToBase64(blob),
        mimeType: mime,
        metrics: metrics.current.slice(),
        label: `Session ${new Date().toLocaleString()}`,
      };
      await saveRecording(rec);
      await refresh();
      setActiveId(rec.id);
    };
    mediaRecorder.current = mr;
    mr.start(250);
    setRecording(true);
  };

  const stopRec = () => {
    mediaRecorder.current?.stop();
    mediaRecorder.current = null;
    setRecording(false);
  };

  const play = (rec: RecordingRecord) => {
    stopPlay();
    const blob = base64ToBlob(rec.audioBase64, rec.mimeType);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioEl.current = audio;
    setActiveId(rec.id);
    setPlaying(true);
    setPlayTime(0);

    const tick = () => {
      if (!audioEl.current) return;
      setPlayTime(audioEl.current.currentTime * 1000);
      rafPlay.current = requestAnimationFrame(tick);
    };
    audio.onended = () => {
      stopPlay();
      URL.revokeObjectURL(url);
    };
    void audio.play();
    rafPlay.current = requestAnimationFrame(tick);
  };

  const stopPlay = () => {
    cancelAnimationFrame(rafPlay.current);
    audioEl.current?.pause();
    audioEl.current = null;
    setPlaying(false);
    setPlayTime(0);
  };

  const remove = async (id: string) => {
    if (activeId === id) stopPlay();
    await deleteRecording(id);
    await refresh();
  };

  const active = records.find((r) => r.id === activeId) ?? null;
  const aligned =
    active && playing
      ? active.metrics.reduce<MetricSample | null>((best, m) => {
          if (m.t <= playTime) return m;
          return best;
        }, null)
      : null;

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Recording</h3>
        <span className="hint">Audio + timestamped metrics</span>
      </div>
      <div className="rec-actions">
        {!recording ? (
          <button className="btn btn-primary" onClick={() => void startRec()} disabled={!micActive}>
            ● Record
          </button>
        ) : (
          <button className="btn btn-danger" onClick={stopRec}>
            ■ Stop
          </button>
        )}
        {recording && <span className="rec-indicator">Recording…</span>}
      </div>

      {active && (
        <div className="review-box">
          <div className="review-title">{active.label}</div>
          <div className="review-meta">
            {(active.durationMs / 1000).toFixed(1)}s · {active.metrics.length} samples
          </div>
          <div className="review-controls">
            {!playing ? (
              <button className="btn btn-secondary" onClick={() => play(active)}>
                ▶ Play & align
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={stopPlay}>
                Stop
              </button>
            )}
          </div>
          {aligned && (
            <div className="aligned-metrics">
              <span>t={(aligned.t / 1000).toFixed(2)}s</span>
              <span>{formatHz(aligned.hz)} Hz</span>
              <span>{aligned.note}</span>
              <span>{formatCents(aligned.cents)}</span>
              <span>H{aligned.strongestHarmonic}</span>
            </div>
          )}
          <MetricsSpark metrics={active.metrics} playTime={playing ? playTime : -1} />
        </div>
      )}

      <ul className="rec-list">
        {records.map((r) => (
          <li key={r.id} className={r.id === activeId ? 'active' : ''}>
            <button className="linkish" onClick={() => setActiveId(r.id)}>
              {r.label ?? r.id}
            </button>
            <span className="hint">{(r.durationMs / 1000).toFixed(1)}s</span>
            <button className="btn-icon" onClick={() => void remove(r.id)} title="Delete">
              ×
            </button>
          </li>
        ))}
        {records.length === 0 && <li className="hint">No recordings yet — stored in IndexedDB</li>}
      </ul>
    </div>
  );
}

function MetricsSpark({ metrics, playTime }: { metrics: MetricSample[]; playTime: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || metrics.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w, h);
    const tMax = metrics[metrics.length - 1]!.t;
    const hzMax = Math.max(...metrics.map((m) => m.hz), 1);
    const hzMin = Math.min(...metrics.map((m) => m.hz));
    ctx.strokeStyle = '#2dd4bf';
    ctx.beginPath();
    metrics.forEach((m, i) => {
      const x = (m.t / tMax) * w;
      const y = h - ((m.hz - hzMin) / (hzMax - hzMin + 1e-6)) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    if (playTime >= 0) {
      const x = (playTime / tMax) * w;
      ctx.strokeStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }, [metrics, playTime]);
  return <canvas ref={ref} className="viz-canvas viz-xs" />;
}
