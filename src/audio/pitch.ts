/**
 * YIN pitch detection (de Cheveigné & Kawahara, 2002)
 * Tuned for sustained vocal drones / overtone singing.
 */

export interface PitchResult {
  hz: number;
  confidence: number; // 0–1, higher = more confident
}

const DEFAULT_THRESHOLD = 0.15;

/**
 * Estimate fundamental frequency from a mono float32 buffer.
 * @param samples - time-domain samples (−1…1)
 * @param sampleRate - Hz
 * @param minHz - lowest expected pitch
 * @param maxHz - highest expected pitch
 */
export function detectPitchYIN(
  samples: Float32Array,
  sampleRate: number,
  minHz = 60,
  maxHz = 1000,
): PitchResult {
  const n = samples.length;
  if (n < 2) return { hz: 0, confidence: 0 };

  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz));
  const tauMax = Math.min(Math.floor(n / 2), Math.floor(sampleRate / minHz));
  if (tauMax <= tauMin) return { hz: 0, confidence: 0 };

  // Difference function
  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < n - tau; i++) {
      const delta = samples[i]! - samples[i + tau]!;
      sum += delta * delta;
    }
    d[tau] = sum;
  }

  // Cumulative mean normalized difference
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau]!;
    cmnd[tau] = running > 0 ? (d[tau]! * tau) / running : 1;
  }

  // Absolute threshold
  let tauEstimate = -1;
  for (let tau = tauMin; tau <= tauMax; tau++) {
    if (cmnd[tau]! < DEFAULT_THRESHOLD) {
      while (tau + 1 <= tauMax && cmnd[tau + 1]! < cmnd[tau]!) tau++;
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate < 0) {
    // Fall back to global minimum in range
    let minVal = Infinity;
    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (cmnd[tau]! < minVal) {
        minVal = cmnd[tau]!;
        tauEstimate = tau;
      }
    }
    if (minVal > 0.5) return { hz: 0, confidence: 0 };
  }

  // Parabolic interpolation
  const x0 = tauEstimate > 0 ? tauEstimate - 1 : tauEstimate;
  const x2 = tauEstimate + 1 <= tauMax ? tauEstimate + 1 : tauEstimate;
  let betterTau = tauEstimate;
  if (x0 !== tauEstimate && x2 !== tauEstimate) {
    const s0 = cmnd[x0]!;
    const s1 = cmnd[tauEstimate]!;
    const s2 = cmnd[x2]!;
    const denom = 2 * (2 * s1 - s2 - s0);
    if (denom !== 0) {
      betterTau = tauEstimate + (s2 - s0) / denom;
    }
  }

  const hz = sampleRate / betterTau;
  const confidence = Math.max(0, Math.min(1, 1 - cmnd[tauEstimate]!));
  if (hz < minHz || hz > maxHz) return { hz: 0, confidence: 0 };
  return { hz, confidence };
}

/** Simple RMS energy */
export function rmsEnergy(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i]! * samples[i]!;
  return Math.sqrt(sum / samples.length);
}
