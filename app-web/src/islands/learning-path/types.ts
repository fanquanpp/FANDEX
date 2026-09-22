import type {
  KnowledgeDifficulty,
  KnowledgeOfficialLink,
} from '@fandex/utils/learning-path';
import type { OfficialDoc as ModuleOfficialDoc } from '@fandex/utils/modules';

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

export type NodeProgress = 'learning' | 'done';

export type TechProgress = Record<string, NodeProgress>;

export interface StageVM {
  id: string;
  title: string;
  subtitle?: string;
  nodes: NodeVM[];
}

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
