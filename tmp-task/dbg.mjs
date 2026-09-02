// 临时调试：核对正则与字段
import { readFileSync } from 'node:fs';
const r = JSON.parse(readFileSync('./tmp-task/report.json', 'utf-8'));
const re = /^\d{3}-(java|kotlin|csharp|go|python|rust|c|cpp|javascript|typescript|vue3|react|nextjs|astro|nestjs|vite|deno|bun|svelte|angular|tailwind)\//;
console.log(re.test('007-javascript/001-x.md'), re.test('014-csharp/001-x.md'), re.test('012-java/001-x.md'));
const hits = r.issues.filter((i) => i.type === 'FENCE_PROSE' && re.test(i.file));
console.log('hits:', hits.length);
