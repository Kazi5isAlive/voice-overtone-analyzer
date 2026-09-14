import { useEffect, useRef } from 'react';
import type { AnalysisFrame } from '../audio/AudioEngine';

interface Props {
  frame: AnalysisFrame | null;
}

export function Waveform({ frame }: Props) {
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

    // Center line
    ctx.strokeStyle = '#1e2a3a';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (!frame) return;
    const data = frame.waveform;
    ctx.strokeStyle = '#5eead4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const step = Math.max(1, Math.floor(data.length / w));
    for (let x = 0; x < w; x++) {
      const i = Math.min(data.length - 1, x * step);
      const y = h / 2 - data[i]! * (h / 2) * 0.9;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, [frame]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Waveform</h3>
        <span className="hint">Oscilloscope</span>
      </div>
      <canvas ref={canvasRef} className="viz-canvas" />
    </div>
  );
}
