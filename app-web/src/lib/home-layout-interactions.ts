
const FULLSCREEN_STORAGE_KEY = 'fandex-fullscreen';

let fullscreenHandler: (() => void) | null = null;

function initHomeLayoutInteractions(): void {
  const btn = document.getElementById('home-fullscreen-btn');
  if (!btn) return;

  if (btn.dataset.bound !== 'true') {
    btn.dataset.bound = 'true';
    btn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  if (fullscreenHandler === null) {
    fullscreenHandler = () => {
      if (document.fullscreenElement) {
        try {
          localStorage.setItem(FULLSCREEN_STORAGE_KEY, 'true');
        } catch {
          /* 隐私模式下 localStorage 不可用，静默处理 */
        }
      } else {
        try {
          localStorage.removeItem(FULLSCREEN_STORAGE_KEY);
        } catch {
          /* 同上 */
        }
      }
    };
    document.addEventListener('fullscreenchange', fullscreenHandler);
  }

  try {
    if (localStorage.getItem(FULLSCREEN_STORAGE_KEY) === 'true' && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } catch {
    /* localStorage 读取失败时静默处理 */
  }
}

initHomeLayoutInteractions();
document.addEventListener('astro:page-load', initHomeLayoutInteractions);
