import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface MetricSample {
  t: number; // ms from recording start
  hz: number;
  note: string;
  cents: number;
  strongestHarmonic: number; // harmonic number (1 = f0)
  strongestHarmonicHz: number;
}

export interface RecordingRecord {
  id: string;
  createdAt: number;
  durationMs: number;
  /** Base64-encoded audio/webm blob */
  audioBase64: string;
  mimeType: string;
  metrics: MetricSample[];
  label?: string;
}

export interface SessionLog {
  id: string;
  createdAt: number;
  fundamentalHz: number | null;
  durationSec: number;
  strongestHarmonic: number | null;
  pitchStability: string; // e.g. "stable" | "moderate" | "unstable" | free text
  breathing: string;
  thetaTrack: boolean;
  subjectiveState: string;
  perceptualChanges: string;
  meditationDepth: number; // 1–10
  notes: string;
}

interface AnalyzerDB extends DBSchema {
  recordings: {
    key: string;
    value: RecordingRecord;
    indexes: { 'by-date': number };
  };
  sessions: {
    key: string;
    value: SessionLog;
    indexes: { 'by-date': number };
  };
}

const DB_NAME = 'voice-overtone-analyzer';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AnalyzerDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AnalyzerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const rec = db.createObjectStore('recordings', { keyPath: 'id' });
        rec.createIndex('by-date', 'createdAt');
        const ses = db.createObjectStore('sessions', { keyPath: 'id' });
        ses.createIndex('by-date', 'createdAt');
      },
    });
  }
  return dbPromise;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export async function saveRecording(rec: RecordingRecord): Promise<void> {
  const db = await getDB();
  await db.put('recordings', rec);
}

export async function listRecordings(): Promise<RecordingRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('recordings', 'by-date');
  return all.reverse();
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('recordings', id);
}

export async function saveSession(log: SessionLog): Promise<void> {
  const db = await getDB();
  await db.put('sessions', log);
}

export async function listSessions(): Promise<SessionLog[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('sessions', 'by-date');
  return all.reverse();
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sessions', id);
}

export function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
