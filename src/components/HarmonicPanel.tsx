import { useEffect, useRef } from 'react';
import type { AnalysisFrame } from '../audio/AudioEngine';

interface Props {
  frame: AnalysisFrame | null;
}

export function HarmonicPanel({ frame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strongest = frame?.strongest ?? null;
  const harmonics = frame?.harmonics ?? [];

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

    if (harmonics.length === 0) {
      ctx.fillStyle = '#3d4f66';
      ctx.font = '12px system-ui';
      ctx.fillText('Harmonics appear when f₀ is locked', 12, h / 2);
      return;
    }

    const maxMag = Math.max(...harmonics.map((x) => x.magnitude), 1e-9);
    const barW = (w - 16) / harmonics.length;

    harmonics.forEach((harm, i) => {
      const norm = harm.magnitude / maxMag;
      const barH = norm * (h - 28);
      const x = 8 + i * barW;
      const isStrong = strongest && harm.n === strongest.n;
      ctx.fillStyle = isStrong ? '#fbbf24' : '#2dd4bf';
      ctx.fillRect(x + 2, h - 18 - barH, barW - 4, barH);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(harm.n), x + barW / 2, h - 4);
    });
    ctx.textAlign = 'left';
  }, [frame, harmonics, strongest]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Harmonic Analyzer</h3>
        <span className="hint">Integer multiples of f₀</span>
      </div>
      <div className="harmonic-summary">
        {strongest && frame && frame.hz > 0 ? (
          <>
            <span className="strong-label">Strongest:</span>
            <span className="strong-value">
              H{strongest.n} · {strongest.hz.toFixed(0)} Hz
              {strongest.n === 1 ? ' (fundamental)' : ` (${strongest.n}×f₀)`}
            </span>
          </>
        ) : (
          <span className="hint">No harmonic lock yet</span>
        )}
      </div>
      <canvas ref={canvasRef} className="viz-canvas viz-sm" />
      <p className="edu-note">
        Harmonics are integer multiples of the fundamental (2f₀, 3f₀…). Overtone singing emphasizes selected harmonics by shaping the vocal tract.
      </p>
    </div>
  );
}
