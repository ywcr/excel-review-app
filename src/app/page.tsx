"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import FileUpload from "@/components/FileUpload";
import TaskSelector from "@/components/TaskSelector";
import ValidationRequirements from "@/components/ValidationRequirements";
import ValidationResults from "@/components/ValidationResults";
import FrontendSheetSelector from "@/components/FrontendSheetSelector";
import { findMatchingSheet } from "@/lib/sheetMatcher";
import UserMenu from "@/components/UserMenu";
import DebugLogViewer from "@/components/DebugLogViewer";
import { useFrontendValidation } from "@/hooks/useFrontendValidation";
import { useAuth } from "@/hooks/useAuth";
// import { useSessionKeepAlive } from "@/hooks/useSessionKeepAlive"; // 移除会话保持机制
import { getAvailableTasks } from "@/lib/validationRules";
import {
  AnimationProvider,
  GentleGradientBackground,
  WarmButton,
  WarmProgressBar,
  SuccessAnimation,
} from "@/components/LightweightAnimations";
import BaiduResults from "@/components/BaiduResults";
import Skin2Replica from "@/components/Skin2Replica";
import BaiduSkinOverlay from "@/components/BaiduSkinOverlay";
import {
  skin2HomeCssLinks,
  skin2HomeInlineStyles,
  skin2HomeBodyHtml,
} from "@/constants/skin2HomeSnapshot";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";
import * as XLSX from "xlsx";

function HomeContent() {
  const {
    user,
    isLoading: authLoading,
    isAuthenticated,
    ensureAuthenticated,
  } = useAuth();
  const availableTasks = getAvailableTasks();
  const [selectedTask, setSelectedTask] = useState<string>(
    availableTasks[0] || ""
  );
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showSheetSelector, setShowSheetSelector] = useState(false);
  const [includeImageValidation, setIncludeImageValidation] = useState(true);
  const [enableWatermarkDetection, setEnableWatermarkDetection] =
    useState(false); // 水印检测默认关闭
  const [skin, setSkin] = useState<"classic" | "baidu">(() => {
    if (typeof window === "undefined") return "classic";
    const stored = window.localStorage.getItem("excel-review-skin");
    return stored === "baidu" ? "baidu" : "classic";
  });
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  // 审核运行批次与导出状态
  const [runId, setRunId] = useState(0);
  const [completedRunId, setCompletedRunId] = useState<number | null>(null);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [reportName, setReportName] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  // 每个运行批次仅显示一次“审核完成”动画
  const [successShownRunId, setSuccessShownRunId] = useState<number | null>(
    null
  );

  // 性能监控和动画控制
  const { updateMetrics, isAnimationEnabled } = usePerformanceMode();

  // 前端验证hook - 必须在条件渲染之前调用
  const {
    isValidating,
    progress,
    result,
    error,
    debugLogs,
    validateExcel,
    cancelValidation,
    clearResult,
    clearDebugLogs,
  } = useFrontendValidation();

  // 移除会话保持机制 - 持久化会话管理
  // 不再需要在验证过程中自动刷新令牌，持久化会话将保持稳定
  // const { startKeepAlive, stopKeepAlive } = useSessionKeepAlive({
  //   enabled: isValidating,
  //   refreshInterval: 5 * 60 * 1000, // 5分钟刷新一次
  //   extendedKeepAliveTime: 10 * 60 * 1000, // 验证结束后延续10分钟
  //   onTaskStart: () => console.log("Excel验证开始，启动会话保持"),
  //   onTaskEnd: () => console.log("Excel验证结束，延续会话保持10分钟"),
  // });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("excel-review-skin", skin);
    }
  }, [skin]);

  // 监听验证结果：只有在“真正完成”（非中间态）时显示“审核完成”提示；是否有问题不影响提示
  useEffect(() => {
    if (!result || isValidating) return;

    // 中间态：需要选择工作表，不算完成
    if ((result as any).needSheetSelection) return;

    const structErrors = (result.errors || []) as any[];
    const hasStructIssues = structErrors.length > 0;

    // 更全面地检测图片问题（重复、模糊、尺寸异常、低像素、疑似网图）
    const imgList = result.imageValidation?.results ?? [];
    const ivSummary = result.imageValidation || ({} as any);
    const hasImageIssues = (() => {
      // 先看汇总统计
      if (
        typeof ivSummary.blurryImages === "number" &&
        ivSummary.blurryImages > 0
      )
        return true;
      if (
        typeof ivSummary.duplicateGroups === "number" &&
        ivSummary.duplicateGroups > 0
      )
        return true;
      // 再看逐项标记
      return imgList.some(
        (img: any) =>
          (img.duplicates?.length ?? 0) > 0 ||
          img.isBlurry === true ||
          img.dimensionOK === false ||
          img.isLowPixel === true ||
          (typeof img.webLikelihood === "number" && img.webLikelihood >= 0.6)
      );
    })();

    const hasIssues = hasStructIssues || hasImageIssues;

    // 审核流程已结束（非中间态）——显示一次“审核完成”动画（无论是否存在问题）
    if (successShownRunId !== runId) {
      setShowSuccessAnimation(true);
      setSuccessShownRunId(runId);
    }

    // 有问题：构建报告（仅一次），不自动下载
    if (hasIssues && completedRunId !== runId) {
      try {
        const { blob, filename } = buildValidationIssuesBlob();
        if (blob) {
          if (reportUrl) URL.revokeObjectURL(reportUrl);
          const url = URL.createObjectURL(blob);
          setReportUrl(url);
          setReportName(filename);
        }
      } catch (e) {
        console.error("Build report failed:", e);
      } finally {
        setCompletedRunId(runId);
      }
    }
  }, [result, isValidating, runId, successShownRunId]);

  // 处理需要选择工作表的情况 - 使用智能匹配
  useEffect(() => {
    if (
      result?.needSheetSelection &&
      !showSheetSelector &&
      result.availableSheets
    ) {
      // 尝试智能匹配
      const matchResult = findMatchingSheet(
        selectedTask,
        result.availableSheets
      );

      console.log(`🎯 智能工作表匹配: ${matchResult.message}`);

      // 如果找到唯一匹配（精确或模糊），自动选择
      if (
        (matchResult.type === "exact" || matchResult.type === "single") &&
        matchResult.matchedSheets.length === 1
      ) {
        console.log(`✅ 自动选择工作表: "${matchResult.matchedSheets[0]}"`);
        // 自动触发验证，不显示选择器
        const autoSelectSheet = async () => {
          setShowSheetSelector(false);
          setRunId((id) => id + 1);
          setCompletedRunId(null);
          if (reportUrl) {
            try {
              URL.revokeObjectURL(reportUrl);
            } catch {}
          }
          setReportUrl(null);
          setReportName(null);

          if (!uploadedFile || !selectedTask) return;

          const isAuthValid = await ensureAuthenticated();
          if (!isAuthValid) {
            setLocalError("登录状态已过期，请重新登录");
            return;
          }

          try {
            const useImageValidation =
              skin === "baidu" ? true : includeImageValidation;
            await validateExcel(
              uploadedFile,
              selectedTask,
              matchResult.matchedSheets[0],
              useImageValidation,
              enableWatermarkDetection
            );
          } catch (err) {
            console.error("Validation with selected sheet failed:", err);
          }
        };
        autoSelectSheet();
      } else {
        // 多个匹配或无匹配，显示选择器让用户手动选择
        console.log(`⚠️ 需要用户手动选择工作表`);
        setShowSheetSelector(true);
      }
    }
  }, [
    result?.needSheetSelection,
    showSheetSelector,
    selectedTask,
    result?.availableSheets,
  ]);

  const isBaiduSkin = skin === "baidu";

  // 如果正在加载认证状态，显示加载界面
  if (authLoading) {
    return (
      <GentleGradientBackground className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在验证登录状态...</p>
        </div>
      </GentleGradientBackground>
    );
  }

  // 如果未认证，这个组件不应该渲染（中间件会重定向）
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleFileUpload = (file: File) => {
    // Check file type
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setLocalError("请选择Excel文件 (.xlsx 或 .xls)");
      return;
    }

    // Check file size and show warning for large files
    const fileSizeMB = file.size / (1024 * 1024);
    const fileSizeGB = fileSizeMB / 1024;
    if (fileSizeMB > 3072) {
      // 3GB 限制
      setLocalError(
        `文件过大 (${fileSizeGB.toFixed(
          2
        )}GB)。系统支持最大3GB文件，请分割文件后重试。`
      );
      return;
    } else if (fileSizeMB > 2000) {
      // 2-3GB: 超大文件警告
      setLocalError(
        `检测到超大文件 (${fileSizeGB.toFixed(
          2
        )}GB)。处理可能需要10-30分钟，请确保浏览器保持运行。`
      );
      // Clear error after 8 seconds to allow processing
      setTimeout(() => setLocalError(null), 8000);
    } else if (fileSizeMB > 1000) {
      // 1-2GB: 大文件警告
      setLocalError(
        `检测到大文件 (${fileSizeGB.toFixed(
          2
        )}GB)。处理可能需要5-15分钟，请耐心等待。`
      );
      // Clear error after 5 seconds to allow processing
      setTimeout(() => setLocalError(null), 5000);
    } else if (fileSizeMB > 100) {
      setLocalError(
        `检测到较大文件 (${fileSizeMB.toFixed(
          0
        )}MB)。处理可能需要1-5分钟，请耐心等待。`
      );
      // Clear error after 3 seconds to allow processing
      setTimeout(() => setLocalError(null), 3000);
    }

    // 如果已有上传的文件，先触发重新上传逻辑
    if (uploadedFile) {
      setUploadedFile(null);
      clearResult();
      // 使用setTimeout确保状态更新完成后再设置新文件
      setTimeout(() => {
        setUploadedFile(file);
        clearResult();
      }, 0);
    } else {
      setUploadedFile(file);
      clearResult();
    }
  };

  const handleValidate = async () => {
    if (!uploadedFile || !selectedTask) return;
    // 启动新一轮审核：清除上一次报告
    setRunId((id) => id + 1);
    setCompletedRunId(null);
    if (reportUrl) {
      try {
        URL.revokeObjectURL(reportUrl);
      } catch {}
    }
    setReportUrl(null);
    setReportName(null);

    // 验证前检查登录状态
    const isAuthValid = await ensureAuthenticated();
    if (!isAuthValid) {
      setLocalError("登录状态已过期，请重新登录");
      return;
    }

    try {
      // 更新性能指标 - 开始处理
      const useImageValidation = isBaiduSkin ? true : includeImageValidation;
      updateMetrics({
        isProcessing: true,
        imageCount: useImageValidation ? 100 : 0,
      });

      // 传递图片验证选项到validateExcel
      await validateExcel(
        uploadedFile,
        selectedTask,
        undefined,
        useImageValidation,
        enableWatermarkDetection // 传递水印检测开关
      );

      // 验证完成 - 更新性能指标
      updateMetrics({ isProcessing: false });

      // 验证完成后添加到历史记录
      // 注意：这里需要等待result更新，所以我们在useEffect中处理
    } catch (err) {
      console.error("Validation failed:", err);
      updateMetrics({ isProcessing: false });
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    setShowSheetSelector(false);
    // 新一轮：清理报告
    setRunId((id) => id + 1);
    setCompletedRunId(null);
    if (reportUrl) {
      try {
        URL.revokeObjectURL(reportUrl);
      } catch {}
    }
    setReportUrl(null);
    setReportName(null);

    if (!uploadedFile || !selectedTask) return;

    // 验证前检查登录状态
    const isAuthValid = await ensureAuthenticated();
    if (!isAuthValid) {
      setLocalError("登录状态已过期，请重新登录");
      return;
    }

    try {
      const useImageValidation = isBaiduSkin ? true : includeImageValidation;
      await validateExcel(
        uploadedFile,
        selectedTask,
        sheetName,
        useImageValidation,
        enableWatermarkDetection // 传递水印检测开关
      );
    } catch (err) {
      console.error("Validation with selected sheet failed:", err);
    }
  };

  const handleSheetSelectorCancel = () => {
    setShowSheetSelector(false);
    // 清理验证状态
    clearResult();
    // 取消任何正在进行的验证
    if (isValidating) {
      cancelValidation();
    }
  };

  // 转换验证结果格式以兼容ValidationResults组件
  const convertedValidationResult = result
    ? {
        success: true,
        fileName: uploadedFile?.name || "",
        taskName: selectedTask,
        validation: {
          isValid: result.isValid,
          errors: (result.errors || []).map((error) => ({
            sheet: "Sheet1", // 前端验证暂时使用固定sheet名
            row: error.row,
            column: error.column,
            field: error.field,
            errorType: error.errorType,
            message: error.message,
            value: error.value,
          })),
          summary: result.summary || {
            totalRows: 0,
            validRows: 0,
            errorCount: 0,
          },
          imageValidation: result.imageValidation,
          headerValidation: result.headerValidation,
        },
      }
    : null;

  const baiduNavLinks: string[] = [
    "新闻",
    "hao123",
    "地图",
    "视频",
    "图片",
    "网盘",
    "文库",
    "AI+",
  ];

  const baiduAiTabs: string[] = [
    "百度AI+",
    "AI助手已支持DeepSeek",
    "AI写作",
    "生成视频",
    "AI编程",
    "AI阅读",
  ];

  const baiduHotList: string[] = [
    "总书记心中‘很有意义’的一个事业",
    "刘备物资荐考辨军成大学校长",
    "尹锡悦密耳鼓出度要事 发软化白",
    "这是我们的新疆！",
    "这网友搞笑玩一天像上了十个班",
    "美防长要求被百年后为将领导聚焦总结",
    "净网：跑马机作影响成果产",
    "女子租房6年房东多次主动降租",
  ];

  const baiduCommonTools: string[] = [
    "Excel 模板下载",
    "图片批量清理",
    "任务切换",
    "历史审核",
  ];

  const baiduFooterLinks: string[] = [
    "关于 Baidu",
    "使用百家号前必读",
    "帮助中心",
    "企业推广",
    "京公网安备11000000000001号",
  ];

  const renderProgressBar = () =>
    progress ? (
      <div className="mt-4">
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${Math.min(progress?.progress ?? 0, 100)}%` }}
          ></div>
        </div>
        {progress?.message && (
          <div className="text-xs text-gray-500 mt-2 text-center">
            {progress.message}
          </div>
        )}
      </div>
    ) : null;

  const renderClassicLayout = () => (
    <GentleGradientBackground className="min-h-screen py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Excel 审核系统 - 前端解析版 🚀
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              上传 Excel 文件，自动完成结构与图片审核
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <UserMenu
              isBaiduSkin={false}
              onSwitchSkin={(skin) => setSkin(skin as any)}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <TaskSelector
                tasks={availableTasks}
                selectedTask={selectedTask}
                onTaskChange={(task) => {
                  setSelectedTask(task);
                  clearResult();
                }}
              />
            </div>
            <div>
              <FileUpload
                onFileUpload={handleFileUpload}
                uploadedFile={uploadedFile}
                isLoading={isValidating}
              />
            </div>
          </div>

          {uploadedFile && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-800 font-medium">
                    已上传文件：{uploadedFile.name}
                  </p>
                  <p className="text-blue-600 text-sm">
                    文件大小：{(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    clearResult();
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  重新上传
                </button>
              </div>
            </div>
          )}

          {uploadedFile && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                验证选项
              </h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeImageValidation}
                    onChange={(e) =>
                      setIncludeImageValidation(e.target.checked)
                    }
                    className="mr-3 text-blue-600"
                  />
                  <span className="text-gray-700 text-sm">
                    包含图片验证（清晰度检测和重复检测）
                  </span>
                </label>

                {includeImageValidation && (
                  <label className="flex items-center ml-6">
                    <input
                      type="checkbox"
                      checked={enableWatermarkDetection}
                      onChange={(e) =>
                        setEnableWatermarkDetection(e.target.checked)
                      }
                      className="mr-3 text-purple-600"
                    />
                    <span className="text-gray-700 text-sm">
                      启用水印检测 🔍
                      <span className="text-gray-500 ml-1">
                        (实验性功能，可能增加检测时间)
                      </span>
                    </span>
                  </label>
                )}
              </div>
            </div>
          )}

          {uploadedFile && (
            <div className="mt-6 text-center flex flex-col items-center space-y-3">
              <WarmButton
                onClick={() => handleValidate()}
                disabled={!selectedTask || isValidating}
                variant="primary"
                className="inline-flex items-center px-6 py-3 text-base font-medium"
              >
                {isValidating ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    验证中...
                  </>
                ) : (
                  "开始审核 ✨"
                )}
              </WarmButton>
              {isValidating && (
                <button
                  onClick={cancelValidation}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  取消
                </button>
              )}
            </div>
          )}
        </div>

        {progress && (
          <div className="mb-6">
            <div className="bg-white border border-pink-200 rounded-lg p-6 shadow-sm">
              <WarmProgressBar
                progress={progress.progress}
                message={progress.message || ""}
              />
            </div>
          </div>
        )}

        {(error || localError) && (
          <div className="mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-400 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">验证失败</h3>
                  <p className="text-sm text-red-700 mt-1">
                    {error || localError}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTask && (
          <ValidationRequirements
            taskName={selectedTask}
            validationResult={convertedValidationResult}
          />
        )}

        {convertedValidationResult && (
          <ValidationResults
            result={convertedValidationResult}
            onExportErrors={async () => {
              try {
                setIsExporting(true);
                const { blob, filename } = buildValidationIssuesBlob();
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = filename || "验证问题.xlsx";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 0);
                }
              } finally {
                setIsExporting(false);
              }
            }}
            isExporting={isExporting}
          />
        )}

        {showSheetSelector && result?.availableSheets && (
          <FrontendSheetSelector
            availableSheets={result.availableSheets}
            onSheetSelect={handleSheetSelect}
            onCancel={handleSheetSelectorCancel}
            taskName={selectedTask}
          />
        )}

        <SuccessAnimation
          show={showSuccessAnimation}
          message="审核完成！✨"
          onComplete={() => setShowSuccessAnimation(false)}
        />

        <DebugLogViewer
          logs={debugLogs}
          onClear={clearDebugLogs}
          isVisible={showDebugLogs}
          onToggle={() => setShowDebugLogs(!showDebugLogs)}
        />
      </div>
    </GentleGradientBackground>
  );

  const renderBaiduLayout = () => {
    // 不再切换到结果页：始终显示首页外观
    return (
      <div className="min-h-screen bg-white relative">
        <Skin2Replica
          key="home"
          bodyHtml={skin2HomeBodyHtml}
          cssLinks={skin2HomeCssLinks}
          inlineStyles={skin2HomeInlineStyles}
        />

        {/* Sheet 选择器（与原皮肤保持一致） */}
        {showSheetSelector && result?.availableSheets && (
          <div className="mt-4">
            <FrontendSheetSelector
              availableSheets={result.availableSheets}
              onSheetSelect={handleSheetSelect}
              onCancel={handleSheetSelectorCancel}
              taskName={selectedTask}
            />
          </div>
        )}

        {/* 任务选择器弹层（百度皮肤） */}
        {showTaskPicker && (
          <div className="fixed inset-0 z-[2147483648] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/20"
              onClick={() => setShowTaskPicker(false)}
            />
            <div className="relative bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-[360px]">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-800">
                  选择任务类型
                </h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowTaskPicker(false)}
                >
                  ✕
                </button>
              </div>
              <div className="max-h-[300px] overflow-auto">
                <TaskSelector
                  tasks={availableTasks}
                  selectedTask={selectedTask}
                  onTaskChange={(task) => {
                    setSelectedTask(task);
                    setShowTaskPicker(false);
                    clearResult();
                  }}
                  compact
                />
              </div>
            </div>
          </div>
        )}

        {/* 叠加交互层 */}
        <BaiduSkinOverlay
          onFileSelected={handleFileUpload}
          onStartValidate={handleValidate}
          progressPercent={progress?.progress ?? 0}
          progressText={progress?.message || null}
          isLoggedIn={Boolean(isAuthenticated && user)}
          fileName={uploadedFile?.name || null}
          isBaiduSkin={true}
          onSwitchSkin={(skin) => setSkin(skin as any)}
          isDownloadAvailable={Boolean(reportUrl)}
          onDownloadReport={() => {
            if (!reportUrl) return;
            const a = document.createElement("a");
            a.href = reportUrl;
            a.download = reportName || "审核问题.xlsx";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
          onOpenTaskSelector={() => setShowTaskPicker(true)}
          selectedTask={selectedTask}
          isRunCompleted={
            Boolean(result) &&
            !isValidating &&
            !(result as any)?.needSheetSelection
          }
        />
      </div>
    );
  };

  // 导出到 Excel（未通过时自动下载）
  // 构建问题Excel（不直接下载），返回 { blob, filename }
  const buildValidationIssuesBlob = (): {
    blob: Blob | null;
    filename: string;
  } => {
    if (!result) return { blob: null, filename: "" };

    // 结构问题：仅保留 单元格/问题类型/问题说明/当前值
    const typeLabel: Record<string, string> = {
      required: "必填项缺失",
      enum: "类型不符",
      timeRange: "时间范围错误",
      duration: "时长不符",
      dateInterval: "日期间隔冲突",
      frequency: "频次超限",
      unique: "重复值",
      structure: "结构错误",
      dateFormat: "日期格式错误",
      prohibitedContent: "禁用内容",
    };
    const structHeader = ["单元格", "问题类型", "问题说明", "当前值"];
    const structAOA: any[][] = [structHeader];
    const structErrors = result.errors || [];
    if (structErrors.length === 0) {
      structAOA.push(["", "", "无结构问题", ""]);
    } else {
      for (const e of structErrors) {
        const col = e.column ?? "";
        const row = e.row ?? "";
        const cell = col && row ? `${col}${row}` : "";
        structAOA.push([
          cell,
          typeLabel[e.errorType] || e.errorType || "",
          e.message ?? "",
          e.value !== undefined ? String(e.value) : "",
        ]);
      }
    }
    const wsStruct = XLSX.utils.aoa_to_sheet(structAOA);
    wsStruct["!cols"] = [
      { wch: 10 }, // 单元格
      { wch: 14 }, // 问题类型
      { wch: 40 }, // 问题说明
      { wch: 20 }, // 当前值
    ];

    // 图片问题：导出“重复/模糊/尺寸异常/低像素/疑似网图”等标签，代表项+重复位置列表
    const imgHeader = ["位置", "问题标签", "说明"];
    const imgAOA: any[][] = [imgHeader];
    const rawList = result.imageValidation?.results ?? [];

    // 去重：按代表项输出（带重复位置列表），非重复保留原项
    const dedupResults = (() => {
      const processed: any[] = [];
      const processedIds = new Set<string>();
      for (const res of rawList) {
        if (processedIds.has(res.id)) continue;
        const dupCount = res.duplicates?.length ?? 0;
        if (dupCount > 0) {
          const duplicateIds = [
            res.id,
            ...((res.duplicates || [])
              .map((d: any) => (typeof d === "string" ? d : d?.id))
              .filter(Boolean) as string[]),
          ];
          const duplicateResults = rawList.filter((r) =>
            duplicateIds.includes(r.id)
          );
          const representative = duplicateResults.sort((a, b) => {
            const aRow = a.row ?? 999999;
            const bRow = b.row ?? 999999;
            if (aRow !== bRow) return aRow - bRow;
            const aCol = a.column ?? "ZZ";
            const bCol = b.column ?? "ZZ";
            return aCol.localeCompare(bCol);
          })[0];
          const allDuplicates = duplicateResults
            .filter((r) => r.id !== representative.id)
            .map((r) => ({
              id: r.id,
              position: r.position,
              row: r.row,
              column: r.column,
            }));
          const repCopy = { ...representative, duplicates: allDuplicates };
          processed.push(repCopy);
          duplicateIds.forEach((id) => processedIds.add(id));
        } else {
          processed.push(res);
          processedIds.add(res.id);
        }
      }
      return processed;
    })();

    // 排序：重复 > 模糊 > 疑似网图 > 尺寸异常 > 低像素 > 位置
    const sorted = dedupResults.sort((a: any, b: any) => {
      const aHasDuplicates = (a.duplicates?.length ?? 0) > 0;
      const bHasDuplicates = (b.duplicates?.length ?? 0) > 0;
      if (aHasDuplicates && !bHasDuplicates) return -1;
      if (!aHasDuplicates && bHasDuplicates) return 1;
      const aBlur = !!a.isBlurry;
      const bBlur = !!b.isBlurry;
      if (aBlur && !bBlur) return -1;
      if (!aBlur && bBlur) return 1;
      const aWeb =
        typeof a.webLikelihood === "number" && a.webLikelihood >= 0.6;
      const bWeb =
        typeof b.webLikelihood === "number" && b.webLikelihood >= 0.6;
      if (aWeb && !bWeb) return -1;
      if (!aWeb && bWeb) return 1;
      const aDimBad = a.dimensionOK === false;
      const bDimBad = b.dimensionOK === false;
      if (aDimBad && !bDimBad) return -1;
      if (!aDimBad && bDimBad) return 1;
      const aLowPixel = !!a.isLowPixel;
      const bLowPixel = !!b.isLowPixel;
      if (aLowPixel && !bLowPixel) return -1;
      if (!aLowPixel && bLowPixel) return 1;
      const aRow = a.row ?? 999999;
      const bRow = b.row ?? 999999;
      if (aRow !== bRow) return aRow - bRow;
      const aCol = a.column ?? "ZZ";
      const bCol = b.column ?? "ZZ";
      return aCol.localeCompare(bCol);
    });

    let imgIssueCount = 0;
    for (const img of sorted) {
      const labels: string[] = [];
      const dupCount = img.duplicates?.length ?? 0;
      if (dupCount > 0) labels.push(`重复${dupCount + 1}张`);
      if (img.isBlurry) labels.push("模糊");
      if (img.dimensionOK === false) labels.push("尺寸异常");
      if (img.isLowPixel) labels.push("低像素");
      if (typeof img.webLikelihood === "number" && img.webLikelihood >= 0.6)
        labels.push("疑似网图");

      // 仅导出有问题的图片
      if (labels.length === 0) continue;

      imgIssueCount++;
      const basePos = img.position || `${img.column ?? ""}${img.row ?? ""}`;

      // 说明：重复位置 + 网图原因
      const parts: string[] = [];
      if (dupCount > 0) {
        const dupPositions = (img.duplicates || [])
          .map((d: any) =>
            typeof d === "string"
              ? d
              : d?.position || `${d?.column ?? ""}${d?.row ?? ""}`
          )
          .filter(Boolean);
        if (dupPositions.length)
          parts.push(`重复位置：${dupPositions.join("，")}`);
      }
      if (
        typeof img.webLikelihood === "number" &&
        img.webLikelihood >= 0.6 &&
        (img.webReasons?.length ?? 0) > 0
      ) {
        parts.push(`网图原因：${img.webReasons!.join("；")}`);
      }

      imgAOA.push([basePos || "", labels.join("；"), parts.join("；")]);
    }

    if (imgIssueCount === 0) {
      imgAOA.push(["", "无图片问题", ""]);
    }

    const wsImg = XLSX.utils.aoa_to_sheet(imgAOA);
    wsImg["!cols"] = [
      { wch: 14 }, // 位置
      { wch: 20 }, // 问题标签（重复N张）
      { wch: 40 }, // 说明（重复位置列表）
    ];

    // 组装工作簿（仅两张表）
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsStruct, "结构问题");
    XLSX.utils.book_append_sheet(wb, wsImg, "图片问题");

    // 返回 blob 与文件名
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    // 本地时间 + 任务类型命名（替换原“审核问题”）
    const sanitize = (s: string) =>
      (s || "")
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
    const base = sanitize(
      (uploadedFile?.name || "excel").replace(/\.[^.]+$/, "")
    );
    const typeSegment = sanitize(selectedTask || "审核问题");
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    // 使用全角冒号“：”分隔时分秒，兼顾 Windows 文件名合法性
    const timeStr = `${pad(now.getHours())}：${pad(now.getMinutes())}：${pad(
      now.getSeconds()
    )}`;
    const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}-${timeStr}`;
    const filename = `${base}_${typeSegment}_${ts}.xlsx`;
    return { blob, filename };
  };

  return isBaiduSkin ? renderBaiduLayout() : renderClassicLayout();
}

// 导出包装了动画提供者的主组件
export default function Home() {
  return (
    <AnimationProvider>
      <HomeContent />
    </AnimationProvider>
  );
}
