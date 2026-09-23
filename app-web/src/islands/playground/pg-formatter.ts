
const PRETTIER_VERSION = '3.5.3';
const PRETTIER_BASE = `https://cdn.jsdelivr.net/npm/prettier@${PRETTIER_VERSION}`;

type FormattableLanguage = 'html' | 'css' | 'javascript' | 'typescript' | 'python';

const PARSER_BY_LANGUAGE: Record<FormattableLanguage, string> = {
  html: 'html',
  css: 'css',
  javascript: 'babel',
  typescript: 'babel-ts',
  python: 'python',
};

// 失败说明以 i18n 键返回（调用方负责按当前语言翻译），避免模块内硬编码中文
export type FormatNoteKey = 'pg.format.unsupported' | 'pg.format.loadFailed' | 'pg.format.failed';

async function loadPlugin(parser: string): Promise<unknown> {
  // 使用变量 URL + @vite-ignore，确保 Vite 构建期不解析 CDN 地址
  const pluginUrl = `${PRETTIER_BASE}/plugins/${parser}.mjs`;
  return import(/* @vite-ignore */ pluginUrl);
}

export async function formatCode(
  language: string,
  code: string,
): Promise<{ code: string; noteKey: FormatNoteKey | '' }> {
  const parser = PARSER_BY_LANGUAGE[language as FormattableLanguage];
  if (!parser) {
    return { code, noteKey: 'pg.format.unsupported' };
  }
  try {
    const standaloneUrl = `${PRETTIER_BASE}/standalone.mjs`;
    const standalone = await import(/* @vite-ignore */ standaloneUrl);
    const format = (
      standalone as {
        format: (source: string, options: Record<string, unknown>) => Promise<string>;
      }
    ).format;
    if (typeof format !== 'function') {
      return { code, noteKey: 'pg.format.loadFailed' };
    }
    const plugins = [await loadPlugin(parser)];
    if (parser === 'babel' || parser === 'babel-ts') {
      plugins.push(await loadPlugin('estree'));
    }
    const formatted = await format(code, {
      parser,
      plugins,
      printWidth: 88,
      tabWidth: 2,
      semi: true,
      singleQuote: true,
    });
    return { code: formatted, noteKey: '' };
  } catch {
    return { code, noteKey: 'pg.format.failed' };
  }
}
