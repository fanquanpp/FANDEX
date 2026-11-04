/**
 * 最终汇总报告生成：合并 r2 全部验证产物，输出 InteractionFinding 数组。
 * 产物：
 *   - qa-interact-r2-report.json （main 全量扫描 + extra + hover 最后一版为 hover；本轮已被 hover 覆盖，
 *     main/extra 数据以 qa-r2-main.log / qa-r2-extra.log 与 verify 产物为准）
 *   - qa-r2-verify-report.json   （修正套件，含已证伪 harness 误报）
 *   - qa-r2-final-verify.json    （CDP 导航验证）
 * 本脚本只做读档汇总，不做点击。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const findings = [];

function load(p) { try { return JSON.parse(readFileSync('C:/Atian/Project/FANDEX/.workflow-tmp/' + p, 'utf8')); } catch { return null; } }

// 1) 确认的产品缺陷：lang toggle 单击导致 useLang 消费 island 崩溃卸载
//    证据（本轮实测）：qa-r2-debug22/23/24/75/76/77 各日志 + 代码定位
findings.push({
  page: '/syntax/, /learning-path/javascript/, /playground/ (all pages with React islands consuming useLang)',
  element: 'header [data-lang-toggle] (fndx-lang-toggle) click',
  expected: '语言切换生效（html[data-lang] 翻转 + i18n 文案重写），页面 islands 保持挂载',
  actual: '单击后 langchange 事件 detail={lang:"en"}（对象而非 Lang 字符串）传入 subscribeLang 回调（app-web/src/lib/i18n.ts:57 的 (event as CustomEvent<Lang>).detail ?? readLangFromDom()），useLang（app-web/src/lib/use-lang.ts:11）把对象写入 React state；随后渲染调用 t(key, params, lang) 时 entry[lang] 为 undefined，text.replace 抛 "TypeError: Cannot read properties of undefined (reading \'replace\')"（app-web/src/lib/i18n.ts:73，CDP 断点捕获 lang={"lang":"en"} 实证），React 渲染树崩溃并把整个 island 卸载：/syntax/ 语法卡片 36->0、/learning-path/javascript/ 地图节点 495->0、/playground/ 工具栏与编辑器全部消失。三个页面均单次点击 100% 复现',
  severity: 'high',
});

// 2) 低危：404 页面自引用 404 状态（dev 环境下 /FANDEX/404/ HTTP 404 为 dev 预期，
//    但页面内全部资源加载正常，无资源性 404；不算缺陷，记录为环境注记而非 finding）

// 3) 确认修复的 r1 缺陷（回归验证通过，不算 finding）

writeFileSync('C:/Atian/Project/FANDEX/.workflow-tmp/qa-r2-findings.json', JSON.stringify(findings, null, 2));
console.log('findings written:', findings.length);
