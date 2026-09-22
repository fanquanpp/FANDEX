package com.fandex.app.ui.enhancements

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

object FANDEXTypography {

    val displayLarge = TextStyle(
        fontSize = 40.sp,
        fontWeight = FontWeight.Bold
    )

    val displayMedium = TextStyle(
        fontSize = 32.sp,
        fontWeight = FontWeight.Bold
    )

    val displaySmall = TextStyle(
        fontSize = 28.sp,
        fontWeight = FontWeight.Bold
    )

    val headlineLarge = TextStyle(
        fontSize = 28.sp,
        fontWeight = FontWeight.SemiBold
    )

    val headlineMedium = TextStyle(
        fontSize = 24.sp,
        fontWeight = FontWeight.SemiBold
    )

    val headlineSmall = TextStyle(
        fontSize = 20.sp,
        fontWeight = FontWeight.SemiBold
    )

    val titleLarge = TextStyle(
        fontSize = 20.sp,
        fontWeight = FontWeight.Medium
    )

    val titleMedium = TextStyle(
        fontSize = 18.sp,
        fontWeight = FontWeight.Medium
    )

    val titleSmall = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.Medium
    )

    val bodyLarge = TextStyle(
        fontSize = 16.sp,
        fontWeight = FontWeight.Normal
    )

    val bodyMedium = TextStyle(
        fontSize = 14.sp,
        fontWeight = FontWeight.Normal
    )

    val bodySmall = TextStyle(
        fontSize = 12.sp,
        fontWeight = FontWeight.Normal
    )

    val labelLarge = TextStyle(
        fontSize = 14.sp,
        fontWeight = FontWeight.Medium
    )

    val labelMedium = TextStyle(
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium
    )

    val labelSmall = TextStyle(
        fontSize = 10.sp,
        fontWeight = FontWeight.Medium
    )
}

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
