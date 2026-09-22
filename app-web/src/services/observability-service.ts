
export type VitalName = 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP';

export type VitalRating = 'good' | 'needs-improvement' | 'poor';

export interface VitalRecord {
  name: VitalName;
  value: number;
  rating: VitalRating;
  timestamp: number;
  url: string;
}

export interface VitalPercentiles {
  p50: number;
  p75: number;
  p95: number;
}

export interface VitalsSummary {
  lcp: VitalPercentiles;
  inp: VitalPercentiles;
  cls: VitalPercentiles;
  ttfb: VitalPercentiles;
  fcp: VitalPercentiles;
}

const STORAGE_KEY = 'fandex-web-vitals';

const MAX_RECORDS = 100;

type StoredVitals = VitalRecord[];

function readStorage(): StoredVitals {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidVitalRecord);
  } catch {
    return [];
  }
}

function isValidVitalRecord(value: unknown): value is VitalRecord {
  if (typeof value !== 'object' || value === null) return false;
  const rec = value as Record<string, unknown>;
  return (
    (rec.name === 'LCP' ||
      rec.name === 'INP' ||
      rec.name === 'CLS' ||
      rec.name === 'TTFB' ||
      rec.name === 'FCP') &&
    typeof rec.value === 'number' &&
    (rec.rating === 'good' || rec.rating === 'needs-improvement' || rec.rating === 'poor') &&
    typeof rec.timestamp === 'number' &&
    typeof rec.url === 'string'
  );
}

function writeStorage(data: StoredVitals): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const truncated = data.slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(truncated));
  } catch {
    // 存储空间不足或 SSR 阶段静默忽略
  }
}

export function recordVital(vital: VitalRecord): void {
  try {
    const all = readStorage();
    all.unshift(vital);
    writeStorage(all);
  } catch {
    // 异常时静默忽略，不影响主流程
  }
}

export function getVitals(limit?: number): VitalRecord[] {
  try {
    const all = readStorage();
    if (limit === undefined || limit <= 0) return all;
    return all.slice(0, Math.min(limit, all.length));
  } catch {
    return [];
  }
}

function computePercentiles(values: number[]): VitalPercentiles {
  if (values.length === 0) {
    return { p50: 0, p75: 0, p95: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const rank = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);
  const weight = rank - lower;
  const lowerVal = sorted[lower]!;
  const upperVal = sorted[upper]!;
  return lowerVal + (upperVal - lowerVal) * weight;
}

export function getVitalsSummary(): VitalsSummary {
  try {
    const all = readStorage();
    const lcpValues: number[] = [];
    const inpValues: number[] = [];
    const clsValues: number[] = [];
    const ttfbValues: number[] = [];
    const fcpValues: number[] = [];
    for (const v of all) {
      switch (v.name) {
        case 'LCP':
          lcpValues.push(v.value);
          break;
        case 'INP':
          inpValues.push(v.value);
          break;
        case 'CLS':
          clsValues.push(v.value);
          break;
        case 'TTFB':
          ttfbValues.push(v.value);
          break;
        case 'FCP':
          fcpValues.push(v.value);
          break;
      }
    }
    return {
      lcp: computePercentiles(lcpValues),
      inp: computePercentiles(inpValues),
      cls: computePercentiles(clsValues),
      ttfb: computePercentiles(ttfbValues),
      fcp: computePercentiles(fcpValues),
    };
  } catch {
    return {
      lcp: { p50: 0, p75: 0, p95: 0 },
      inp: { p50: 0, p75: 0, p95: 0 },
      cls: { p50: 0, p75: 0, p95: 0 },
      ttfb: { p50: 0, p75: 0, p95: 0 },
      fcp: { p50: 0, p75: 0, p95: 0 },
    };
  }
}

export function clearVitals(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 异常时静默忽略
  }
}

export function exportVitalsJSON(): string {
  try {
    const all = readStorage();
    return JSON.stringify(all, null, 2);
  } catch {
    return '[]';
  }
}
