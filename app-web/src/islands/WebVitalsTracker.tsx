import { useEffect } from 'react';
import { onLCP, onINP, onCLS, onTTFB, onFCP, type Metric } from 'web-vitals';
import {
  recordVital,
  exportVitalsJSON,
  type VitalName,
  type VitalRating,
} from '@services/observability-service';

function isVitalName(name: string): name is VitalName {
  return name === 'LCP' || name === 'INP' || name === 'CLS' || name === 'TTFB' || name === 'FCP';
}

function toVitalRating(rating: string): VitalRating {
  if (rating === 'good' || rating === 'needs-improvement' || rating === 'poor') {
    return rating;
  }
  return 'needs-improvement';
}

function handleMetric(metric: Metric): void {
  if (!isVitalName(metric.name)) return;
  const record = {
    name: metric.name,
    value: metric.value,
    rating: toVitalRating(metric.rating),
    timestamp: Date.now(),
    url: window.location.href,
  };
  try {
    recordVital(record);
  } catch {
    // Service 层异常时静默忽略
  }
  if (import.meta.env.DEV) {
    console.log( // 仅 DEV 环境的诊断输出（非生产日志）
      `[WebVitals] ${metric.name} = ${metric.value.toFixed(2)} (${metric.rating})`,
      metric
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 岛屿约定保留空接口：Record<string, never> 会拒绝 Astro 的 client:* 属性传递
interface WebVitalsTrackerProps {}

export function WebVitalsTracker(_props: WebVitalsTrackerProps) {
  useEffect(() => {
    let cleanup: (() => void) | null = null;
    try {
      const unsubs: Array<void | (() => void)> = [];
      unsubs.push(onLCP(handleMetric));
      unsubs.push(onINP(handleMetric));
      unsubs.push(onCLS(handleMetric));
      unsubs.push(onTTFB(handleMetric));
      unsubs.push(onFCP(handleMetric));
      cleanup = () => {
        for (const unsub of unsubs) {
          if (typeof unsub === 'function') {
            try {
              unsub();
            } catch {
              // 取消订阅异常时静默忽略
            }
          }
        }
      };
      window.__fandexExportVitals = () => {
        try {
          return exportVitalsJSON();
        } catch {
          return '[]';
        }
      };
    } catch {
      // web-vitals 初始化异常时静默忽略
    }
    return () => {
      if (cleanup) {
        try {
          cleanup();
        } catch {
          // 清理异常时静默忽略
        }
      }
    };
  }, []);

  return null;
}

export default WebVitalsTracker;
