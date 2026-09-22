package com.fandex.app.ui.background

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fandex.app.ui.components.GeoBgVariant

@Composable
fun BackgroundDecorSystem(
    variant: GeoBgVariant,
    dynamicBackground: Boolean = true,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.fillMaxSize()) {
        if (dynamicBackground) {
            L1ParticleLayer(modifier = Modifier.fillMaxSize())
        }

        L3GridNoiseLayer(modifier = Modifier.fillMaxSize())

        L4GeoDecorLayer(
            variant = variant,
            modifier = Modifier.fillMaxSize()
        )

    }
}
