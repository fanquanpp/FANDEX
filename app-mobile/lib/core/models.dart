// 数据模型 — 契约与 app-Android-new assets 一致。

class ModulesData {
  final Map<String, String> categoryLabels;
  final Map<String, ColorValue> categoryColors;
  final List<String> categoryOrder;
  final List<ModuleInfo> modules;

  const ModulesData({
    required this.categoryLabels,
    required this.categoryColors,
    required this.categoryOrder,
    required this.modules,
  });

  factory ModulesData.fromJson(Map<String, dynamic> json) {
    int parseColor(String hex) {
      var h = hex.replaceFirst('#', '');
      if (h.length == 6) h = 'FF$h';
      return int.parse(h, radix: 16);
    }

    final labels = <String, String>{};
    (json['categoryLabels'] as Map<String, dynamic>? ?? {}).forEach((k, v) => labels[k] = v as String);

    final colors = <String, ColorValue>{};
    (json['categoryColors'] as Map<String, dynamic>? ?? {}).forEach((k, v) => colors[k] = parseColor(v as String));

    final order = (json['categoryOrder'] as List<dynamic>? ?? []).cast<String>();

    final modules = (json['modules'] as List<dynamic>? ?? [])
        .map((e) => ModuleInfo.fromJson(e as Map<String, dynamic>))
        .toList();

    return ModulesData(
      categoryLabels: labels,
      categoryColors: colors,
      categoryOrder: order,
      modules: modules,
    );
  }
}

typedef ColorValue = int;

class OfficialDoc {
  final String label;
  final String url;
  final String type;
  const OfficialDoc({required this.label, required this.url, required this.type});

  factory OfficialDoc.fromJson(Map<String, dynamic> json) => OfficialDoc(
        label: json['label'] as String? ?? '',
        url: json['url'] as String? ?? '',
        type: json['type'] as String? ?? '',
      );
}

class ModuleInfo {
  final String id;
  final String title;
  final String icon;
  final String description;
  final List<String> categories;
  final int folderOrder;
  final String updatePriority;
  final String updateNote;
  final List<OfficialDoc> officialDocs;

  const ModuleInfo({
    required this.id,
    required this.title,
    required this.icon,
    required this.description,
    required this.categories,
    required this.folderOrder,
    required this.updatePriority,
    required this.updateNote,
    required this.officialDocs,
  });

  // 数据源里 updatePriority 可能是布尔、updateNote 可能缺失，统一宽松转字符串。
  static String _asText(dynamic v) {
    if (v is String) return v;
    if (v is bool) return v ? 'true' : 'false';
    return '';
  }

  factory ModuleInfo.fromJson(Map<String, dynamic> json) => ModuleInfo(
        id: _asText(json['id']),
        title: _asText(json['title']),
        icon: _asText(json['icon']),
        description: _asText(json['description']),
        categories: (json['categories'] as List<dynamic>? ?? []).cast<String>(),
        folderOrder: json['folder_order'] as int? ?? 0,
        updatePriority: _asText(json['updatePriority']),
        updateNote: _asText(json['updateNote']),
        officialDocs: (json['officialDocs'] as List<dynamic>? ?? [])
            .map((e) => OfficialDoc.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class DocEntry {
  final String slug;
  final String title;
  final String module;
  final String category;
  final String difficulty;
  final String description;
  final int order;
  final String updated;

  const DocEntry({
    required this.slug,
    required this.title,
    required this.module,
    required this.category,
    required this.difficulty,
    required this.description,
    required this.order,
    required this.updated,
  });

  factory DocEntry.fromJson(Map<String, dynamic> json) => DocEntry(
        slug: json['slug'] as String? ?? '',
        title: json['title'] as String? ?? '',
        module: json['module'] as String? ?? '',
        category: json['category'] as String? ?? '',
        difficulty: json['difficulty'] as String? ?? 'beginner',
        description: json['description'] as String? ?? '',
        order: json['order'] as int? ?? 0,
        updated: json['updated'] as String? ?? '',
      );
}

class ParsedDoc {
  final DocEntry entry;
  final String body;
  final String author;
  final List<String> prerequisites;
  final List<String> related;

  const ParsedDoc({
    required this.entry,
    required this.body,
    required this.author,
    required this.prerequisites,
    required this.related,
  });
}

class PathNode {
  final String id;
  final String title;
  final String doc;
  final String desc;
  final String difficulty;
  const PathNode({required this.id, required this.title, required this.doc, required this.desc, required this.difficulty});

  factory PathNode.fromJson(Map<String, dynamic> json) => PathNode(
        id: json['id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        doc: json['doc'] as String? ?? '',
        desc: json['desc'] as String? ?? '',
        difficulty: json['difficulty'] as String? ?? 'beginner',
      );
}

class PathStage {
  final String id;
  final String title;
  final String subtitle;
  final List<PathNode> nodes;
  const PathStage({required this.id, required this.title, required this.subtitle, required this.nodes});

  factory PathStage.fromJson(Map<String, dynamic> json) => PathStage(
        id: json['id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        subtitle: json['subtitle'] as String? ?? '',
        nodes: (json['nodes'] as List<dynamic>? ?? [])
            .map((e) => PathNode.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class ModulePath {
  final String version;
  final String module;
  final String summary;
  final List<PathStage> stages;
  const ModulePath({required this.version, required this.module, required this.summary, required this.stages});

  factory ModulePath.fromJson(Map<String, dynamic> json) => ModulePath(
        version: json['version'] as String? ?? '',
        module: json['module'] as String? ?? '',
        summary: json['summary'] as String? ?? '',
        stages: (json['stages'] as List<dynamic>? ?? [])
            .map((e) => PathStage.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class SyntaxLanguage {
  final String id;
  final String title;
  final String icon;
  final String color;
  final int count;
  final int docCount;
  const SyntaxLanguage({
    required this.id,
    required this.title,
    required this.icon,
    required this.color,
    required this.count,
    required this.docCount,
  });

  factory SyntaxLanguage.fromJson(Map<String, dynamic> json) => SyntaxLanguage(
        id: json['id'] as String? ?? '',
        title: json['title'] as String? ?? '',
        icon: json['icon'] as String? ?? '',
        color: json['color'] as String? ?? '#39C5BB',
        count: json['count'] as int? ?? 0,
        docCount: json['docCount'] as int? ?? 0,
      );
}

class SyntaxCard {
  final String id;
  final String docTitle;
  final String section;
  final String name;
  final String formula;
  final String code;
  final String lang;
  final bool truncated;

  const SyntaxCard({
    required this.id,
    required this.docTitle,
    required this.section,
    required this.name,
    required this.formula,
    required this.code,
    required this.lang,
    required this.truncated,
  });

  factory SyntaxCard.fromJson(Map<String, dynamic> json) => SyntaxCard(
        id: json['id'] as String? ?? '',
        docTitle: json['docTitle'] as String? ?? '',
        section: json['section'] as String? ?? '',
        name: json['name'] as String? ?? '',
        formula: json['formula'] as String? ?? '',
        code: json['code'] as String? ?? '',
        lang: json['lang'] as String? ?? '',
        truncated: json['truncated'] as bool? ?? false,
      );
}

class HistoryEntry {
  final String module;
  final String slug;
  final String title;
  final String moduleTitle;
  final int timestamp;

  const HistoryEntry({
    required this.module,
    required this.slug,
    required this.title,
    required this.moduleTitle,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() => {
        'module': module,
        'slug': slug,
        'title': title,
        'moduleTitle': moduleTitle,
        'timestamp': timestamp,
      };

  factory HistoryEntry.fromJson(Map<String, dynamic> json) => HistoryEntry(
        module: json['module'] as String? ?? '',
        slug: json['slug'] as String? ?? '',
        title: json['title'] as String? ?? '',
        moduleTitle: json['moduleTitle'] as String? ?? '',
        timestamp: json['timestamp'] as int? ?? 0,
      );
}
