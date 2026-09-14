import { useEffect, useRef } from 'react';
import type { AnalysisFrame } from '../audio/AudioEngine';

interface Props {
  frame: AnalysisFrame | null;
}

export function Spectrum({ frame }: Props) {
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

    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w, h);

    if (!frame) {
      ctx.fillStyle = '#3d4f66';
      ctx.font = '13px system-ui';
      ctx.fillText('Start mic to see spectrum', 16, h / 2);
      return;
    }

    const { spectrum, sampleRate, fftSize, hz, harmonics } = frame;
    const binHz = sampleRate / fftSize;
    const maxDisplayHz = 4000;
    const maxBin = Math.min(spectrum.length, Math.floor(maxDisplayHz / binHz));

    // Bars
    const barW = Math.max(1, w / maxBin);
    for (let i = 1; i < maxBin; i++) {
      const mag = spectrum[i]!;
      const db = 20 * Math.log10(Math.max(mag, 1e-10));
      const norm = Math.max(0, Math.min(1, (db + 90) / 80));
      const barH = norm * (h - 4);
      const x = (i / maxBin) * w;
      const hue = 160 + (i / maxBin) * 80;
      ctx.fillStyle = `hsla(${hue}, 70%, 55%, 0.85)`;
      ctx.fillRect(x, h - barH, Math.ceil(barW) + 0.5, barH);
    }

    // f0 marker
    if (hz > 0 && hz < maxDisplayHz) {
      const x = (hz / maxDisplayHz) * w;
      ctx.strokeStyle = '#f472b6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f472b6';
      ctx.font = '11px system-ui';
      ctx.fillText(`f₀ ${hz.toFixed(0)}`, x + 4, 14);
    }

    // Harmonic markers
    if (harmonics.length > 1) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
      for (const harm of harmonics.slice(1, 8)) {
        if (harm.hz > maxDisplayHz) break;
        const x = (harm.hz / maxDisplayHz) * w;
        ctx.fillRect(x - 0.5, 0, 1, h);
      }
    }

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px system-ui';
    for (const label of [500, 1000, 2000, 3000, 4000]) {
      const x = (label / maxDisplayHz) * w;
      ctx.fillText(`${label}`, x - 10, h - 4);
    }
  }, [frame]);

  return (
    <div className="panel panel-hero">
      <div className="panel-header">
        <h3>Frequency Spectrum</h3>
        <span className="hint">0 – 4 kHz · pink = f₀ · gold = harmonics</span>
      </div>
      <canvas ref={canvasRef} className="viz-canvas viz-hero" />
    </div>
  );
}
