"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Head from "next/head";
import Script from "next/script";
import "./questionnaire-automation.css";

export default function QuestionnaireAutomationPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login?redirect=/questionnaire-automation");
        return;
      }

      // 可以根据需要设置权限控制，这里暂时允许所有已认证用户访问
      // if (user?.role !== "admin") {
      //   router.push("/?error=access_denied");
      //   return;
      // }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 检查权限
  if (!isAuthenticated) {
    return null; // 重定向处理中
  }

  return (
    <>
      <Head>
        <title>精灵蜂统一自动化脚本 - 问卷自动化工具</title>
      </Head>

      {/* 引入CSS样式 */}
      <link rel="stylesheet" href="/automation/style.css" />

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="questionnaire-automation-container">
          <div className="container mx-auto max-w-7xl">
            {/* 页面头部 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  问卷自动化工具
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  高效的问卷数据处理和自动化代码生成工具，支持多种问卷类型的批量处理和智能化管理
                </p>
              </div>
            </div>

            {/* API配置区域 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="api-toggle">
                <div
                  className="mode-switch"
                  role="group"
                  aria-label="选择执行模式"
                >
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                    </svg>
                    执行模式选择
                  </h3>
                  <div className="flex gap-6">
                    <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                      <input
                        type="radio"
                        name="execMode"
                        value="dom"
                        defaultChecked
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          🧩 DOM模式
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          通过页面操作实现自动化
                        </p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                      <input
                        type="radio"
                        name="execMode"
                        value="api"
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          🚀 API模式
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          直接调用API接口
                        </p>
                      </div>
                    </label>
                  </div>
                  <div
                    className="api-info mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                    id="modeHint"
                  >
                    <div className="flex items-center text-sm text-green-700">
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      DOM模式：通过页面操作实现自动化，更稳定可靠
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 自动化功能配置 */}
            <div className="auto-features mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  🤖 自动化功能配置
                </h3>
                <details className="group">
                  <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                    ⚙️ 高级选项
                  </summary>
                  <div className="mt-4 space-y-4">
                    <div className="feature-toggle">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          id="autoNextDate"
                          defaultChecked
                          className="text-blue-600"
                        />
                        <span className="text-sm font-medium">
                          📅 自动切换日期
                        </span>
                      </label>
                      <div className="feature-info mt-1 text-xs text-gray-600 ml-6">
                        ✅ 当前日期任务完成后自动切换到下一个日期
                        <br />
                        ⚠️ 关闭后需要手动选择日期
                      </div>
                    </div>
                    <div className="feature-toggle">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          id="autoValidation"
                          defaultChecked
                          className="text-blue-600"
                        />
                        <span className="text-sm font-medium">
                          🔍 自动数据验证
                        </span>
                      </label>
                      <div className="feature-info mt-1 text-xs text-gray-600 ml-6">
                        ✅ 任务完成后自动验证是否有遗漏
                        <br />✅ 发现遗漏时自动补充创建
                      </div>
                    </div>
                    <div className="feature-toggle">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          id="consoleSnippetMode"
                          defaultChecked
                          className="text-blue-600"
                        />
                        <span className="text-sm font-medium">
                          📦 控制台代码片段模式
                        </span>
                      </label>
                      <div className="feature-info mt-1 text-xs text-gray-600 ml-6">
                        ✅ 生成适合Chrome DevTools Snippets的代码格式
                        <br />✅ 自动命名为指派人名称，方便管理
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            {/* 问卷类型选择 */}
            <div className="questionnaire-selector mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  📋 选择问卷类型
                </h3>
                <div
                  className="questionnaire-types grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                  id="questionnaireTypes"
                >
                  {/* 问卷类型将通过JavaScript动态生成 */}
                </div>
              </div>
            </div>

            {/* 文件上传区域 */}
            <div className="file-upload mb-6" id="fileUpload">
              <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
                <div className="text-center">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-gray-600 mb-2">
                    拖拽 Excel文件到此处，或点击选择文件
                  </p>
                  <input
                    type="file"
                    id="fileInput"
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                    onClick={() =>
                      document.getElementById("fileInput")?.click()
                    }
                  >
                    选择文件
                  </button>
                </div>
                <textarea
                  className="w-full h-64 mt-4 p-3 border border-gray-300 rounded-lg resize-none font-mono text-sm"
                  id="dataPreview"
                  placeholder="Excel数据预览将显示在这里..."
                  readOnly
                ></textarea>
              </div>
            </div>

            {/* 指派人管理 */}
            <div
              className="assignee-management mb-6 hidden"
              id="assigneeManagement"
            >
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  👥 指派人管理
                </h3>
                <div className="assignee-list" id="assigneeList"></div>
              </div>
            </div>

            {/* 日期管理 */}
            <div className="date-management mb-6 hidden" id="dateManagement">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  📅 <span id="selectedAssigneeName">选择指派人</span>{" "}
                  的日期管理
                </h3>
                <div className="date-status" id="dateStatus">
                  <p className="text-center text-gray-500 py-8">
                    👆 请先点击上方的指派人查看其日期
                  </p>
                </div>
              </div>
            </div>

            {/* 生成按钮区域 */}
            <div
              className="generation-buttons mb-6 hidden"
              id="generationButtons"
            >
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  🚀 生成自动化代码
                </h3>
                <div className="validation-buttons flex gap-4">
                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    id="createQuestionnairesBtn"
                    disabled
                  >
                    📝 生成并复制 当前日期代码
                  </button>
                  <button
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    id="createAllQuestionnairesBtn"
                    disabled
                  >
                    📊 生成并复制 全部日期代码
                  </button>
                </div>
                <p id="dataSummary" className="text-gray-600 mt-2 hidden"></p>
              </div>
            </div>

            {/* 数据验证区域 */}
            <div
              className="validation-section mb-6 hidden"
              id="validationSection"
            >
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  🔍 数据验证工具
                </h3>
                <p className="text-gray-700 mb-3">
                  ⚠️
                  数据验证功能已集成到生成的代码片段中，请在控制台中使用以下命令：
                </p>
                <div className="bg-gray-100 p-4 rounded-lg space-y-2">
                  <code className="block text-sm text-gray-800">
                    validateData() - 验证当前数据集创建情况并给出缺失列表
                  </code>
                  <code className="block text-sm text-gray-800">
                    showMissing() - 以表格和 JSON 形式显示缺失项
                  </code>
                  <code className="block text-sm text-gray-800">
                    updateWithMissing() - 自动补充创建缺失项（随后会再次验证）
                  </code>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  💡
                  这些命令只能在执行自动化代码后的控制台中使用，因为需要访问后端API。
                </p>
              </div>
            </div>

            {/* 代码生成结果区域 */}
            <div
              className="questionnaire-creation-section hidden"
              id="questionnaireCreationSection"
            >
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">
                  📦 生成结果
                </h3>
                <div id="questionnaireCreationResults">
                  {/* 生成的代码将显示在这里，包含复制按钮 */}
                </div>

                {/* 使用说明 */}
                <div
                  className="usage-instructions mt-4 p-4 bg-blue-50 rounded-lg hidden"
                  id="usageInstructions"
                >
                  <h4 className="font-semibold text-blue-800 mb-2">
                    📖 使用说明
                  </h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>1. 复制生成的代码到浏览器控制台</p>
                    <p>2. 在目标网站页面中粘贴并执行</p>
                    <p>3. 代码将自动创建问卷数据</p>
                    <p>4. 使用验证命令检查创建结果</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 引入必要的第三方库和脚本 */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
        strategy="beforeInteractive"
        onLoad={() => console.log("XLSX loaded")}
      />
      <Script
        src="https://code.jquery.com/jquery-3.6.0.min.js"
        strategy="beforeInteractive"
        onLoad={() => console.log("jQuery loaded")}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"
        strategy="beforeInteractive"
        onLoad={() => console.log("CryptoJS loaded")}
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
        src="/automation/js/main.js"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptsLoaded(true);
          // 初始化应用程序
          if (typeof window !== "undefined" && (window as any).AutomationApp) {
            const app = new (window as any).AutomationApp();
            app.initialize();
          }
        }}
      />
    </>
  );
}
