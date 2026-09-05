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
        // 独立应用标识：与旧版 FANDEX-App（com.fandex.app）并存，
        // 不覆盖安装、不互相更新；代码包名（namespace）保持不变
        applicationId = "com.fandexpp.fandex"
        minSdk = 26
        targetSdk = 37
        versionCode = 8
        versionName = "4.3.0"

        /**
         * GitHub Releases API 端点
         *
         * 用于 UpdateChecker 检查应用更新（移植自旧端 build.gradle.kts 38-42 行的做法）。
         * 通过 BuildConfig 注入便于后续切换仓库或环境（如内测分发）时统一管理。
         */
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

    /**
     * 正式发布签名配置（移植自旧端 app/build.gradle.kts 60-93 行的三级回退策略）
     *
     * 密码读取优先级：
     * 1. 环境变量 FANDEX_KEYSTORE_PASSWORD / FANDEX_KEY_PASSWORD（CI 通过 Secrets 注入）
     * 2. local.properties 中的 storePassword / keyPassword（本地开发）
     *
     * keyAlias 优先级：
     * 1. 环境变量 FANDEX_KEY_ALIAS
     * 2. local.properties 中的 keyAlias
     * 3. 默认值 "fandex"
     *
     * keystore 文件路径遵循旧端约定：工程根目录下的 fandex-release.jks
     */
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
        // 调试包使用默认调试密钥
        getByName("debug") {
            // 默认调试密钥
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
            /**
             * 签名回退策略（与旧端一致的三级回退）：
             * - 环境变量 / local.properties 提供正式 keystore（文件存在且密码非空）时使用 release 签名
             * - 否则回退 debug 签名，保证无密钥环境（CI / 新 clone）可直接出包
             */
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
    // AndroidX 核心
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.splashscreen)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    debugImplementation(libs.compose.ui.tooling)

    // 导航
    implementation(libs.androidx.navigation.compose)

    // DataStore
    implementation(libs.androidx.datastore.preferences)

    // Markdown 解析
    implementation(libs.commonmark)
    implementation(libs.commonmark.ext.gfm.tables)
    implementation(libs.commonmark.ext.gfm.strikethrough)
    implementation(libs.commonmark.ext.task.list)

    // LaTeX 数学公式离线渲染（块级 $$ 与行内 $，Android 适配版 JLatexMath）
    implementation(libs.jlatexmath.android)

    // 协程
    implementation(libs.kotlinx.coroutines.android)

    // 网络（更新自检：GitHub Releases API 与 APK CDN 下载）
    implementation(libs.okhttp)

    // WorkManager（每日更新检查后台任务）
    implementation(libs.androidx.work.runtime.ktx)

    // 序列化
    implementation(libs.kotlinx.serialization.json)

    // 测试
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.compose.bom))
    androidTestImplementation(libs.compose.ui.tooling)
}
