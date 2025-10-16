@echo off
REM 服装季节检测API启动脚本 (Windows)

echo ============================================
echo   启动服装季节检测API服务
echo ============================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Python未安装或不在PATH中
    echo 请先安装Python 3.8+
    pause
    exit /b 1
)

echo [1/3] 检查依赖...
python -c "import fastapi, uvicorn" >nul 2>&1
if errorlevel 1 (
    echo [提示] 缺少依赖，正在安装...
    pip install fastapi uvicorn python-multipart opencv-python ultralytics pillow numpy -i https://pypi.tuna.tsinghua.edu.cn/simple
    if errorlevel 1 (
        echo [错误] 依赖安装失败
        pause
        exit /b 1
    )
)

echo [2/3] 检查YOLO模型...
if not exist "yolov8n.pt" (
    echo [提示] YOLOv8模型不存在，首次运行时会自动下载
)

echo [3/3] 启动API服务...
echo.
echo ============================================
echo   服务地址: http://localhost:8000
echo   API文档: http://localhost:8000/docs
echo   按 Ctrl+C 停止服务
echo ============================================
echo.

cd /d "%~dp0"
python api\clothing_season_api.py

pause
