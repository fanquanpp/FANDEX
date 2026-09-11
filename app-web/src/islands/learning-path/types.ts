/**
 * 学习路径交互岛类型定义（客户端安全）
 * -----------------------------------------------------------------------------
 * 说明：仅定义类型，不引入任何服务端数据模块，避免客户端打包 doc-index 与地图 JSON。
 */
import type {
  KnowledgeDifficulty,
  KnowledgeOfficialLink,
} from '@fandex/utils/learning-path';
import type { OfficialDoc as ModuleOfficialDoc } from '@fandex/utils/modules';

/** 知识点节点视图模型 */
export interface NodeVM {
  id: string;
  title: string;
  desc?: string;
  difficulty?: KnowledgeDifficulty;
  stageId: string;
  stageTitle: string;
  href?: string;
  docTitle?: string;
  official?: KnowledgeOfficialLink;
}

/**
 * 节点学习进度状态（用户标记）
 * - 'learning' 学习中
 * - 'done' 已完成
 * - 未标记即"未学习"，不落存储（避免全量节点写入 localStorage）
 */
export type NodeProgress = 'learning' | 'done';

/** 单个技术的进度表：节点 ID -> 进度状态 */
export type TechProgress = Record<string, NodeProgress>;

/** 阶段视图模型 */
export interface StageVM {
  id: string;
  title: string;
  subtitle?: string;
  nodes: NodeVM[];
}

/** 技术视图模型 */
export interface TechVM {
  module: string;
  title: string;
  icon: string;
  summary: string;
  color: string;
  officialDocs: readonly ModuleOfficialDoc[];
  stages: StageVM[];
  stats: { stages: number; nodes: number; docs: number; gaps: number };
}

export type { KnowledgeDifficulty, KnowledgeOfficialLink };
