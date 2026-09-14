import { useState, useEffect } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { hzToNote } from '../utils/music';

interface Props {
  micActive: boolean;
  suggestedHz: number;
}

export function ReferenceDrone({ micActive, suggestedHz }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [freq, setFreq] = useState(110);
  const [volume, setVolume] = useState(0.12);
  const [theta, setTheta] = useState(false);
  const [thetaRate, setThetaRate] = useState(6);

  useEffect(() => {
    if (!micActive) {
      audioEngine.stopDrone();
      setEnabled(false);
    }
  }, [micActive]);

  useEffect(() => {
    if (!enabled || !micActive) return;
    audioEngine.startDrone(freq, volume, theta, thetaRate);
    return () => audioEngine.stopDrone();
  }, [enabled, micActive, theta, thetaRate]); // restart on theta toggle

  useEffect(() => {
    if (enabled && micActive && !theta) {
      audioEngine.updateDrone(freq, volume);
    }
  }, [freq, volume, enabled, micActive, theta]);

  const toggle = () => {
    if (!micActive) return;
    setEnabled((v) => !v);
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <h3>Reference / Drone</h3>
        <span className="hint">Musical tuning tone</span>
      </div>
      <div className="drone-controls">
        <button className={`btn ${enabled ? 'btn-danger' : 'btn-secondary'}`} onClick={toggle} disabled={!micActive}>
          {enabled ? 'Stop Drone' : 'Start Drone'}
        </button>
        <button
          className="btn btn-ghost"
          disabled={!micActive || suggestedHz <= 0}
          onClick={() => setFreq(Math.round(suggestedHz * 10) / 10)}
          title="Match current vocal f₀"
        >
          Match f₀
        </button>
      </div>
      <label className="slider-row">
        <span>Frequency {freq.toFixed(1)} Hz ({hzToNote(freq)})</span>
        <input type="range" min={55} max={440} step={0.5} value={freq} onChange={(e) => setFreq(+e.target.value)} />
      </label>
      <label className="slider-row">
        <span>Volume</span>
        <input type="range" min={0} max={0.4} step={0.01} value={volume} onChange={(e) => setVolume(+e.target.value)} />
      </label>
      <label className="check-row">
        <input type="checkbox" checked={theta} onChange={(e) => setTheta(e.target.checked)} />
        <span>Theta-band AM (4–8 Hz) on drone amplitude</span>
      </label>
      {theta && (
        <label className="slider-row">
          <span>AM rate {thetaRate.toFixed(1)} Hz</span>
          <input type="range" min={4} max={8} step={0.1} value={thetaRate} onChange={(e) => setThetaRate(+e.target.value)} />
        </label>
      )}
      <p className="edu-note warn-note">
        Theta AM modulates the audible drone loudness — it is <em>not</em> a claim that you can sing 6 Hz with your vocal folds. Vocal f₀ for adults is typically ~80–300 Hz.
      </p>
    </div>
  );
}
