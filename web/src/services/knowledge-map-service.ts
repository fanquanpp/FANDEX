/**
 * 知识地图服务模块
 * 封装知识地图节点与边的构建逻辑，输出可被 Mermaid 渲染的结构化数据
 *
 * 设计原则：
 * - 仅本模块组合 module-service 与 doc-service 的输出，UI 层不直接拼装
 * - 所有 async 函数均通过 try-catch 包裹，异常时返回空图
 * - 节点 ID 唯一且稳定，便于 Vue 端做节点点击跳转
 * - 边仅描述"前置依赖"与"关联"两类语义，避免业务概念膨胀
 *
 * 数据来源：
 * - 模块节点：module-service.getAllModules()
 * - 模块前置依赖：module-service.getModulePrerequisites()
 * - 文档节点：doc-service.getAllDocs()（按 module 字段过滤得到模块文档）
 * - 文档前置与关联：文档 frontmatter 的 prerequisites 与 related 字段
 */
import { getAllModules, getModulePrerequisites } from './module-service';
import { getAllDocs, docSlug } from './doc-service';
import type { Module } from './module-service';
import type { DocEntry } from './doc-service';

/** 节点类型：模块节点或文档节点 */
export type MapNodeType = 'module' | 'doc';

/** 难度等级，与 frontmatter difficulty 字段保持一致 */
export type MapDifficulty = 'beginner' | 'intermediate' | 'advanced';

/** 边类型：前置依赖（强连接）或关联（弱连接） */
export type MapEdgeType = 'prerequisite' | 'related';

/** 知识地图节点 */
export interface MapNode {
  /** 节点唯一 ID：模块节点使用模块 ID，文档节点使用 `moduleId/slug` 形式 */
  id: string;
  /** 节点显示文本 */
  label: string;
  /** 节点类型 */
  type: MapNodeType;
  /** 所属模块 ID（文档节点为父模块，模块节点为自身） */
  module: string;
  /** 难度等级（仅文档节点有意义，模块节点缺省） */
  difficulty?: MapDifficulty;
  /** 标签列表（仅文档节点有意义） */
  tags?: string[];
}

/** 知识地图边 */
export interface MapEdge {
  /** 起点节点 ID */
  from: string;
  /** 终点节点 ID */
  to: string;
  /** 边类型 */
  type: MapEdgeType;
}

/** 知识地图完整结构 */
export interface KnowledgeMap {
  /** 节点列表 */
  nodes: MapNode[];
  /** 边列表 */
  edges: MapEdge[];
}

/** 空知识地图常量，用于异常回退 */
const EMPTY_MAP: KnowledgeMap = { nodes: [], edges: [] };

/**
 * 将文档 entry 转换为文档节点 ID
 * @param doc - 文档 entry
 * @returns 文档节点 ID，格式为 `moduleId/slug`
 */
function docNodeId(doc: DocEntry): string {
  return `${doc.data.module}/${docSlug(doc.id)}`;
}

/**
 * 将模块 entry 转换为模块节点
 * @param mod - 模块元数据
 * @returns 模块节点对象
 */
function buildModuleNode(mod: Module): MapNode {
  return {
    id: mod.id,
    label: mod.title,
    type: 'module',
    module: mod.id,
  };
}

/**
 * 将文档 entry 转换为文档节点
 * @param doc - 文档 entry
 * @returns 文档节点对象
 */
function buildDocNode(doc: DocEntry): MapNode {
  return {
    id: docNodeId(doc),
    label: doc.data.title,
    type: 'doc',
    module: doc.data.module,
    // difficulty 可能为 undefined，使用条件展开避免 exactOptionalPropertyTypes 报错
    ...(doc.data.difficulty ? { difficulty: doc.data.difficulty } : {}),
    tags: [...doc.data.tags],
  };
}

/**
 * 从文档 frontmatter 的 prerequisites 字段构建前置依赖边
 * 支持两种引用格式：纯 slug 或 `moduleId/slug` 完整路径
 * @param doc - 当前文档
 * @param allDocs - 全部文档列表（用于解析 slug 引用）
 * @returns 边数组
 */
function buildDocPrerequisiteEdges(doc: DocEntry, allDocs: readonly DocEntry[]): MapEdge[] {
  const edges: MapEdge[] = [];
  const fromId = docNodeId(doc);
  for (const ref of doc.data.prerequisites) {
    // 在全部文档中查找匹配的引用（支持纯 slug 与完整路径两种格式）
    const matched = allDocs.find((d) => {
      const slug = docSlug(d.id);
      return ref === slug || ref === `${d.data.module}/${slug}`;
    });
    if (matched) {
      edges.push({
        from: docNodeId(matched),
        to: fromId,
        type: 'prerequisite',
      });
    }
  }
  return edges;
}

/**
 * 从文档 frontmatter 的 related 字段构建关联边
 * @param doc - 当前文档
 * @param allDocs - 全部文档列表
 * @returns 边数组
 */
function buildDocRelatedEdges(doc: DocEntry, allDocs: readonly DocEntry[]): MapEdge[] {
  const edges: MapEdge[] = [];
  const fromId = docNodeId(doc);
  for (const ref of doc.data.related) {
    const matched = allDocs.find((d) => {
      const slug = docSlug(d.id);
      return ref === slug || ref === `${d.data.module}/${slug}`;
    });
    if (matched) {
      const toId = docNodeId(matched);
      // 避免自环与重复边（无向关联，统一以 fromId < toId 顺序记录）
      if (toId === fromId) continue;
      edges.push({
        from: fromId < toId ? fromId : toId,
        to: fromId < toId ? toId : fromId,
        type: 'related',
      });
    }
  }
  return edges;
}

/**
 * 对边列表去重：相同 from/to/type 的边仅保留一条
 * @param edges - 待去重的边列表
 * @returns 去重后的边列表
 */
function dedupeEdges(edges: readonly MapEdge[]): MapEdge[] {
  const seen = new Set<string>();
  const result: MapEdge[] = [];
  for (const e of edges) {
    const key = `${e.from}|${e.to}|${e.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(e);
  }
  return result;
}

/**
 * 获取全局知识地图（完整数据）
 *
 * 包含所有模块节点、模块间前置依赖边，以及全部文档节点、文档间前置与关联边
 *
 * 渲染策略说明：
 * - FANDEX 当前有 52 个模块 + 2065 篇文档 + 4583 条文档间关系
 * - Mermaid 无法直接渲染此规模，全局知识地图改用 3D Force Graph 渲染
 * - 全局知识地图页（/map/）由 KnowledgeGraph3D.vue 基于 ThreeJS/WebGL 渲染：
 *   3D 力导向布局，单图可承载 10000+ 节点，支持旋转/缩放/平移/节点跳转
 * - 模块知识地图页（/[module]/map/）仍用 Mermaid 渲染单模块范围内的文档关系
 *
 * @returns 完整知识地图；异常时返回空图
 */
export async function getGlobalMap(): Promise<KnowledgeMap> {
  try {
    const allModules = getAllModules();
    const allDocs = await getAllDocs();

    const moduleNodes: MapNode[] = allModules.map(buildModuleNode);
    const docNodes: MapNode[] = allDocs.map(buildDocNode);

    // 模块级前置依赖边
    const moduleEdges: MapEdge[] = [];
    for (const mod of allModules) {
      const prereqs = getModulePrerequisites(mod.id);
      for (const dep of prereqs) {
        // 仅当依赖目标确实存在时才添加边，避免悬空引用
        if (allModules.some((m) => m.id === dep)) {
          moduleEdges.push({ from: dep, to: mod.id, type: 'prerequisite' });
        }
      }
    }

    // 文档级前置与关联边
    const docEdges: MapEdge[] = [];
    for (const doc of allDocs) {
      docEdges.push(...buildDocPrerequisiteEdges(doc, allDocs));
      docEdges.push(...buildDocRelatedEdges(doc, allDocs));
    }

    return {
      nodes: [...moduleNodes, ...docNodes],
      edges: dedupeEdges([...moduleEdges, ...docEdges]),
    };
  } catch {
    return EMPTY_MAP;
  }
}

/**
 * 获取指定模块的知识地图
 * 范围：模块节点 + 该模块下所有文档节点 + 与该模块相关的边（模块前置依赖、文档前置与关联）
 * 为了图的可读性，关联文档仅纳入本模块内的文档；模块前置依赖照常展示
 * @param moduleId - 模块 ID
 * @returns 模块知识地图；模块不存在或异常时返回空图
 */
export async function getModuleMap(moduleId: string): Promise<KnowledgeMap> {
  try {
    const allModules = getAllModules();
    const mod = allModules.find((m) => m.id === moduleId);
    if (!mod) return EMPTY_MAP;

    // 单次拉取全部文档，从中过滤当前模块文档，避免同时调用
    // getDocsByModule + getAllDocs 导致 Astro collection 被扫描两次
    const allDocs = await getAllDocs();
    const moduleDocs = allDocs.filter((d) => d.data.module === moduleId);

    // 节点：当前模块节点 + 本模块文档节点
    const moduleNode = buildModuleNode(mod);
    const docNodes: MapNode[] = moduleDocs.map(buildDocNode);

    // 模块级前置依赖边（仅纳入当前模块及其前置模块）
    const moduleEdges: MapEdge[] = [];
    const prereqs = getModulePrerequisites(moduleId);
    for (const dep of prereqs) {
      if (allModules.some((m) => m.id === dep)) {
        moduleEdges.push({ from: dep, to: moduleId, type: 'prerequisite' });
      }
    }

    // 文档级前置与关联边（仅纳入本模块内的文档，避免跨模块边导致图过于稀疏）
    const docEdges: MapEdge[] = [];
    for (const doc of moduleDocs) {
      // 前置依赖：仅保留同模块内的依赖
      for (const edge of buildDocPrerequisiteEdges(doc, allDocs)) {
        if (edge.from.startsWith(`${moduleId}/`)) {
          docEdges.push(edge);
        }
      }
      // 关联：仅保留同模块内的关联
      for (const edge of buildDocRelatedEdges(doc, allDocs)) {
        if (edge.from.startsWith(`${moduleId}/`) && edge.to.startsWith(`${moduleId}/`)) {
          docEdges.push(edge);
        }
      }
    }

    return {
      nodes: [moduleNode, ...docNodes],
      edges: dedupeEdges([...moduleEdges, ...docEdges]),
    };
  } catch {
    return EMPTY_MAP;
  }
}

/**
 * 获取指定文档的知识地图
 * 范围：当前文档节点 + 其全部前置依赖文档节点 + 其全部关联文档节点
 * 适用于"当前文档上下文"场景，帮助学习者快速了解前置与延伸阅读
 * @param moduleId - 文档所属模块 ID
 * @param slug - 文档 slug
 * @returns 文档知识地图；文档不存在或异常时返回空图
 */
export async function getDocMap(moduleId: string, slug: string): Promise<KnowledgeMap> {
  try {
    const allDocs = await getAllDocs();
    const current = allDocs.find((d) => d.data.module === moduleId && docSlug(d.id) === slug);
    if (!current) return EMPTY_MAP;

    const currentId = docNodeId(current);
    const nodeMap = new Map<string, MapNode>();
    nodeMap.set(currentId, buildDocNode(current));

    const edges: MapEdge[] = [];

    // 前置依赖边：纳入前置文档节点
    for (const edge of buildDocPrerequisiteEdges(current, allDocs)) {
      const matched = allDocs.find((d) => docNodeId(d) === edge.from);
      if (matched) {
        nodeMap.set(edge.from, buildDocNode(matched));
        edges.push(edge);
      }
    }

    // 关联边：纳入关联文档节点（buildDocRelatedEdges 已过滤自环，可直接使用）
    for (const edge of buildDocRelatedEdges(current, allDocs)) {
      const matched = allDocs.find((d) => docNodeId(d) === edge.from);
      const matchedTo = allDocs.find((d) => docNodeId(d) === edge.to);
      if (matched) nodeMap.set(edge.from, buildDocNode(matched));
      if (matchedTo) nodeMap.set(edge.to, buildDocNode(matchedTo));
      edges.push(edge);
    }

    return {
      nodes: Array.from(nodeMap.values()),
      edges: dedupeEdges(edges),
    };
  } catch {
    return EMPTY_MAP;
  }
}

/**
 * 将原始节点 ID 转换为 Mermaid 安全的节点 ID
 * Mermaid 流程图节点 ID 不允许包含 `/`、空格等特殊字符，
 * 而文档节点 ID 形如 `moduleId/slug`，必须先转义再写入 Mermaid 语法
 *
 * 转义规则：`/` → `__`（双下划线）
 * 选择 `__` 的依据：
 * - 模块 ID 仅含字母与连字符，slug 为文档文件名，均不含 `__`
 * - Mermaid 节点 ID 允许下划线，`__` 不会触发语法错误
 *
 * 与 KnowledgeMap.vue 的 bindNodeClickHandlers 配套：
 * 客户端从 Mermaid 生成的 g.node id 中提取 NodeID 后，
 * 需通过 `replace(/__/g, '/')` 反向还原为原始节点 ID 再查 nodeUrlMap
 *
 * @param nodeId - 原始节点 ID（可能含 `/`）
 * @returns Mermaid 安全的节点 ID（`/` 已替换为 `__`）
 */
function toMermaidNodeId(nodeId: string): string {
  return nodeId.replace(/\//g, '__');
}

/**
 * 将 KnowledgeMap 数据序列化为 Mermaid graph LR 语法字符串
 * 用于客户端 Mermaid 渲染
 *
 * 节点样式约定：
 * - 模块节点：圆角矩形 (subroutine)，加粗
 * - 文档节点：矩形 (rect)
 * - 难度通过 class 区分颜色
 *
 * 边样式约定：
 * - prerequisite：实线箭头，语义为"必须先学"
 * - related：虚线箭头，语义为"相关延伸"
 *
 * 节点 ID 转义：文档节点 ID 形如 `moduleId/slug`，含 `/` 会导致 Mermaid 解析失败，
 * 渲染出粉红色错误占位节点（fill:#faa）。通过 toMermaidNodeId 统一转义为 `__`，
 * 客户端 bindNodeClickHandlers 反向还原
 *
 * @param map - 知识地图数据
 * @returns Mermaid 语法字符串
 */
export function toMermaidGraph(map: KnowledgeMap): string {
  const lines: string[] = ['graph LR', ''];

  // 节点定义（ID 经 toMermaidNodeId 转义，避免 Mermaid 解析 `/` 失败）
  for (const node of map.nodes) {
    const safeLabel = sanitizeMermaidLabel(node.label);
    const mermaidId = toMermaidNodeId(node.id);
    if (node.type === 'module') {
      // 模块节点：圆角矩形 + 加粗
      lines.push(`  ${mermaidId}(("${safeLabel}"))`);
    } else {
      // 文档节点：矩形
      lines.push(`  ${mermaidId}["${safeLabel}"]`);
    }
  }
  lines.push('');

  // 边定义（from/to 同样需要转义）
  for (const edge of map.edges) {
    const fromId = toMermaidNodeId(edge.from);
    const toId = toMermaidNodeId(edge.to);
    if (edge.type === 'prerequisite') {
      // 实线箭头，标注"前置"
      lines.push(`  ${fromId} --> ${toId}`);
    } else {
      // 虚线箭头，标注"关联"
      lines.push(`  ${fromId} -.-> ${toId}`);
    }
  }
  lines.push('');

  // 难度样式 classDef
  lines.push('  classDef diffBeginner fill:#dcfce7,stroke:#16a34a,stroke-width:1px');
  lines.push('  classDef diffIntermediate fill:#fef9c3,stroke:#ca8a04,stroke-width:1px');
  lines.push('  classDef diffAdvanced fill:#fee2e2,stroke:#dc2626,stroke-width:1px');
  lines.push('  classDef moduleNode fill:#dbeafe,stroke:#2563eb,stroke-width:2px,font-weight:bold');

  // 为节点分配难度 class（class 引用也需使用转义后的 ID）
  for (const node of map.nodes) {
    const mermaidId = toMermaidNodeId(node.id);
    if (node.type === 'module') {
      lines.push(`  class ${mermaidId} moduleNode`);
    } else if (node.difficulty) {
      const cls = difficultyClass(node.difficulty);
      if (cls) lines.push(`  class ${mermaidId} ${cls}`);
    }
  }

  return lines.join('\n');
}

/**
 * 根据难度等级返回对应的 Mermaid class 名
 * @param difficulty - 难度等级
 * @returns class 名；无对应难度时返回 null
 */
function difficultyClass(difficulty: MapDifficulty): string | null {
  switch (difficulty) {
    case 'beginner':
      return 'diffBeginner';
    case 'intermediate':
      return 'diffIntermediate';
    case 'advanced':
      return 'diffAdvanced';
    default:
      return null;
  }
}

/**
 * 净化 Mermaid 节点 label 中的特殊字符
 * Mermaid 节点 label 中若包含双引号、括号等会破坏语法，需转义或剔除
 * @param label - 原始 label
 * @returns 净化后的 label
 */
function sanitizeMermaidLabel(label: string): string {
  // 移除可能破坏 Mermaid 语法的字符：双引号、反引号、方括号、圆括号、尖括号
  return label.replace(/["`[\]()<>]/g, '').trim();
}

export type { Module, DocEntry };
