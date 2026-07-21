package com.fandex.app.ui.enhancements

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * FontSystem 字体系统
 *
 * 功能：提供统一的字体样式预设，遵循 Material 3 字体规范
 *
 * 实现要点：
 * - 定义 `FANDEXTypography` object 包含预设 TextStyle
 *   - displayLarge/Medium/Small（40/32/28 sp，Bold）
 *   - headlineLarge/Medium/Small（28/24/20 sp，SemiBold）
 *   - titleLarge/Medium/Small（20/18/16 sp，Medium）
 *   - bodyLarge/Medium/Small（16/14/12 sp，Normal）
 *   - labelLarge/Medium/Small（14/12/10 sp，Medium）
 * - 提供 `scaledTypography(scale: Float)` 函数返回缩放后的 Typography
 *
 * 设计原则：
 * - 字号梯度遵循 Material 3 type role 规范
 * - FontWeight 使用 Compose 内置常量（Bold/SemiBold/Medium/Normal）
 * - scaledTypography 通过 *scale 系数对 sp 字号进行整体缩放，便于适配可访问性设置
 *
 * 使用示例：
 *   Text(text = "Hello", style = FANDEXTypography.headlineLarge)
 *   MaterialTheme(typography = scaledTypography(scale = 1.2f)) { ... }
 */
object FANDEXTypography {

    /** Display Large：40sp / Bold，用于超大标题（启动页/品牌展示） */
    val displayLarge = TextStyle(
        fontSize = 40.sp,
        fontWeight = FontWeight.Bold
    )

    /** Display Medium：32sp / Bold，用于大标题 */
    val displayMedium = TextStyle(
        fontSize = 32.sp,
        fontWeight = FontWeight.Bold
    )

    /** Display Small：28sp / Bold，用于中等大标题 */
    val displaySmall = TextStyle(
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold
    )

    /** Headline Large：28sp / SemiBold，用于页面顶部标题 */
    val headlineLarge = TextStyle(
        fontSize = 28.sp,
        fontWeight = FontWeight.SemiBold
    )

    /** Headline Medium：24sp / SemiBold，用于次级标题 */
    val headlineMedium = TextStyle(
        fontSize = 24.sp,
        fontWeight = FontWeight.SemiBold
    )

    /** Headline Small：20sp / SemiBold，用于区块标题 */
    val headlineSmall = TextStyle(
        fontSize = 20.sp,
        fontWeight = FontWeight.SemiBold
    )

    /** Title Large：20sp / Medium，用于卡片标题 */
    val titleLarge = TextStyle(
        fontSize = 20.sp,
        fontWeight = FontWeight.Medium
    )

    /** Title Medium：18sp / Medium，用于列表项标题 */
    val titleMedium = TextStyle(
        fontSize = 18.sp,
        fontWeight = FontWeight.Medium
    )

    /** Title Small：16sp / Medium，用于小标题 */
    val titleSmall = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.Medium
    )

    /** Body Large：16sp / Normal，用于正文主体 */
    val bodyLarge = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.Normal
    )

    /** Body Medium：14sp / Normal，用于正文次要文本 */
    val bodyMedium = TextStyle(
        fontSize = 14.sp,
        fontWeight = FontWeight.Normal
    )

    /** Body Small：12sp / Normal，用于辅助说明文本 */
    val bodySmall = TextStyle(
        fontSize = 12.sp,
        fontWeight = FontWeight.Normal
    )

    /** Label Large：14sp / Medium，用于按钮/强调标签 */
    val labelLarge = TextStyle(
        fontSize = 14.sp,
        fontWeight = FontWeight.Medium
    )

    /** Label Medium：12sp / Medium，用于辅助标签 */
    val labelMedium = TextStyle(
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium
    )

    /** Label Small：10sp / Medium，用于超小标签（如时间戳/计数） */
    val labelSmall = TextStyle(
        fontSize = 10.sp,
        fontWeight = FontWeight.Medium
    )
}

/**
 * 生成缩放后的 Typography 实例
 *
 * 功能：根据 scale 系数对所有字号进行整体缩放，用于可访问性场景（大字号模式）
 *
 * 输入：
 *   - scale 缩放系数（1.0 为原始尺寸，1.2 放大 20%，0.8 缩小 20%）
 * 输出：包含所有缩放后 TextStyle 的 Typography 实例
 *
 * 使用示例：
 *   MaterialTheme(typography = scaledTypography(scale = 1.2f)) { ... }
 */
@Composable
fun scaledTypography(scale: Float = 1.0f): Typography {
    return remember(scale) {
        Typography(
            displayLarge = FANDEXTypography.displayLarge.copy(fontSize = (40 * scale).sp),
            displayMedium = FANDEXTypography.displayMedium.copy(fontSize = (32 * scale).sp),
            displaySmall = FANDEXTypography.displaySmall.copy(fontSize = (28 * scale).sp),
            headlineLarge = FANDEXTypography.headlineLarge.copy(fontSize = (28 * scale).sp),
            headlineMedium = FANDEXTypography.headlineMedium.copy(fontSize = (24 * scale).sp),
            headlineSmall = FANDEXTypography.headlineSmall.copy(fontSize = (20 * scale).sp),
            titleLarge = FANDEXTypography.titleLarge.copy(fontSize = (20 * scale).sp),
            titleMedium = FANDEXTypography.titleMedium.copy(fontSize = (18 * scale).sp),
            titleSmall = FANDEXTypography.titleSmall.copy(fontSize = (16 * scale).sp),
            bodyLarge = FANDEXTypography.bodyLarge.copy(fontSize = (16 * scale).sp),
            bodyMedium = FANDEXTypography.bodyMedium.copy(fontSize = (14 * scale).sp),
            bodySmall = FANDEXTypography.bodySmall.copy(fontSize = (12 * scale).sp),
            labelLarge = FANDEXTypography.labelLarge.copy(fontSize = (14 * scale).sp),
            labelMedium = FANDEXTypography.labelMedium.copy(fontSize = (12 * scale).sp),
            labelSmall = FANDEXTypography.labelSmall.copy(fontSize = (10 * scale).sp)
        )
    }
}
