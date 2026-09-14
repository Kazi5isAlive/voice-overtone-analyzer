/**
 * Central Web Audio engine: mic capture, analysers, reference drone.
 * Analysis runs on the main thread via AnalyserNode + YIN.
 */

import { detectPitchYIN, rmsEnergy } from './pitch';
import { analyzeHarmonics, strongestHarmonic, findFormants, type HarmonicPeak, type FormantPeak } from './harmonics';
import { hzToNote, hzToCents } from '../utils/music';

export interface AnalysisFrame {
  time: number;
  hz: number;
  note: string;
  cents: number;
  confidence: number;
  rms: number;
  harmonics: HarmonicPeak[];
  strongest: HarmonicPeak | null;
  formants: FormantPeak[];
  /** time-domain samples for waveform (−1…1) */
  waveform: Float32Array;
  /** frequency magnitudes (linear) */
  spectrum: Float32Array;
  sampleRate: number;
  fftSize: number;
}

type FrameListener = (frame: AnalysisFrame) => void;

const FFT_SIZE = 4096;
const SMOOTHING = 0.7;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gain: GainNode | null = null;
  private silent: GainNode | null = null;

  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private thetaLfo: OscillatorNode | null = null;
  private thetaGain: GainNode | null = null;

  private raf = 0;
  private listeners = new Set<FrameListener>();
  private running = false;
  private smoothedHz = 0;

  private timeBuf: Float32Array | null = null;
  private freqBuf: Float32Array | null = null;

  get audioContext(): AudioContext | null {
    return this.ctx;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get mediaStream(): MediaStream | null {
    return this.stream;
  }

  onFrame(fn: FrameListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  async startMic(): Promise<void> {
    if (this.running) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });

    this.ctx = new AudioContext();
    await this.ctx.resume();

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = SMOOTHING;
    this.analyser.minDecibels = -90;
    this.analyser.maxDecibels = -10;

    this.gain = this.ctx.createGain();
    this.gain.gain.value = 1;

    // Keep graph alive but don't play mic through speakers (feedback)
    this.silent = this.ctx.createGain();
    this.silent.gain.value = 0;

    this.source.connect(this.gain);
    this.gain.connect(this.analyser);
    this.analyser.connect(this.silent);
    this.silent.connect(this.ctx.destination);

    this.timeBuf = new Float32Array(this.analyser.fftSize);
    this.freqBuf = new Float32Array(this.analyser.frequencyBinCount);

    this.running = true;
    this.loop();
  }

  stopMic(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;

    this.stopDrone();

    this.source?.disconnect();
    this.analyser?.disconnect();
    this.gain?.disconnect();
    this.silent?.disconnect();
    this.source = null;
    this.analyser = null;
    this.gain = null;
    this.silent = null;

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;

    void this.ctx?.close();
    this.ctx = null;
    this.smoothedHz = 0;
  }

  /** Musical reference drone (not a sub-audio beat). Optional amplitude modulation in Theta band for entrainment feel. */
  startDrone(freqHz: number, volume = 0.15, thetaMod = false, thetaRate = 6): void {
    if (!this.ctx) return;
    this.stopDrone();

    this.droneOsc = this.ctx.createOscillator();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.value = freqHz;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = volume;

    this.droneOsc.connect(this.droneGain);
    this.droneGain.connect(this.ctx.destination);
    this.droneOsc.start();

    if (thetaMod) {
      // Subtle AM in 4–8 Hz — does NOT mean the voice produces 6 Hz
      this.thetaLfo = this.ctx.createOscillator();
      this.thetaLfo.frequency.value = thetaRate;
      this.thetaGain = this.ctx.createGain();
      this.thetaGain.gain.value = volume * 0.35;
      this.thetaLfo.connect(this.thetaGain);
      this.thetaGain.connect(this.droneGain.gain);
      this.thetaLfo.start();
      this.droneGain.gain.value = volume * 0.65;
    }
  }

  updateDrone(freqHz: number, volume: number): void {
    if (this.droneOsc && this.droneGain && this.ctx) {
      this.droneOsc.frequency.setTargetAtTime(freqHz, this.ctx.currentTime, 0.02);
      // Only update if not theta-modulated structure; caller may restart for theta
      if (!this.thetaLfo) {
        this.droneGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.02);
      }
    }
  }

  stopDrone(): void {
    try {
      this.thetaLfo?.stop();
      this.thetaLfo?.disconnect();
    } catch {
      /* already stopped */
    }
    try {
      this.droneOsc?.stop();
      this.droneOsc?.disconnect();
    } catch {
      /* already stopped */
    }
    this.droneGain?.disconnect();
    this.thetaGain?.disconnect();
    this.droneOsc = null;
    this.droneGain = null;
    this.thetaLfo = null;
    this.thetaGain = null;
  }

  private loop = () => {
    if (!this.running || !this.analyser || !this.ctx || !this.timeBuf || !this.freqBuf) return;

    this.analyser.getFloatTimeDomainData(this.timeBuf as unknown as Float32Array<ArrayBuffer>);
    this.analyser.getFloatFrequencyData(this.freqBuf as unknown as Float32Array<ArrayBuffer>);

    // Convert dB spectrum to linear magnitude for analysis helpers
    const linear = new Float32Array(this.freqBuf.length);
    for (let i = 0; i < this.freqBuf.length; i++) {
      linear[i] = Math.pow(10, this.freqBuf[i]! / 20);
    }

    const rms = rmsEnergy(this.timeBuf);
    let pitch = { hz: 0, confidence: 0 };
    if (rms > 0.01) {
      pitch = detectPitchYIN(this.timeBuf, this.ctx.sampleRate, 55, 900);
    }

    // Exponential smoothing for display stability
    if (pitch.hz > 0 && pitch.confidence > 0.4) {
      this.smoothedHz =
        this.smoothedHz > 0
          ? this.smoothedHz * 0.85 + pitch.hz * 0.15
          : pitch.hz;
    } else if (rms < 0.008) {
      this.smoothedHz = 0;
    }

    const hz = this.smoothedHz;
    const harmonics = hz > 0 ? analyzeHarmonics(linear, this.ctx.sampleRate, this.analyser.fftSize, hz) : [];
    const strongest = strongestHarmonic(harmonics);
    const formants = findFormants(linear, this.ctx.sampleRate, this.analyser.fftSize);

    const frame: AnalysisFrame = {
      time: performance.now(),
      hz,
      note: hz > 0 ? hzToNote(hz) : '—',
      cents: hz > 0 ? hzToCents(hz) : 0,
      confidence: pitch.confidence,
      rms,
      harmonics,
      strongest,
      formants,
      waveform: this.timeBuf.slice(),
      spectrum: linear,
      sampleRate: this.ctx.sampleRate,
      fftSize: this.analyser.fftSize,
    };

    for (const fn of this.listeners) fn(frame);
    this.raf = requestAnimationFrame(this.loop);
  };
}

/** Singleton for the app */
export const audioEngine = new AudioEngine();
