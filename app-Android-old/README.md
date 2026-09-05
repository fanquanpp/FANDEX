# FANDEX App（旧版，已冻结）

> **冻结公告（2026-09）**：本目录为旧版 FANDEX Android 应用（`com.fandex.app`，
> versionCode 17），自新版应用（`app-Android-new`，`com.fandexpp.fandex`）完成
> 功能追平后进入**维护冻结**状态。
>
> - 只修复阻断性缺陷，不再新增功能、不再做性能重构（旧端存在主线程 Markdown
>   解析、无内容缓存、自研 LaTeX 渲染等历史包袱，修复性价比低）；
> - 新功能与体验优化一律在 `app-Android-new` 进行（更新体系、启动页、字号缩放、
>   签名、单元测试已于 2026-09 迁移完成）；
> - CI（android-build.yml / android-release.yml）暂保留本目录的构建产物
>   （`FANDEX-Legacy` APK），供存量用户过渡下载；待新版应用正式发布并稳定后，
>   本目录将从构建矩阵与仓库中移除。
