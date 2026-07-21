/**
 * reading-time 工具单元测试
 *
 * 测试目标：覆盖 src/lib/reading-time.ts 中的 computeReadingTime 函数
 * - 显式 readingTime 参数优先返回
 * - 空内容与纯空白内容的最小值保护
 * - 普通文本按非空白字符数估算
 * - 代码块（```...```）剥离后再计数
 * - Markdown 标记符号剥离后再计数
 *
 * 设计说明：
 * reading-time.ts 是纯函数无副作用，无外部依赖，直接断言输入输出即可。
 */
import { describe, it, expect } from 'vitest';
import { computeReadingTime } from '@/lib/reading-time';

describe('computeReadingTime', () => {
  describe('显式 readingTime 参数', () => {
    it('当 readingTime 为正数时应直接返回该值', () => {
      expect(computeReadingTime('任何正文内容', 5)).toBe(5);
    });

    it('当 readingTime 为 0 时应回退到字符估算（返回 1）', () => {
      // readingTime > 0 才生效，0 视为无效
      expect(computeReadingTime('短文本', 0)).toBe(1);
    });

    it('当 readingTime 为负数时应回退到字符估算', () => {
      expect(computeReadingTime('短文本', -10)).toBe(1);
    });

    it('当 readingTime 为 undefined 时应回退到字符估算', () => {
      expect(computeReadingTime('短文本')).toBe(1);
    });
  });

  describe('空内容与最小值保护', () => {
    it('空字符串应返回 1 分钟（最小值）', () => {
      expect(computeReadingTime('')).toBe(1);
    });

    it('纯空白字符串应返回 1 分钟（最小值）', () => {
      expect(computeReadingTime('   \n\t  \n  ')).toBe(1);
    });

    it('仅含代码块的内容应返回 1 分钟（剥离后无剩余字符）', () => {
      const onlyCodeBlock = '```\nconsole.log("hello");\n```';
      expect(computeReadingTime(onlyCodeBlock)).toBe(1);
    });
  });

  describe('字符数估算逻辑', () => {
    it('应按非空白字符数除以 300 向上取整计算（301 字符 -> 2 分钟）', () => {
      // 构造 301 个非空白字符
      const text = 'a'.repeat(301);
      expect(computeReadingTime(text)).toBe(2);
    });

    it('应按非空白字符数除以 300 向上取整计算（300 字符 -> 1 分钟）', () => {
      const text = 'a'.repeat(300);
      expect(computeReadingTime(text)).toBe(1);
    });

    it('应剥离 Markdown 标记符号后再计数', () => {
      // 含 # * ` 等标记，剥离后仅剩 'ab'
      const markdown = '# Heading\n**bold** `code` ab';
      // 剥离后：Headingboldcodeab = 16 字符 -> 1 分钟
      expect(computeReadingTime(markdown)).toBe(1);
    });

    it('应剥离代码块后再计数（代码块内字符不计）', () => {
      // 代码块内有 100 个字符，正文有 350 个字符
      const codeBlock = '```\n' + 'x'.repeat(100) + '\n```';
      const body = 'a'.repeat(350);
      const content = codeBlock + '\n' + body;
      // 剥离代码块后剩 350 个字符 -> ceil(350/300) = 2
      expect(computeReadingTime(content)).toBe(2);
    });

    it('应支持中文字符计数（每个汉字算 1 字符）', () => {
      // 600 个汉字 -> 2 分钟
      const text = '中'.repeat(600);
      expect(computeReadingTime(text)).toBe(2);
    });
  });

  describe('边界条件', () => {
    it('单个字符应返回 1 分钟', () => {
      expect(computeReadingTime('a')).toBe(1);
    });

    it('混合代码块与正文应正确剥离代码块', () => {
      const content = '正文一\n```\ncode\n```\n正文二';
      // 剥离代码块后：正文一正文二 = 6 字符 -> 1 分钟
      expect(computeReadingTime(content)).toBe(1);
    });
  });
});
