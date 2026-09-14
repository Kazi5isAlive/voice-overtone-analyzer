import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { formatCents } from '../utils/music';

interface Props {
  cents: number;
  hz: number;
  history: MutableRefObject<{ t: number; hz: number; cents: number }[]>;
  active: boolean;
}

export function PitchStability({ cents, hz, history, active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // ±50 cent guides
    ctx.strokeStyle = '#1e2a3a';
    ctx.lineWidth = 1;
    for (const c of [-50, -25, 0, 25, 50]) {
      const y = h / 2 - (c / 50) * (h / 2 - 8);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.fillStyle = '#475569';
    ctx.font = '10px system-ui';
    ctx.fillText('0¢', 4, h / 2 - 4);

    const hist = history.current;
    if (hist.length < 2) return;

    const t0 = hist[0]!.t;
    const t1 = hist[hist.length - 1]!.t;
    const span = Math.max(1, t1 - t0);

    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    hist.forEach((p, i) => {
      const x = ((p.t - t0) / span) * w;
      const y = h / 2 - (p.cents / 50) * (h / 2 - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [cents, hz, history, active]);

  const stability =
    hz <= 0
      ? '—'
      : Math.abs(cents) < 5
        ? 'Very stable'
        : Math.abs(cents) < 15
          ? 'Stable'
          : Math.abs(cents) < 30
            ? 'Moderate drift'
            : 'Unstable';

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Cents / Pitch Stability</h3>
        <span className={`badge ${hz > 0 ? 'badge-on' : ''}`}>{stability}</span>
      </div>
      <div className="cents-readout">
        <span className="cents-value">{hz > 0 ? formatCents(cents) : '—'}</span>
        <span className="hint">offset from nearest equal-tempered note</span>
      </div>
      <canvas ref={canvasRef} className="viz-canvas viz-sm" />
    </div>
  );
}
