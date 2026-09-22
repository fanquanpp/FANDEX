package com.fandex.app.home

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
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
import com.fandex.app.data.ContentIndex
import com.fandex.app.data.DataStoreManager
import com.fandex.app.data.Document
import com.fandex.app.data.Strings
import com.fandex.app.data.resolveDocuments
import com.fandex.app.ui.background.BackgroundDecorSystem
import com.fandex.app.ui.components.CategoryColorParser
import com.fandex.app.ui.components.GeoBgVariant

@Composable
fun ModuleScreen(
    moduleId: String,
    contentIndex: ContentIndex? = null,
    onNavigateToArticle: (String, String, String) -> Unit
) {
    val strings = Strings.default
    val module = contentIndex?.modules?.find { it.id == moduleId }
    val category = module?.let { m ->
        contentIndex.categories.find { it.id == m.category }
    }
    val documents = module?.let { contentIndex.resolveDocuments(it) } ?: emptyList()

    val context = LocalContext.current
    val dynamicBackgroundEnabled by DataStoreManager.getDynamicBackground(context)
        .collectAsState(initial = true)

    val accentColor = remember(category?.color) {
        CategoryColorParser.parse(category?.color)
    }

    if (contentIndex == null || module == null) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            BackgroundDecorSystem(
                variant = GeoBgVariant.Loading,
                dynamicBackground = dynamicBackgroundEnabled
            )
            CircularProgressIndicator(modifier = Modifier.size(24.dp))
        }
        return
    }

    Box(modifier = Modifier.fillMaxSize()) {
        BackgroundDecorSystem(
            variant = GeoBgVariant.Module,
            dynamicBackground = dynamicBackgroundEnabled
        )
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp)
        ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .width(4.dp)
                        .height(24.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(accentColor)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Text(
                        text = module.title,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        Text(
                            text = category?.label ?: "",
                            style = MaterialTheme.typography.labelSmall,
                            color = accentColor.copy(alpha = 0.8f)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "${documents.size} ${strings.docs}",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
            if (module.description.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = module.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Spacer(modifier = Modifier.height(8.dp))
            Box(
                modifier = Modifier
                    .width(48.dp)
                    .height(2.dp)
                    .clip(RoundedCornerShape(1.dp))
                    .background(accentColor.copy(alpha = 0.4f))
            )
            Spacer(modifier = Modifier.height(6.dp))
        }

        itemsIndexed(documents, key = { _, document -> document.slug }) { index, document ->
            Column(modifier = Modifier.animateItem(
                placementSpec = spring(
                    stiffness = Spring.StiffnessMediumLow,
                    dampingRatio = Spring.DampingRatioNoBouncy
                )
            )) {
                DocumentListItem(
                    document = document,
                    index = index + 1,
                    accentColor = accentColor,
                    onClick = {
                        onNavigateToArticle(document.module, document.slug, document.title)
                    }
                )
                if (index < documents.size - 1) {
                    Box(
                        modifier = Modifier
                            .padding(start = 28.dp, top = 2.dp, bottom = 2.dp)
                            .width(24.dp)
                            .height(1.dp)
                            .clip(RoundedCornerShape(0.5.dp))
                            .background(accentColor.copy(alpha = 0.2f))
                    )
                }
            }
        }
    }
    }
}

@Composable
fun DocumentListItem(
    document: Document,
    index: Int,
    accentColor: Color,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 4.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(CircleShape)
                .background(accentColor.copy(alpha = 0.15f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "$index",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = accentColor
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = document.title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Normal,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = document.slug,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}
