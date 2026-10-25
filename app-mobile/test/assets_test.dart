import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';
import 'package:app_mobile/core/models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('modules.json 资产加载与解析', () async {
    final raw = await rootBundle.loadString('assets/metadata/modules.json');
    final data = ModulesData.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    expect(data.modules.length, greaterThan(40));
    expect(data.categoryOrder, isNotEmpty);
    expect(data.categoryColors['tools'], isNotNull);
  });

  test('doc-index.json 资产加载与解析', () async {
    final raw = await rootBundle.loadString('assets/metadata/doc-index.json');
    final list = (jsonDecode(raw) as List<dynamic>).map((e) => DocEntry.fromJson(e as Map<String, dynamic>)).toList();
    expect(list.length, greaterThan(2000));
  });
}
