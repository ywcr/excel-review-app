# 同步 /public/automation 优化到 /html 目录的脚本
# 创建时间：2025-09-22

Write-Host "开始同步自动化脚本优化..." -ForegroundColor Green

# 定义源和目标目录
$sourceBase = ".\public\automation"
$targetBase = ".\html"

# 需要同步的文件列表
$filesToSync = @(
    @{src="js\main.js"; dst="js\main.js"},
    @{src="js\data-processor.js"; dst="js\data-processor.js"},
    @{src="js\sheet-selector.js"; dst="js\sheet-selector.js"},
    @{src="js\ui-manager.js"; dst="js\ui-manager.js"},
    @{src="js\utils.js"; dst="js\utils.js"},
    @{src="js\config.js"; dst="js\config.js"},
    @{src="js\automation-generator.js"; dst="js\automation-generator.js"},
    @{src="style.css"; dst="style.css"}
)

# 备份函数
function Backup-File {
    param($filePath)
    if (Test-Path $filePath) {
        $backupPath = "$filePath.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        Copy-Item $filePath $backupPath -Force
        Write-Host "  备份已创建: $(Split-Path $backupPath -Leaf)" -ForegroundColor Gray
        return $backupPath
    }
    return $null
}

# 同步函数
function Sync-File {
    param($source, $target)
    
    if (Test-Path $source) {
        # 检查文件是否不同
        $sourceHash = Get-FileHash $source -Algorithm MD5
        $targetHash = $null
        if (Test-Path $target) {
            $targetHash = Get-FileHash $target -Algorithm MD5
        }
        
        if ($targetHash -eq $null -or $sourceHash.Hash -ne $targetHash.Hash) {
            # 备份目标文件
            $backup = Backup-File $target
            
            # 复制文件
            Copy-Item $source $target -Force
            Write-Host "✓ 已同步: $(Split-Path $target -Leaf)" -ForegroundColor Green
            
            # 显示变更统计
            if ($backup -ne $null) {
                $sourceLines = (Get-Content $source | Measure-Object -Line).Lines
                $targetLines = (Get-Content $backup | Measure-Object -Line).Lines
                $diff = $sourceLines - $targetLines
                if ($diff -gt 0) {
                    Write-Host "  增加了 $diff 行" -ForegroundColor Yellow
                } elseif ($diff -lt 0) {
                    Write-Host "  减少了 $([Math]::Abs($diff)) 行" -ForegroundColor Yellow
                }
            }
            return $true
        } else {
            Write-Host "○ 已是最新: $(Split-Path $target -Leaf)" -ForegroundColor Gray
            return $false
        }
    } else {
        Write-Host "✗ 源文件不存在: $source" -ForegroundColor Red
        return $false
    }
}

# 同步 automation 子目录
Write-Host "`n同步 automation 子目录..." -ForegroundColor Cyan

# 检查并同步 automation 子目录
$automationDirs = @(
    "automation\code-generator.js",
    "automation\control-panel.js", 
    "automation\execution-logic.js",
    "automation\template-manager.js",
    "automation\validation-manager.js"
)

foreach ($subFile in $automationDirs) {
    $src = Join-Path $sourceBase "js\$subFile"
    $dst = Join-Path $targetBase "js\$subFile"
    
    # 确保目标目录存在
    $dstDir = Split-Path $dst -Parent
    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        Write-Host "创建目录: $dstDir" -ForegroundColor Yellow
    }
    
    if (Test-Path $src) {
        Sync-File $src $dst
    }
}

# 同步 questionnaire-logic 子目录
Write-Host "`n同步 questionnaire-logic 子目录..." -ForegroundColor Cyan

$questionnaireFiles = Get-ChildItem "$sourceBase\js\automation\questionnaire-logic" -Filter "*.js" -ErrorAction SilentlyContinue

if ($questionnaireFiles) {
    foreach ($file in $questionnaireFiles) {
        $src = $file.FullName
        $relativePath = $file.FullName.Replace("$sourceBase\js\", "")
        $dst = Join-Path $targetBase "js\$relativePath"
        
        # 确保目标目录存在
        $dstDir = Split-Path $dst -Parent
        if (-not (Test-Path $dstDir)) {
            New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
            Write-Host "创建目录: $dstDir" -ForegroundColor Yellow
        }
        
        Sync-File $src $dst
    }
}

# 同步主要文件
Write-Host "`n同步主要文件..." -ForegroundColor Cyan

$syncedCount = 0
$skippedCount = 0

foreach ($file in $filesToSync) {
    $src = Join-Path $sourceBase $file.src
    $dst = Join-Path $targetBase $file.dst
    
    if (Sync-File $src $dst) {
        $syncedCount++
    } else {
        $skippedCount++
    }
}

# API Worker 相关文件（仅存在于 public/automation）
Write-Host "`n检查 API Worker 文件..." -ForegroundColor Cyan

$apiWorkerFiles = @(
    "api-worker.js",
    "api-worker-bridge.js", 
    "api-worker-scheduler.js"
)

foreach ($apiFile in $apiWorkerFiles) {
    $src = "$sourceBase\js\$apiFile"
    if (Test-Path $src) {
        Write-Host "○ API Worker 文件: $apiFile (仅在 /public/automation 中)" -ForegroundColor Gray
    }
}

# 显示总结
Write-Host "`n========== 同步完成 ==========" -ForegroundColor Green
Write-Host "同步文件数: $syncedCount" -ForegroundColor Yellow
Write-Host "跳过文件数: $skippedCount" -ForegroundColor Gray

# 检查是否需要特殊处理
Write-Host "`n检查特殊配置..." -ForegroundColor Cyan

# 检查 API 端点配置
$configFile = Join-Path $targetBase "js\config.js"
if (Test-Path $configFile) {
    $configContent = Get-Content $configFile -Raw
    if ($configContent -match "API_BASE_URL") {
        Write-Host "✓ API 配置已存在" -ForegroundColor Green
    }
}

Write-Host "`n提示:" -ForegroundColor Yellow
Write-Host "1. 已创建备份文件，如需恢复请查看 .backup_* 文件" -ForegroundColor Gray
Write-Host "2. API Worker 文件保留在 /public/automation 中" -ForegroundColor Gray
Write-Host "3. 建议测试 /html 目录中的功能是否正常" -ForegroundColor Gray
