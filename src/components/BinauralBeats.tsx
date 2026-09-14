import { useEffect, useState } from 'react';
import { binauralGenerator, BAND_PRESETS, type BandPreset } from '../audio/BinauralGenerator';

export function BinauralBeats() {
  const [playing, setPlaying] = useState(false);
  const [preset, setPreset] = useState<BandPreset>('Theta');
  const [base, setBase] = useState(200);
  const [beat, setBeat] = useState(6);
  const [volume, setVolume] = useState(0.18);

  useEffect(() => {
    return () => binauralGenerator.stop();
  }, []);

  useEffect(() => {
    if (preset === 'Custom') return;
    const p = BAND_PRESETS[preset];
    setBase(p.base);
    setBeat(p.beat);
  }, [preset]);

  useEffect(() => {
    if (playing) binauralGenerator.update(base, beat, volume);
  }, [base, beat, volume, playing]);

  const toggle = async () => {
    if (playing) {
      binauralGenerator.stop();
      setPlaying(false);
    } else {
      await binauralGenerator.start(base, beat, volume);
      setPlaying(true);
    }
  };

  return (
    <div className="panel panel-binaural">
      <div className="panel-header">
        <h3>Binaural Beats Generator</h3>
        <span className="hint">Separate from vocal f₀</span>
      </div>
      <p className="headphones-banner">🎧 Headphones required — each ear receives a slightly different carrier.</p>
      <div className="preset-row">
        {(Object.keys(BAND_PRESETS) as Exclude<BandPreset, 'Custom'>[]).map((name) => (
          <button
            key={name}
            type="button"
            className={`preset-btn ${preset === name ? 'active' : ''}`}
            onClick={() => setPreset(name)}
            title={BAND_PRESETS[name].desc}
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          className={`preset-btn ${preset === 'Custom' ? 'active' : ''}`}
          onClick={() => setPreset('Custom')}
        >
          Custom
        </button>
      </div>
      {preset !== 'Custom' && <p className="hint preset-desc">{BAND_PRESETS[preset].desc}</p>}
      <label className="slider-row">
        <span>
          Base / carrier center: {base.toFixed(0)} Hz
          <small className="sub"> L {(base - beat / 2).toFixed(1)} · R {(base + beat / 2).toFixed(1)}</small>
        </span>
        <input
          type="range"
          min={100}
          max={500}
          step={1}
          value={base}
          onChange={(e) => {
            setPreset('Custom');
            setBase(+e.target.value);
          }}
        />
      </label>
      <label className="slider-row">
        <span>Beat frequency: {beat.toFixed(1)} Hz</span>
        <input
          type="range"
          min={0.5}
          max={100}
          step={0.1}
          value={beat}
          onChange={(e) => {
            setPreset('Custom');
            setBeat(+e.target.value);
          }}
        />
      </label>
      <label className="slider-row">
        <span>Volume</span>
        <input type="range" min={0} max={0.5} step={0.01} value={volume} onChange={(e) => setVolume(+e.target.value)} />
      </label>
      <button type="button" className={`btn ${playing ? 'btn-danger' : 'btn-secondary'}`} onClick={() => void toggle()}>
        {playing ? 'Stop binaural' : 'Start binaural'}
      </button>
      <p className="edu-note">
        Binaural beats are a <em>perceived</em> difference tone created in the auditory pathway — not a sound your vocal folds produce.
        This panel is independent of the fundamental-frequency display above. Usable alongside voice analysis.
      </p>
    </div>
  );
}
