# 文档清理脚本 - 第二轮
# 继续清理重复和过时的文档

$archiveDir = "D:\yaowei\excel-review-app\docs-archive"
$rootDir = "D:\yaowei\excel-review-app"

$docsToArchive = @(
    # 水印检测重复文档（保留最新的3个核心文档即可）
    "WATERMARK_DETECTION_DESIGN.md",
    "WATERMARK_DETECTION_IMPROVEMENTS.md",
    "WATERMARK_DETECTION_SUMMARY.md",
    "WATERMARK_DETECTION_TEST_GUIDE.md",
    "WATERMARK_DETECTION_USAGE.md",
    "WATERMARK_DETECTION_VERIFICATION.md",
    "WATERMARK_EXCEL_FIX.md",
    "WATERMARK_QUICK_START.md",
    "WATERMARK_TOGGLE_IMPLEMENTATION.md",
    "WATERMARK_TUNING_GUIDE.md",
    
    # Worker 模式相关（已不使用）
    "WORKER_JQUERY_SOLUTION.md",
    "WORKER_MODE_ANALYSIS.md",
    "WORKER_MODE_REMOVAL_SUMMARY.md",
    "WORKER_MODE_STATUS_ANALYSIS.md",
    "WHY_MANUAL_WORKS_BUT_AUTO_FAILS.md",
    
    # Validation 重复文档（太多了，保留1-2个即可）
    "VALIDATION_API_FIX.md",
    "VALIDATION_ISSUE_RESOLUTION.md",
    "VALIDATION_MISSING_DATA_FIX.md",
    "VALIDATION_TEST_REPORT.md",
    "FINAL_VALIDATION_TEST.md",
    "FRONTEND_VALIDATION_IMPLEMENTATION.md",
    
    # Vercel 部署重复
    "VERCEL_ENV_SETUP.md",
    
    # 其他重复/临时文档
    "bug.md",
    "START_POSITION_BUTTON_FIX.md",
    "TEMPLATE_ALIGNMENT_REPORT.md",
    "UPDATE_WITH_MISSING_FIX.md",
    "UI_OPTIMIZATION.md",
    "OPTION_COMPARISON_IMPROVEMENT.md",
    "YOUTUBE_AUDIO_NOTE.md",
    "WARP.md",
    "DEPENDENCY_WARNINGS.md",
    
    # 清理计划本身（已完成）
    "docs-cleanup-plan.md"
)

$movedCount = 0
$notFoundCount = 0

Write-Host "`n第二轮文档清理...`n" -ForegroundColor Cyan

foreach ($doc in $docsToArchive) {
    $sourcePath = Join-Path $rootDir $doc
    $destPath = Join-Path $archiveDir $doc
    
    if (Test-Path $sourcePath) {
        Move-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "✅ 已归档: $doc" -ForegroundColor Green
        $movedCount++
    } else {
        Write-Host "⚠️  未找到: $doc" -ForegroundColor Yellow
        $notFoundCount++
    }
}

Write-Host "`n" -NoNewline
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "第二轮清理完成" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "已归档文档: $movedCount 个" -ForegroundColor Green
Write-Host "未找到文档: $notFoundCount 个" -ForegroundColor Yellow

# 统计当前剩余文档
$remainingDocs = (Get-ChildItem -Path $rootDir -Filter "*.md" -File).Count
$archivedTotal = (Get-ChildItem -Path $archiveDir -File).Count
Write-Host "`n当前剩余文档: $remainingDocs 个" -ForegroundColor Cyan
Write-Host "归档目录总计: $archivedTotal 个" -ForegroundColor Cyan
