import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.fandex.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.fandexpp.fandex"
        minSdk = 26
        targetSdk = 37
        versionCode = 10
        versionName = "4.4.0"

        buildConfigField(
            "String",
            "GITHUB_API_URL",
            "\"https://api.github.com/repos/fanquanpp/FANDEX/releases/latest\""
        )

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
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
        getByName("debug") {
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = if (
                signingConfigs.getByName("release").storeFile?.exists() == true &&
                !signingConfigs.getByName("release").storePassword.isNullOrBlank()
            ) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
        debug {
            isMinifyEnabled = false
        }
    }

    // release 签名缺失时立即失败：debug 签名的 release 包一旦发布，
    // 已装用户会因签名不一致无法升级。上面的 buildTypes 回退逻辑仅供
    // 非分发任务（本地 compile 等）完成配置，真正打包前在此拦截。
    gradle.taskGraph.whenReady {
        val shipsReleaseBinary = allTasks.any { task ->
            (task.name.startsWith("assemble") || task.name.startsWith("bundle")) &&
                task.name.endsWith("Release")
        }
        if (shipsReleaseBinary) {
            val release = signingConfigs.getByName("release")
            val keystoreReady = release.storeFile?.exists() == true &&
                !release.storePassword.isNullOrBlank() &&
                !release.keyAlias.isNullOrBlank() &&
                !release.keyPassword.isNullOrBlank()
            if (!keystoreReady) {
                throw GradleException(
                    "release 签名未配置完整（缺少 fandex-release.jks 或 storePassword/keyAlias/keyPassword）。" +
                        "请设置环境变量 FANDEX_KEYSTORE_PASSWORD / FANDEX_KEY_ALIAS / FANDEX_KEY_PASSWORD，" +
                        "或在 local.properties 配置同名属性；已禁止回退 debug 签名产出 release 包。"
                )
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

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.splashscreen)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.androidx.navigation.compose)

    implementation(libs.androidx.datastore.preferences)

    implementation(libs.commonmark)
    implementation(libs.commonmark.ext.gfm.tables)
    implementation(libs.commonmark.ext.gfm.strikethrough)
    implementation(libs.commonmark.ext.task.list)

    implementation(libs.jlatexmath.android)

    implementation(libs.kotlinx.coroutines.android)

    implementation(libs.okhttp)

    implementation(libs.androidx.work.runtime.ktx)

    implementation(libs.kotlinx.serialization.json)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.compose.ui.tooling)
}
