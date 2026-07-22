import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

/**
 * 应用版本元数据（顶级变量）
 *
 * 提取到顶层的原因：
 * 1. AGP 9.0 新变体 API（androidComponents.onVariants）中
 *    `variant.versionName` 已被移除，无法在变体回调内直接读取版本名。
 * 2. 通过顶级变量在 `android.defaultConfig` 与 `androidComponents.onVariants`
 *    之间共享同一份版本数据，保证输出文件名与内置版本号一致。
 */
val appVersionName = "3.7.0"
val appVersionCode = 13

android {
    namespace = "com.fandex.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.fandex.app"
        minSdk = 26
        targetSdk = 37
        versionCode = appVersionCode
        versionName = appVersionName

        /**
         * GitHub Releases API 端点
         *
         * 用于 UpdateChecker 检查应用更新，迁移自 UpdateChecker.kt 中的硬编码 URL。
         * 通过 BuildConfig 注入便于后续切换仓库或环境（如内测分发）时统一管理。
         */
        buildConfigField(
            "String",
            "GITHUB_API_URL",
            "\"https://api.github.com/repos/fanquanpp/FANDEX-App/releases/latest\""
        )
    }

    /**
     * 签名配置
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
     * 未配置环境变量且 local.properties 不存在时，密码为空字符串，
     * 仅 debug 构建可用（debug 不需要签名密码）。
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
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
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

    /**
     * 单元测试配置
     *
     * - returnDefaultValues：Android 框架方法未 mock 时返回默认值，避免 NPE
     *   ContentLoader 单元测试通过 Mockito mock Context 与 AssetManager，
     *   该配置作为兜底防止未预期的方法调用抛出 NullPointerException
     * - jvmArgs net.bytebuddy.experimental=true：
     *   当前环境为 JDK 25，Mockito 5.14.2 内置的 Byte Buddy 最高官方支持到 Java 24。
     *   设置 experimental 标志允许 Byte Buddy 在 Java 25 上工作（这是 Mockito 官方推荐方案）。
     *   后续 Mockito 升级到内置 Byte Buddy 1.17+ 后可移除此参数。
     */
    testOptions {
        unitTests {
            isReturnDefaultValues = true
            all { test ->
                test.jvmArgs("-Dnet.bytebuddy.experimental=true")
            }
        }
    }
}

/**
 * Kotlin 编译器配置
 *
 * AGP 9.0 移除了 `kotlinOptions` DSL 块，改用 `kotlin { compilerOptions { } }`。
 * 显式指定 JVM 字节码目标为 21，与 compileOptions 中的 Java 21 保持一致。
 */
kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)
    }
}

/**
 * 自定义 APK 输出文件名（AGP 9.0 新变体 API）
 *
 * 旧版 `applicationVariants.all { }` DSL 在 AGP 9.0 中已被移除，
 * 改用 `androidComponents.onVariants { }` 配合 VariantOutput API。
 *
 * 输出格式：FANDEX-v{versionName}.apk（如 FANDEX-v3.0.0.apk）
 * 确保下载和分发时文件名具有可辨识的版本标识。
 */
androidComponents {
    onVariants { variant ->
        variant.outputs.forEach { output ->
            output.outputFileName.set("FANDEX-v${appVersionName}.apk")
        }
    }
}

dependencies {
    // Compose
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.activity.compose)
    implementation(libs.navigation.compose)

    // Lifecycle
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)

    // Markdown 解析
    implementation(libs.commonmark)
    implementation(libs.commonmark.ext.gfm.tables)
    implementation(libs.commonmark.ext.gfm.strikethrough)

    // DataStore（偏好设置持久化）
    implementation(libs.datastore.preferences)

    // JSON 解析
    implementation(libs.gson)

    // AndroidX Core
    implementation(libs.core.ktx)
    implementation(libs.androidx.annotation)

    // 网络请求（仅用于更新自检功能，访问 GitHub Releases 域名白名单）
    implementation(libs.okhttp)

    // 协程
    implementation(libs.kotlinx.coroutines.android)

    // WorkManager（更新检查后台任务）
    implementation(libs.androidx.work.runtime.ktx)

    // 单元测试
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.mockito.core)
    testImplementation(libs.mockito.kotlin)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(libs.mockwebserver)
}
