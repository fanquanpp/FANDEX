import 'package:flutter_test/flutter_test.dart';
import 'package:app_mobile/core/frontmatter.dart';
import 'package:app_mobile/features/reader/markdown/blocks.dart';

void main() {
  test('frontmatter 解析：字段与列表', () {
    const src = r'''
---
title: 测试文档
order: 3
difficulty: advanced
prerequisites:
  - 'java/basics'
  - 'mysql/index'
---

正文内容
''';
    final result = splitFrontmatter(src);
    expect(result.meta, isNotNull);
    expect(result.meta!.title, '测试文档');
    expect(result.meta!.order, 3);
    expect(result.meta!.difficulty, 'advanced');
    expect(result.meta!.prerequisites, ['java/basics', 'mysql/index']);
    expect(result.body.trimLeft().startsWith('正文内容'), isTrue);
  });

  test('markdown 解析：标题/代码/表格/引用警告块', () {
    const src = r'''
## 二级标题

一段正文，含行内公式 $E=mc^2$ 与 `代码`。

```python
print('hello')
```

| A | B |
| - | - |
| 1 | 2 |

> [!WARNING]
> 警告内容

$$
E = mc^2
$$
''';
    final result = parseMarkdown(src);
    expect(result.blocks.length, greaterThanOrEqualTo(6));
    expect(result.headings, isNotEmpty);
    final quote = result.blocks.whereType<BQuote>().first;
    expect(quote.admonition, 'WARNING');
    expect(result.blocks.whereType<BMath>().length, 1);
    expect(result.blocks.whereType<BCode>().first.lang, 'python');
  });

  test('阅读时长计算', () {
    expect(readingMinutes('短文'), 1);
    final longCode = '```x${'x' * 2000}```';
    expect(readingMinutes(longCode), 1);
  });
}
