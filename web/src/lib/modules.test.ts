/**
 * modules 单元测试
 *
 * 测试目标：覆盖 src/lib/modules.ts 中的核心函数
 * - getModule：按 id 查找模块
 * - getModulesByCategory：按分类筛选模块列表
 * - getPrimaryCategory：获取模块的主分类（categories 数组首元素）
 * - docSlug：从 content collection id 中提取 slug
 *
 * 设计说明：
 * modules.ts 是纯数据与纯函数模块，无副作用、无 DOM 依赖、无环境变量依赖，
 * 因此测试无需任何 mock，直接断言输入输出即可。
 */

import { describe, it, expect } from 'vitest';
import { getModule, getModulesByCategory, getPrimaryCategory, docSlug } from '@/lib/modules';

describe('getModule', () => {
  it('应根据 id 返回对应模块对象', () => {
    const mod = getModule('git');
    expect(mod).toBeDefined();
    expect(mod?.id).toBe('git');
    expect(mod?.title).toBe('Git');
    expect(mod?.icon).toBe('Git');
  });

  it('应返回 toolchain 分类下的 markdown 模块', () => {
    const mod = getModule('markdown');
    expect(mod).toBeDefined();
    expect(mod?.categories).toContain('toolchain');
  });

  it('当 id 不存在时应返回 undefined', () => {
    const mod = getModule('non-existent-module-id');
    expect(mod).toBeUndefined();
  });

  it('应正确查找含多分类的模块（如 c 模块同时属于 dev-lang 与 comp-sci）', () => {
    const mod = getModule('c');
    expect(mod).toBeDefined();
    expect(mod?.categories).toEqual(['dev-lang', 'comp-sci']);
  });

  it('应正确查找含连字符的 id（如 cs-fundamentals）', () => {
    const mod = getModule('cs-fundamentals');
    expect(mod).toBeDefined();
    expect(mod?.id).toBe('cs-fundamentals');
    expect(mod?.title).toBe('计算机基础');
  });

  it('应正确查找 data 分类下的最后一个模块', () => {
    const mod = getModule('ai-ethics');
    expect(mod).toBeDefined();
    expect(mod?.categories).toEqual(['data']);
  });
});

describe('getModulesByCategory', () => {
  it('应返回 toolchain 分类下的全部 4 个模块', () => {
    const result = getModulesByCategory('toolchain');
    expect(result).toHaveLength(4);
    const ids = result.map((m) => m.id);
    expect(ids).toEqual(['getting-started', 'markdown', 'git', 'github']);
  });

  it('应返回 database 分类下的全部 4 个模块', () => {
    const result = getModulesByCategory('database');
    expect(result).toHaveLength(4);
    const ids = result.map((m) => m.id);
    expect(ids).toEqual(['sql', 'mysql', 'postgresql', 'redis']);
  });

  it('应包含多分类模块（c 模块同时出现在 dev-lang 与 comp-sci 结果中）', () => {
    const devLangModules = getModulesByCategory('dev-lang');
    const compSciModules = getModulesByCategory('comp-sci');
    const devLangIds = devLangModules.map((m) => m.id);
    const compSciIds = compSciModules.map((m) => m.id);
    // c 模块同时属于 dev-lang 与 comp-sci
    expect(devLangIds).toContain('c');
    expect(compSciIds).toContain('c');
    // cpp 模块也同时属于两个分类
    expect(devLangIds).toContain('cpp');
    expect(compSciIds).toContain('cpp');
  });

  it('应返回 comp-sci 分类下的全部模块', () => {
    const result = getModulesByCategory('comp-sci');
    // comp-sci 包含：c、cpp、algorithm、cs-fundamentals、calculus、discrete-math、
    //                linear-algebra、probability-statistics、english、networking
    expect(result.length).toBeGreaterThanOrEqual(10);
    const ids = result.map((m) => m.id);
    expect(ids).toContain('algorithm');
    expect(ids).toContain('cs-fundamentals');
    expect(ids).toContain('calculus');
    expect(ids).toContain('english');
  });

  it('当分类不存在时应返回空数组', () => {
    const result = getModulesByCategory('non-existent-category');
    expect(result).toEqual([]);
  });

  it('应返回 eng-infra 分类下含 agent 等多分类模块', () => {
    const result = getModulesByCategory('eng-infra');
    const ids = result.map((m) => m.id);
    // agent 同时属于 eng-infra 与 data
    expect(ids).toContain('agent');
    // redis 同时属于 database 与 eng-infra
    expect(ids).toContain('redis');
    // go 同时属于 dev-lang 与 eng-infra
    expect(ids).toContain('go');
  });
});

describe('getPrimaryCategory', () => {
  it('应返回多分类模块的第一个分类（c 模块主分类为 dev-lang）', () => {
    const mod = getModule('c');
    expect(mod).toBeDefined();
    if (!mod) return; // 类型守卫：确保 mod 非 undefined
    expect(getPrimaryCategory(mod)).toBe('dev-lang');
  });

  it('对于单分类模块应返回该唯一分类', () => {
    const mod = getModule('git');
    expect(mod).toBeDefined();
    if (!mod) return;
    expect(getPrimaryCategory(mod)).toBe('toolchain');
  });

  it('对于多分类模块应返回第一个而非最后一个（redis 主分类为 database 而非 eng-infra）', () => {
    const mod = getModule('redis');
    expect(mod).toBeDefined();
    if (!mod) return;
    expect(mod.categories).toEqual(['database', 'eng-infra']);
    expect(getPrimaryCategory(mod)).toBe('database');
  });

  it('对于 data 分类下的模块应返回 data', () => {
    const mod = getModule('machine-learning');
    expect(mod).toBeDefined();
    if (!mod) return;
    expect(getPrimaryCategory(mod)).toBe('data');
  });

  it('对于 networking 模块应返回 eng-infra 而非 comp-sci', () => {
    const mod = getModule('networking');
    expect(mod).toBeDefined();
    if (!mod) return;
    expect(mod.categories).toEqual(['eng-infra', 'comp-sci']);
    expect(getPrimaryCategory(mod)).toBe('eng-infra');
  });
});

describe('docSlug', () => {
  /**
   * docSlug 函数行为说明：
   * 输入 content collection id（如 'javascript/basics.md'），
   * 通过 split('/').pop() 取最后一段（文件名），再去除 .md/.mdx 后缀。
   * 注意：返回的是纯文件名，不包含目录路径前缀。
   */

  it('应从嵌套路径中提取文件名作为 slug（去除 .md 后缀）', () => {
    // split('/') -> ['javascript', 'basics.md']，pop() -> 'basics.md'，replace -> 'basics'
    expect(docSlug('javascript/basics.md')).toBe('basics');
  });

  it('应从扁平路径中提取 slug', () => {
    expect(docSlug('basics.md')).toBe('basics');
  });

  it('应支持 .mdx 扩展名', () => {
    expect(docSlug('javascript/intro.mdx')).toBe('intro');
  });

  it('当无扩展名时应返回最后一段路径段', () => {
    // split('/') -> ['javascript', 'basics']，pop() -> 'basics'
    expect(docSlug('javascript/basics')).toBe('basics');
  });

  it('应处理多级嵌套路径（仅返回最后一段文件名）', () => {
    expect(docSlug('a/b/c/d.md')).toBe('d');
  });

  it('应处理仅含扩展名的文件名', () => {
    expect(docSlug('file.md')).toBe('file');
  });

  it('应处理仅含 .mdx 扩展名的文件名', () => {
    expect(docSlug('file.mdx')).toBe('file');
  });

  it('应处理不含斜杠的纯文件名', () => {
    expect(docSlug('README.md')).toBe('README');
  });

  it('应处理空字符串（pop 返回空字符串，因 falsy 回退到原值）', () => {
    // ''.split('/') -> ['']，pop() -> ''，'' || '' 仍为 ''，replace 无变化
    expect(docSlug('')).toBe('');
  });

  it('应处理仅含斜杠的路径（pop 返回空字符串，回退到原值）', () => {
    // 'a/b/'.split('/') -> ['a', 'b', '']，pop() -> ''，'' || 'a/b/' -> 'a/b/'
    expect(docSlug('a/b/')).toBe('a/b/');
  });
});
