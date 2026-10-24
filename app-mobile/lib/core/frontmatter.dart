// Frontmatter 解析 — 与 Kotlin 版 FrontmatterParser 行为对齐（逐行解析，支持列表）。

class DocFrontmatter {
  final Map<String, String> fields;
  final Map<String, List<String>> lists;

  const DocFrontmatter({required this.fields, required this.lists});

  String? get title => fields['title'];
  String? get module => fields['module'];
  String? get category => fields['category'];
  String? get difficulty => fields['difficulty'];
  String? get description => fields['description'];
  String? get author => fields['author'];
  String? get updated => fields['updated'];
  int get order => int.tryParse(fields['order'] ?? '') ?? 0;
  List<String> get related => lists['related'] ?? const [];
  List<String> get prerequisites => lists['prerequisites'] ?? const [];
}

class FrontmatterResult {
  final DocFrontmatter? meta;
  final String body;

  const FrontmatterResult({required this.meta, required this.body});
}

FrontmatterResult splitFrontmatter(String content) {
  final normalized = content.replaceFirst(RegExp(r'^\uFEFF'), '');
  if (!normalized.startsWith('---')) {
    return FrontmatterResult(meta: null, body: normalized);
  }
  final end = normalized.indexOf('\n---', 3);
  if (end < 0) {
    return FrontmatterResult(meta: null, body: normalized);
  }
  final header = normalized.substring(3, end);
  var body = normalized.substring(end + 4);
  if (body.startsWith('\n')) body = body.substring(1);

  final fields = <String, String>{};
  final lists = <String, List<String>>{};
  String? currentListKey;

  for (var line in header.split('\n')) {
    line = line.trim();
    if (line.isEmpty) continue;

    if (currentListKey != null && line.startsWith('- ')) {
      final value = line.substring(2).trim();
      lists[currentListKey]!.add(_stripQuotes(value));
      continue;
    }
    currentListKey = null;

    final colon = line.indexOf(':');
    if (colon <= 0) continue;

    final key = line.substring(0, colon).trim();
    final value = line.substring(colon + 1).trim();

    if (value.isEmpty && (key == 'related' || key == 'prerequisites')) {
      lists[key] = <String>[];
      currentListKey = key;
    } else {
      fields[key] = _stripQuotes(value);
    }
  }

  return FrontmatterResult(meta: DocFrontmatter(fields: fields, lists: lists), body: body);
}

String _stripQuotes(String v) {
  if (v.length >= 2) {
    final first = v.substring(0, 1);
    final last = v.substring(v.length - 1);
    if ((first == '\'' && last == '\'') || (first == '"' && last == '"')) {
      return v.substring(1, v.length - 1);
    }
  }
  return v;
}

// 阅读时长：去代码块与行内代码后按字数 / 300 分钟，至少 1 分钟。
int readingMinutes(String body) {
  var text = body.replaceAll(RegExp(r'```[\s\S]*?```'), ' ').replaceAll(RegExp(r'`[^`]*`'), ' ');
  text = text.replaceAll(RegExp(r'\$\$[\s\S]*?\$\$'), ' ');
  final visible = text.replaceAll(RegExp(r'\s'), '');
  if (visible.isEmpty) return 1;
  return (visible.runes.length / 300).ceil().clamp(1, 999);
}
