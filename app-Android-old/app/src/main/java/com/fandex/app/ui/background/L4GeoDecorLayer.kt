package com.fandex.app.ui.background

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fandex.app.ui.components.GeoBgDecor
import com.fandex.app.ui.components.GeoBgVariant

@Composable
fun L4GeoDecorLayer(
    variant: GeoBgVariant,
    modifier: Modifier = Modifier
) {
    GeoBgDecor(
        variant = variant,
        modifier = modifier
    )
}
