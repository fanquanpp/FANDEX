package com.fandex.app.update

import com.google.gson.annotations.SerializedName
import java.io.File

/**
 * 更新自检功能数据模型集合
 *
 * 功能：定义 GitHub Releases API 响应模型、应用内使用的更新信息模型、
 *       下载状态机与检查状态机
 *
 * 设计原则：
 * - 数据模型使用不可变 data class，字段提供默认值以兼容 Gson 反序列化缺失字段
 * - 状态机使用 sealed class，保证 when 分支穷举性，避免遗漏分支
 * - GitHubRelease 与 GitHubAsset 字段命名使用 Kotlin 惯例 camelCase，
 *   通过 @SerializedName 注解显式映射 GitHub API 返回的 snake_case JSON 字段
 *   （Gson 默认按字段名映射，无法处理 snake_case ↔ camelCase 转换）
 */

/**
 * GitHub Release API 响应模型
 *
 * 功能：映射 GitHub Releases API 返回的 JSON 结构
 *
 * 字段说明：
 * - tagName：版本号标签，如 "v3.0.0"（JSON 字段：tag_name）
 * - name：Release 标题（人类可读名称）
 * - body：Release notes，Markdown 格式的更新说明
 * - publishedAt：发布时间，ISO8601 格式字符串（JSON 字段：published_at）
 * - htmlUrl：Release 页面 URL，用于"查看详情"按钮跳转（JSON 字段：html_url）
 * - assets：附件列表，包含可下载的 APK 文件元数据
 *
 * 数据来源：GET https://api.github.com/repos/{owner}/{repo}/releases/latest
 */
data class GitHubRelease(
    /** 版本号标签，如 "v3.0.0" */
    @SerializedName("tag_name") val tagName: String = "",
    /** Release 标题 */
    @SerializedName("name") val name: String = "",
    /** Release notes（Markdown 格式） */
    @SerializedName("body") val body: String = "",
    /** 发布时间（ISO8601 字符串） */
    @SerializedName("published_at") val publishedAt: String = "",
    /** Release 页面 URL */
    @SerializedName("html_url") val htmlUrl: String = "",
    /** 附件列表 */
    @SerializedName("assets") val assets: List<GitHubAsset> = emptyList()
)

/**
 * GitHub Asset 附件模型
 *
 * 功能：映射 Release 附件 JSON 结构，标识可下载的 APK 文件
 *
 * 字段说明：
 * - name：文件名，如 "FANDEX-v3.0.0.apk"
 * - size：文件大小（字节）
 * - downloadUrl：实际下载 URL，指向 objects.githubusercontent.com CDN（JSON 字段：browser_download_url）
 * - contentType：MIME 类型，如 "application/vnd.android.package-archive"（JSON 字段：content_type）
 */
data class GitHubAsset(
    /** 文件名 */
    @SerializedName("name") val name: String = "",
    /** 文件大小（字节） */
    @SerializedName("size") val size: Long = 0,
    /** 下载 URL（CDN 地址） */
    @SerializedName("browser_download_url") val downloadUrl: String = "",
    /** MIME 类型 */
    @SerializedName("content_type") val contentType: String = ""
)

/**
 * 应用内使用的更新信息模型
 *
 * 功能：封装从 GitHubRelease 解析出的、应用层使用的更新信息
 *
 * 设计说明：
 * - latestVersion：已去除 "v" 前缀的纯版本号字符串
 * - latestVersionCode：从版本号解析出的整数版本码，用于版本对比
 * - isUpdateAvailable：是否真的存在新版本（结合当前版本对比后的结论）
 *
 * 与 GitHubRelease 的区别：
 * - GitHubRelease 是 API 原始返回，UpdateInfo 是业务处理后的结果
 * - UpdateInfo 已剔除无关字段（如 assets 列表），仅保留 UI 与下载流程所需信息
 */
data class UpdateInfo(
    /** 最新版本号（已去除 "v" 前缀，如 "3.0.0"） */
    val latestVersion: String,
    /** 解析出的版本码（如 3.0.0 -> 300） */
    val latestVersionCode: Int,
    /** APK 下载地址（CDN） */
    val downloadUrl: String,
    /** APK 文件大小（字节） */
    val downloadSize: Long,
    /** 更新说明（Markdown） */
    val releaseNotes: String,
    /** 发布时间（ISO8601） */
    val publishedAt: String,
    /** Release 页面 URL */
    val htmlUrl: String,
    /** 是否有更新可用 */
    val isUpdateAvailable: Boolean
)

/**
 * 下载状态机
 *
 * 功能：表示 APK 下载流程的状态，供 UI 层订阅渲染
 *
 * 状态流转：
 *   Idle -> Downloading -> Completed
 *                     \-> Failed
 *
 * 设计原则：
 * - 使用 sealed class 保证 when 分支穷举
 * - Downloading 携带实时进度信息，UI 可据此更新进度条
 * - Completed 携带下载完成的 File 对象，便于直接传递给安装器
 * - Failed 携带错误信息，UI 可据此显示 Toast / Snackbar
 */
sealed class DownloadState {
    /** 空闲状态：尚未开始下载或已重置 */
    object Idle : DownloadState()

    /** 下载中状态：携带实时进度信息 */
    data class Downloading(
        /** 进度百分比 0-100 */
        val progress: Int,
        /** 已下载字节数 */
        val downloadedBytes: Long,
        /** 总字节数（-1 表示未知） */
        val totalBytes: Long
    ) : DownloadState()

    /** 下载完成状态：携带 APK 文件对象 */
    data class Completed(val file: File) : DownloadState()

    /** 下载失败状态：携带错误信息 */
    data class Failed(val message: String) : DownloadState()
}

/**
 * 检查状态机
 *
 * 功能：表示版本检查流程的状态，供 UI 层订阅渲染
 *
 * 状态流转：
 *   Idle -> Checking -> Available（有新版本）
 *                  \-> UpToDate（已是最新）
 *                  \-> Failed（检查失败）
 *
 * 设计原则：
 * - Available 携带 UpdateInfo，UI 可据此显示更新卡片
 * - UpToDate 与 Available 显式区分，便于 UI 渲染不同反馈
 * - Failed 携带错误信息，便于用户感知失败原因
 */
sealed class CheckState {
    /** 空闲状态：尚未开始检查或已 dismiss */
    object Idle : CheckState()

    /** 检查中状态：网络请求进行中 */
    object Checking : CheckState()

    /** 发现新版本状态：携带更新信息 */
    data class Available(val updateInfo: UpdateInfo) : CheckState()

    /** 已是最新版本状态 */
    object UpToDate : CheckState()

    /** 检查失败状态：携带错误信息 */
    data class Failed(val message: String) : CheckState()
}
