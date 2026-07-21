package com.fandex.app.update

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.util.Log
import androidx.core.content.FileProvider
import java.io.File

/**
 * APK 安装器
 *
 * 功能：通过 FileProvider 获取 content:// URI，调起系统 PackageInstaller 安装 APK
 *
 * 输入：
 *   - context：应用上下文
 *
 * 输出：Boolean
 *   - true：成功调起系统安装界面
 *   - false：调起失败（权限缺失或 Intent 无法解析）
 *
 * 核心流程：
 *   1. 校验 APK 文件存在
 *   2. 通过 FileProvider 获取 content:// URI（避免 file:// URI 在 Android 7.0+ 触发 FileUriExposedException）
 *   3. 构造 ACTION_VIEW Intent，设置 MIME 类型为 APK 包
 *   4. 授予临时读权限 + 设置 NEW_TASK 标志
 *   5. 校验 Intent 可解析后启动 Activity
 *
 * 权限要求：
 *   - Android 8.0+ 需在 Manifest 声明 REQUEST_INSTALL_PACKAGES 权限
 *   - 本应用已在 AndroidManifest.xml 中声明该权限
 *
 * FileProvider 配置：
 *   - authority: ${applicationId}.fileprovider
 *   - 路径配置在 res/xml/file_paths.xml，已暴露 cache-path="downloads/"
 */
class UpdateInstaller(private val context: Context) {

    companion object {
        /** 日志 TAG */
        private const val TAG = "UpdateInstaller"
    }

    /**
     * 安装 APK 文件
     *
     * 输入：apkFile 下载完成的 APK 文件对象
     * 输出：Boolean 表示是否成功调起安装界面
     *
     * 流程：
     *   1. 校验文件存在性
     *   2. 检查 REQUEST_INSTALL_PACKAGES 权限（Android 8.0+）
     *   3. 通过 FileProvider 获取 content URI
     *   4. 构造并校验 Intent
     *   5. 启动系统安装界面
     *
     * 异常处理：
     *   - 文件不存在：返回 false
     *   - 权限缺失：返回 false（已在 Manifest 声明，正常情况下不会缺失）
     *   - Intent 无法解析：返回 false（设备无可用安装器）
     *   - Activity 启动失败：catch 异常后返回 false
     */
    fun install(apkFile: File): Boolean {
        try {
            /* 校验文件存在性 */
            if (!apkFile.exists() || !apkFile.isFile) {
                return false
            }

            /* Android 8.0+ 检查 REQUEST_INSTALL_PACKAGES 权限 */
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val granted = context.checkSelfPermission(android.Manifest.permission.REQUEST_INSTALL_PACKAGES) ==
                    PackageManager.PERMISSION_GRANTED
                if (!granted) {
                    return false
                }
            }

            /* 通过 FileProvider 获取 content:// URI */
            val authority = "${context.packageName}.fileprovider"
            val uri: Uri = FileProvider.getUriForFile(context, authority, apkFile)

            /* 构造安装 Intent */
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            /* 校验 Intent 可解析（设备存在可处理 APK 安装的 Activity） */
            if (intent.resolveActivity(context.packageManager) == null) {
                return false
            }

            /* 启动系统安装界面 */
            context.startActivity(intent)
            return true
        } catch (e: Exception) {
            Log.e(TAG, "调起 APK 安装界面失败: ${e.message}", e)
            /* 任何异常均视为调起失败，返回 false 让上层友好提示 */
            return false
        }
    }
}
