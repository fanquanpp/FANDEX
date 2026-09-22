import { t } from './i18n';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPromptEvent | null = null;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  const iosLike = /iphone|ipad|ipod/i.test(ua);
  const ipadOs = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return iosLike || ipadOs;
}

function hideButtons(): void {
  document.querySelectorAll<HTMLElement>('[data-install-app]').forEach((btn) => {
    btn.hidden = true;
  });
}

function revealButtons(): void {
  document.querySelectorAll<HTMLElement>('[data-install-app]').forEach((btn) => {
    btn.hidden = false;
  });
}

function removeTip(): void {
  document.querySelector('.install-tip')?.remove();
}

function showTip(): void {
  removeTip();
  const tip = document.createElement('div');
  tip.className = 'install-tip';
  tip.setAttribute('role', 'note');
  tip.textContent = t('pwa.iosTip');
  document.body.appendChild(tip);
  window.setTimeout(removeTip, 5000);
}

function bindInstallButtons(): void {
  if (isStandalone()) {
    hideButtons();
    return;
  }

  document.querySelectorAll<HTMLElement>('[data-install-app]').forEach((btn) => {
    if (btn.dataset.installBound === 'true') return;
    btn.dataset.installBound = 'true';

    if (deferredPrompt || isIos()) {
      btn.hidden = false;
    }

    btn.addEventListener('click', () => {
      if (deferredPrompt) {
        const event = deferredPrompt;
        deferredPrompt = null;
        if (typeof event.prompt !== 'function') return;
        void event.prompt().then(() => event.userChoice).then((choice) => {
          if (choice.outcome === 'accepted') hideButtons();
        }).catch(() => {
          // 用户关闭浏览器级弹窗等异常：回到待安装态，事件不再重放
        });
        return;
      }
      if (isIos()) {
        showTip();
      }
    });
  });
}

if (!import.meta.env.SSR && typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    revealButtons();
  });

  window.addEventListener('appinstalled', hideButtons);

  bindInstallButtons();
  document.addEventListener('astro:page-load', () => {
    bindInstallButtons();
  });
}
