/**
 * 速查表数据映射工具
 *
 * 功能概述：
 * - 将 data/cheatsheets/*.json 的中文 key 结构转换为 CheatsheetData 英文接口
 * - 供 MDX 速查表页面与 [name].astro 动态路由共用，避免重复实现
 *
 * 数据流：
 * 1. 读取 JSON：{ 元数据: { 模块名称, ... }, 分组: [{ 分组名, 分组说明, 条目: [...] }] }
 * 2. 输出 CheatsheetData：{ name, title, sections: [{ title, items: [{ syntax, description, example? }] }] }
 *
 * 字段映射规则：
 * - 元数据.模块名称 → title（缺失则回退到 name）
 * - 分组 → sections（过滤掉无条目的空分组）
 * - 分组.分组名 → section.title
 * - 分组.条目 → section.items
 * - 条目.描述 → item.syntax（顶部一行 code 字体显示的简短描述）
 * - 条目.使用场景 → item.description（缺失则回退到描述或空字符串）
 * - 条目.代码 → item.example（仅在非空时设置，触发岛屿的折叠示例代码块）
 */

import type { CheatsheetData, CheatsheetItem, CheatsheetSection } from '@/types';

/** 速查表 JSON 原始数据结构（中文 key，仅声明使用到的字段） */
export interface CheatsheetJson {
  元数据?: {
    模块名称?: string;
    版本?: string;
    最后更新?: string;
    前置知识?: string[];
    推荐学习顺序?: string[];
  };
  分组?: Array<{
    分组名?: string;
    分组说明?: string;
    条目?: Array<{
      描述?: string;
      代码?: string;
      使用场景?: string;
    }>;
  }>;
}

/**
 * 将中文 key 的 JSON 数据映射为 CheatsheetData 英文接口
 *
 * @param name - 速查表标识（文件名，如 'python'）
 * @param json - 原始 JSON 数据
 * @returns 与 CheatsheetData 接口对齐的结构化数据
 */
export function mapCheatsheet(name: string, json: CheatsheetJson): CheatsheetData {
  const meta = json.元数据 ?? {};
  const groups = json.分组 ?? [];

  const sections: CheatsheetSection[] = groups
    .filter((g) => Array.isArray(g.条目) && g.条目.length > 0)
    .map((group) => {
      const items: CheatsheetItem[] = (group.条目 ?? []).map((entry) => {
        const syntax = entry.描述?.trim() ?? '';
        const description = entry.使用场景?.trim() || entry.描述?.trim() || '';
        const example = entry.代码?.trim() || undefined;

        return {
          syntax,
          description,
          // 仅在存在代码时设置 example，避免岛屿误判为可折叠
          ...(example ? { example } : {}),
        };
      });

      return {
        title: group.分组名?.trim() ?? '未命名分组',
        items,
      };
    });

  return {
    name,
    title: meta.模块名称?.trim() || name,
    sections,
  };
}
