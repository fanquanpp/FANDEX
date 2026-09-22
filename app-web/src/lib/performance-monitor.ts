
import type { VitalRecord, VitalName, VitalPercentiles } from '@services/observability-service';

function clearMonitorInterval(panel: HTMLElement): void {
  const existing = panel.dataset.intervalId;
  if (existing) {
    const id = Number(existing);
    if (!Number.isNaN(id)) window.clearInterval(id);
    delete panel.dataset.intervalId;
  }
}

function initPerformanceMonitor(): void {
  const panel = document.getElementById('fandex-perf-monitor');
  if (!panel) return;

  clearMonitorInterval(panel);

  const toggleBtn = document.getElementById('perf-monitor-toggle');
  const closeBtn = document.getElementById('perf-monitor-close');
  const vitalsGrid = document.getElementById('perf-vitals-grid');
  const summaryEl = document.getElementById('perf-summary');
  const waterfallEl = document.getElementById('perf-waterfall');
  const exportBtn = document.getElementById('perf-export');
  const clearBtn = document.getElementById('perf-clear');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      panel.style.display = 'none';
      clearMonitorInterval(panel);
    });
  }

  type ObservabilityModule = typeof import('@services/observability-service');
  async function loadObservability(): Promise<ObservabilityModule | null> {
    try {
      const mod = await import('@services/observability-service');
      return mod;
    } catch {
      return null;
    }
  }

  function formatMs(value: number): string {
    if (!value || value === 0) return '—';
    if (value < 10) return value.toFixed(1) + 'ms';
    return Math.round(value) + 'ms';
  }

  function formatCls(value: number): string {
    if (!value || value === 0) return '—';
    return value.toFixed(3);
  }

  function ratingClass(rating: string): string {
    if (rating === 'good') return 'rating-good';
    if (rating === 'needs-improvement') return 'rating-needs-improvement';
    return 'rating-poor';
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function renderVitals(): Promise<void> {
    if (!vitalsGrid) return;
    const mod = await loadObservability();
    if (!mod) return;
    try {
      const all = mod.getVitals(20);
      const latest = new Map<string, VitalRecord>();
      for (const v of all) {
        if (!latest.has(v.name)) latest.set(v.name, v);
      }
      const names: VitalName[] = ['LCP', 'INP', 'CLS', 'TTFB', 'FCP'];
      const html = names
        .map((name) => {
          const v = latest.get(name);
          const value = v ? (name === 'CLS' ? formatCls(v.value) : formatMs(v.value)) : '—';
          const rating = v ? v.rating : 'good';
          return `
            <div class="perf-vital-card ${ratingClass(rating)}">
              <div class="perf-vital-name">${name}</div>
              <div class="perf-vital-value">${value}</div>
            </div>
          `;
        })
        .join('');
      vitalsGrid.innerHTML = html;
    } catch {
      vitalsGrid.innerHTML = '<p class="perf-empty">读取失败</p>';
    }
  }

  async function renderSummary(): Promise<void> {
    if (!summaryEl) return;
    const mod = await loadObservability();
    if (!mod) return;
    try {
      const s = mod.getVitalsSummary();
      const rows: Array<{ label: string; p: VitalPercentiles; fmt: (v: number) => string }> = [
        { label: 'LCP', p: s.lcp, fmt: formatMs },
        { label: 'INP', p: s.inp, fmt: formatMs },
        { label: 'CLS', p: s.cls, fmt: formatCls },
        { label: 'TTFB', p: s.ttfb, fmt: formatMs },
        { label: 'FCP', p: s.fcp, fmt: formatMs },
      ];
      const html = rows
        .map(
          (r) => `
          <div class="perf-summary-row">
            <span class="perf-summary-label">${r.label}</span>
            <span class="perf-summary-values">p50 ${r.fmt(r.p.p50)} · p75 ${r.fmt(r.p.p75)} · p95 ${r.fmt(r.p.p95)}</span>
          </div>
        `,
        )
        .join('');
      summaryEl.innerHTML = html;
    } catch {
      summaryEl.innerHTML = '<p class="perf-empty">读取失败</p>';
    }
  }

  function renderWaterfall(): void {
    if (!waterfallEl) return;
    try {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const recent = entries.slice(-20).sort((a, b) => a.startTime - b.startTime);
      if (recent.length === 0) {
        waterfallEl.innerHTML = '<p class="perf-empty">暂无资源加载记录</p>';
        return;
      }
      const maxEnd = Math.max(...recent.map((e) => e.responseEnd));
      const minStart = Math.min(...recent.map((e) => e.startTime));
      const totalSpan = Math.max(maxEnd - minStart, 1);
      const html = recent
        .map((e) => {
          const safeName = escapeHtml(e.name.split('/').pop() || e.name);
          const safeTitle = escapeHtml(e.name);
          const left = ((e.startTime - minStart) / totalSpan) * 100;
          const width = Math.max((e.duration / totalSpan) * 100, 2);
          const duration =
            e.duration < 10 ? e.duration.toFixed(1) + 'ms' : Math.round(e.duration) + 'ms';
          return `
            <div class="perf-waterfall-item">
              <span class="perf-waterfall-name" title="${safeTitle}">${safeName}</span>
              <div class="perf-waterfall-bar-container">
                <div class="perf-waterfall-bar" style="left:${left}%;width:${width}%"></div>
              </div>
              <span class="perf-waterfall-duration">${duration}</span>
            </div>
          `;
        })
        .join('');
      waterfallEl.innerHTML = html;
    } catch {
      waterfallEl.innerHTML = '<p class="perf-empty">读取失败</p>';
    }
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const mod = await loadObservability();
      if (!mod) return;
      try {
        const json = mod.exportVitalsJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fandex-web-vitals.json';
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        // 异常时静默忽略
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      const mod = await loadObservability();
      if (!mod) return;
      try {
        mod.clearVitals();
        await renderVitals();
        await renderSummary();
      } catch {
        // 异常时静默忽略
      }
    });
  }

  void renderVitals();
  void renderSummary();
  renderWaterfall();

  const intervalId = window.setInterval(() => {
    void renderVitals();
    void renderSummary();
    renderWaterfall();
  }, 2000);
  panel.dataset.intervalId = String(intervalId);
}

document.addEventListener('astro:before-swap', () => {
  const panel = document.getElementById('fandex-perf-monitor');
  if (panel) clearMonitorInterval(panel);
});
document.addEventListener('astro:page-load', initPerformanceMonitor);
initPerformanceMonitor();
