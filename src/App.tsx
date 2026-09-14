import { useEffect, useRef, useState } from 'react';
import { useAnalysis } from './hooks/useAnalysis';
import { MicControls } from './components/MicControls';
import { FundamentalDisplay } from './components/FundamentalDisplay';
import { Waveform } from './components/Waveform';
import { Spectrum } from './components/Spectrum';
import { Spectrogram } from './components/Spectrogram';
import { HarmonicPanel } from './components/HarmonicPanel';
import { FormantPanel } from './components/FormantPanel';
import { PitchStability } from './components/PitchStability';
import { ReferenceDrone } from './components/ReferenceDrone';
import { RecordingPanel } from './components/RecordingPanel';
import { SessionLogPanel } from './components/SessionLog';
import { BinauralBeats } from './components/BinauralBeats';

export default function App() {
  const { status, error, frame, pitchHistory, start, stop, isActive } = useAnalysis();
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const wasActive = useRef(false);

  useEffect(() => {
    if (isActive && !wasActive.current) {
      setSessionStartedAt(Date.now());
    }
    if (!isActive && wasActive.current) {
      /* keep last start for log prefill */
    }
    wasActive.current = isActive;
  }, [isActive]);

  const hz = frame?.hz ?? 0;
  const note = frame?.note ?? '—';
  const cents = frame?.cents ?? 0;
  const confidence = frame?.confidence ?? 0;
  const strongestN = frame?.strongest?.n ?? null;

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Voice Overtone Analyzer</h1>
          <p className="tagline">
            Voice → frequency → harmonics → resonance → time → subjective experience
          </p>
        </div>
        <p className="disclaimer">
          Practice & research tool for sustained drones and overtone singing — not a “consciousness frequency” finder.
        </p>
      </header>

      <section className="grid-top">
        <MicControls status={status} error={error} onStart={() => void start()} onStop={stop} />
        <FundamentalDisplay hz={hz} note={note} confidence={confidence} active={isActive} />
        <PitchStability cents={cents} hz={hz} history={pitchHistory} active={isActive} />
      </section>

      <section className="grid-viz">
        <Spectrum frame={frame} />
        <div className="viz-side">
          <Waveform frame={frame} />
          <Spectrogram frame={frame} />
        </div>
      </section>

      <section className="grid-analysis">
        <HarmonicPanel frame={frame} />
        <FormantPanel frame={frame} />
        <ReferenceDrone micActive={isActive} suggestedHz={hz} />
      </section>

      <section className="grid-tools">
        <RecordingPanel frame={frame} micActive={isActive} />
        <SessionLogPanel
          lastHz={hz}
          lastStrongHarmonic={strongestN}
          lastCentsAbs={Math.abs(cents)}
          sessionStartedAt={sessionStartedAt}
        />
      </section>

      <section className="grid-binaural">
        <BinauralBeats />
      </section>

      <footer className="app-footer">
        <span>Web Audio · YIN pitch · IndexedDB · runs fully offline in your browser</span>
      </footer>
    </div>
  );
}
