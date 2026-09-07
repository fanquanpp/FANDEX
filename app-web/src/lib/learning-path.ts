/**
 * 学习路径 Web 适配层（服务端专用）
 * -----------------------------------------------------------------------------
 * 职责：
 * - 引入共享层学习路径数据（shd-shared/metadata/learning-path/）
 * - 结合模块元数据（modules.json）与文档索引（doc-index.json）
 *   组装页面/交互岛所需的视图模型
 *
 * 性能与存储设计：
 * - 本模块仅在 .astro 页面（服务端）使用，交互岛只接收已序列化的视图模型，
 *   客户端不会打包全部地图 JSON 与 doc-index.json
 * - 地图按技术拆分为独立 JSON（一技术一文件），页面按需引用对应文件
 * - 文档标题通过预构建的 doc-index.json 解析，避免 getCollection 全量加载导致 OOM
 */
import type {
  KnowledgeDifficulty,
  KnowledgeOfficialLink,
  KnowledgeStage,
  TechnologyMap,
} from '@fandex/utils/learning-path';
import {
  getLearningPathIndex,
  countKnowledgeCoverage,
  javascriptMap,
  typescriptMap,
  gitMap,
  html5Map,
  cssMap,
  reactMap,
  vue3Map,
  pythonMap,
  javaMap,
  goMap,
  cMap,
  cppMap,
  sqlMap,
  mysqlMap,
  redisMap,
  shellMap,
  algorithmMap,
  csFundamentalsMap,
  devopsMap,
  markdownMap,
  githubMap,
  svgMap,
  astroMap,
  viteMap,
  tailwindMap,
  kotlinMap,
  csharpMap,
  rustMap,
  postgresqlMap,
  networkingMap,
  cybersecurityMap,
  cloudComputingMap,
  softwareTestingMap,
  nextjsMap,
  nestjsMap,
} from '@fandex/utils/learning-path';
import docIndex from '@/data/doc-index.json';
import { getModule, categoryColors, getPrimaryCategory } from '@/lib/modules';
import type { OfficialDoc } from '@fandex/utils/modules';

// ============================================================
// 类型定义
// ============================================================

/** 交互岛节点视图模型（含跳转链接与文档标题） */
export interface LearningPathNodeVM {
  /** 节点唯一 ID */
  id: string;
  /** 知识点标题 */
  title: string;
  /** 一句话说明 */
  desc?: string;
  /** 建议难度 */
  difficulty?: KnowledgeDifficulty;
  /** 所属阶段 ID */
  stageId: string;
  /** 所属阶段标题 */
  stageTitle: string;
  /** 站内文档链接（doc 存在时生成） */
  href?: string;
  /** 站内文档标题（doc 存在时解析） */
  docTitle?: string;
  /** 外部官方链接（doc 缺失时兜底） */
  official?: KnowledgeOfficialLink;
}

/** 交互岛阶段视图模型 */
export interface LearningPathStageVM {
  /** 阶段 ID */
  id: string;
  /** 阶段标题 */
  title: string;
  /** 阶段副标题 */
  subtitle?: string;
  /** 阶段内知识点 */
  nodes: LearningPathNodeVM[];
}

/** 交互岛技术视图模型 */
export interface LearningPathTechVM {
  /** 模块 ID */
  module: string;
  /** 模块标题 */
  title: string;
  /** 模块图标文本 */
  icon: string;
  /** 路线说明 */
  summary: string;
  /** 模块分类主题色（驱动整图配色） */
  color: string;
  /** 模块官方文档链接 */
  officialDocs: readonly OfficialDoc[];
  /** 学习阶段 */
  stages: LearningPathStageVM[];
  /** 覆盖统计 */
  stats: { stages: number; nodes: number; docs: number; gaps: number };
}

// ============================================================
// 数据源注册表
// ============================================================

/**
 * 技术地图注册表
 * 静态引入保证构建期可解析；服务端按需取用，客户端不打包
 */
const technologyMaps: Readonly<Record<string, TechnologyMap>> = {
  javascript: javascriptMap as unknown as TechnologyMap,
  typescript: typescriptMap as unknown as TechnologyMap,
  git: gitMap as unknown as TechnologyMap,
  html5: html5Map as unknown as TechnologyMap,
  css: cssMap as unknown as TechnologyMap,
  react: reactMap as unknown as TechnologyMap,
  vue3: vue3Map as unknown as TechnologyMap,
  python: pythonMap as unknown as TechnologyMap,
  java: javaMap as unknown as TechnologyMap,
  go: goMap as unknown as TechnologyMap,
  c: cMap as unknown as TechnologyMap,
  cpp: cppMap as unknown as TechnologyMap,
  sql: sqlMap as unknown as TechnologyMap,
  mysql: mysqlMap as unknown as TechnologyMap,
  redis: redisMap as unknown as TechnologyMap,
  shell: shellMap as unknown as TechnologyMap,
  algorithm: algorithmMap as unknown as TechnologyMap,
  'cs-fundamentals': csFundamentalsMap as unknown as TechnologyMap,
  devops: devopsMap as unknown as TechnologyMap,
  markdown: markdownMap as unknown as TechnologyMap,
  github: githubMap as unknown as TechnologyMap,
  svg: svgMap as unknown as TechnologyMap,
  astro: astroMap as unknown as TechnologyMap,
  vite: viteMap as unknown as TechnologyMap,
  tailwind: tailwindMap as unknown as TechnologyMap,
  kotlin: kotlinMap as unknown as TechnologyMap,
  csharp: csharpMap as unknown as TechnologyMap,
  rust: rustMap as unknown as TechnologyMap,
  postgresql: postgresqlMap as unknown as TechnologyMap,
  networking: networkingMap as unknown as TechnologyMap,
  cybersecurity: cybersecurityMap as unknown as TechnologyMap,
  'cloud-computing': cloudComputingMap as unknown as TechnologyMap,
  'software-testing': softwareTestingMap as unknown as TechnologyMap,
  nextjs: nextjsMap as unknown as TechnologyMap,
  nestjs: nestjsMap as unknown as TechnologyMap,
};

/** 文档索引映射：module/slug -> title，供节点文档标题解析 */
const docTitleMap = new Map<string, string>(
  (docIndex as Array<{ module: string; slug: string; title: string }>).map((doc) => [
    `${doc.module}/${doc.slug}`,
    doc.title,
  ]),
);

// ============================================================
// 查询与组装
// ============================================================

/**
 * 获取学习路径技术顺序
 * @returns 模块 ID 数组
 */
export function getLearningPathModules(): readonly string[] {
  return getLearningPathIndex();
}

/**
 * 判断模块是否已配置学习路径地图
 * @param module - 模块 ID
 * @returns 是否存在对应地图
 */
export function hasLearningPathMap(module: string): boolean {
  return module in technologyMaps;
}

/**
 * 获取原始技术地图（供统计与审计使用）
 * @param module - 模块 ID
 * @returns 技术地图；未配置时返回 undefined
 */
export function getTechnologyMap(module: string): TechnologyMap | undefined {
  return technologyMaps[module];
}

/**
 * 组装交互岛所需的技术视图模型
 * - 解析每个知识点的站内文档链接与标题
 * - 注入模块分类色与官方文档链接
 * @param module - 模块 ID
 * @param base - 站点基础路径（import.meta.env.BASE_URL）
 * @returns 视图模型；模块不存在或未配置地图时返回 undefined
 */
export function getLearningPathTechVM(
  module: string,
  base: string,
): LearningPathTechVM | undefined {
  const map = technologyMaps[module];
  const meta = getModule(module);
  if (!map || !meta) return undefined;

  const color = categoryColors[getPrimaryCategory(meta)] || '#666666';
  const stats = countKnowledgeCoverage(map);

  const stages: LearningPathStageVM[] = map.stages.map((stage: KnowledgeStage) => ({
    id: stage.id,
    title: stage.title,
    ...(stage.subtitle ? { subtitle: stage.subtitle } : {}),
    nodes: stage.nodes.map((node) => {
      const vm: LearningPathNodeVM = {
        id: node.id,
        title: node.title,
        stageId: stage.id,
        stageTitle: stage.title,
      };
      if (node.desc) vm.desc = node.desc;
      if (node.difficulty) vm.difficulty = node.difficulty;
      if (node.official) vm.official = node.official;
      if (node.doc) {
        vm.href = `${base}${module}/${node.doc}/`;
        vm.docTitle = docTitleMap.get(`${module}/${node.doc}`) || node.title;
      }
      return vm;
    }),
  }));

  return {
    module: map.module,
    title: meta.title,
    icon: meta.icon,
    summary: map.summary,
    color,
    officialDocs: meta.officialDocs ?? [],
    stages,
    stats: { stages: map.stages.length, ...stats },
  };
}
