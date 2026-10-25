import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../data/prefs.dart';

// 应用内更新 — 检查逻辑纯 Dart；仅 Android 通过平台通道调起 APK 安装器。
// iOS 走 App Store 更新，通道在 iOS 侧不可用（安装方法直接抛 UnsupportedError）。

class UpdateInfo {
  final String version;
  final String notes;
  final String apkUrl;

  const UpdateInfo(
      {required this.version, required this.notes, required this.apkUrl});
}

class GeoUpdater {
  static const MethodChannel _channel = MethodChannel('fandex/updater');
  static const _apiUrl =
      'https://api.github.com/repos/fanquanpp/FANDEX/releases/latest';

  int _versionCode(String v) {
    final parts = v.replaceFirst(RegExp(r'^v'), '').split('.');
    if (parts.length < 3) return 0;
    final major = int.tryParse(parts[0]) ?? 0;
    final minor = int.tryParse(parts[1]) ?? 0;
    final patch = int.tryParse(parts[2]) ?? 0;
    return major * 10000 + minor * 100 + patch;
  }

  Future<UpdateInfo?> check({required LibraryStore store}) async {
    try {
      final resp = await http.get(Uri.parse(_apiUrl), headers: const {
        'Accept': 'application/vnd.github+json'
      }).timeout(const Duration(seconds: 15));
      if (resp.statusCode != 200) return null;
      final json =
          jsonDecode(utf8.decode(resp.bodyBytes)) as Map<String, dynamic>;
      final tag = json['tag_name'] as String? ?? '';
      final version = tag.replaceFirst(RegExp(r'^v'), '');
      if (_versionCode(version) <=
          _versionCode(store.ignoredVersion() ?? '0.0.0')) {
        return null;
      }

      String? apkUrl;
      final assets = json['assets'] as List<dynamic>? ?? [];
      for (final a in assets) {
        final name = (a as Map<String, dynamic>)['name'] as String? ?? '';
        if (name.startsWith('FANDEX') && name.endsWith('.apk')) {
          apkUrl = a['browser_download_url'] as String?;
          break;
        }
      }
      return UpdateInfo(
        version: version,
        notes: json['body'] as String? ?? '',
        apkUrl: apkUrl ?? '',
      );
    } catch (_) {
      return null;
    }
  }

  Stream<double> downloadApk(String url, {String? toPath}) async* {
    final dir =
        toPath != null ? File(toPath).parent : await getTemporaryDirectory();
    final file = File(toPath ?? '${dir.path}/fandex-update.apk');
    final client = http.Client();
    try {
      final req = await client.send(http.Request('GET', Uri.parse(url)));
      final total = req.contentLength ?? 0;
      final sink = file.openWrite();
      var received = 0;
      await for (final chunk in req.stream) {
        received += chunk.length;
        sink.add(chunk);
        if (total > 0) yield received / total;
      }
      await sink.flush();
      await sink.close();
      yield 1.0;
    } finally {
      client.close();
    }
  }

  Future<void> installApk(String path) async {
    await _channel.invokeMethod('installApk', path);
  }
}

final geoUpdaterProvider = Provider<GeoUpdater>((ref) => GeoUpdater());
