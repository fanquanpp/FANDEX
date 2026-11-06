import type {
  KnowledgeDifficulty,
  KnowledgeOfficialLink,
} from '@fandex/utils/learning-path';
import type { OfficialDoc } from '@fandex/utils/modules';
import { toPlainTextMath } from '@/lib/plain-math';
import learningPathResolved from '@/data/learning-path-resolved.json';

export interface LearningPathNodeVM {
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

export interface LearningPathStageVM {
  id: string;
  title: string;
  subtitle?: string;
  nodes: LearningPathNodeVM[];
}

export interface LearningPathTechVM {
  module: string;
  title: string;
  icon: string;
  summary: string;
  color: string;
  officialDocs: readonly OfficialDoc[];
  stages: LearningPathStageVM[];
  stats: { stages: number; nodes: number; docs: number; gaps: number };
}

// learning-path-resolved.json（scripts/build-learning-path.mjs 产物，schema v1）节点形状：
// meta（title/icon/color/officialDocs）与 docTitle 已在构建期 join 完成；
// href 不烘进产物（base 中立，评审 MF2：web /FANDEX/ 与桌面 / 双构建共享缓存），
// 本模块是唯一 SSR 拼接点：href = `${base}${docRef.module}/${docRef.slug}/`，
// 与旧实现 learning-path.ts:183 的现式逐字一致，调用点契约（[tech]/index.astro:20,26,33）零变更。
interface ResolvedNode {
  id: string;
  title: string;
  desc?: string;
  difficulty?: KnowledgeDifficulty;
  stageId: string;
  stageTitle: string;
  official?: KnowledgeOfficialLink;
  docRef?: { module: string; slug: string; docTitle: string };
}

interface ResolvedStage {
  id: string;
  title: string;
  subtitle?: string;
  nodes: ResolvedNode[];
}

interface ResolvedMap {
  module: string;
  title: string;
  icon: string;
  summary: string;
  color: string;
  officialDocs: readonly OfficialDoc[];
  stages: ResolvedStage[];
  stats: { stages: number; nodes: number; docs: number; gaps: number };
}

interface ResolvedArtifact {
  index: string[];
  maps: Record<string, ResolvedMap>;
}

const resolved = learningPathResolved as unknown as ResolvedArtifact;

export function getLearningPathModules(): readonly string[] {
  return resolved.index;
}

export function hasLearningPathMap(module: string): boolean {
  return module in resolved.maps;
}

export function getLearningPathTechVM(
  module: string,
  base: string,
): LearningPathTechVM | undefined {
  const map = resolved.maps[module];
  if (!map) return undefined;

  const stages: LearningPathStageVM[] = map.stages.map((stage: ResolvedStage) => ({
    id: stage.id,
    title: stage.title,
    ...(stage.subtitle ? { subtitle: stage.subtitle } : {}),
    nodes: stage.nodes.map((node) => {
      const vm: LearningPathNodeVM = {
        id: node.id,
        title: node.title,
        stageId: node.stageId,
        stageTitle: node.stageTitle,
      };
      if (node.desc) vm.desc = node.desc;
      if (node.difficulty) vm.difficulty = node.difficulty;
      if (node.official) vm.official = node.official;
      if (node.docRef) {
        vm.href = `${base}${node.docRef.module}/${node.docRef.slug}/`;
        // 产物 docTitle 面向 KaTeX 通道书写（与 frontmatter title 同源）；节点
        // 面板/地图为纯文本展示，按视检第 2 期第 1 项清洗行内 LaTeX
        vm.docTitle = toPlainTextMath(node.docRef.docTitle);
      }
      return vm;
    }),
  }));

  return {
    module: map.module,
    title: map.title,
    icon: map.icon,
    summary: map.summary,
    color: map.color,
    officialDocs: map.officialDocs,
    stages,
    stats: { ...map.stats },
  };
}
