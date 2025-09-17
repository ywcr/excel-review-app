"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Head from "next/head";
import Script from "next/script";

export default function AutomationPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login?redirect=/automation");
        return;
      }

      if (user?.role !== "admin") {
        router.push("/?error=access_denied");
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 检查权限
  if (!isAuthenticated || user?.role !== "admin") {
    return null; // 重定向处理中
  }

  return (
    <>
      <Head>
        <title>精灵蜂统一自动化脚本 - 模块化版</title>
      </Head>

      {/* 引入CSS样式 */}
      <link rel="stylesheet" href="/automation/style.css" />

      <div className="automation-container">
        <div className="container">
          <h1>🤖 精灵蜂统一自动化脚本 - 模块化版</h1>

          {/* API配置区域 */}
          <div className="api-config">
            <div className="api-toggle">
              <div
                className="mode-switch"
                role="group"
                aria-label="选择执行模式"
              >
                <label>
                  <input
                    type="radio"
                    name="execMode"
                    value="dom"
                    defaultChecked
                  />
                  <span>🧩 DOM模式</span>
                </label>
                <label>
                  <input type="radio" name="execMode" value="api" />
                  <span>🚀 API模式</span>
                </label>
              </div>
              <div
                className="api-info"
                id="modeHint"
                style={{ marginTop: "6px" }}
              >
                ✅ DOM模式：通过页面操作实现自动化，更稳定
              </div>
            </div>
          </div>

          {/* 自动化功能配置 */}
          <div className="auto-features">
            <h3>🤖 自动化功能配置</h3>
            <details>
              <summary>⚙️ 高级选项</summary>
              <div className="feature-toggle" style={{ marginTop: "10px" }}>
                <label>
                  <input type="checkbox" id="autoNextDate" defaultChecked />
                  <span>📅 自动切换日期</span>
                </label>
                <div className="feature-info">
                  ✅ 当前日期任务完成后自动切换到下一个日期
                  <br />
                  ⚠️ 关闭后需要手动选择日期
                </div>
              </div>
              <div className="feature-toggle">
                <label>
                  <input
                    type="checkbox"
                    id="autoNextQuestionnaire"
                    defaultChecked
                  />
                  <span>📋 自动切换问卷</span>
                </label>
                <div className="feature-info">
                  ✅ 当前问卷任务完成后自动切换到下一个问卷
                  <br />
                  ⚠️ 关闭后需要手动选择问卷
                </div>
              </div>
              <div className="feature-toggle">
                <label>
                  <input type="checkbox" id="smartRetry" defaultChecked />
                  <span>🔄 智能重试</span>
                </label>
                <div className="feature-info">
                  ✅ 遇到错误时自动重试，提高成功率
                  <br />
                  ⚠️ 关闭后遇到错误将直接停止
                </div>
              </div>
            </details>
          </div>

          {/* 问卷选择器 */}
          <div className="questionnaire-selector">
            <h3>📋 选择问卷类型</h3>
            <div className="questionnaire-types">
              <label className="questionnaire-option">
                <input type="radio" name="questionnaire" value="niujie" />
                <span className="questionnaire-label">🐂 牛解消费者问卷</span>
              </label>
              <label className="questionnaire-option">
                <input type="radio" name="questionnaire" value="zhibai" />
                <span className="questionnaire-label">🌿 知柏消费者问卷</span>
              </label>
              <label className="questionnaire-option">
                <input type="radio" name="questionnaire" value="xihuang" />
                <span className="questionnaire-label">💊 西黄消费者问卷</span>
              </label>
              <label className="questionnaire-option">
                <input type="radio" name="questionnaire" value="tiegao" />
                <span className="questionnaire-label">🩹 贴膏患者问卷</span>
              </label>
            </div>
          </div>

          {/* 文件上传区域 */}
          <div className="file-upload">
            <h3>📁 上传Excel文件</h3>
            <div className="upload-area" id="uploadArea">
              <input
                type="file"
                id="fileInput"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
              />
              <div className="upload-content">
                <div className="upload-icon">📄</div>
                <p>点击选择或拖拽Excel文件到此处</p>
                <p className="upload-hint">支持 .xlsx 和 .xls 格式</p>
              </div>
            </div>
            <div
              id="fileInfo"
              className="file-info"
              style={{ display: "none" }}
            >
              <div className="file-details">
                <span id="fileName"></span>
                <span id="fileSize"></span>
              </div>
              <button id="removeFile" className="remove-btn">
                ✕
              </button>
            </div>
          </div>

          {/* 工作表选择区域 */}
          <div
            id="sheetSelection"
            className="sheet-selection"
            style={{ display: "none" }}
          >
            <h3>📊 选择工作表</h3>
            <div id="sheetList" className="sheet-list"></div>
          </div>

          {/* 控制按钮 */}
          <div className="controls">
            <button id="generateBtn" className="btn primary" disabled>
              🚀 生成自动化脚本
            </button>
            <button
              id="executeBtn"
              className="btn success"
              style={{ display: "none" }}
            >
              ▶️ 执行脚本
            </button>
            <button
              id="stopBtn"
              className="btn danger"
              style={{ display: "none" }}
            >
              ⏹️ 停止执行
            </button>
          </div>

          {/* 进度显示 */}
          <div
            id="progressContainer"
            className="progress-container"
            style={{ display: "none" }}
          >
            <h3>📈 执行进度</h3>
            <div className="progress-bar">
              <div id="progressFill" className="progress-fill"></div>
            </div>
            <div id="progressText" className="progress-text">
              准备中...
            </div>
            <div id="progressDetails" className="progress-details"></div>
          </div>

          {/* 日志输出 */}
          <div
            id="logContainer"
            className="log-container"
            style={{ display: "none" }}
          >
            <h3>📝 执行日志</h3>
            <div className="log-controls">
              <button id="clearLogBtn" className="btn secondary">
                清空日志
              </button>
              <button id="exportLogBtn" className="btn secondary">
                导出日志
              </button>
            </div>
            <div id="logOutput" className="log-output"></div>
          </div>

          {/* 脚本输出 */}
          <div
            id="scriptContainer"
            className="script-container"
            style={{ display: "none" }}
          >
            <h3>📜 生成的脚本</h3>
            <div className="script-controls">
              <button id="copyScriptBtn" className="btn secondary">
                📋 复制脚本
              </button>
              <button id="downloadScriptBtn" className="btn secondary">
                💾 下载脚本
              </button>
            </div>
            <pre id="scriptOutput" className="script-output"></pre>
          </div>
        </div>

        {/* 工作表选择模态框 */}
        <div id="sheetModal" className="modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>📊 选择工作表</h3>
              <button className="modal-close" id="closeSheetModal">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>检测到多个工作表，请选择要处理的工作表：</p>
              <div id="modalSheetList" className="modal-sheet-list"></div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn secondary" id="cancelSheetBtn">
                取消
              </button>
              <button
                className="modal-btn primary"
                id="confirmSheetBtn"
                disabled
              >
                确认选择
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 引入必要的第三方库和脚本 */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://code.jquery.com/jquery-3.6.0.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"
        strategy="beforeInteractive"
      />

      {/* 引入模块化的JavaScript文件 */}
      <Script src="/automation/js/config.js" strategy="afterInteractive" />
      <Script src="/automation/js/utils.js" strategy="afterInteractive" />
      <Script
        src="/automation/js/data-processor.js"
        strategy="afterInteractive"
      />
      <Script src="/automation/js/ui-manager.js" strategy="afterInteractive" />
      <Script
        src="/automation/js/sheet-selector.js"
        strategy="afterInteractive"
      />
      <Script
        src="/automation/js/automation-generator-enhanced.js"
        strategy="afterInteractive"
      />
      <Script src="/automation/js/main.js" strategy="afterInteractive" />
    </>
  );
}
