
import learningPathIndex from '../metadata/learning-path/index.json';

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
export { default as startMap } from '../metadata/learning-path/start.json';
export { default as roadmapMap } from '../metadata/learning-path/roadmap.json';
export { default as mongodbMap } from '../metadata/learning-path/mongodb.json';

export type KnowledgeDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface KnowledgeOfficialLink {
  readonly label: string;
  readonly url: string;
}

export interface KnowledgeNode {
  readonly id: string;
  readonly title: string;
  readonly desc?: string;
  readonly difficulty?: KnowledgeDifficulty;
  readonly doc?: string;
  readonly official?: KnowledgeOfficialLink;
}

export interface KnowledgeStage {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly nodes: readonly KnowledgeNode[];
}

export interface TechnologyMap {
  readonly version: string;
  readonly module: string;
  readonly summary: string;
  readonly stages: readonly KnowledgeStage[];
}

export interface LearningPathIndex {
  readonly version: string;
  readonly order: readonly string[];
}

const frozenIndex: Readonly<LearningPathIndex> = Object.freeze({
  version: learningPathIndex.version,
  order: Object.freeze([...learningPathIndex.order]),
});

export function getLearningPathIndex(): readonly string[] {
  return frozenIndex.order;
}

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

export function getKnowledgeGaps(map: TechnologyMap): ReadonlyArray<
  KnowledgeNode & { readonly stageId: string; readonly stageTitle: string }
> {
  return flattenKnowledgeNodes(map).filter((node) => !node.doc);
}
