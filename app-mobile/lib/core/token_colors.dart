// 本文件由 shd-shared/tokens/scripts/generate-tokens-dart.ts 自动生成，
// 手动修改会在 check-tokens-drift 门禁中报错。重新生成：
//   pnpm --filter @fandex/tokens generate:dart

import 'package:flutter/material.dart' show Color;

/// 原始调色板（primitive/color.json）——无语义，仅供 GeoPalette 映射兜底。
class TokenPrimitive {
  static const Color colorNeutral0 = Color(0xFF000000);
  static const Color colorNeutral50 = Color(0xFF0A0A0A);
  static const Color colorNeutral100 = Color(0xFF141414);
  static const Color colorNeutral200 = Color(0xFF1F1F1F);
  static const Color colorNeutral300 = Color(0xFF2A2A2A);
  static const Color colorNeutral400 = Color(0xFF404040);
  static const Color colorNeutral500 = Color(0xFF525252);
  static const Color colorNeutral550 = Color(0xFF596671);
  static const Color colorNeutral600 = Color(0xFF737373);
  static const Color colorNeutral700 = Color(0xFFA3A3A3);
  static const Color colorNeutral800 = Color(0xFFBCC8D0);
  static const Color colorNeutral900 = Color(0xFFCCD5DB);
  static const Color colorNeutral950 = Color(0xFFDAE1E6);
  static const Color colorNeutral1000 = Color(0xFFE2E8EC);
  static const Color colorNeutral1050 = Color(0xFFEBEFF3);
  static const Color colorCyan100 = Color(0xFF084743);
  static const Color colorCyan200 = Color(0xFF0E655F);
  static const Color colorCyan300 = Color(0xFF14716A);
  static const Color colorCyan400 = Color(0xFF00D6C7);
  static const Color colorCyan500 = Color(0xFF39C5BB);
  static const Color colorCyan600 = Color(0xFF4FFFF2);
  static const Color colorPrimary50 = Color(0xFFEEFCFB);
  static const Color colorPrimary100 = Color(0xFFCBF6F3);
  static const Color colorPrimary200 = Color(0xFFA2ECE7);
  static const Color colorPrimary300 = Color(0xFF74DCD5);
  static const Color colorPrimary400 = Color(0xFF58D0C7);
  static const Color colorPrimary500 = Color(0xFF39C5BB);
  static const Color colorPrimary600 = Color(0xFF26ABA2);
  static const Color colorPrimary700 = Color(0xFF14716A);
  static const Color colorPrimary800 = Color(0xFF0E655F);
  static const Color colorPrimary900 = Color(0xFF084743);
  static const Color colorAccent50 = Color(0xFFE5FFFD);
  static const Color colorAccent100 = Color(0xFFB8FFFA);
  static const Color colorAccent200 = Color(0xFF80FFF6);
  static const Color colorAccent300 = Color(0xFF40FFF1);
  static const Color colorAccent400 = Color(0xFF00FFED);
  static const Color colorAccent500 = Color(0xFF00CCBD);
  static const Color colorAccent600 = Color(0xFF00A69A);
  static const Color colorAccent700 = Color(0xFF008076);
  static const Color colorAccent800 = Color(0xFF005E58);
  static const Color colorAccent900 = Color(0xFF00403B);
  static const Color colorSuccessLight = Color(0xFF16A34A);
  static const Color colorSuccessDark = Color(0xFF22C55E);
  static const Color colorWarningLight = Color(0xFFEA580C);
  static const Color colorWarningDark = Color(0xFFF97316);
  static const Color colorDangerLight = Color(0xFFDC2626);
  static const Color colorDangerDark = Color(0xFFEF4444);
  static const Color colorInfoLight = Color(0xFF14716A);
  static const Color colorInfoDark = Color(0xFF39C5BB);
  static const Color colorShadowBlack = Color(0xFF000000);
}

/// 浅色语义色（semantic/color.light.json，引用已解析为最终十六进制）。
class TokenLight {
  static const Color colorBgPrimary = Color(0xFFEBEFF3);
  static const Color colorBgSecondary = Color(0xFFE2E8EC);
  static const Color colorBgTertiary = Color(0xFFDAE1E6);
  static const Color colorBgElevated = Color(0xFFEBEFF3);
  static const Color colorBgSunken = Color(0xFFDAE1E6);
  static const Color colorBgHover = Color(0xFFE2E8EC);
  static const Color colorBgActive = Color(0xFFDAE1E6);
  static const Color colorFgPrimary = Color(0xFF0A0A0A);
  static const Color colorFgSecondary = Color(0xFF525252);
  static const Color colorFgTertiary = Color(0xFF596671);
  static const Color colorFgDisabled = Color(0xFFBCC8D0);
  static const Color colorFgInverse = Color(0xFFEBEFF3);
  static const Color colorAccentBase = Color(0xFF14716A);
  static const Color colorAccentHover = Color(0xFF0E655F);
  static const Color colorAccentActive = Color(0xFF084743);
  static const Color colorAccentFg = Color(0xFFEBEFF3);
  static const Color colorSuccessBase = Color(0xFF16A34A);
  static const Color colorSuccessBg = Color(0xFF16A34A);
  static const Color colorSuccessFg = Color(0xFFEBEFF3);
  static const Color colorWarningBase = Color(0xFFEA580C);
  static const Color colorWarningBg = Color(0xFFEA580C);
  static const Color colorWarningFg = Color(0xFFEBEFF3);
  static const Color colorDangerBase = Color(0xFFDC2626);
  static const Color colorDangerBg = Color(0xFFDC2626);
  static const Color colorDangerFg = Color(0xFFEBEFF3);
  static const Color colorInfoBase = Color(0xFF14716A);
  static const Color colorInfoBg = Color(0xFF14716A);
  static const Color colorInfoFg = Color(0xFFEBEFF3);
  static const Color colorBorderDefault = Color(0xFFCCD5DB);
  static const Color colorBorderStrong = Color(0xFFBCC8D0);
  static const Color colorBorderSubtle = Color(0xFFDAE1E6);
  static const Color colorBorderFocus = Color(0xFF14716A);
  static const Color colorCodeBg = Color(0xFF0A0A0A);
  static const Color colorCodeText = Color(0xFFCCD5DB);
  static const Color colorCodeComment = Color(0xFF737373);
}

/// 深色语义色（semantic/color.dark.json，引用已解析为最终十六进制）。
class TokenDark {
  static const Color colorBgPrimary = Color(0xFF0A0A0A);
  static const Color colorBgSecondary = Color(0xFF141414);
  static const Color colorBgTertiary = Color(0xFF1F1F1F);
  static const Color colorBgElevated = Color(0xFF1F1F1F);
  static const Color colorBgSunken = Color(0xFF000000);
  static const Color colorBgHover = Color(0xFF141414);
  static const Color colorBgActive = Color(0xFF1F1F1F);
  static const Color colorFgPrimary = Color(0xFFEBEFF3);
  static const Color colorFgSecondary = Color(0xFFA3A3A3);
  static const Color colorFgTertiary = Color(0xFF737373);
  static const Color colorFgDisabled = Color(0xFF404040);
  static const Color colorFgInverse = Color(0xFF0A0A0A);
  static const Color colorAccentBase = Color(0xFF39C5BB);
  static const Color colorAccentHover = Color(0xFF4FFFF2);
  static const Color colorAccentActive = Color(0xFF00D6C7);
  static const Color colorAccentFg = Color(0xFF000000);
  static const Color colorSuccessBase = Color(0xFF22C55E);
  static const Color colorSuccessBg = Color(0xFF22C55E);
  static const Color colorSuccessFg = Color(0xFF000000);
  static const Color colorWarningBase = Color(0xFFF97316);
  static const Color colorWarningBg = Color(0xFFF97316);
  static const Color colorWarningFg = Color(0xFF000000);
  static const Color colorDangerBase = Color(0xFFEF4444);
  static const Color colorDangerBg = Color(0xFFEF4444);
  static const Color colorDangerFg = Color(0xFF000000);
  static const Color colorInfoBase = Color(0xFF39C5BB);
  static const Color colorInfoBg = Color(0xFF39C5BB);
  static const Color colorInfoFg = Color(0xFF000000);
  static const Color colorBorderDefault = Color(0xFF2A2A2A);
  static const Color colorBorderStrong = Color(0xFF404040);
  static const Color colorBorderSubtle = Color(0xFF141414);
  static const Color colorBorderFocus = Color(0xFF39C5BB);
  static const Color colorCodeBg = Color(0xFF000000);
  static const Color colorCodeText = Color(0xFFCCD5DB);
  static const Color colorCodeComment = Color(0xFF737373);
}
