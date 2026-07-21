/**
 * build-glossary-index 单元测试
 *
 * 测试目标：覆盖术语索引生成脚本的关键逻辑
 * - extractTerms：从 Markdown 内容中提取术语定义（三级标题解析、定义捕获、状态机边界）
 * - walkDir：递归目录遍历（与 build-search-index 共享实现，验证术语表场景）
 * - main：端到端索引生成（多模块目录合并、JSON 输出、空目录处理）
 *
 * 测试策略：
 * extractTerms 为纯函数，直接构造 Markdown 文本断言输入输出。
 * walkDir 使用 os.tmpdir() 创建临时目录结构进行集成测试。
 * main 通过传入自定义 options 指向临时目录，验证完整的索引生成流程，
 * 避免修改真实术语表目录与 public/data 输出路径。
 *
 * 术语表文件格式参考（src/content/glossary/git/glossary.md）：
 *   ### 1.1 术语名（English Name）
 *   **名称**：术语名（英文）
 *   **首次出现位置**：xxx.md
 *   **定义**：
 *   术语定义文本...
 *   **详解**：
 *   详细解释...
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

// 导入待测函数（脚本已通过 import.meta.url 守卫，import 时不会自动执行 main）
const { extractTerms, walkDir, main } = await import('./build-glossary-index.mjs');

/**
 * 构造标准术语条目的 Markdown 文本
 * @param {string} num - 序号（如 '1.1'）
 * @param {string} name - 术语名（可含括号英文别名）
 * @param {string} def - 定义文本
 * @returns {string} 完整的术语条目 Markdown
 */
function buildTermBlock(num, name, def) {
  return `### ${num} ${name}

**名称**：${name}

**首次出现位置**：test.md
**定义**：

${def}

**详解**：
这是详解内容，不应出现在定义中。

---`;
}

describe('extractTerms', () => {
  it('应解析简单的术语条目（无括号英文别名）', () => {
    const content = buildTermBlock('1.1', 'Git', 'Git 是分布式版本控制系统。');
    const terms = extractTerms(content, 'git');
    expect(terms['Git']).toBeDefined();
    expect(terms['Git'].module).toBe('git');
    expect(terms['Git'].def).toBe('Git 是分布式版本控制系统。');
    expect(terms['Git'].slug).toBe('git/glossary');
  });

  it('应从术语名中去除括号内的英文别名', () => {
    const content = buildTermBlock('1.4', '仓库（Repository）', '仓库是版本控制的存储单元。');
    const terms = extractTerms(content, 'git');
    // 键名应去除括号部分
    expect(terms['仓库']).toBeDefined();
    expect(terms['仓库'].def).toBe('仓库是版本控制的存储单元。');
    // 原始含括号的键名不应存在
    expect(terms['仓库（Repository）']).toBeUndefined();
  });

  it('应处理半角括号包裹的英文别名', () => {
    const content = buildTermBlock('1.2', '闭包(Closure)', '闭包是函数与词法环境的组合。');
    const terms = extractTerms(content, 'javascript');
    expect(terms['闭包']).toBeDefined();
    expect(terms['闭包'].def).toBe('闭包是函数与词法环境的组合。');
  });

  it('应解析同一文件中的多个术语条目', () => {
    const content =
      buildTermBlock('1.1', 'Git', 'Git 是版本控制系统。') +
      '\n\n' +
      buildTermBlock('1.2', '仓库（Repository）', '仓库是存储单元。') +
      '\n\n' +
      buildTermBlock('1.3', '分支（Branch）', '分支是开发线路。');
    const terms = extractTerms(content, 'git');
    expect(Object.keys(terms)).toHaveLength(3);
    expect(terms['Git']).toBeDefined();
    expect(terms['仓库']).toBeDefined();
    expect(terms['分支']).toBeDefined();
  });

  it('应捕获跨多行的定义文本', () => {
    const content = `### 1.1 多行术语

**名称**：多行术语

**首次出现位置**：test.md
**定义**：

这是定义的第一行。
这是定义的第二行。
这是定义的第三行。

**详解**：
详解内容。`;
    const terms = extractTerms(content, 'test');
    expect(terms['多行术语']).toBeDefined();
    // 多行定义应合并为单个字符串（以空格连接）
    expect(terms['多行术语'].def).toBe('这是定义的第一行。 这是定义的第二行。 这是定义的第三行。');
  });

  it('应在遇到 **详解** 标记时停止捕获定义', () => {
    const content = `### 1.1 测试术语

**名称**：测试术语

**首次出现位置**：test.md
**定义**：

这是定义文本。

**详解**：
这是详解文本，不应出现在定义中。
也不应出现。

---
`;
    const terms = extractTerms(content, 'test');
    expect(terms['测试术语'].def).toBe('这是定义文本。');
    // 详解文本不应出现在定义中
    expect(terms['测试术语'].def).not.toContain('详解文本');
  });

  it('应在遇到 --- 分隔符时停止捕获定义', () => {
    const content = `### 1.1 分隔符测试

**定义**：

定义内容。

---

### 1.2 下一个术语

**定义**：

下一个定义。`;
    const terms = extractTerms(content, 'test');
    expect(terms['分隔符测试'].def).toBe('定义内容。');
    expect(terms['下一个术语'].def).toBe('下一个定义。');
  });

  it('当内容无三级标题时应返回空对象', () => {
    const content = `# 一级标题

正文内容

## 二级标题

更多内容。`;
    const terms = extractTerms(content, 'test');
    expect(terms).toEqual({});
  });

  it('当三级标题不匹配 N.N 格式时应被忽略', () => {
    // 标题格式为 ### core 核心基础术语（无序号），不匹配 /^###\s+\d+\.\d+\s+(.+)$/
    const content = `### core 核心基础术语

**定义**：

不应被捕获的定义。`;
    const terms = extractTerms(content, 'javascript');
    expect(terms).toEqual({});
  });

  it('应处理定义标记后同行有文本的情况', () => {
    const content = `### 1.1 同行定义

**定义**：这是同行的定义文本。

**详解**：
详解。`;
    const terms = extractTerms(content, 'test');
    expect(terms['同行定义']).toBeDefined();
    expect(terms['同行定义'].def).toBe('这是同行的定义文本。');
  });

  it('应处理文件末尾的最后一个术语（无 **详解** 或 --- 结尾）', () => {
    const content = `### 1.1 末尾术语

**定义**：

这是文件末尾的定义。`;
    const terms = extractTerms(content, 'test');
    expect(terms['末尾术语']).toBeDefined();
    expect(terms['末尾术语'].def).toBe('这是文件末尾的定义。');
  });

  it('应跳过定义过长（超过 200 字符）的术语', () => {
    // 构造一个超过 200 字符的定义
    const longDef = 'A'.repeat(201);
    const content = `### 1.1 长定义术语

**定义**：

${longDef}

**详解**：
详解。`;
    const terms = extractTerms(content, 'test');
    // 超长定义应被跳过
    expect(terms['长定义术语']).toBeUndefined();
  });

  it('应处理无 ** 前缀的 定义： 标记', () => {
    const content = `### 1.1 纯文本定义标记

定义：这是纯文本标记的定义。

**详解**：
详解。`;
    const terms = extractTerms(content, 'test');
    expect(terms['纯文本定义标记']).toBeDefined();
    expect(terms['纯文本定义标记'].def).toBe('这是纯文本标记的定义。');
  });

  it('当术语无定义内容时应被跳过', () => {
    const content = `### 1.1 无定义术语

**定义**：

**详解**：
详解内容。`;
    const terms = extractTerms(content, 'test');
    // 定义为空，应被跳过
    expect(terms['无定义术语']).toBeUndefined();
  });

  it('应在 slug 字段中包含模块标识', () => {
    const content = buildTermBlock('1.1', '测试', '定义。');
    const terms = extractTerms(content, 'python');
    expect(terms['测试'].slug).toBe('python/glossary');
  });
});

describe('walkDir', () => {
  let tempDir;

  beforeEach(async () => {
    // 创建临时目录结构用于测试
    tempDir = await mkdtemp(join(tmpdir(), 'fandex-gloss-walk-'));
    await mkdir(join(tempDir, 'git'), { recursive: true });
    await mkdir(join(tempDir, 'git', 'nested'), { recursive: true });
    await writeFile(join(tempDir, 'git', 'glossary.md'), '# Git 术语');
    await writeFile(join(tempDir, 'git', 'nested', 'extra.md'), '# 额外术语');
    await writeFile(join(tempDir, 'git', 'readme.txt'), '非 Markdown');
    await writeFile(join(tempDir, 'other.md'), '# 其他');
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('应递归遍历目录并找到所有 .md 文件', async () => {
    const files = [];
    await walkDir(tempDir, '.md', async (filePath) => {
      files.push(filePath);
    });
    expect(files).toHaveLength(3);
    const names = files.map((f) => f.split(sep).pop());
    expect(names).toContain('glossary.md');
    expect(names).toContain('extra.md');
    expect(names).toContain('other.md');
  });

  it('应跳过不匹配扩展名的文件', async () => {
    const files = [];
    await walkDir(tempDir, '.md', async (filePath) => {
      files.push(filePath);
    });
    const hasTxt = files.some((f) => f.endsWith('.txt'));
    expect(hasTxt).toBe(false);
  });

  it('应处理空目录', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'fandex-gloss-empty-'));
    const files = [];
    await walkDir(emptyDir, '.md', async (filePath) => {
      files.push(filePath);
    });
    expect(files).toEqual([]);
    await rm(emptyDir, { recursive: true, force: true });
  });

  it('应对回调函数传入完整文件路径', async () => {
    const files = [];
    await walkDir(tempDir, '.md', async (filePath) => {
      files.push(filePath);
    });
    for (const f of files) {
      expect(f.startsWith(tempDir)).toBe(true);
    }
  });
});

describe('main', () => {
  let tempGlossaryDir;
  let tempOutputDir;
  let tempOutputFile;

  beforeEach(async () => {
    // 创建临时术语表目录与输出目录
    tempGlossaryDir = await mkdtemp(join(tmpdir(), 'fandex-glossary-'));
    tempOutputDir = await mkdtemp(join(tmpdir(), 'fandex-gloss-out-'));
    tempOutputFile = join(tempOutputDir, 'glossary-index.json');

    // 创建 git 模块术语表
    await mkdir(join(tempGlossaryDir, 'git'), { recursive: true });
    await writeFile(
      join(tempGlossaryDir, 'git', 'glossary.md'),
      buildTermBlock('1.1', 'Git', 'Git 是分布式版本控制系统。') +
        '\n\n' +
        buildTermBlock('1.2', '仓库（Repository）', '仓库是版本控制的存储单元。')
    );

    // 创建 markdown 模块术语表
    await mkdir(join(tempGlossaryDir, 'markdown'), { recursive: true });
    await writeFile(
      join(tempGlossaryDir, 'markdown', 'glossary.md'),
      buildTermBlock('1.1', 'Markdown', 'Markdown 是轻量级标记语言。')
    );

    // 创建一个非目录文件（应被跳过）
    await writeFile(join(tempGlossaryDir, 'README.txt'), '不是目录');
  });

  afterEach(async () => {
    await rm(tempGlossaryDir, { recursive: true, force: true });
    await rm(tempOutputDir, { recursive: true, force: true });
  });

  it('应从多个模块目录合并术语索引', async () => {
    await main({
      glossaryDir: tempGlossaryDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const index = JSON.parse(content);
    // git 模块 2 个术语 + markdown 模块 1 个术语 = 3 个
    expect(Object.keys(index)).toHaveLength(3);
    expect(index['Git']).toBeDefined();
    expect(index['Git'].module).toBe('git');
    expect(index['仓库']).toBeDefined();
    expect(index['仓库'].module).toBe('git');
    expect(index['Markdown']).toBeDefined();
    expect(index['Markdown'].module).toBe('markdown');
  });

  it('应跳过非目录条目', async () => {
    await main({
      glossaryDir: tempGlossaryDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const index = JSON.parse(content);
    // README.txt 不应作为模块被处理
    const modules = new Set(Object.values(index).map((t) => t.module));
    expect(modules.has('README.txt')).toBe(false);
  });

  it('应生成有效的 JSON 对象文件', async () => {
    await main({
      glossaryDir: tempGlossaryDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
    const index = JSON.parse(content);
    // 每个条目应包含 module、def、slug 字段
    for (const term of Object.values(index)) {
      expect(term).toHaveProperty('module');
      expect(term).toHaveProperty('def');
      expect(term).toHaveProperty('slug');
    }
  });

  it('应为每个术语设置正确的 slug 字段', async () => {
    await main({
      glossaryDir: tempGlossaryDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const index = JSON.parse(content);
    expect(index['Git'].slug).toBe('git/glossary');
    expect(index['Markdown'].slug).toBe('markdown/glossary');
  });

  it('应处理空术语表目录', async () => {
    const emptyGlossaryDir = await mkdtemp(join(tmpdir(), 'fandex-glossary-empty-'));
    await main({
      glossaryDir: emptyGlossaryDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const index = JSON.parse(content);
    expect(index).toEqual({});
    await rm(emptyGlossaryDir, { recursive: true, force: true });
  });

  it('应处理模块目录下无 .md 文件的情况', async () => {
    // 创建一个空模块目录
    await mkdir(join(tempGlossaryDir, 'empty-module'), { recursive: true });
    await main({
      glossaryDir: tempGlossaryDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const index = JSON.parse(content);
    // 空模块不应影响其他模块的术语
    expect(Object.keys(index)).toHaveLength(3);
    const modules = new Set(Object.values(index).map((t) => t.module));
    expect(modules.has('empty-module')).toBe(false);
  });

  it('应处理模块目录中有多个 .md 文件的情况', async () => {
    // 在 git 模块下再添加一个 .md 文件
    await writeFile(
      join(tempGlossaryDir, 'git', 'extra.md'),
      buildTermBlock('2.1', '额外术语', '这是额外文件中的术语。')
    );
    await main({
      glossaryDir: tempGlossaryDir,
      outputDir: tempOutputDir,
      outputFile: tempOutputFile,
    });

    const content = await readFile(tempOutputFile, 'utf-8');
    const index = JSON.parse(content);
    // git 模块现有 3 个术语（原 2 个 + 新增 1 个）+ markdown 1 个 = 4 个
    expect(Object.keys(index)).toHaveLength(4);
    expect(index['额外术语']).toBeDefined();
    expect(index['额外术语'].module).toBe('git');
  });
});
