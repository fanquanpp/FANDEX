package com.fandex.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fandex.app.ui.common.pressScale
import com.fandex.app.ui.common.selectionPulse
import com.fandex.app.ui.common.tweenFast
import com.fandex.app.ui.theme.CategoryColors
import com.fandex.app.ui.theme.LocalExtendedColors

object CategoryColor {
    fun parse(hex: String): Color {
        val normalized = hex.removePrefix("#")
        return runCatching {
            Color(normalized.toLong(16) or 0xFF000000)
        }.getOrDefault(CategoryColors.Tools)
    }
}

@Composable
fun FdxIconButton(
    icon: ImageVector,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    tint: Color = MaterialTheme.colorScheme.onSurface,
    iconSize: Dp = 20.dp,
    enabled: Boolean = true
) {
    val extendedColors = LocalExtendedColors.current
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()

    val background by animateColorAsState(
        targetValue = if (pressed && enabled) extendedColors.bgHover else Color.Transparent,
        animationSpec = tweenFast(),
        label = "fdxIconButtonBg"
    )

    Box(
        modifier = modifier
            .size(32.dp)
            .pressScale(interaction, pressedScale = 0.94f)
            .clip(RoundedCornerShape(4.dp))
            .background(background)
            .clickable(
                interactionSource = interaction,
                indication = null,
                enabled = enabled,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = if (enabled) tint else tint.copy(alpha = 0.38f),
            modifier = Modifier.size(iconSize)
        )
    }
}

@Composable
fun SectionHeader(
    title: String,
    color: Color = MaterialTheme.colorScheme.primary,
    count: Int? = null,
    modifier: Modifier = Modifier
) {
    val extendedColors = LocalExtendedColors.current

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(14.dp)
                .clip(RoundedCornerShape(1.dp))
                .background(color)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.04.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        if (count != null) {
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "$count",
                style = MaterialTheme.typography.labelSmall,
                color = extendedColors.fgTertiary,
                modifier = Modifier
                    .clip(RoundedCornerShape(4.dp))
                    .background(extendedColors.bgElevated)
                    .border(1.dp, extendedColors.borderSubtle, RoundedCornerShape(4.dp))
                    .padding(horizontal = 8.dp, vertical = 1.dp)
            )
        }
    }
}

data class FilterOption(
    val id: String,
    val label: String,
    val color: Color = Color.Unspecified
)

@Composable
fun FilterChipRow(
    options: List<FilterOption>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val extendedColors = LocalExtendedColors.current

    androidx.compose.foundation.lazy.LazyRow(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(options.size, key = { options[it].id }) { index ->
            val option = options[index]
            val selected = option.id == selectedId
            val accent = if (option.color == Color.Unspecified) {
                MaterialTheme.colorScheme.primary
            } else option.color
            val interaction = remember { MutableInteractionSource() }

            val bg by animateColorAsState(
                targetValue = if (selected) accent.copy(alpha = 0.12f) else extendedColors.bgElevated,
                animationSpec = tweenFast(),
                label = "chipRowBg"
            )
            val borderColor by animateColorAsState(
                targetValue = if (selected) accent.copy(alpha = 0.5f) else extendedColors.borderDefault,
                animationSpec = tweenFast(),
                label = "chipRowBorder"
            )
            val fgColor by animateColorAsState(
                targetValue = if (selected) accent else extendedColors.fgSecondary,
                animationSpec = tweenFast(),
                label = "chipRowFg"
            )

            Row(
                modifier = Modifier
                    .pressScale(interaction)
                    .selectionPulse(selected)
                    .clip(RoundedCornerShape(4.dp))
                    .background(bg)
                    .border(1.dp, borderColor, RoundedCornerShape(4.dp))
                    .clickable(
                        interactionSource = interaction,
                        indication = null
                    ) { onSelect(option.id) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (selected) {
                    Box(
                        modifier = Modifier
                            .width(3.dp)
                            .height(12.dp)
                            .clip(RoundedCornerShape(1.dp))
                            .background(accent)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                }
                Text(
                    text = option.label,
                    style = MaterialTheme.typography.labelLarge,
                    color = fgColor,
                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium
                )
            }
        }
    }
}

@Composable
fun StatsBar(
    stats: List<Pair<String, String>>,
    modifier: Modifier = Modifier,
    accent: Color = MaterialTheme.colorScheme.primary
) {
    val extendedColors = LocalExtendedColors.current

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(4.dp))
            .background(extendedColors.bgElevated)
            .border(1.dp, extendedColors.borderDefault, RoundedCornerShape(4.dp))
            .heightIn(min = 64.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(36.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(accent)
        )
        Spacer(modifier = Modifier.width(16.dp))

        Row(
            modifier = Modifier
                .weight(1f)
                .padding(top = 12.dp, bottom = 12.dp, end = 12.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            stats.forEachIndexed { index, (value, label) ->
                if (index > 0) {
                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(28.dp)
                            .background(extendedColors.borderSubtle)
                    )
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = value,
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                    Text(
                        text = label,
                        style = MaterialTheme.typography.labelSmall,
                        color = extendedColors.fgTertiary
                    )
                }
            }
        }
    }
}
