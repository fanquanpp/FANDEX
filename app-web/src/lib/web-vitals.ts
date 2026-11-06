/**
 * WebVitalsTracker vanilla 版（S4 运行时优化批次：岛屿去 React 化）。
 *
 * 原实现为 React island（WebVitalsTracker.tsx，BaseLayout client:idle），渲染 null
 * 却让每个页面常驻 react-dom 水合运行时。移植为 vanilla 模块后由 BaseLayout.astro
 * 的普通 <script> 装载：无 DOM 标记、无水合，整页会话只注册一次。
 *
 * 与原 island 的差异（有意为之）：React 版在每次 ClientRouter 换页时随岛卸载
 * 解绑、新页重新订阅；vanilla 版监听器跨换页持续有效——web-vitals 的指标
 * 本就以「一次页面加载」为口径，CLS 会话窗口在软导航间本就连续累积，
 * 持久订阅与该口径一致，且省去逐页重注册。因此不设 astro:before-swap 清理。
 *
 * 上报通道不变：recordVital 写 localStorage（observability-service，性能面板
 * 与 window.__fandexExportVitals 导出消费），DEV 环境附 console 诊断输出。
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
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
      metric,
    );
  }
}

let started = false;

/**
 * BaseLayout 脚本入口：注册全部 vitals 指标监听并挂导出钩子。
 * 幂等（整页会话一次）；预渲染期求值安全（SSR 守卫内零执行）。
 */
export function initWebVitalsTracking(): void {
  if (!import.meta.env.SSR && typeof document !== 'undefined' && !started) {
    started = true;
    try {
      // web-vitals 内部按指标维护单例观察者，重复订阅才会重复回调；
      // 此处整页会话只注册一次，无需解绑（见模块注释）
      onLCP(handleMetric);
      onINP(handleMetric);
      onCLS(handleMetric);
      onTTFB(handleMetric);
      onFCP(handleMetric);
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
  }
}
