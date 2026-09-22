import { t } from './i18n';

interface SwUpdateMessage {
  type: 'SW_CONTENT_UPDATED';
  pathname: string;
}

const AUTO_HIDE_DELAY_MS = 15_000;

let autoHideTimer = 0;

function removeBar(): void {
  document.querySelector('.sw-update-bar')?.remove();
  if (autoHideTimer) {
    window.clearTimeout(autoHideTimer);
    autoHideTimer = 0;
  }
}

function showUpdateBar(): void {
  if (document.querySelector('.sw-update-bar')) return;

  const bar = document.createElement('div');
  bar.className = 'sw-update-bar';
  bar.setAttribute('role', 'status');

  const text = document.createElement('span');
  text.className = 'sw-update-bar-text';
  text.textContent = t('swUpdate.updated');
  bar.appendChild(text);

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'sw-update-bar-refresh';
  refreshBtn.textContent = t('swUpdate.refresh');
  refreshBtn.addEventListener('click', () => window.location.reload());
  bar.appendChild(refreshBtn);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'sw-update-bar-close';
  closeBtn.setAttribute('aria-label', t('swUpdate.closeAria'));
  closeBtn.textContent = t('swUpdate.close');
  closeBtn.addEventListener('click', removeBar);
  bar.appendChild(closeBtn);

  document.body.appendChild(bar);

  requestAnimationFrame(() => bar.classList.add('is-visible'));

  autoHideTimer = window.setTimeout(removeBar, AUTO_HIDE_DELAY_MS);
}

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  navigator.serviceWorker?.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as SwUpdateMessage | undefined;
    if (data?.type !== 'SW_CONTENT_UPDATED') return;
    if (new URL(data.pathname, location.href).pathname !== location.pathname) return;
    showUpdateBar();
  });

  document.addEventListener('astro:before-swap', removeBar);
}
