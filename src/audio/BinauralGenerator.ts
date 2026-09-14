/**
 * Binaural beats generator — independent of vocal pitch analysis.
 * Left ear: carrier − beat/2, Right ear: carrier + beat/2
 * Requires headphones.
 */

export type BandPreset = 'Delta' | 'Theta' | 'Alpha' | 'Beta' | 'Gamma' | 'Custom';

export const BAND_PRESETS: Record<Exclude<BandPreset, 'Custom'>, { beat: number; base: number; desc: string }> = {
  Delta: { beat: 2, base: 200, desc: '0.5–4 Hz — deep sleep range' },
  Theta: { beat: 6, base: 200, desc: '4–8 Hz — meditative / drowsy' },
  Alpha: { beat: 10, base: 200, desc: '8–12 Hz — relaxed awareness' },
  Beta: { beat: 18, base: 220, desc: '12–30 Hz — alert focus' },
  Gamma: { beat: 40, base: 250, desc: '30–100 Hz — high-frequency binding' },
};

export class BinauralGenerator {
  private ctx: AudioContext | null = null;
  private merger: ChannelMergerNode | null = null;
  private oscL: OscillatorNode | null = null;
  private oscR: OscillatorNode | null = null;
  private gainL: GainNode | null = null;
  private gainR: GainNode | null = null;
  private master: GainNode | null = null;
  private _playing = false;

  get playing(): boolean {
    return this._playing;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  async start(baseHz: number, beatHz: number, volume = 0.2): Promise<void> {
    this.stop();
    this.ctx = new AudioContext();
    await this.ctx.resume();

    const left = baseHz - beatHz / 2;
    const right = baseHz + beatHz / 2;

    this.oscL = this.ctx.createOscillator();
    this.oscR = this.ctx.createOscillator();
    this.oscL.type = 'sine';
    this.oscR.type = 'sine';
    this.oscL.frequency.value = Math.max(20, left);
    this.oscR.frequency.value = Math.max(20, right);

    this.gainL = this.ctx.createGain();
    this.gainR = this.ctx.createGain();
    this.gainL.gain.value = 1;
    this.gainR.gain.value = 1;

    this.master = this.ctx.createGain();
    this.master.gain.value = volume;

    this.merger = this.ctx.createChannelMerger(2);

    this.oscL.connect(this.gainL);
    this.oscR.connect(this.gainR);
    this.gainL.connect(this.merger, 0, 0);
    this.gainR.connect(this.merger, 0, 1);
    this.merger.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.oscL.start();
    this.oscR.start();
    this._playing = true;
  }

  update(baseHz: number, beatHz: number, volume: number): void {
    if (!this.ctx || !this.oscL || !this.oscR || !this.master) return;
    const left = Math.max(20, baseHz - beatHz / 2);
    const right = Math.max(20, baseHz + beatHz / 2);
    const t = this.ctx.currentTime;
    this.oscL.frequency.setTargetAtTime(left, t, 0.05);
    this.oscR.frequency.setTargetAtTime(right, t, 0.05);
    this.master.gain.setTargetAtTime(volume, t, 0.05);
  }

  stop(): void {
    try {
      this.oscL?.stop();
      this.oscR?.stop();
    } catch {
      /* already stopped */
    }
    this.oscL?.disconnect();
    this.oscR?.disconnect();
    this.gainL?.disconnect();
    this.gainR?.disconnect();
    this.merger?.disconnect();
    this.master?.disconnect();
    void this.ctx?.close();
    this.oscL = null;
    this.oscR = null;
    this.gainL = null;
    this.gainR = null;
    this.merger = null;
    this.master = null;
    this.ctx = null;
    this._playing = false;
  }
}

export const binauralGenerator = new BinauralGenerator();
