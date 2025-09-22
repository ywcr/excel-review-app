// ==================== 主应用程序 ====================

/**
 * 主应用程序类
 */
class AutomationApp {
  constructor() {
    // 核心组件
    this.questionnaireSelector = null;
    this.fileUploader = null;
    this.dataPreviewer = null;
    this.assigneeManager = null;
    this.dateManager = null;
    this.sheetSelector = null;
    this.preferenceManager = null;

    // 数据处理器
    this.excelProcessor = null;
    this.dataParser = null;

    // 应用状态
    this.currentQuestionnaireType = "";
    this.currentDate = "";
    this.assigneeData = {};
    this.allDates = [];
    this.copiedAssignees = new Set();
    this.lastLoadedExcelData = null; // 存储最后加载的Excel数据

    // 设置
    this.useApiMode = false;
    this.autoNextDate = CONFIG.defaults.autoNextDate;
    this.autoValidation = CONFIG.defaults.autoValidation;
  }

  /**
   * 初始化应用程序
   */
  initialize() {
    // 防止重复初始化
    if (this.initialized) {
      console.log("AutomationApp already initialized, skipping...");
      return;
    }

    Logger.logInfo("🚀 正在初始化统一自动化脚本...");

    this.initializeComponents();
    this.initializeEventListeners();
    this.loadPreferences();
    this.showWelcomeMessage();

    this.initialized = true;
    Logger.logInfo("✅ 统一自动化脚本初始化完成");
  }

  /**
   * 初始化组件
   */
  initializeComponents() {
    // UI组件
    this.questionnaireSelector = new QuestionnaireTypeSelector(
      "questionnaireTypes"
    );
    this.fileUploader = new FileUploader("fileUpload", "fileInput");
    this.dataPreviewer = new DataPreviewer("dataPreview");
    this.assigneeManager = new AssigneeManager("assigneeList");
    this.dateManager = new DateManager("dateStatus", "selectedAssigneeName");
    this.sheetSelector = new SheetSelector();
    this.preferenceManager = new SheetPreferenceManager();

    // 数据处理器
    this.excelProcessor = new ExcelProcessor();

    // 初始化UI组件
    this.questionnaireSelector.initialize();
    this.fileUploader.initialize();

    // 设置回调函数
    this.setupCallbacks();
  }

  /**
   * 设置回调函数
   */
  setupCallbacks() {
    // 问卷类型选择回调
    this.questionnaireSelector.onSelectionChange = (type, config) => {
      const previousType = this.currentQuestionnaireType;
      this.currentQuestionnaireType = type;
      this.dataParser = new DataParser(config);

      // 如果已经有上传的文件数据，重新处理
      if (previousType && this.lastLoadedExcelData) {
        Logger.logInfo("🔄 问卷类型已更改，重新解析数据...");
        this.handleExcelData(this.lastLoadedExcelData);
      }
    };

    // 文件上传回调
    this.fileUploader.onFileLoad = async (files) => {
      await this.handleFileUpload(files);
    };

    // 指派人选择回调
    this.assigneeManager.onSelectionChange = (assignee, data) => {
      this.dateManager.displayAssigneeDates(assignee, data);
    };

    // 日期选择回调
    this.dateManager.onSelectionChange = (date, data) => {
      this.currentDate = date;
    };

    // Sheet选择确认回调
    this.sheetSelector.onConfirm = (sheetName, sheetData) => {
      this.processSheetData(sheetName, sheetData);
    };
  }

  /**
   * 初始化事件监听器
   */
  initializeEventListeners() {
    // 执行模式单选（DOM / API）
    const modeRadios = document.querySelectorAll('input[name="execMode"]');
    const savedMode = localStorage.getItem("automation_mode") || "dom";
    this.useApiMode = savedMode === "api";

    if (modeRadios && modeRadios.length) {
      modeRadios.forEach((r) => {
        if (r.value === savedMode) r.checked = true;
        r.addEventListener("change", (e) => {
          const mode = e.target.value;
          this.useApiMode = mode === "api";
          localStorage.setItem("automation_mode", mode);
          this.updateModeHint(mode);
          Logger.logInfo(`🔄 切换到${this.useApiMode ? "API" : "DOM"}模式`);
        });
      });
    }
    this.updateModeHint(savedMode);

    // 自动切换日期
    const autoNextDateCheckbox = DOMUtils.getElementById("autoNextDate");
    if (autoNextDateCheckbox) {
      autoNextDateCheckbox.onchange = (e) => {
        this.autoNextDate = e.target.checked;
        Logger.logInfo(
          `📅 自动切换日期: ${this.autoNextDate ? "开启" : "关闭"}`
        );
      };
    }

    // 自动数据验证
    const autoValidationCheckbox = DOMUtils.getElementById("autoValidation");
    if (autoValidationCheckbox) {
      autoValidationCheckbox.onchange = (e) => {
        this.autoValidation = e.target.checked;
        Logger.logInfo(
          `🔍 自动数据验证: ${this.autoValidation ? "开启" : "关闭"}`
        );
      };
    }

    // 生成按钮事件绑定（生成并复制）
    const singleBtn = DOMUtils.getElementById("createQuestionnairesBtn");
    if (singleBtn) {
      singleBtn.addEventListener("click", async () => {
        const oldText = singleBtn.textContent;
        singleBtn.disabled = true;
        singleBtn.textContent = "⏳ 生成中...";
        try {
          await this.createQuestionnaires();
        } finally {
          singleBtn.textContent = oldText;
          singleBtn.disabled = false;
        }
      });
    }

    const allBtn = DOMUtils.getElementById("createAllQuestionnairesBtn");
    if (allBtn) {
      allBtn.addEventListener("click", async () => {
        const oldText = allBtn.textContent;
        allBtn.disabled = true;
        allBtn.textContent = "⏳ 生成中...";
        try {
          await this.createAllQuestionnaires();
        } finally {
          allBtn.textContent = oldText;
          allBtn.disabled = false;
        }
      });
    }
  }

  /**
   * 加载偏好设置
   */
  loadPreferences() {
    this.preferenceManager.load();
  }

  /**
   * 显示欢迎消息
   */
  showWelcomeMessage() {
    Logger.logCommand(
      "💡 使用说明：1. 选择问卷类型 → 2. 上传Excel文件 → 3. 选择指派人和日期 → 4. 点击创建问卷"
    );
    Logger.logCommand("🔧 控制台命令：showHelp() - 显示所有可用命令");
    Logger.logCommand(
      "🔧 高级功能：clearSheetPreferences() - 清除Sheet选择偏好"
    );

    // 延迟显示帮助信息
    setTimeout(() => {
      Logger.logInfo("");
      Logger.logInfo("🎯 新功能：现在支持完整的DOM模式问卷创建！");
      Logger.logInfo(
        "📋 支持的问卷类型：六味患者、西黄消费者、牛解消费者、知柏消费者、贴膏患者"
      );
      Logger.logInfo("🚀 可以直接在控制台使用 showHelp() 查看所有命令");
    }, 1000);
  }

  /**
   * 处理文件上传
   */
  async handleFileUpload(files) {
    if (!this.currentQuestionnaireType) {
      Toast.error("❌ 请先选择问卷类型");
      return;
    }

    try {
      const result = await this.excelProcessor.loadFile(files);
      // 保存Excel数据以便在切换问卷类型时重新解析
      this.lastLoadedExcelData = result;
      await this.handleExcelData(result);
    } catch (error) {
      Logger.logError(`文件处理失败: ${error.message}`);
      Toast.error("❌ 文件处理失败");
    }
  }

  /**
   * 处理Excel数据
   */
  async handleExcelData(result) {
    const config = this.questionnaireSelector.getSelectedConfig();
    if (!config) {
      Logger.logError("未选择问卷类型");
      return;
    }

    // 尝试智能匹配Sheet名称
    const matcher = new SheetMatcher(config);
    const preferences = this.preferenceManager.getAllPreferences();
    const matchResult = matcher.findMatchingSheet(result.sheets, preferences);

    if (matchResult.found) {
      // 找到匹配的Sheet，直接处理数据
      Logger.logSuccess(`✅ 自动匹配到工作表: ${matchResult.sheetName}`);
      this.processSheetData(
        matchResult.sheetName,
        result.sheets[matchResult.sheetName]
      );
    } else {
      // 未找到匹配的Sheet，显示选择界面
      Logger.logWarning(`⚠️ 无法自动匹配工作表，需要手动选择`);
      this.sheetSelector.show(config, result.sheets, matchResult.reason);
    }
  }

  /**
   * 处理Sheet数据
   */
  processSheetData(sheetName, sheetData) {
    try {
      const result = this.dataParser.parseSheetData(sheetData);

      // 更新应用状态
      this.assigneeData = result.assigneeData;
      this.allDates = result.allDates;
      this.copiedAssignees.clear();

      // 更新UI
      this.dataPreviewer.displayPreview(result.data);
      this.assigneeManager.displayList(result.assigneeData);

      // 显示管理界面
      DOMUtils.show("dateManagement");
      DOMUtils.show("assigneeManagement");
      DOMUtils.show("validationSection");
      DOMUtils.show("generationButtons"); // 显示生成按钮区域
      DOMUtils.show("questionnaireCreationSection");

      // 启用生成按钮并展示摘要
      this.setGenerateButtonsEnabled(true);
      this.updateDataSummaryFromState();

      // 滚动到指派人管理区域
      const assigneeSection = document.getElementById("assigneeManagement");
      if (assigneeSection) {
        setTimeout(() => {
          assigneeSection.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 100);
      }
    } catch (error) {
      Logger.logError(`数据处理失败: ${error.message}`);
      Toast.error(`❌ 数据处理失败: ${error.message}`);
    }
  }

  /**
   * 创建当前日期问卷
   */
  createQuestionnaires() {
    Logger.logInfo("🚀 开始生成当前日期自动化代码...");

    // 基础验证
    if (!this.currentDate || !this.currentQuestionnaireType) {
      Toast.error("❌ 请先选择指派人和日期");
      Logger.logError(
        "缺少必要信息：currentDate=" +
          this.currentDate +
          ", questionnaireType=" +
          this.currentQuestionnaireType
      );
      return;
    }

    try {
      // 获取配置
      const config = this.questionnaireSelector.getSelectedConfig();
      if (!config) {
        Toast.error("❌ 未找到问卷配置");
        Logger.logError("问卷配置为空");
        return;
      }
      Logger.logInfo("✅ 问卷配置获取成功：" + config.name);

      // 获取选中的指派人
      const assignee = this.assigneeManager.getSelectedAssignee();
      if (!assignee) {
        Toast.error("❌ 请先选择指派人");
        Logger.logError("未选择指派人");
        return;
      }
      Logger.logInfo("✅ 指派人获取成功：" + assignee);

      // 获取所有数据
      const allData = this.getAllParsedData();
      if (!allData || allData.length === 0) {
        Toast.error("❌ 没有可用的数据，请先上传并解析Excel文件");
        Logger.logError("数据为空，assigneeData:", this.assigneeData);
        return;
      }
      Logger.logInfo("✅ 数据获取成功，总计：" + allData.length + " 条");

      // 验证当前日期和指派人的数据
      const filteredData = allData.filter(
        (item) => item.assignee === assignee && item.time === this.currentDate
      );

      if (filteredData.length === 0) {
        Toast.error(
          `❌ 没有找到指派人"${assignee}"在日期"${this.currentDate}"的数据`
        );
        Logger.logError(
          "过滤后数据为空，可用数据：",
          allData.map((item) => `${item.assignee}-${item.time}`)
        );
        return;
      }
      Logger.logInfo(`✅ 找到匹配数据：${filteredData.length} 条`);

      // 生成自动化代码
      const generator = new AutomationCodeGenerator({
        ...config,
        mode: this.useApiMode ? "api" : "dom",
      });
      const automationCode = generator.generateCode(
        filteredData, // 使用已过滤的数据，只包含当前指派人和当前日期的数据
        assignee,
        this.currentDate,
        this.useApiMode
      );

      // 显示生成的代码
      this.displayAutomationCode(
        automationCode,
        `${config.name} - ${assignee} - ${this.currentDate}`
      );

      // 显示使用说明
      this.showUsageInstructions();

      Logger.logSuccess(`✅ 已生成${config.name}自动化代码`);
      Toast.success(
        '✅ 自动化代码已生成！请查看下方绿色区域，点击"复制代码"按钮'
      );
    } catch (error) {
      Logger.logError(`代码生成失败: ${error.message}`);
      Logger.logError("错误堆栈:", error.stack);
      Toast.error(`❌ 代码生成失败: ${error.message}`);
    }
  }

  /**
   * 创建所有日期问卷
   */
  createAllQuestionnaires() {
    Logger.logInfo("🚀 开始生成所有日期自动化代码...");

    if (!this.currentQuestionnaireType) {
      Toast.error("❌ 请先选择问卷类型");
      return;
    }

    try {
      // 获取配置
      const config = this.questionnaireSelector.getSelectedConfig();
      if (!config) {
        Toast.error("❌ 未找到问卷配置");
        return;
      }

      // 获取选中的指派人
      const assignee = this.assigneeManager.getSelectedAssignee();
      if (!assignee) {
        Toast.error("❌ 请先选择指派人");
        return;
      }

      // 获取所有数据
      const allData = this.getAllParsedData();
      if (!allData || allData.length === 0) {
        Toast.error("❌ 没有可用的数据，请先上传并解析Excel文件");
        return;
      }

      // 过滤指派人的所有数据（包含所有日期）
      const assigneeData = allData.filter((item) => item.assignee === assignee);

      if (assigneeData.length === 0) {
        Toast.error(`❌ 没有找到指派人"${assignee}"的数据`);
        return;
      }

      // 获取该指派人的所有日期
      const assigneeDates = [
        ...new Set(assigneeData.map((item) => item.time)),
      ].sort();
      Logger.logInfo(
        `✅ 找到指派人"${assignee}"的数据：${assigneeData.length}条，涵盖${assigneeDates.length}个日期`
      );

      // 生成包含所有日期的完整自动化代码
      const generator = new AutomationCodeGenerator({
        ...config,
        mode: this.useApiMode ? "api" : "dom",
      });
      const allDatesCode = generator.generateAllDatesCode(
        assigneeData,
        assignee,
        assigneeDates,
        this.useApiMode
      );

      // 显示生成的代码
      this.displayAutomationCode(
        allDatesCode,
        `${config.name} - ${assignee} - 全部日期 (${assigneeDates.join(", ")})`
      );

      // 显示使用说明
      this.showUsageInstructions();

      Logger.logSuccess(
        `✅ 已生成包含${assigneeDates.length}个日期的完整自动化代码`
      );
      Toast.success(
        `✅ 已生成全部日期自动化代码！包含${assigneeDates.length}个日期，请查看下方绿色区域复制代码`
      );
    } catch (error) {
      Logger.logError(`批量代码生成失败: ${error.message}`);
      Logger.logError("错误堆栈:", error.stack);
      Toast.error(`❌ 批量代码生成失败: ${error.message}`);
    }
  }

  /**
   * 获取所有解析的数据
   */
  getAllParsedData() {
    const allData = [];

    // 验证assigneeData是否存在
    if (!this.assigneeData || typeof this.assigneeData !== "object") {
      Logger.logWarning("assigneeData为空或格式不正确:", this.assigneeData);
      return allData;
    }

    try {
      Object.keys(this.assigneeData).forEach((assignee) => {
        const assigneeItems = this.assigneeData[assignee];

        // 验证指派人数据是否为数组
        if (!Array.isArray(assigneeItems)) {
          Logger.logWarning(
            `指派人 ${assignee} 的数据不是数组:`,
            assigneeItems
          );
          return;
        }

        // 直接处理数组中的每个项目
        assigneeItems.forEach((item, index) => {
          if (!item || typeof item !== "object") {
            Logger.logWarning(
              `指派人 ${assignee} 索引 ${index} 的数据格式不正确:`,
              item
            );
            return;
          }

          // 确保数据包含必要的字段
          const processedItem = {
            name: item.name || `未知${index + 1}`,
            sex: item.sex || "男",
            time: item.time || "",
            assignee: item.assignee || assignee,
            hospital: item.hospital || "",
            address: item.address || "",
          };

          allData.push(processedItem);
        });
      });
    } catch (error) {
      Logger.logError("获取解析数据时出错:", error);
      Logger.logError("assigneeData结构:", this.assigneeData);
    }

    Logger.logInfo(`getAllParsedData完成，共获取 ${allData.length} 条数据`);
    if (allData.length > 0) {
      Logger.logInfo("数据示例:", allData[0]);
    }
    return allData;
  }

  /**
   * 显示自动化代码
   */
  displayAutomationCode(code, title) {
    Logger.logCommand(`\n==================== ${title} ====================`);
    Logger.logCommand(code);
    Logger.logCommand(
      `==================== ${title} 结束 ====================\n`
    );

    // 在页面上显示代码和复制按钮
    const resultsDiv = DOMUtils.getElementById("questionnaireCreationResults");
    // 如果存在生成结果的details容器，自动展开
    const detailsEl = document.querySelector('#questionnaireCreationSection details');
    if (detailsEl && !detailsEl.open) {
      detailsEl.open = true;
    }
    if (resultsDiv) {
      const codeBlock = DOMUtils.createElement("div", "code-result");
      codeBlock.innerHTML = `
                <details class="code-accordion">
                  <summary class="code-header">
                    <h4>🤖 ${title}</h4>
                    <button class="copy-btn" onclick="copyToClipboard(this)" data-code="${encodeURIComponent(
                      code
                    )}">📋 复制代码</button>
                  </summary>
                  <div class="code-info">
                    <p>✅ 自动化代码已生成！请复制以下代码到问卷页面的控制台中执行：</p>
                  </div>
                  <pre class="code-content"><code>${this.escapeHtml(code)}</code></pre>
                  <div class="code-footer">
                    <p><strong>使用说明：</strong></p>
                    <ol>
                      <li>点击上方"📋 复制代码"按钮复制代码</li>
                      <li>打开问卷创建页面</li>
                      <li>按F12打开开发者工具，切换到source（源代码）标签</li>
                      <li>选中该标签下的代码片段（snippet）</li>
                      <li>粘贴代码并执行</li>
                      <li>根据提示调用相应的执行函数</li>
                    </ol>
                  </div>
                </details>
            `;
      // 明确设置每条结果默认折叠
      const innerDetails = codeBlock.querySelector('details');
      if (innerDetails) innerDetails.open = false;
      resultsDiv.appendChild(codeBlock);

      // 滚动到结果区域
      codeBlock.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // 显示成功提示（已去重，避免与自动复制的提示重复）
  }

  /**
   * 设置生成按钮的可用状态
   */
  setGenerateButtonsEnabled(enabled) {
    const singleBtn = DOMUtils.getElementById("createQuestionnairesBtn");
    const allBtn = DOMUtils.getElementById("createAllQuestionnairesBtn");
    if (singleBtn) singleBtn.disabled = !enabled;
    if (allBtn) allBtn.disabled = !enabled;
  }

  /**
   * 更新模式提示文案
   */
  updateModeHint(mode) {
    const hintEl = DOMUtils.getElementById("modeHint");
    if (!hintEl) return;
    hintEl.innerHTML =
      mode === "api"
        ? "✅ API模式：直接通过接口创建，速度更快；注意错误重试与去重逻辑已内置"
        : "✅ DOM模式：通过页面操作实现自动化，更稳定";
  }

  /**
   * 根据当前状态更新数据摘要
   */
  updateDataSummaryFromState() {
    const p = DOMUtils.getElementById("dataSummary");
    if (!p) return;

    const assignees = Object.keys(this.assigneeData || {}).length;
    const dates = (this.allDates || []).length;
    let rows = 0;
    try {
      rows = Object.values(this.assigneeData || {}).reduce(
        (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
        0
      );
    } catch (_) {}

    p.textContent = `已加载：指派人 ${assignees} 人 ｜ 日期 ${dates} 天 ｜ 记录 ${rows} 条`;
    p.style.display = "block";
  }

  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 显示使用说明
   */
  showUsageInstructions() {
    const instructionsDiv = DOMUtils.getElementById("usageInstructions");
    if (instructionsDiv) {
      DOMUtils.show(instructionsDiv);
    }
  }

  /**
   * 获取应用状态
   */
  getStatus() {
    return {
      questionnaireType: this.currentQuestionnaireType,
      currentDate: this.currentDate,
      assigneeCount: Object.keys(this.assigneeData).length,
      dateCount: this.allDates.length,
      useApiMode: this.useApiMode,
      autoNextDate: this.autoNextDate,
      autoValidation: this.autoValidation,
    };
  }
}

// 全局应用实例
let app = null;

// DOM加载完成后初始化应用
document.addEventListener("DOMContentLoaded", function () {
  app = new AutomationApp();
  app.initialize();
});

// 全局函数
window.createQuestionnaires = function () {
  if (app) {
    app.createQuestionnaires();
  }
};

window.createAllQuestionnaires = function () {
  if (app) {
    app.createAllQuestionnaires();
  }
};

window.closeSheetModal = function () {
  if (app && app.sheetSelector) {
    app.sheetSelector.close();
  }
};

window.confirmSheetSelection = function () {
  if (app && app.sheetSelector) {
    app.sheetSelector.confirm();
  }
};

window.copyToClipboard = function (button) {
  const code = decodeURIComponent(button.dataset.code);

  // 使用现代的Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        showCopySuccess(button);
      })
      .catch(() => {
        fallbackCopyTextToClipboard(code, button);
      });
  } else {
    // 降级到传统方法
    fallbackCopyTextToClipboard(code, button);
  }
};

// 显示复制成功状态
function showCopySuccess(button) {
  const originalText = button.innerHTML;
  button.innerHTML = "✅ 已复制!";
  button.classList.add("copied");

  setTimeout(() => {
    button.innerHTML = originalText;
    button.classList.remove("copied");
  }, 3000);

  Toast.success("✅ 自动化代码已复制到剪贴板！可以粘贴到问卷页面控制台执行");
  Logger.logSuccess("📋 代码已复制到剪贴板");
}

// 降级复制方法
function fallbackCopyTextToClipboard(text, button) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    if (successful) {
      showCopySuccess(button);
    } else {
      Toast.error("❌ 复制失败，请手动选择代码复制");
    }
  } catch (err) {
    Toast.error("❌ 复制失败，请手动选择代码复制");
    Logger.logError("复制失败:", err);
  }

  document.body.removeChild(textArea);
}

window.showHelp = function () {
  const status = app ? app.getStatus() : {};
  console.log(`
🤖 精灵蜂统一自动化脚本 - 帮助文档

📋 基本使用流程：
1. 选择问卷类型
2. 上传Excel文件
3. 选择指派人和日期
4. 点击创建问卷

🔧 控制台命令：
- showHelp() - 显示此帮助信息
- clearSheetPreferences() - 清除Sheet选择偏好

📊 当前状态：
- 问卷类型: ${status.questionnaireType || "未选择"}
- 当前日期: ${status.currentDate || "未选择"}
- 指派人数量: ${status.assigneeCount || 0}
- 日期数量: ${status.dateCount || 0}
- API模式: ${status.useApiMode ? "开启" : "关闭"}
- 自动切换日期: ${status.autoNextDate ? "开启" : "关闭"}
- 自动验证: ${status.autoValidation ? "开启" : "关闭"}

💡 提示：
- 支持拖拽上传Excel文件
- 支持智能匹配工作表名称
- 支持记住Sheet选择偏好
- 按ESC键可关闭模态框
- 生成的自动化代码可直接在问卷页面控制台执行
    `);
};

// 全局导出
window.AutomationApp = AutomationApp;

// 全局函数 - 供HTML按钮调用
window.closeSheetModal = function () {
  const app = window.automationAppInstance;
  if (app && app.sheetSelector) {
    app.sheetSelector.close();
  }
};

window.confirmSheetSelection = function () {
  const app = window.automationAppInstance;
  if (app && app.sheetSelector) {
    app.sheetSelector.confirm();
  }
};
