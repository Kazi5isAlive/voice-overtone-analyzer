/**
 * Harmonic & formant analysis from frequency-domain magnitude data.
 */

export interface HarmonicPeak {
  n: number; // harmonic number (1 = f0)
  hz: number;
  magnitude: number; // linear magnitude at bin
  db: number;
}

export interface FormantPeak {
  hz: number;
  magnitude: number;
  db: number;
  label: string; // F1, F2, …
}

function magToDb(m: number): number {
  return 20 * Math.log10(Math.max(m, 1e-12));
}

/**
 * Measure energy at integer multiples of f0.
 * Uses a small bin window around each target frequency.
 */
export function analyzeHarmonics(
  magnitudes: Float32Array,
  sampleRate: number,
  fftSize: number,
  f0: number,
  maxHarmonics = 16,
): HarmonicPeak[] {
  if (f0 <= 0 || magnitudes.length === 0) return [];
  const binHz = sampleRate / fftSize;
  const peaks: HarmonicPeak[] = [];
  const halfWindow = Math.max(1, Math.round((f0 * 0.03) / binHz)); // ±3% of f0

  for (let n = 1; n <= maxHarmonics; n++) {
    const target = f0 * n;
    if (target >= sampleRate / 2) break;
    const center = Math.round(target / binHz);
    let maxMag = 0;
    let maxBin = center;
    for (let b = Math.max(1, center - halfWindow); b <= Math.min(magnitudes.length - 1, center + halfWindow); b++) {
      const m = magnitudes[b]!;
      if (m > maxMag) {
        maxMag = m;
        maxBin = b;
      }
    }
    peaks.push({
      n,
      hz: maxBin * binHz,
      magnitude: maxMag,
      db: magToDb(maxMag),
    });
  }
  return peaks;
}

/** Strongest harmonic above f0 (or f0 itself if none stronger) */
export function strongestHarmonic(peaks: HarmonicPeak[]): HarmonicPeak | null {
  if (peaks.length === 0) return null;
  let best = peaks[0]!;
  for (const p of peaks) {
    if (p.magnitude > best.magnitude) best = p;
  }
  return best;
}

/**
 * Find formant-like peaks: local maxima in a smoothed spectrum,
 * independent of f0 (vocal tract resonances).
 * Searches roughly 200–4000 Hz typical for vowels.
 */
export function findFormants(
  magnitudes: Float32Array,
  sampleRate: number,
  fftSize: number,
  maxFormants = 4,
  minHz = 200,
  maxHz = 4000,
): FormantPeak[] {
  const binHz = sampleRate / fftSize;
  const start = Math.max(1, Math.floor(minHz / binHz));
  const end = Math.min(magnitudes.length - 2, Math.floor(maxHz / binHz));

  // Light smoothing
  const smooth = new Float32Array(magnitudes.length);
  for (let i = start; i <= end; i++) {
    smooth[i] =
      (magnitudes[i - 1]! + magnitudes[i]! + magnitudes[i + 1]!) / 3;
  }

  // Local maxima
  const candidates: { bin: number; mag: number }[] = [];
  for (let i = start + 1; i < end; i++) {
    if (smooth[i]! > smooth[i - 1]! && smooth[i]! >= smooth[i + 1]! && smooth[i]! > 1e-6) {
      candidates.push({ bin: i, mag: smooth[i]! });
    }
  }
  candidates.sort((a, b) => b.mag - a.mag);

  // Greedy pick with minimum separation (~300 Hz)
  const minSepBins = Math.round(300 / binHz);
  const chosen: typeof candidates = [];
  for (const c of candidates) {
    if (chosen.every((x) => Math.abs(x.bin - c.bin) >= minSepBins)) {
      chosen.push(c);
      if (chosen.length >= maxFormants) break;
    }
  }
  chosen.sort((a, b) => a.bin - b.bin);

  return chosen.map((c, i) => ({
    hz: c.bin * binHz,
    magnitude: c.mag,
    db: magToDb(c.mag),
    label: `F${i + 1}`,
  }));
}
