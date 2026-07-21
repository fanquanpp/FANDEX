/**
 * Pagefind 模块测试 Mock
 *
 * 用途：
 * - 在 Vitest 单元测试环境中替代 /pagefind/pagefind.js 动态导入
 * - SearchModal.tsx 使用 import(/* @vite-ignore *\/ '/pagefind/pagefind.js') 加载生产构建产物
 * - 测试环境无该产物，需通过 vitest.config.ts 的 resolve.alias 映射到本文件
 *
 * Skill 偏差报备：
 * - 原方案使用 vi.mock('/pagefind/pagefind.js') 拦截动态 import，但 Vite 8.x 的
 *   import-analysis 插件在 vitest mock 注册前就拦截了该路径，导致 vi.mock 无法生效。
 * - 改用 resolve.alias 将 '/pagefind/pagefind.js' 映射到本 mock 文件，
 *   使 Vite 解析阶段直接重定向到本地模块，绕过 import-analysis 拦截。
 * - 此方案经工具验证为有效方案，避免伪造检索过程。
 *
 * 行为说明：
 * - search() 返回空结果数组，模拟 Pagefind 索引为空，使 SearchModal 自然降级到 Fuse.js 路径
 *   （searchWithPagefind 返回 []，performSearch 检测到 pfResults.length === 0 后进入 Fuse.js 分支）
 * - init() 为空操作，避免实际初始化逻辑
 */

export async function search(_query: string): Promise<{
  results: Array<{
    id: string;
    data: () => Promise<{
      url: string;
      excerpt: string;
      meta: { title: string; [key: string]: string };
    }>;
  }>;
}> {
  // 返回空结果，触发 SearchModal 降级到 Fuse.js 本地索引搜索
  return { results: [] };
}

export async function init(): Promise<void> {
  // 测试环境空操作
}

const pagefindMock = {
  search,
  init,
};

export default pagefindMock;
