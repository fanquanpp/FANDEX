/**
 * constants 工具单元测试
 *
 * 测试目标：覆盖 src/lib/constants.ts 中的 SITE 常量结构
 * - 字段完整性（title/subtitle/url/author/lang）
 * - 字段值正确性
 * - url 与 RUNTIME.siteUrl 一致性
 *
 * 设计说明：
 * constants.ts 依赖 @/config/runtime 的 RUNTIME 对象，RUNTIME 内部使用
 * import.meta.env 读取环境变量。本测试通过 vitest 的 import.meta.env 默认
 * 行为（未设置时返回 undefined）触发 fallback 默认值，验证 SITE 结构稳定。
 */
import { describe, it, expect } from 'vitest';
import { SITE } from '@/lib/constants';
import { RUNTIME } from '@/config/runtime';

describe('SITE 常量', () => {
  describe('字段完整性', () => {
    it('应包含 title 字段且值为字符串', () => {
      expect(typeof SITE.title).toBe('string');
      expect(SITE.title.length).toBeGreaterThan(0);
    });

    it('应包含 subtitle 字段且值为字符串', () => {
      expect(typeof SITE.subtitle).toBe('string');
      expect(SITE.subtitle.length).toBeGreaterThan(0);
    });

    it('应包含 url 字段且值为字符串', () => {
      expect(typeof SITE.url).toBe('string');
      expect(SITE.url.length).toBeGreaterThan(0);
    });

    it('应包含 author 字段且值为字符串', () => {
      expect(typeof SITE.author).toBe('string');
      expect(SITE.author.length).toBeGreaterThan(0);
    });

    it('应包含 lang 字段且值为字符串', () => {
      expect(typeof SITE.lang).toBe('string');
      expect(SITE.lang.length).toBeGreaterThan(0);
    });
  });

  describe('字段值正确性', () => {
    it('title 应为 FANDEX', () => {
      expect(SITE.title).toBe('FANDEX');
    });

    it('subtitle 应为"循序渐进"', () => {
      expect(SITE.subtitle).toBe('循序渐进');
    });

    it('author 应为 fanquanpp', () => {
      expect(SITE.author).toBe('fanquanpp');
    });

    it('lang 应为 zh-CN', () => {
      expect(SITE.lang).toBe('zh-CN');
    });

    it('url 应与 RUNTIME.siteUrl 一致', () => {
      expect(SITE.url).toBe(RUNTIME.siteUrl);
    });

    it('url 应为合法 http(s) URL', () => {
      expect(SITE.url).toMatch(/^https?:\/\//);
    });
  });

  describe('对象稳定性', () => {
    it('SITE 应为对象类型', () => {
      expect(typeof SITE).toBe('object');
      expect(SITE).not.toBeNull();
    });

    it('SITE 应包含全部 5 个字段', () => {
      const keys = Object.keys(SITE).sort();
      expect(keys).toEqual(['author', 'lang', 'subtitle', 'title', 'url']);
    });
  });
});
