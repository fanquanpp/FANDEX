/**
 * text — 文本特效：拆字入场与解密显形。
 *
 * data-fx-split="rise|pop|flip"：字符级拆分入场，CSS 动画错峰；
 * data-fx-decrypt：乱码滚动后逐位落定（GLYPHS 扰码池）。
 *
 * 可访问性：拆分后整段加 aria-label 原文、字符 span aria-hidden；
 * prefers-reduced-motion 下一律返回原文不动。
 */

import { prefersReducedMotion } from '../capabilities';

import type { FxDispose } from '../registry';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+-<>[]{}';

export function mountSplit(host: HTMLElement): FxDispose {
  if (prefersReducedMotion()) return () => {};

  const effect = host.dataset.fxSplit || 'rise';
  if (!['rise', 'pop', 'flip'].includes(effect)) return () => {};
  if (host.dataset.fxSplitApplied === 'true') return () => {};
  host.dataset.fxSplitApplied = 'true';

  const stagger = Number.parseFloat(host.dataset.fxSplitStagger ?? '') || 26;
  const baseDelay = Number.parseFloat(host.dataset.fxSplitDelay ?? '') || 0;
  const text = host.textContent ?? '';
  const chars = Array.from(text);
  host.setAttribute('aria-label', text);
  host.classList.add('fx-split', `fx-split--${effect}`);
  host.textContent = '';
  chars.forEach((char, index) => {
    const span = document.createElement('span');
    span.className = 'fx-split__char';
    span.setAttribute('aria-hidden', 'true');
    span.style.setProperty('--fx-char-i', String(index));
    span.style.animationDelay = `${baseDelay + index * stagger}ms`;
    span.textContent = char === ' ' ? '\u00a0' : char;
    host.appendChild(span);
  });
  return () => {};
}

export function mountDecrypt(host: HTMLElement): FxDispose {
  if (prefersReducedMotion()) return () => {};
  const original = host.dataset.fxDecryptText ?? host.textContent ?? '';
  if (!original) return () => {};
  if (host.dataset.fxDecryptApplied === 'true') return () => {};
  host.dataset.fxDecryptApplied = 'true';
  host.dataset.fxDecryptText = original;

  const speed = Math.max(12, Number.parseFloat(host.dataset.fxDecryptSpeed ?? '') || 30);
  const hold = Math.max(0, Number.parseFloat(host.dataset.fxDecryptDelay ?? '') || 0);
  const total = Array.from(original).length;
  host.classList.add('fx-decrypt');
  host.setAttribute('aria-label', original);
  host.textContent = '';

  let frame = 0;
  let timer = 0;
  let started = false;

  const start = () => {
    if (started) return;
    started = true;
    timer = window.setInterval(() => {
      frame += 1;
      const revealed = Math.floor(frame / 2);
      host.textContent = Array.from(original)
        .map((char, index) => {
          if (index < revealed || char === ' ') return char;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join('');
      if (revealed >= total) {
        window.clearInterval(timer);
        timer = 0;
        host.textContent = original;
        host.classList.add('fx-decrypt--done');
      }
    }, speed);
  };

  const kickoff = hold > 0 ? window.setTimeout(start, hold) : (start(), 0);
  const timeout = kickoff;

  return () => {
    if (timer) window.clearInterval(timer);
    if (timeout) window.clearTimeout(timeout);
    host.textContent = original;
  };
}
