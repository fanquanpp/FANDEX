/**
 * 可观测性服务模块
 *
 * 功能概述：
 * 统一管理 Web Vitals 性能指标的采集、存储、查询与导出。
 * 采集 LCP / INP / CLS / TTFB / FCP 五项核心指标，按 rating 分级
 * （good / needs-improvement / poor），数据持久化到 localStorage，
 * 保留最近 100 次记录，支持分位数统计（p50 / p75 / p95）。
 *
 * 数据流：
 * - WebVitalsTracker.vue 通过 onLCP/onINP 等回调采集指标 → recordVital()
 * - recordVital() 写入 localStorage（key: fandex-web-vitals）并截断至 100 条
 * - getVitals() / getVitalsSummary() 提供查询接口
 * - exportVitalsJSON() 输出可下载的 JSON 字符串
 *
 * SSR 安全：
 * - Astro 构建阶段（SSR）localStorage 不可用
 * - 所有函数在 SSR 阶段安全返回空数据或空操作，不抛异常
 *
 * 依赖规则：
 * - 仅使用浏览器原生 localStorage API，不引入外部依赖
 * - 不包含任何视图代码，符合 Service 层职责
 */

/** Web Vitals 指标名称类型 */
export type VitalName = 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP';

/** 指标评级：good 良好 / needs-improvement 需改进 / poor 较差 */
export type VitalRating = 'good' | 'needs-improvement' | 'poor';

/** 单条 Web Vitals 记录 */
export interface VitalRecord {
  /** 指标名称 */
  name: VitalName;
  /** 指标数值（LCP/INP/TTFB/FCP 单位为毫秒，CLS 为无量纲小数） */
  value: number;
  /** 评级 */
  rating: VitalRating;
  /** 采集时间戳（performance.timeOrigin + now，等价于 Date.now()） */
  timestamp: number;
  /** 采集页面 URL */
  url: string;
}

/** 单项指标的分位数统计结果 */
export interface VitalPercentiles {
  /** 中位数（p50） */
  p50: number;
  /** p75 分位数 */
  p75: number;
  /** p95 分位数 */
  p95: number;
}

/** 全部指标的汇总统计 */
export interface VitalsSummary {
  lcp: VitalPercentiles;
  inp: VitalPercentiles;
  cls: VitalPercentiles;
  ttfb: VitalPercentiles;
  fcp: VitalPercentiles;
}

/** localStorage 存储键名 */
const STORAGE_KEY = 'fandex-web-vitals';

/** 最大保留记录条数 */
const MAX_RECORDS = 100;

/** localStorage 中存储的记录数组类型 */
type StoredVitals = VitalRecord[];

/**
 * 从 localStorage 读取全部 Web Vitals 记录
 * SSR 或读取异常时返回空数组
 * @returns Web Vitals 记录数组（按时间倒序，最新在前）
 */
function readStorage(): StoredVitals {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 逐项校验数据结构，过滤掉不合法的记录
    return parsed.filter(isValidVitalRecord);
  } catch {
    return [];
  }
}

/**
 * 校验未知对象是否为合法的 VitalRecord
 * 防止 localStorage 中存储的旧数据或损坏数据导致后续处理异常
 * @param value - 待校验的值
 * @returns 是否为合法 VitalRecord
 */
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

/**
 * 将记录数组写入 localStorage
 * 写入前截断至 MAX_RECORDS 条，保留最新的记录
 * @param data - 待写入的记录数组
 */
function writeStorage(data: StoredVitals): void {
  if (typeof localStorage === 'undefined') return;
  try {
    // 仅保留最新的 MAX_RECORDS 条记录
    const truncated = data.slice(0, MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(truncated));
  } catch {
    // 存储空间不足或 SSR 阶段静默忽略
  }
}

/**
 * 记录一条 Web Vitals 指标
 * 新记录插入数组头部（最新在前），并截断至 MAX_RECORDS 条
 * @param vital - 待记录的 Web Vitals 指标
 */
export function recordVital(vital: VitalRecord): void {
  try {
    const all = readStorage();
    all.unshift(vital);
    writeStorage(all);
  } catch {
    // 异常时静默忽略，不影响主流程
  }
}

/**
 * 查询最近的 Web Vitals 记录
 * @param limit - 返回记录条数上限（默认全部返回）
 * @returns 记录数组（按时间倒序）
 */
export function getVitals(limit?: number): VitalRecord[] {
  try {
    const all = readStorage();
    if (limit === undefined || limit <= 0) return all;
    return all.slice(0, Math.min(limit, all.length));
  } catch {
    return [];
  }
}

/**
 * 计算单指标的分位数统计
 * 使用线性插值法计算 p50 / p75 / p95
 * @param values - 该指标的所有数值（无需预排序）
 * @returns 分位数统计结果；无数据时返回全 0
 */
function computePercentiles(values: number[]): VitalPercentiles {
  if (values.length === 0) {
    return { p50: 0, p75: 0, p95: 0 };
  }
  // 升序排序副本，避免污染原数组
  const sorted = [...values].sort((a, b) => a - b);
  return {
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
  };
}

/**
 * 计算已排序数组的指定分位数
 * 使用线性插值法：rank = (p / 100) * (n - 1)
 * @param sorted - 升序排序后的数值数组
 * @param p - 分位数（0-100）
 * @returns 分位数值
 */
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

/**
 * 获取全部 Web Vitals 指标的汇总统计（p50 / p75 / p95）
 * @returns 汇总统计对象；无数据时各项均为 0
 */
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

/**
 * 清空全部 Web Vitals 记录
 */
export function clearVitals(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 异常时静默忽略
  }
}

/**
 * 导出全部 Web Vitals 记录为 JSON 字符串
 * 用于下载或上传到外部监控平台
 * @returns JSON 字符串；无数据时返回空数组字符串
 */
export function exportVitalsJSON(): string {
  try {
    const all = readStorage();
    return JSON.stringify(all, null, 2);
  } catch {
    return '[]';
  }
}
