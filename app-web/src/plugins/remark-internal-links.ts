/**
 * 站内根相对链接 base 重写插件（remark 阶段）
 *
 * 解决的问题：
 * 站点部署在 GitHub Pages 项目路径 /FANDEX/ 下（base 非 /），而文档正文的
 * 站内链接普遍写作根相对形式（如 /sql/020-OverviewStandard、/github/010-GitHubOverview）。
 * 浏览器会将其解析到域根 https://fanquanpp.github.io/sql/...，线上 404。
 *
 * 处理策略（构建期一次性重写，SSG 输出即为正确地址）：
 * - 覆盖 link / image / definition 三类节点的 URL（图片与引用式链接同样受影响）
 * - 仅处理「以 / 开头且非 // 开头」的根相对路径；锚点、mailto:、外链不受影响
 * - 幂等：已携带 base 前缀的链接不重复追加
 * - 桌面端构建（DESKTOP_BUILD=1）base 为 /，追加前缀等于原样返回，天然兼容
 * - 目录式链接（无扩展名、不以 / 结尾）统一补尾斜杠，与 trailingSlash: 'always'
 *   一致，消除 GitHub Pages 的 301 重定向
 */
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';

interface Options {
  /** 站点基础路径（与 astro.config 的 base 一致，由配置文件显式传入；
   * 插件在 config 加载期于 Node 侧执行，import.meta.env 在此上下文不可靠，
   * 不能在插件内部读取） */
  base: string;
}

/** 去掉首尾斜杠的 base 前缀（'/FANDEX'）；base 为 '/' 时为空串（无需重写） */
function toPrefix(base: string): string {
  return base !== '/' ? base.replace(/^\/|\/$/g, '') : '';
}

export function remarkInternalLinks({ base }: Options) {
  const PREFIX = toPrefix(base);
  return (tree: Root) => {
    if (!PREFIX) return;
    visit(tree, (node) => {
      // link：行内/自动链接；image：图片；definition：引用式链接定义
      if (node.type !== 'link' && node.type !== 'image' && node.type !== 'definition') {
        return;
      }
      const url = node.url;
      // 仅处理根相对路径：以 / 开头且非协议相对（//）
      if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return;
      // 幂等：已带 base 前缀（含 /FANDEX/ 与 /FANDEX 两种形态）则跳过
      if (url === `/${PREFIX}` || url.startsWith(`/${PREFIX}/`)) return;

      let rewritten = `/${PREFIX}${url}`;
      // 目录式链接补尾斜杠：不含扩展名且未以 / 结尾（锚点部分原样保留，含 # 号）
      const hashIndex = rewritten.indexOf('#');
      const pathPart = hashIndex >= 0 ? rewritten.slice(0, hashIndex) : rewritten;
      const hashPart = hashIndex >= 0 ? rewritten.slice(hashIndex) : '';
      if (!pathPart.endsWith('/') && !/\.[a-zA-Z0-9]+$/.test(pathPart)) {
        rewritten = `${pathPart}/${hashPart}`;
      }
      node.url = rewritten;
    });
  };
}
