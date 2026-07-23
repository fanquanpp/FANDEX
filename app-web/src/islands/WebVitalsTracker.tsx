/**
 * Web Vitals 采集组件 (WebVitalsTracker)
 * =======================================
 * 功能概述：
 * - 使用 web-vitals 库采集 LCP / INP / CLS / TTFB / FCP 五项核心性能指标
 * - 采集结果通过 observability-service 持久化到 localStorage
 * - 开发环境（import.meta.env.DEV）下输出到 console 便于调试
 * - 暴露全局导出 API：window.__fandexExportVitals() 返回 JSON 字符串
 *
 * 数据流：
 * - web-vitals 回调 → 构造 VitalRecord → recordVital() 写入 localStorage
 * - DEV 模式额外 console.log 指标详情
 * - window.__fandexExportVitals() 调用 exportVitalsJSON() 导出全部记录
 *
 * 使用方式：
 * - 在 BaseLayout.astro 中通过 <WebVitalsTracker client:load /> 引入
 * - client:load 确保仅在浏览器端水合，SSR 阶段不执行采集
 *
 * 注意事项：
 * - 组件无 UI 输出，仅作为采集器存在（return null）
 * - useEffect 注册 web-vitals 回调，effect 清理函数在卸载时调用（web-vitals 自动管理订阅）
 */
import { useEffect } from 'react';
import { onLCP, onINP, onCLS, onTTFB, onFCP, type Metric } from 'web-vitals';
import {
  recordVital,
  exportVitalsJSON,
  type VitalName,
  type VitalRating,
} from '@services/observability-service';

/**
 * web-vitals 库的 Metric 对象中 name 字段类型为 string
 * 此处通过类型守卫收敛为 VitalName 联合类型，避免 any
 */
function isVitalName(name: string): name is VitalName {
  return name === 'LCP' || name === 'INP' || name === 'CLS' || name === 'TTFB' || name === 'FCP';
}

/**
 * web-vitals 库的 Metric.rating 类型为 string
 * 此处收敛为 VitalRating 联合类型，避免 any
 */
function toVitalRating(rating: string): VitalRating {
  if (rating === 'good' || rating === 'needs-improvement' || rating === 'poor') {
    return rating;
  }
  // 未知评级回退为 needs-improvement
  return 'needs-improvement';
}

/**
 * 处理 web-vitals 回调的统一函数
 * 构造 VitalRecord 并写入 Service 层，DEV 模式下额外输出 console
 * @param metric - web-vitals 库返回的指标对象
 */
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
  // 开发环境输出到 console 便于调试
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(
      `[WebVitals] ${metric.name} = ${metric.value.toFixed(2)} (${metric.rating})`,
      metric
    );
  }
}

/**
 * 组件 props 接口
 * WebVitalsTracker 无外部 props，定义空接口以保持组件接口一致性
 */
interface WebVitalsTrackerProps {}

/**
 * Web Vitals 采集器组件
 * 无 UI 输出，仅在客户端挂载时注册采集回调并暴露全局导出 API
 */
export function WebVitalsTracker({}: WebVitalsTrackerProps = {}) {
  useEffect(() => {
    /** 保存 web-vitals 取消订阅函数，组件卸载时调用 */
    let cleanup: (() => void) | null = null;
    try {
      // 注册五项核心指标的采集回调
      const unsubs: Array<() => void> = [];
      unsubs.push(onLCP(handleMetric));
      unsubs.push(onINP(handleMetric));
      unsubs.push(onCLS(handleMetric));
      unsubs.push(onTTFB(handleMetric));
      unsubs.push(onFCP(handleMetric));
      cleanup = () => {
        for (const unsub of unsubs) {
          try {
            unsub();
          } catch {
            // 取消订阅异常时静默忽略
          }
        }
      };
      // 暴露全局导出 API，供开发者工具或外部脚本调用
      // window.__fandexExportVitals 类型由 src/types/global.d.ts 统一声明
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
    // 组件卸载时清理订阅，防止内存泄漏与回调遗留
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

  // 采集器组件无 UI 输出
  return null;
}

export default WebVitalsTracker;
