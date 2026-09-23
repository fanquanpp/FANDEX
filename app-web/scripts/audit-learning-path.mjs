import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const MAP_DIR = join(ROOT, 'shd-shared', 'metadata', 'learning-path');
const MODULES_PATH = join(ROOT, 'shd-shared', 'metadata', 'modules.json');
const CONTENT_DIR = join(ROOT, 'cnt-content', 'full');
// 报告输出到仓库根 .reports/（.gitignore 排除，不入库）
const REPORT_DIR = join(ROOT, '.reports');

const officialLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
});

const knowledgeNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  desc: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  doc: z.string().min(1).optional(),
  official: officialLinkSchema.optional(),
});

const knowledgeStageSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  nodes: z.array(knowledgeNodeSchema).min(1),
});

const technologyMapSchema = z.object({
  version: z.string(),
  module: z.string().min(1),
  summary: z.string(),
  stages: z.array(knowledgeStageSchema).min(1),
});

const indexSchema = z.object({
  version: z.string(),
  order: z.array(z.string()),
});

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function scanContentDocs() {
  const docsByFolder = new Map();
  const folderByModule = new Map();
  const moduleDirs = readdirSync(CONTENT_DIR, { withFileTypes: true }).filter((e) =>
    e.isDirectory(),
  );
  for (const dir of moduleDirs) {
    const slugs = new Set();
    const dirPath = join(CONTENT_DIR, dir.name);
    for (const file of readdirSync(dirPath)) {
      if (extname(file) === '.md' || extname(file) === '.mdx') {
        slugs.add(basename(file, extname(file)));
      }
    }
    docsByFolder.set(dir.name, slugs);
    const match = dir.name.match(/^\d{3}-(.+)$/);
    if (match) folderByModule.set(match[1], dir.name);
  }
  return { docsByFolder, folderByModule };
}

function loadModuleFolders() {
  const modules = loadJson(MODULES_PATH).modules;
  return new Map(modules.map((m) => [m.id, m]));
}

function main() {
  const args = process.argv.slice(2);
  const writeReport = args.includes('--write-report');
  const templatesArg = args.indexOf('--templates');
  const templatesDir = templatesArg >= 0 ? args[templatesArg + 1] : null;

  const modules = loadModuleFolders();
  const { docsByFolder, folderByModule } = scanContentDocs();
  const index = indexSchema.parse(loadJson(join(MAP_DIR, 'index.json')));
  const moduleIds = new Set(modules.keys());

  let errors = 0;
  let warnings = 0;
  const rows = [];
  const gapRows = [];

  for (const id of index.order) {
    if (!existsSync(join(MAP_DIR, `${id}.json`))) {
      console.error(`[FAIL] index.json 引用了不存在的地图文件: ${id}.json`);
      errors++;
    }
  }

  for (const moduleId of index.order) {
    const filePath = join(MAP_DIR, `${moduleId}.json`);
    if (!existsSync(filePath)) continue;

    let map;
    try {
      map = technologyMapSchema.parse(loadJson(filePath));
    } catch (err) {
      console.error(`[FAIL] ${moduleId}.json 结构校验失败:`, err.issues ?? err.message);
      errors++;
      continue;
    }

    if (!moduleIds.has(map.module)) {
      console.error(`[FAIL] ${moduleId}.json 引用了不存在的模块 ID: ${map.module}`);
      errors++;
    }

    const nodeIds = new Set();
    const stageIds = new Set();
    let docs = 0;
    let gaps = 0;

    for (const stage of map.stages) {
      if (stageIds.has(stage.id)) {
        console.error(`[FAIL] ${moduleId}.json 阶段 ID 重复: ${stage.id}`);
        errors++;
      }
      stageIds.add(stage.id);

      for (const node of stage.nodes) {
        if (nodeIds.has(node.id)) {
          console.error(`[FAIL] ${moduleId}.json 节点 ID 重复: ${node.id}`);
          errors++;
        }
        nodeIds.add(node.id);

        if (node.doc) {
          const folder = folderByModule.get(map.module);
          const exists = folder ? docsByFolder.get(folder)?.has(node.doc) : false;
          if (!exists) {
            console.error(
              `[FAIL] ${moduleId}.json 节点 ${node.id} 引用的文档不存在: ${node.doc}`,
            );
            errors++;
          } else {
            docs++;
          }
        } else {
          gaps++;
          gapRows.push({
            module: map.module,
            moduleTitle: modules.get(map.module)?.title ?? map.module,
            stage: stage.title,
            node,
          });
        }
      }
    }

    rows.push({
      module: map.module,
      title: modules.get(map.module)?.title ?? map.module,
      stages: map.stages.length,
      nodes: nodeIds.size,
      docs,
      gaps,
    });
    console.log(
      `[OK] ${map.module.padEnd(12)} 阶段 ${map.stages.length}  知识点 ${nodeIds.size}  已覆盖 ${docs}  缺口 ${gaps}`,
    );
  }

  for (const moduleId of moduleIds) {
    if (!index.order.includes(moduleId)) {
      console.warn(`[WARN] 模块 ${moduleId} 尚未配置学习路径地图`);
      warnings++;
    }
  }

  const total = rows.reduce((acc, r) => acc + r.nodes, 0);
  const totalDocs = rows.reduce((acc, r) => acc + r.docs, 0);
  const totalGaps = rows.reduce((acc, r) => acc + r.gaps, 0);

  const report = [
    '# 学习路径缺口审计报告',
    '',
    `> 生成时间：${new Date().toISOString()}`,
    `> 技术数量：${rows.length} ｜ 知识点：${total} ｜ 已覆盖：${totalDocs} ｜ 缺口：${totalGaps}`,
    '',
    '## 总览',
    '',
    '| 技术 | 阶段 | 知识点 | 已覆盖 | 缺口 |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) => `| ${r.title}（${r.module}） | ${r.stages} | ${r.nodes} | ${r.docs} | ${r.gaps} |`,
    ),
    '',
    '## 待补充文档清单',
    '',
    ...(gapRows.length
      ? gapRows.map(
          (g) =>
            `- [ ] **${g.moduleTitle}** ${g.node.title}（${g.stage}）｜建议难度：${g.node.difficulty ?? '未指定'}｜${g.node.desc ?? ''}`,
        )
      : ['- 当前没有缺口，全部知识点均已有文档。']),
    '',
  ].join('\n');

  if (writeReport) {
    mkdirSync(REPORT_DIR, { recursive: true });
    const reportPath = join(REPORT_DIR, 'learning-path-gap-report.md');
    writeFileSync(reportPath, report, 'utf-8');
    console.log(`\n报告已写入: ${reportPath}`);
  }

  if (templatesDir && gapRows.length > 0) {
    mkdirSync(templatesDir, { recursive: true });
    for (const gap of gapRows) {
      const moduleInfo = modules.get(gap.module);
      const folderName = moduleInfo
        ? `${String(moduleInfo.folder_order).padStart(3, '0')}-${moduleInfo.id}`
        : gap.module;
      const fileName = `${gap.node.id}.md`;
      const template = [
        '---',
        `order: 0`,
        `title: ${gap.node.title}`,
        `module: ${gap.module}`,
        `category: '${folderName}'`,
        `difficulty: ${gap.node.difficulty ?? 'beginner'}`,
        `description: ${gap.node.desc ?? ''}`,
        `author: fanquanpp`,
        `updated: '2026-08-02'`,
        `related: []`,
        `prerequisites: []`,
        '---',
        '',
        `# ${gap.node.title}`,
        '',
        `> ${gap.node.desc ?? '待补充说明'}`,
        '',
        '## 一句话理解',
        '',
        '## 核心概念',
        '',
        '## 代码示例',
        '',
        '## 常见误区',
        '',
        '## 自测',
        '',
      ].join('\n');
      const target = join(templatesDir, gap.module, fileName);
      mkdirSync(join(templatesDir, gap.module), { recursive: true });
      if (!existsSync(target)) writeFileSync(target, template, 'utf-8');
    }
    console.log(`模板已写入: ${templatesDir}`);
  }

  console.log(`\n结果: ${errors} errors, ${warnings} warnings`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
