import { RUNTIME } from '@/config/runtime';

export const SITE = {
  title: 'FANDEX',
  subtitle: '循序渐进',
  url: RUNTIME.siteUrl,
  author: 'fanquanpp',
  lang: 'zh-CN',
};

export const IS_DESKTOP_BUILD = process.env.DESKTOP_BUILD === '1';

export const MODULE_PAGE_SIZE = 60;
