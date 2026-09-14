/** Musical note / pitch utilities */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** A4 reference frequency (Hz) */
export const A4_HZ = 440;

/** Convert frequency to MIDI note number (can be fractional) */
export function hzToMidi(hz: number): number {
  if (hz <= 0) return NaN;
  return 69 + 12 * Math.log2(hz / A4_HZ);
}

/** MIDI number → nearest note name + octave (e.g. "E2") */
export function midiToNoteName(midi: number): string {
  if (!Number.isFinite(midi)) return '—';
  const rounded = Math.round(midi);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return `${name}${octave}`;
}

/** Frequency → note name + octave */
export function hzToNote(hz: number): string {
  return midiToNoteName(hzToMidi(hz));
}

/** Cents offset from nearest equal-tempered note (−50 … +50) */
export function hzToCents(hz: number): number {
  const midi = hzToMidi(hz);
  if (!Number.isFinite(midi)) return 0;
  return (midi - Math.round(midi)) * 100;
}

/** Frequency of a MIDI note */
export function midiToHz(midi: number): number {
  return A4_HZ * Math.pow(2, (midi - 69) / 12);
}

/** Format Hz for display */
export function formatHz(hz: number, digits = 1): string {
  if (!Number.isFinite(hz) || hz <= 0) return '—';
  return hz.toFixed(digits);
}

/** Format cents with sign */
export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) return '—';
  const sign = cents >= 0 ? '+' : '';
  return `${sign}${cents.toFixed(1)}¢`;
}
