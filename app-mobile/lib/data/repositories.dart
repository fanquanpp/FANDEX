import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/frontmatter.dart';
import '../core/models.dart';

class ModulesRepository {
  ModulesData? _cache;

  Future<ModulesData> load() async {
    final cached = _cache;
    if (cached != null) return cached;
    final raw = await rootBundle.loadString('assets/metadata/modules.json');
    final data = ModulesData.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    _cache = data;
    return data;
  }
}

class DocsRepository {
  final Map<String, ParsedDoc> _cache = {};

  List<DocEntry>? _indexCache;

  Future<List<DocEntry>> index() async {
    final cached = _indexCache;
    if (cached != null) return cached;
    final raw = await rootBundle.loadString('assets/metadata/doc-index.json');
    final list = (jsonDecode(raw) as List<dynamic>).map((e) => DocEntry.fromJson(e as Map<String, dynamic>)).toList();
    _indexCache = list;
    return list;
  }

  Future<ParsedDoc> load(String moduleId, String slug) async {
    final key = '$moduleId/$slug';
    final cached = _cache[key];
    if (cached != null) return cached;
    final raw = await rootBundle.loadString('assets/docs/$moduleId/$slug.md');
    final parsed = splitFrontmatter(raw);
    final fm = parsed.meta;

    final entries = await index();
    DocEntry? entry;
    for (final e in entries) {
      if (e.slug == slug && e.module == moduleId) {
        entry = e;
        break;
      }
    }
    entry ??= DocEntry(
      slug: slug,
      title: fm?.title ?? slug,
      module: moduleId,
      category: fm?.category ?? '',
      difficulty: fm?.difficulty ?? 'beginner',
      description: fm?.description ?? '',
      order: fm?.order ?? 0,
      updated: fm?.updated ?? '',
    );

    final doc = ParsedDoc(
      entry: entry,
      body: parsed.body,
      author: fm?.author ?? '',
      prerequisites: fm?.prerequisites ?? const [],
      related: fm?.related ?? const [],
    );
    if (_cache.length > 48) _cache.remove(_cache.keys.first);
    _cache[key] = doc;
    return doc;
  }

  Future<List<DocEntry>> search(String query, ModulesData? modules) async {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return const [];
    final entries = await index();
    final results = <DocEntry>[];
    for (final e in entries) {
      final moduleTitle = modules?.modules.firstWhere((m) => m.id == e.module, orElse: () => ModuleInfo(
            id: e.module,
            title: e.module,
            icon: '',
            description: '',
            categories: const [],
            folderOrder: 0,
            updatePriority: '',
            updateNote: '',
            officialDocs: const [],
          )).title;
      final haystack =
          '${e.title} ${e.description} ${e.module} $moduleTitle ${e.category}'.toLowerCase();
      if (haystack.contains(q)) results.add(e);
      if (results.length >= 60) break;
    }
    return results;
  }
}

class PathsRepository {
  final Map<String, ModulePath> _cache = {};
  List<String>? _orderCache;

  Future<List<String>> order() async {
    final cached = _orderCache;
    if (cached != null) return cached;
    final raw = await rootBundle.loadString('assets/metadata/learning-path/index.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final order = (json['order'] as List<dynamic>? ?? []).cast<String>();
    _orderCache = order;
    return order;
  }

  Future<ModulePath> load(String moduleId) async {
    final cached = _cache[moduleId];
    if (cached != null) return cached;
    final raw = await rootBundle.loadString('assets/metadata/learning-path/$moduleId.json');
    final path = ModulePath.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    _cache[moduleId] = path;
    return path;
  }
}

class SyntaxRepository {
  List<SyntaxLanguage>? _langCache;
  final Map<String, List<SyntaxCard>> _dataCache = {};

  Future<List<SyntaxLanguage>> languages() async {
    final cached = _langCache;
    if (cached != null) return cached;
    final raw = await rootBundle.loadString('assets/metadata/syntax-index.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final langs = (json['languages'] as List<dynamic>? ?? [])
        .map((e) => SyntaxLanguage.fromJson(e as Map<String, dynamic>))
        .toList();
    _langCache = langs;
    return langs;
  }

  Future<List<SyntaxCard>> cards(String langId) async {
    final cached = _dataCache[langId];
    if (cached != null) return cached;
    final raw = await rootBundle.loadString('assets/syntax-data/$langId.json');
    final json = jsonDecode(raw) as Map<String, dynamic>;
    final cards = (json['cards'] as List<dynamic>? ?? [])
        .map((e) => SyntaxCard.fromJson(e as Map<String, dynamic>))
        .toList();
    _dataCache[langId] = cards;
    return cards;
  }
}

final modulesRepositoryProvider = Provider<ModulesRepository>((ref) => ModulesRepository());
final docsRepositoryProvider = Provider<DocsRepository>((ref) => DocsRepository());
final pathsRepositoryProvider = Provider<PathsRepository>((ref) => PathsRepository());
final syntaxRepositoryProvider = Provider<SyntaxRepository>((ref) => SyntaxRepository());

final modulesProvider = FutureProvider<ModulesData>((ref) => ref.watch(modulesRepositoryProvider).load());

final docIndexProvider = FutureProvider<List<DocEntry>>((ref) => ref.watch(docsRepositoryProvider).index());

final pathOrderProvider = FutureProvider<List<String>>((ref) => ref.watch(pathsRepositoryProvider).order());

final syntaxLanguagesProvider = FutureProvider<List<SyntaxLanguage>>((ref) => ref.watch(syntaxRepositoryProvider).languages());

class DocRef {
  final String module;
  final String slug;
  const DocRef(this.module, this.slug);

  @override
  bool operator ==(Object other) => other is DocRef && other.module == module && other.slug == slug;

  @override
  int get hashCode => Object.hash(module, slug);
}

final docProvider = FutureProvider.family<ParsedDoc, DocRef>(
  (ref, ref_) => ref.watch(docsRepositoryProvider).load(ref_.module, ref_.slug),
);

final modulePathProvider = FutureProvider.family<ModulePath, String>(
  (ref, moduleId) => ref.watch(pathsRepositoryProvider).load(moduleId),
);

final syntaxCardsProvider = FutureProvider.family<List<SyntaxCard>, String>(
  (ref, langId) => ref.watch(syntaxRepositoryProvider).cards(langId),
);
