/**
 * 学习路径共享访问层（三端统一数据源）
 * -----------------------------------------------------------------------------
 * 功能概述：
 * - 定义学习路径图（TechnologyMap）与知识点（KnowledgeNode）的共享类型
 * - 提供索引读取、节点/缺口统计等纯函数工具，供 web/desktop/android 复用
 * - 不加载具体技术地图（地图由各端按需引入），避免全量打包浪费存储
 *
 * 数据源：shd-shared/metadata/learning-path/
 * - index.json          技术索引（展示顺序）
 * - <module>.json       单技术知识地图（一技术一文件）
 *
 * 设计原则（与 modules.ts 一致）：
 * - 零硬编码：索引从共享 JSON 实时读取
 * - 类型严格：无 any，与 JSON 结构对齐
 * - 冻结导出：防止运行时篡改
 */

import learningPathIndex from '../metadata/learning-path/index.json';

// 各技术地图由共享包统一导出，避免各端跨包直接导入 JSON 造成构建解析不一致
export { default as javascriptMap } from '../metadata/learning-path/javascript.json';
export { default as typescriptMap } from '../metadata/learning-path/typescript.json';
export { default as gitMap } from '../metadata/learning-path/git.json';
export { default as html5Map } from '../metadata/learning-path/html5.json';
export { default as cssMap } from '../metadata/learning-path/css.json';
export { default as reactMap } from '../metadata/learning-path/react.json';
export { default as vue3Map } from '../metadata/learning-path/vue3.json';
export { default as pythonMap } from '../metadata/learning-path/python.json';
export { default as javaMap } from '../metadata/learning-path/java.json';
export { default as goMap } from '../metadata/learning-path/go.json';
export { default as cMap } from '../metadata/learning-path/c.json';
export { default as cppMap } from '../metadata/learning-path/cpp.json';
export { default as sqlMap } from '../metadata/learning-path/sql.json';
export { default as mysqlMap } from '../metadata/learning-path/mysql.json';
export { default as redisMap } from '../metadata/learning-path/redis.json';
export { default as shellMap } from '../metadata/learning-path/shell.json';
export { default as algorithmMap } from '../metadata/learning-path/algorithm.json';
export { default as csFundamentalsMap } from '../metadata/learning-path/cs-fundamentals.json';
export { default as devopsMap } from '../metadata/learning-path/devops.json';
export { default as markdownMap } from '../metadata/learning-path/markdown.json';
export { default as githubMap } from '../metadata/learning-path/github.json';
export { default as svgMap } from '../metadata/learning-path/svg.json';
export { default as astroMap } from '../metadata/learning-path/astro.json';
export { default as viteMap } from '../metadata/learning-path/vite.json';
export { default as tailwindMap } from '../metadata/learning-path/tailwind.json';
export { default as kotlinMap } from '../metadata/learning-path/kotlin.json';
export { default as csharpMap } from '../metadata/learning-path/csharp.json';
export { default as rustMap } from '../metadata/learning-path/rust.json';
export { default as postgresqlMap } from '../metadata/learning-path/postgresql.json';
export { default as networkingMap } from '../metadata/learning-path/networking.json';
export { default as cybersecurityMap } from '../metadata/learning-path/cybersecurity.json';
export { default as cloudComputingMap } from '../metadata/learning-path/cloud-computing.json';
export { default as softwareTestingMap } from '../metadata/learning-path/software-testing.json';
export { default as nextjsMap } from '../metadata/learning-path/nextjs.json';
export { default as nestjsMap } from '../metadata/learning-path/nestjs.json';

// ============================================================
// 类型定义
// ============================================================

/** 知识点难度 */
export type KnowledgeDifficulty = 'beginner' | 'intermediate' | 'advanced';

/** 外部官方链接（用于尚无站内文档的知识点） */
export interface KnowledgeOfficialLink {
  /** 链接显示文本 */
  readonly label: string;
  /** 链接目标 URL */
  readonly url: string;
}

/**
 * 知识点节点
 * - doc 存在：该知识点已有站内专项文档，节点可点击跳转
 * - doc 缺失：为待补充节点，页面以虚线样式提示，可提供 official 链接兜底
 */
export interface KnowledgeNode {
  /** 图内唯一 ID（如 js-001） */
  readonly id: string;
  /** 知识点标题 */
  readonly title: string;
  /** 一句话说明 */
  readonly desc?: string;
  /** 建议难度 */
  readonly difficulty?: KnowledgeDifficulty;
  /** 已发布文档 slug（对应 cnt-content/full/<module>/<slug>.md） */
  readonly doc?: string;
  /** 外部官方链接（doc 缺失时兜底） */
  readonly official?: KnowledgeOfficialLink;
}

/** 学习阶段（思维导图的一级分支） */
export interface KnowledgeStage {
  /** 阶段唯一 ID（如 basics） */
  readonly id: string;
  /** 阶段标题（如 基础语法） */
  readonly title: string;
  /** 阶段副标题 */
  readonly subtitle?: string;
  /** 知识点列表（阶段内按数组顺序连接） */
  readonly nodes: readonly KnowledgeNode[];
}

/** 单技术知识地图 */
export interface TechnologyMap {
  /** 数据版本号 */
  readonly version: string;
  /** 模块 ID（对应 modules.json 的 module.id） */
  readonly module: string;
  /** 路线一句话说明 */
  readonly summary: string;
  /** 学习阶段（从左到右排列） */
  readonly stages: readonly KnowledgeStage[];
}

/** 学习路径索引 */
export interface LearningPathIndex {
  /** 数据版本号 */
  readonly version: string;
  /** 技术展示顺序（模块 ID 列表） */
  readonly order: readonly string[];
}

// ============================================================
// 索引与统计工具
// ============================================================

/** 冻结的索引实例，防止运行时篡改 */
const frozenIndex: Readonly<LearningPathIndex> = Object.freeze({
  version: learningPathIndex.version,
  order: Object.freeze([...learningPathIndex.order]),
});

/**
 * 获取学习路径技术索引
 * @returns 冻结的技术顺序数组
 */
export function getLearningPathIndex(): readonly string[] {
  return frozenIndex.order;
}

/**
 * 展平知识地图的所有知识点
 * @param map - 技术地图
 * @returns 带阶段信息的节点数组（含 stageId/stageTitle）
 */
export function flattenKnowledgeNodes(map: TechnologyMap): ReadonlyArray<
  KnowledgeNode & { readonly stageId: string; readonly stageTitle: string }
> {
  const result: Array<KnowledgeNode & { stageId: string; stageTitle: string }> = [];
  for (const stage of map.stages) {
    for (const node of stage.nodes) {
      result.push({ ...node, stageId: stage.id, stageTitle: stage.title });
    }
  }
  return result;
}

/**
 * 统计知识地图的文档覆盖情况
 * @param map - 技术地图
 * @returns 节点总数、已覆盖文档数、待补充缺口数
 */
export function countKnowledgeCoverage(map: TechnologyMap): {
  readonly nodes: number;
  readonly docs: number;
  readonly gaps: number;
} {
  let nodes = 0;
  let docs = 0;
  for (const stage of map.stages) {
    for (const node of stage.nodes) {
      nodes += 1;
      if (node.doc) docs += 1;
    }
  }
  return { nodes, docs, gaps: nodes - docs };
}

/**
 * 获取地图中的待补充知识点
 * @param map - 技术地图
 * @returns 缺少站内文档的节点列表
 */
export function getKnowledgeGaps(map: TechnologyMap): ReadonlyArray<
  KnowledgeNode & { readonly stageId: string; readonly stageTitle: string }
> {
  return flattenKnowledgeNodes(map).filter((node) => !node.doc);
}
