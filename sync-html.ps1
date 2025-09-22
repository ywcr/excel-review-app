# Sync automation optimizations to /html directory
# Date: 2025-09-22

Write-Host "Starting sync..." -ForegroundColor Green

$source = ".\public\automation"
$target = ".\html"

# Main files
$files = @(
    "js\main.js",
    "js\data-processor.js",
    "js\sheet-selector.js",
    "js\ui-manager.js",
    "js\utils.js",
    "js\config.js",
    "js\automation-generator.js",
    "style.css"
)

# Sync main files
foreach ($file in $files) {
    $src = Join-Path $source $file
    $dst = Join-Path $target $file
    
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "Synced: $file" -ForegroundColor Green
    }
}

# Sync automation subfolder
$automationFiles = @(
    "automation\code-generator.js",
    "automation\control-panel.js",
    "automation\execution-logic.js",
    "automation\template-manager.js",
    "automation\validation-manager.js"
)

foreach ($file in $automationFiles) {
    $src = Join-Path $source "js\$file"
    $dst = Join-Path $target "js\$file"
    
    $dstDir = Split-Path $dst -Parent
    if (-not (Test-Path $dstDir)) {
        New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
    }
    
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "Synced: js\$file" -ForegroundColor Green
    }
}

# Sync questionnaire-logic
$qlSource = "$source\js\automation\questionnaire-logic"
$qlTarget = "$target\js\automation\questionnaire-logic"

if (Test-Path $qlSource) {
    if (-not (Test-Path $qlTarget)) {
        New-Item -ItemType Directory -Path $qlTarget -Force | Out-Null
    }
    
    Get-ChildItem $qlSource -Filter "*.js" | ForEach-Object {
        Copy-Item $_.FullName $qlTarget -Force
        Write-Host "Synced: questionnaire-logic\$($_.Name)" -ForegroundColor Green
    }
}

Write-Host "`nSync completed!" -ForegroundColor Green
Write-Host "Note: API Worker files remain in /public/automation only" -ForegroundColor Yellow