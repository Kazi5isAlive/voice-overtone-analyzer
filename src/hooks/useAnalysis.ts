import { useEffect, useState, useCallback, useRef } from 'react';
import { audioEngine, type AnalysisFrame } from '../audio/AudioEngine';

export type MicStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

export function useAnalysis() {
  const [status, setStatus] = useState<MicStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState<AnalysisFrame | null>(null);
  const historyRef = useRef<{ t: number; hz: number; cents: number }[]>([]);

  useEffect(() => {
    return audioEngine.onFrame((f) => {
      setFrame(f);
      if (f.hz > 0) {
        const hist = historyRef.current;
        hist.push({ t: f.time, hz: f.hz, cents: f.cents });
        // Keep ~30s of history at ~60fps ≈ 1800 samples; trim to 1200
        if (hist.length > 1200) hist.splice(0, hist.length - 1200);
      }
    });
  }, []);

  const start = useCallback(async () => {
    setStatus('requesting');
    setError(null);
    try {
      await audioEngine.startMic();
      setStatus('active');
      historyRef.current = [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/Permission|NotAllowed|Denied/i.test(msg) || (e as { name?: string })?.name === 'NotAllowedError') {
        setStatus('denied');
        setError('Microphone permission denied. Allow mic access in the browser and try again.');
      } else {
        setStatus('error');
        setError(msg);
      }
    }
  }, []);

  const stop = useCallback(() => {
    audioEngine.stopMic();
    setStatus('idle');
    setFrame(null);
  }, []);

  return {
    status,
    error,
    frame,
    pitchHistory: historyRef,
    start,
    stop,
    isActive: status === 'active',
  };
}
