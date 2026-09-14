import { useEffect, useRef } from 'react';
import type { AnalysisFrame } from '../audio/AudioEngine';

interface Props {
  frame: AnalysisFrame | null;
}

export function Spectrogram({ frame }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colRef = useRef(0);
  const readyRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const dpr = 1; // keep 1 for scroll performance
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!readyRef.current || canvas.width !== w) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.fillStyle = '#05080c';
      ctx.fillRect(0, 0, w, h);
      colRef.current = 0;
      readyRef.current = true;
    }

    const { spectrum, sampleRate, fftSize } = frame;
    const binHz = sampleRate / fftSize;
    const maxDisplayHz = 4000;
    const maxBin = Math.min(spectrum.length - 1, Math.floor(maxDisplayHz / binHz));

    const x = colRef.current;
    // Scroll when full
    if (x >= w - 1) {
      const image = ctx.getImageData(1, 0, w - 1, h);
      ctx.putImageData(image, 0, 0);
      ctx.fillStyle = '#05080c';
      ctx.fillRect(w - 1, 0, 1, h);
    }

    const drawX = Math.min(x, w - 1);
    for (let y = 0; y < h; y++) {
      // bottom = low freq
      const frac = 1 - y / h;
      const bin = Math.floor(frac * maxBin);
      const mag = spectrum[bin]!;
      const db = 20 * Math.log10(Math.max(mag, 1e-10));
      const v = Math.max(0, Math.min(1, (db + 90) / 70));
      // Magma-ish colormap
      const r = Math.floor(255 * Math.min(1, v * 2));
      const g = Math.floor(255 * Math.max(0, v - 0.3) * 1.4);
      const b = Math.floor(255 * Math.max(0, 0.5 - Math.abs(v - 0.5)) * 1.5 + v * 40);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(drawX, y, 1, 1);
    }

    if (colRef.current < w - 1) colRef.current += 1;
  }, [frame]);

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Spectrogram</h3>
        <span className="hint">Time × frequency waterfall</span>
      </div>
      <canvas ref={canvasRef} className="viz-canvas" />
    </div>
  );
}
