# 水印数据集生成 - 快速启动脚本
# 适用于 Windows PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  水印数据集生成工具 - 快速启动" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Python
Write-Host "[1/5] 检查 Python 环境..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Python 已安装: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "❌ 未找到 Python，请先安装 Python 3.7+" -ForegroundColor Red
    exit 1
}

# 检查依赖
Write-Host ""
Write-Host "[2/5] 检查 Python 依赖..." -ForegroundColor Yellow
$packages = @("pillow", "requests")
$missingPackages = @()

foreach ($pkg in $packages) {
    $check = python -c "import $($pkg.Replace('-', '_'))" 2>&1
    if ($LASTEXITCODE -ne 0) {
        $missingPackages += $pkg
    }
}

if ($missingPackages.Count -gt 0) {
    Write-Host "⚠️  缺少依赖: $($missingPackages -join ', ')" -ForegroundColor Yellow
    Write-Host "正在安装..." -ForegroundColor Yellow
    pip install $missingPackages
} else {
    Write-Host "✅ 所有依赖已安装" -ForegroundColor Green
}

# 创建目录结构
Write-Host ""
Write-Host "[3/5] 创建目录结构..." -ForegroundColor Yellow
$directories = @(
    "..\dataset\source",
    "..\dataset\watermarked",
    "..\dataset\scraped"
)

foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ 创建目录: $dir" -ForegroundColor Green
    }
}

# 检查源图片
Write-Host ""
Write-Host "[4/5] 检查源图片..." -ForegroundColor Yellow
$sourceImages = Get-ChildItem -Path "..\dataset\source" -Include @("*.jpg", "*.jpeg", "*.png", "*.bmp") -Recurse
$imageCount = $sourceImages.Count

if ($imageCount -eq 0) {
    Write-Host "⚠️  未找到源图片" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请选择操作:" -ForegroundColor Cyan
    Write-Host "  1) 手动添加图片到 dataset/source/ 目录" -ForegroundColor White
    Write-Host "  2) 下载测试样本图片（需要网络）" -ForegroundColor White
    Write-Host "  3) 退出" -ForegroundColor White
    Write-Host ""
    
    $choice = Read-Host "请输入选择 (1-3)"
    
    switch ($choice) {
        "1" {
            Write-Host ""
            Write-Host "请将图片放入以下目录后重新运行此脚本:" -ForegroundColor Yellow
            Write-Host "  $(Resolve-Path '..\dataset\source')" -ForegroundColor White
            Write-Host ""
            Write-Host "按任意键退出..."
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            exit 0
        }
        "2" {
            Write-Host ""
            Write-Host "开始下载测试样本..." -ForegroundColor Yellow
            python generate_watermarks.py --download --source ..\dataset\source
            
            # 重新检查
            $sourceImages = Get-ChildItem -Path "..\dataset\source" -Include @("*.jpg", "*.jpeg", "*.png", "*.bmp") -Recurse
            $imageCount = $sourceImages.Count
            
            if ($imageCount -eq 0) {
                Write-Host "❌ 下载失败，请检查网络连接" -ForegroundColor Red
                exit 1
            }
        }
        default {
            exit 0
        }
    }
}

Write-Host "✅ 找到 $imageCount 张源图片" -ForegroundColor Green

# 生成水印
Write-Host ""
Write-Host "[5/5] 生成水印图片..." -ForegroundColor Yellow
Write-Host "目标平台: 高德、百度、小红书、抖音、微博" -ForegroundColor White
Write-Host ""

python generate_watermarks.py --source ..\dataset\source --output ..\dataset\watermarked

# 统计结果
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$watermarkedImages = Get-ChildItem -Path "..\dataset\watermarked" -Include @("*.jpg", "*.jpeg", "*.png") -Recurse
$watermarkedCount = $watermarkedImages.Count

Write-Host "📊 统计信息:" -ForegroundColor Yellow
Write-Host "  源图片数量: $imageCount" -ForegroundColor White
Write-Host "  生成水印图片: $watermarkedCount" -ForegroundColor White
Write-Host ""
Write-Host "📂 输出目录:" -ForegroundColor Yellow
Write-Host "  $(Resolve-Path '..\dataset\watermarked')" -ForegroundColor White
Write-Host ""
Write-Host "🎉 你现在可以使用这些图片训练水印检测模型了！" -ForegroundColor Green
Write-Host ""
Write-Host "📖 更多信息请查看: WATERMARK_DATASET_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
