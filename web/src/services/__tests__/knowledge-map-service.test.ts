/**
 * knowledge-map-service 单元测试
 *
 * 测试策略：
 * knowledge-map-service 依赖：
 * - module-service.getAllModules / getModulePrerequisites
 * - doc-service.getAllDocs / getDocsByModule / docSlug
 *
 * 通过 vi.mock 注入 astro:content 与模块级依赖，验证：
 * 1. getGlobalMap：全局节点与边构建
 * 2. getModuleMap：模块级节点与边
 * 3. getDocMap：文档级节点与边
 * 4. toMermaidGraph：Mermaid 语法序列化
 *
 * 覆盖场景：节点构建、边去重、前置依赖、关联边、自环过滤
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** 伪造模块元数据 */
const fakeModules = [
  { id: 'cpp', title: 'C++', icon: 'C+', description: 'C++ 语言', categories: ['dev-lang'] },
  { id: 'c', title: 'C', icon: 'C', description: 'C 语言', categories: ['dev-lang'] },
  { id: 'git', title: 'Git', icon: 'Git', description: '版本控制', categories: ['toolchain'] },
];

/** 伪造模块前置依赖 */
const fakePrerequisites: Record<string, string[]> = {
  cpp: ['c'],
  git: [],
  c: [],
};

/** 伪造文档条目结构 */
interface FakeDocEntry {
  id: string;
  data: {
    title: string;
    module: string;
    order?: number;
    tags: string[];
    difficulty?: string;
    related: string[];
    prerequisites: string[];
  };
}

let fakeDocs: FakeDocEntry[] = [];

function makeDoc(entry: FakeDocEntry): unknown {
  return { id: entry.id, body: '', data: entry.data };
}

vi.mock('astro:content', () => ({
  getCollection: vi.fn(async (collection: string, filter?: (entry: unknown) => boolean) => {
    if (collection !== 'docs') return [];
    const docs = fakeDocs.map(makeDoc);
    if (filter) return docs.filter(filter);
    return docs;
  }),
}));

vi.mock('@/lib/modules', () => ({
  modules: fakeModules,
  categoryLabels: { 'dev-lang': '开发语言', toolchain: '工具链' },
  categoryColors: { 'dev-lang': '#d63031', toolchain: '#4f5bd5' },
  categoryOrder: ['toolchain', 'dev-lang'],
  modulePrerequisites: fakePrerequisites,
  getModule: (id: string) => fakeModules.find((m) => m.id === id),
  getModulesByCategory: (cat: string) => fakeModules.filter((m) => m.categories.includes(cat)),
  getPrimaryCategory: (mod: { categories: string[] }) => mod.categories[0],
  docSlug: (id: string) => (id.split('/').pop() || id).replace(/\.(md|mdx)$/, ''),
}));

const { getGlobalMap, getModuleMap, getDocMap, toMermaidGraph } =
  await import('@/services/knowledge-map-service');

beforeEach(() => {
  fakeDocs = [];
});

describe('knowledge-map-service', () => {
  describe('getGlobalMap', () => {
    it('无文档数据时应仅返回模块级节点与模块前置依赖边', async () => {
      const map = await getGlobalMap();
      // 节点：仅模块节点（fakeModules 始终非空）
      expect(map.nodes).toHaveLength(fakeModules.length);
      const nodeIds = map.nodes.map((n) => n.id);
      expect(nodeIds).toEqual(fakeModules.map((m) => m.id));
      // 边：仅模块级前置依赖边，不应存在文档级边（from/to 均不含 "/"）
      const docEdges = map.edges.filter((e) => e.from.includes('/') || e.to.includes('/'));
      expect(docEdges).toEqual([]);
      // 模块级前置依赖边应存在（cpp 依赖 c）
      const modulePrereqEdges = map.edges.filter((e) => e.type === 'prerequisite');
      expect(modulePrereqEdges.length).toBeGreaterThan(0);
      // 关联边（related）在无文档时应为空
      const relatedEdges = map.edges.filter((e) => e.type === 'related');
      expect(relatedEdges).toEqual([]);
    });

    it('应包含所有模块节点与文档节点', async () => {
      fakeDocs = [
        {
          id: 'cpp/pointer.md',
          data: {
            title: '指针',
            module: 'cpp',
            order: 1,
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
        {
          id: 'git/branch.md',
          data: {
            title: '分支',
            module: 'git',
            order: 1,
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
      ];
      const map = await getGlobalMap();
      // 节点：3 模块 + 2 文档
      expect(map.nodes).toHaveLength(5);
      const nodeIds = map.nodes.map((n) => n.id);
      expect(nodeIds).toContain('cpp');
      expect(nodeIds).toContain('cpp/pointer');
      expect(nodeIds).toContain('git/branch');
    });

    it('应构建模块级前置依赖边（cpp 依赖 c）', async () => {
      const map = await getGlobalMap();
      const prereqEdge = map.edges.find(
        (e) => e.type === 'prerequisite' && e.from === 'c' && e.to === 'cpp'
      );
      expect(prereqEdge).toBeDefined();
    });

    it('应构建文档级前置依赖边', async () => {
      fakeDocs = [
        {
          id: 'cpp/basic.md',
          data: {
            title: '基础',
            module: 'cpp',
            order: 1,
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
        {
          id: 'cpp/advanced.md',
          data: {
            title: '进阶',
            module: 'cpp',
            order: 2,
            tags: [],
            related: [],
            prerequisites: ['basic'],
          },
        },
      ];
      const map = await getGlobalMap();
      const docEdge = map.edges.find(
        (e) => e.type === 'prerequisite' && e.from === 'cpp/basic' && e.to === 'cpp/advanced'
      );
      expect(docEdge).toBeDefined();
    });

    it('应构建文档关联边（去重 + 自环过滤）', async () => {
      fakeDocs = [
        {
          id: 'cpp/a.md',
          data: {
            title: 'A',
            module: 'cpp',
            order: 1,
            tags: [],
            related: ['b'],
            prerequisites: [],
          },
        },
        {
          id: 'cpp/b.md',
          data: {
            title: 'B',
            module: 'cpp',
            order: 2,
            tags: [],
            related: ['a'],
            prerequisites: [],
          },
        },
      ];
      const map = await getGlobalMap();
      // 双向 related 应去重为单条边
      const relatedEdges = map.edges.filter((e) => e.type === 'related');
      expect(relatedEdges).toHaveLength(1);
    });
  });

  describe('getModuleMap', () => {
    it('未匹配模块应返回空图', async () => {
      const map = await getModuleMap('non-existent');
      expect(map.nodes).toEqual([]);
      expect(map.edges).toEqual([]);
    });

    it('应包含模块节点与该模块下所有文档节点', async () => {
      fakeDocs = [
        {
          id: 'cpp/1.md',
          data: { title: '1', module: 'cpp', order: 1, tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'cpp/2.md',
          data: { title: '2', module: 'cpp', order: 2, tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'git/1.md',
          data: { title: 'G1', module: 'git', order: 1, tags: [], related: [], prerequisites: [] },
        },
      ];
      const map = await getModuleMap('cpp');
      // 模块节点 + 2 个文档节点
      expect(map.nodes).toHaveLength(3);
    });

    it('应包含模块前置依赖边', async () => {
      const map = await getModuleMap('cpp');
      const prereqEdge = map.edges.find((e) => e.type === 'prerequisite' && e.to === 'cpp');
      expect(prereqEdge).toBeDefined();
      expect(prereqEdge!.from).toBe('c');
    });

    it('应仅纳入本模块内的文档边', async () => {
      fakeDocs = [
        {
          id: 'cpp/a.md',
          data: {
            title: 'A',
            module: 'cpp',
            order: 1,
            tags: [],
            related: ['b'],
            prerequisites: [],
          },
        },
        {
          id: 'cpp/b.md',
          data: { title: 'B', module: 'cpp', order: 2, tags: [], related: [], prerequisites: [] },
        },
        {
          id: 'git/x.md',
          data: { title: 'X', module: 'git', order: 1, tags: [], related: [], prerequisites: [] },
        },
      ];
      const map = await getModuleMap('cpp');
      // 所有边应仅涉及 cpp 模块
      for (const edge of map.edges) {
        if (edge.type === 'related' || (edge.type === 'prerequisite' && edge.from.includes('/'))) {
          expect(edge.from.startsWith('cpp/')).toBe(true);
          expect(edge.to.startsWith('cpp/')).toBe(true);
        }
      }
    });
  });

  describe('getDocMap', () => {
    it('未匹配文档应返回空图', async () => {
      const map = await getDocMap('cpp', 'non-existent');
      expect(map.nodes).toEqual([]);
      expect(map.edges).toEqual([]);
    });

    it('应包含当前文档节点与其前置/关联文档节点', async () => {
      fakeDocs = [
        {
          id: 'cpp/current.md',
          data: {
            title: '当前',
            module: 'cpp',
            order: 2,
            tags: [],
            related: ['related'],
            prerequisites: ['prereq'],
          },
        },
        {
          id: 'cpp/prereq.md',
          data: {
            title: '前置',
            module: 'cpp',
            order: 1,
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
        {
          id: 'cpp/related.md',
          data: {
            title: '关联',
            module: 'cpp',
            order: 3,
            tags: [],
            related: [],
            prerequisites: [],
          },
        },
      ];
      const map = await getDocMap('cpp', 'current');
      expect(map.nodes.length).toBeGreaterThanOrEqual(3);
      // 应包含前置依赖边与关联边
      expect(map.edges.some((e) => e.type === 'prerequisite')).toBe(true);
      expect(map.edges.some((e) => e.type === 'related')).toBe(true);
    });
  });

  describe('toMermaidGraph', () => {
    it('应输出以 graph LR 开头的 Mermaid 语法', () => {
      const map = {
        nodes: [{ id: 'mod1', label: 'Module 1', type: 'module' as const, module: 'mod1' }],
        edges: [],
      };
      const result = toMermaidGraph(map);
      expect(result.startsWith('graph LR')).toBe(true);
    });

    it('模块节点应使用圆角矩形语法 (())', () => {
      const map = {
        nodes: [{ id: 'mod1', label: 'Mod', type: 'module' as const, module: 'mod1' }],
        edges: [],
      };
      const result = toMermaidGraph(map);
      expect(result).toContain('mod1(("Mod"))');
    });

    it('文档节点应使用矩形语法 []', () => {
      const map = {
        nodes: [{ id: 'doc1', label: 'Doc', type: 'doc' as const, module: 'mod1' }],
        edges: [],
      };
      const result = toMermaidGraph(map);
      expect(result).toContain('doc1["Doc"]');
    });

    it('prerequisite 边应使用实线箭头 -->', () => {
      const map = {
        nodes: [
          { id: 'a', label: 'A', type: 'doc' as const, module: 'm' },
          { id: 'b', label: 'B', type: 'doc' as const, module: 'm' },
        ],
        edges: [{ from: 'a', to: 'b', type: 'prerequisite' as const }],
      };
      const result = toMermaidGraph(map);
      expect(result).toContain('a --> b');
    });

    it('related 边应使用虚线箭头 -.->', () => {
      const map = {
        nodes: [
          { id: 'a', label: 'A', type: 'doc' as const, module: 'm' },
          { id: 'b', label: 'B', type: 'doc' as const, module: 'm' },
        ],
        edges: [{ from: 'a', to: 'b', type: 'related' as const }],
      };
      const result = toMermaidGraph(map);
      expect(result).toContain('a -.-> b');
    });

    it('label 中的特殊字符应被净化', () => {
      const map = {
        nodes: [{ id: 'n1', label: 'Hello "World" [test]', type: 'doc' as const, module: 'm' }],
        edges: [],
      };
      const result = toMermaidGraph(map);
      // 双引号、方括号应被移除
      expect(result).not.toContain('"World"');
      expect(result).not.toContain('[test]');
    });

    it('应包含难度样式 classDef 定义', () => {
      const map = {
        nodes: [
          {
            id: 'd1',
            label: 'D',
            type: 'doc' as const,
            module: 'm',
            difficulty: 'beginner' as const,
          },
        ],
        edges: [],
      };
      const result = toMermaidGraph(map);
      expect(result).toContain('classDef diffBeginner');
      expect(result).toContain('class d1 diffBeginner');
    });

    it('文档节点 ID 中的 `/` 应被转义为 `__`，避免 Mermaid 解析失败', () => {
      // 文档节点 ID 形如 `moduleId/slug`，Mermaid 节点 ID 不允许 `/`，
      // 必须转义为 `__` 才能正常渲染
      const map = {
        nodes: [
          { id: 'cpp', label: 'C++', type: 'module' as const, module: 'cpp' },
          {
            id: 'cpp/pointer',
            label: '指针',
            type: 'doc' as const,
            module: 'cpp',
          },
        ],
        edges: [],
      };
      const result = toMermaidGraph(map);
      // 转义后的 Mermaid 节点 ID 应出现
      expect(result).toContain('cpp__pointer["指针"]');
      // 原始含 `/` 的 ID 不应直接出现在节点定义中
      expect(result).not.toMatch(/cpp\/pointer\[/);
    });

    it('文档级边的 from/to 中的 `/` 也应被转义', () => {
      const map = {
        nodes: [
          {
            id: 'cpp/basic',
            label: '基础',
            type: 'doc' as const,
            module: 'cpp',
          },
          {
            id: 'cpp/advanced',
            label: '进阶',
            type: 'doc' as const,
            module: 'cpp',
          },
        ],
        edges: [
          {
            from: 'cpp/basic',
            to: 'cpp/advanced',
            type: 'prerequisite' as const,
          },
        ],
      };
      const result = toMermaidGraph(map);
      // 边定义应使用转义后的 ID
      expect(result).toContain('cpp__basic --> cpp__advanced');
      // 不应出现原始含 `/` 的边
      expect(result).not.toMatch(/cpp\/basic --> cpp\/advanced/);
    });

    it('模块节点 ID 不含 `/` 时应保持原样', () => {
      const map = {
        nodes: [
          {
            id: 'getting-started',
            label: '入门',
            type: 'module' as const,
            module: 'getting-started',
          },
        ],
        edges: [],
      };
      const result = toMermaidGraph(map);
      expect(result).toContain('getting-started(("入门"))');
      expect(result).toContain('class getting-started moduleNode');
    });
  });
});
