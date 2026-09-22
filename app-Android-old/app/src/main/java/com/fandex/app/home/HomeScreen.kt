package com.fandex.app.home

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.material3.*
import com.fandex.app.data.Category
import com.fandex.app.data.ContentIndex
import com.fandex.app.data.DataStoreManager
import com.fandex.app.data.Module
import com.fandex.app.data.Strings
import com.fandex.app.ui.background.BackgroundDecorSystem
import com.fandex.app.ui.components.CategoryColorParser
import com.fandex.app.ui.components.GeoBgVariant

@Composable
fun HomeScreen(
    contentIndex: ContentIndex? = null,
    selectedCategory: String? = null,
    onCategoryChange: (String?) -> Unit = {},
    onNavigateToModule: (String) -> Unit
) {
    val strings = Strings.default

    val context = LocalContext.current
    val dynamicBackgroundEnabled by DataStoreManager.getDynamicBackground(context)
        .collectAsState(initial = true)

    if (contentIndex == null) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            BackgroundDecorSystem(
                variant = GeoBgVariant.Loading,
                dynamicBackground = dynamicBackgroundEnabled
            )
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "FANDEX",
                    style = MaterialTheme.typography.headlineLarge,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = strings.loading,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        return
    }

    val filteredModules = remember(contentIndex, selectedCategory) {
        if (selectedCategory != null) {
            contentIndex.modules.filter { it.category == selectedCategory }
        } else {
            contentIndex.modules
        }
    }

    val categoryMap = remember(contentIndex) {
        contentIndex.categories.associateBy { it.id }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        BackgroundDecorSystem(
            variant = GeoBgVariant.Home,
            dynamicBackground = dynamicBackgroundEnabled
        )
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
        item {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                item {
                    FilterChip(
                        selected = selectedCategory == null,
                        onClick = { onCategoryChange(null) },
                        label = { Text(strings.all) },
                        modifier = Modifier.animateItem(
                            placementSpec = spring(
                                stiffness = Spring.StiffnessMediumLow,
                                dampingRatio = Spring.DampingRatioNoBouncy
                            )
                        )
                    )
                }
                items(contentIndex.categories, key = { it.id }) { category ->
                    val catColor = remember(category.color) {
                        CategoryColorParser.parse(category.color)
                    }
                    FilterChip(
                        selected = selectedCategory == category.id,
                        onClick = {
                            onCategoryChange(if (selectedCategory == category.id) null else category.id)
                        },
                        label = { Text(category.label) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = catColor.copy(alpha = 0.15f),
                            selectedLabelColor = catColor
                        ),
                        modifier = Modifier.animateItem(
                            placementSpec = spring(
                                stiffness = Spring.StiffnessMediumLow,
                                dampingRatio = Spring.DampingRatioNoBouncy
                            )
                        )
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }

        val groupedModules = filteredModules.groupBy { it.category }
        val orderedCategories = contentIndex.categories.filter { groupedModules.containsKey(it.id) }

        items(orderedCategories, key = { it.id }) { category ->
            val categoryModules = groupedModules[category.id] ?: emptyList()
            CategoryModuleSection(
                category = category,
                modules = categoryModules,
                categoryMap = categoryMap,
                strings = strings,
                onModuleClick = onNavigateToModule,
                modifier = Modifier.animateItem(
                    placementSpec = spring(
                        stiffness = Spring.StiffnessMediumLow,
                        dampingRatio = Spring.DampingRatioNoBouncy
                    )
                )
            )
        }
    }
    }
}

@Composable
fun CategoryModuleSection(
    category: Category,
    modules: List<Module>,
    categoryMap: Map<String, Category>,
    strings: Strings.LangStrings,
    onModuleClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val cardColor = remember(category.color) {
        CategoryColorParser.parse(category.color)
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(bottom = 6.dp, top = 8.dp)
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(18.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(cardColor)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = category.label,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = "${modules.size} ${strings.modules}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        modules.forEachIndexed { index, module ->
            ModuleCard(
                module = module,
                accentColor = cardColor,
                categoryLabel = category.label,
                strings = strings,
                onClick = { onModuleClick(module.id) }
            )
            if (index < modules.size - 1) {
                Box(
                    modifier = Modifier
                        .padding(start = 24.dp, top = 2.dp, bottom = 2.dp)
                        .width(32.dp)
                        .height(2.dp)
                        .clip(RoundedCornerShape(1.dp))
                        .background(cardColor.copy(alpha = 0.3f))
                )
            }
        }
    }
}

@Composable
fun ModuleCard(
    module: Module,
    accentColor: Color,
    categoryLabel: String,
    strings: Strings.LangStrings,
    onClick: () -> Unit
) {
    val descriptionFirstLine = remember(module.description) {
        val firstLine = module.description.lines().firstOrNull { it.isNotBlank() } ?: ""
        if (firstLine.length > 60) firstLine.take(57) + "..." else firstLine
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(accentColor)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = module.title,
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 2.dp)
                ) {
                    Text(
                        text = "${module.documents.size} ${strings.docs}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = categoryLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = accentColor.copy(alpha = 0.7f)
                    )
                }
                if (descriptionFirstLine.isNotBlank()) {
                    Text(
                        text = descriptionFirstLine,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }
        }
    }
}
