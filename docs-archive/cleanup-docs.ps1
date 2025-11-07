# 文档清理脚本
# 将无用文档移动到 docs-archive 目录

$archiveDir = "D:\yaowei\excel-review-app\docs-archive"
$rootDir = "D:\yaowei\excel-review-app"

# 要删除的文档列表
$docsToArchive = @(
    # API 签名调试文档
    "API_SIGNATURE_255_LIMIT_EXPLANATION.md",
    "API_SIGNATURE_CORRECT_UNDERSTANDING.md",
    "API_SIGNATURE_DEBUG.md",
    "API_SIGNATURE_FINAL_FIX.md",
    "API_SIGNATURE_FIX_FINAL.md",
    "API_SIGNATURE_FORMATPARAMS_FIX.md",
    "API_SIGNATURE_INVESTIGATION.md",
    "API_SIGNATURE_URL_ENCODING_FIX.md",
    "API_SIGNATURE_VERIFICATION_FIX.md",
    "API_ANSWERS_FORMAT_FIX.md",
    "API_MODE_CONTENTWINDOW_FIX.md",
    "API_RESPONSE_FORMAT_FIX.md",
    "SIGNATURE_TRUNCATION_ISSUE.md",
    
    # 水印检测迭代文档
    "PHASE1_RESULTS.md",
    "PHASE2_RESULTS.md",
    "PHASE3-ANALYSIS-SUMMARY.md",
    "PHASE3.1-RESULTS.md",
    "PHASE3.2-RESULTS.md",
    "PHASE3-COMPLETE-SUMMARY.md",
    "PHASE4-FINAL-REPORT.md",
    "PHASE5-GRIDLINE-DETECTION-SUMMARY.md",
    "adjust-watermark-threshold.md",
    "ADVANCED_WATERMARK_DETECTION_GUIDE.md",
    
    # 问卷相关文档
    "QUESTIONNAIRE_CONTENT_CHECK_COMPLETE.md",
    "QUESTIONNAIRE_CONTENT_SYNC.md",
    "QUESTIONNAIRE_EXTRACTION_ENHANCEMENT.md",
    "QUESTIONNAIRE_REMOVAL_SUMMARY.md",
    "QUESTIONNAIRE_REMOVAL_VERIFICATION.md",
    "QUESTIONNAIRE_START_POSITION_FEATURE.md",
    
    # 音频调试文档
    "AUDIO_CHECK_SUMMARY.md",
    "AUDIO_FREEZE_FIX.md",
    "AUDIO_RELOAD_FIX.md",
    "AUDIO_OPTIONS_COMPARISON.md",
    
    # 联系人创建调试文档
    "CONTACT_CREATION_FIX.md",
    "CONTACT_CREATION_RESUME_FEATURE.md",
    "CONTACT_CREATION_SPEED_OPTIMIZATION.md",
    
    # 边框检测文档
    "BORDER_DETECTION_TUNING.md",
    
    # 重复项检测文档
    "DUPLICATE_LAYOUT_IMPROVEMENT.md",
    
    # 执行控制文档
    "EXECUTION_STATE_RESET_FIX.md",
    
    # 盐值并发文档
    "SALT_CONCURRENCY_FIX.md",
    "SALT_STREAMING_FIX.md",
    
    # 持续时间修复文档
    "DURATION_VALIDATION_ENHANCEMENT.md",
    
    # Worker 调试文档
    "WORKER_BOUNDARY_FIX.md",
    "WORKER_MESSAGE_INTEGRITY_FIX.md",
    "WORKER_STATE_SYNC_FIX.md",
    "WORKER_STREAMING_FIX.md",
    
    # 浏览器冻结调试
    "BROWSER_FREEZE_DEBUG.md",
    
    # 其他临时/调试文档
    "DEBUG_DUPLICATE_DISPLAY.md",
    "DEBUG_LOGS_GUIDE.md",
    "DETECTION_LOGIC_ISSUES.md",
    "DOM_MODE_INTERRUPTION_FIX.md",
    "ENCRYPTEDTEXT_FIX.md",
    "HIDDEN_FIELD_DELIMITER_FIX.md",
    "LOGIN_SESSION_FIX.md",
    "NVCVAL_CONCURRENCY_FIX.md",
    "REGEX_ESCAPE_FIX.md",
    "RESUME_FEATURE_CONTROL_FIX.md",
    "PORT_CHANGE_3001.md",
    "bug修复记录.md",
    
    # 多个 FINAL 总结文档
    "FINAL_SUMMARY.md",
    "FINAL_CONFIG_SUMMARY.md",
    "FINAL_TEST_CONFIG_SUMMARY.md",
    
    # 优化相关重复文档
    "CODE_OPTIMIZATION_SUMMARY.md",
    "CODE_REDUNDANCY_ANALYSIS.md",
    "OPTIMIZATION_QUICK_REFERENCE.md",
    "CONFIG_RECOMMENDATION.md",
    "QINKAI_FILE_OPTIMIZATION.md",
    "QINKAI_OPTIMIZATIONS_IMPLEMENTED.md",
    
    # 其他重复/合并文档
    "SMART_DEV_START_SUMMARY.md",
    "DEPLOYMENT_READY.md",
    "DETECTION_UPGRADE_SUMMARY.md",
    "AUTOMATION_ISSUES_ANALYSIS.md",
    "VALIDATION_IMPLEMENTATION_FINAL.md",
    "VALIDATION_COMPLETE.md",
    "WHY_CHOOSE_WORKER.md",
    "START_TEST_GUIDE.md",
    "YOUTUBE_TRAINING_FIX.md",
    "TRAINING_DURATION_FIX.md",
    "UI_IMPROVEMENT_SUMMARY.md",
    "CHANGELOG_DURATION.md",
    "CHANGELOG_OPTIMIZATION.md",
    "WARP_INSTRUCTIONS.md",
    "TEMPLATE_CONFIG_OPTIMIZATION.md",
    "VERCEL_DEPLOYMENT_GUIDE.md",
    "REAL_FILE_TEST_REPORT.md",
    "PROJECT_ID_FIX_SUMMARY.md",
    "QUICK_INTEGRATION_EXAMPLE.md",
    
    # 临时测试输出
    "ocr-test-error.txt",
    "ocr-test-output.txt"
)

$movedCount = 0
$notFoundCount = 0

Write-Host "`n开始移动文档到归档目录...`n" -ForegroundColor Cyan

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
Write-Host "清理完成" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "已归档文档: $movedCount 个" -ForegroundColor Green
Write-Host "未找到文档: $notFoundCount 个" -ForegroundColor Yellow
Write-Host "`n所有文档已备份到: $archiveDir" -ForegroundColor Cyan
