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
  startMap,
  roadmapMap,
  mongodbMap,
} from '@fandex/utils/learning-path';
import docIndex from '@/data/doc-index.json';
import { getModule, categoryColors, getPrimaryCategory } from '@/lib/modules';
import type { OfficialDoc } from '@fandex/utils/modules';

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
  start: startMap as unknown as TechnologyMap,
  roadmap: roadmapMap as unknown as TechnologyMap,
  mongodb: mongodbMap as unknown as TechnologyMap,
};

const docTitleMap = new Map<string, string>(
  (docIndex as Array<{ module: string; slug: string; title: string }>).map((doc) => [
    `${doc.module}/${doc.slug}`,
    doc.title,
  ]),
);

export function getLearningPathModules(): readonly string[] {
  return getLearningPathIndex();
}

export function hasLearningPathMap(module: string): boolean {
  return module in technologyMaps;
}

export function getTechnologyMap(module: string): TechnologyMap | undefined {
  return technologyMaps[module];
}

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
