import { useEffect, useRef } from 'react';
import type { AnalysisFrame } from '../audio/AudioEngine';

interface Props {
  frame: AnalysisFrame | null;
}

export function FormantPanel({ frame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const formants = frame?.formants ?? [];

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

    const maxHz = 4000;

    // Spectrum backdrop
    if (frame) {
      const { spectrum, sampleRate, fftSize } = frame;
      const binHz = sampleRate / fftSize;
      const maxBin = Math.min(spectrum.length, Math.floor(maxHz / binHz));
      ctx.beginPath();
      for (let i = 1; i < maxBin; i++) {
        const x = (i / maxBin) * w;
        const db = 20 * Math.log10(Math.max(spectrum[i]!, 1e-10));
        const norm = Math.max(0, Math.min(1, (db + 90) / 80));
        const y = h - norm * (h - 8);
        if (i === 1) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Formant markers
    formants.forEach((f, i) => {
      const x = (f.hz / maxHz) * w;
      const colors = ['#f472b6', '#fb923c', '#a78bfa', '#38bdf8'];
      ctx.strokeStyle = colors[i % colors.length]!;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 8);
      ctx.lineTo(x, h - 4);
      ctx.stroke();
      ctx.fillStyle = colors[i % colors.length]!;
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(`${f.label} ${f.hz.toFixed(0)}`, x + 4, 16 + i * 14);
    });
  }, [frame, formants]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Formants / Vocal Resonance</h3>
        <span className="hint">Tract resonances ≠ f₀</span>
      </div>
      <div className="formant-list">
        {formants.length === 0 ? (
          <span className="hint">Sing a sustained vowel to estimate formants</span>
        ) : (
          formants.map((f) => (
            <span key={f.label} className="formant-chip">
              {f.label}: {f.hz.toFixed(0)} Hz
            </span>
          ))
        )}
      </div>
      <canvas ref={canvasRef} className="viz-canvas viz-sm" />
      <p className="edu-note">
        <strong>Formants</strong> are resonances of the vocal tract (filter), not the vocal-fold vibration rate (<strong>f₀</strong>) or its
        integer <strong>harmonics</strong> (source). Changing tongue/lip shape moves formants and can amplify specific overtones.
      </p>
    </div>
  );
}
