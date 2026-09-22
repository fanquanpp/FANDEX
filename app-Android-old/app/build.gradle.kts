import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

val appVersionName = "4.2.1"
val appVersionCode = 17

android {
    namespace = "com.fandex.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.fandex.app"
        minSdk = 26
        targetSdk = 37
        versionCode = appVersionCode
        versionName = appVersionName

        buildConfigField(
            "String",
            "GITHUB_API_URL",
            "\"https://api.github.com/repos/fanquanpp/FANDEX/releases/latest\""
        )
    }

    val localProps = Properties().apply {
        file("../local.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) }
    }
    signingConfigs {
        create("release") {
            storeFile = file("../fandex-release.jks")
            storePassword = System.getenv("FANDEX_KEYSTORE_PASSWORD")
                ?: localProps.getProperty("storePassword", "")
            keyAlias = System.getenv("FANDEX_KEY_ALIAS")
                ?: localProps.getProperty("keyAlias", "fandex")
            keyPassword = System.getenv("FANDEX_KEY_PASSWORD")
                ?: localProps.getProperty("keyPassword", "")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (
                signingConfigs.getByName("release").storeFile?.exists() == true &&
                !signingConfigs.getByName("release").storePassword.isNullOrBlank()
            ) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    testOptions {
        unitTests {
            isReturnDefaultValues = true
            all { test ->
                test.jvmArgs("-Dnet.bytebuddy.experimental=true")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)
    }
}

androidComponents {
    onVariants { variant ->
        variant.outputs.forEach { output ->
            output.outputFileName.set("FANDEX-v${appVersionName}.apk")
        }
    }
}

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.activity.compose)
    implementation(libs.navigation.compose)

    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)

    implementation(libs.commonmark)
    implementation(libs.commonmark.ext.gfm.tables)
    implementation(libs.commonmark.ext.gfm.strikethrough)

    implementation(libs.datastore.preferences)

    implementation(libs.gson)

    implementation(libs.core.ktx)
    implementation(libs.androidx.annotation)

    implementation(libs.okhttp)

    implementation(libs.kotlinx.coroutines.android)

    implementation(libs.androidx.work.runtime.ktx)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.mockito.core)
    testImplementation(libs.mockito.kotlin)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(libs.mockwebserver)
}
