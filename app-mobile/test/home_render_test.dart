import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:app_mobile/app/app.dart';
import 'package:app_mobile/data/prefs.dart';

void main() {
  testWidgets('首页渲染 hero 与模块卡', (tester) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
        child: const FandexMobileApp(),
      ),
    );
    await tester.pump(const Duration(milliseconds: 50));
    // 入场动画 250ms + 阶梯，推进多帧。
    await tester.pump(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('FANDEX'), findsWidgets);
    // 模块卡至少出现一个（模块标题取自 modules.json 第一项）。
    expect(find.text('零基础起步'), findsWidgets);

    final heroTop = tester.getTopLeft(find.text('FANDEX').first);
    // ignore: avoid_print
    print('HERO_POS $heroTop');
  });
}
