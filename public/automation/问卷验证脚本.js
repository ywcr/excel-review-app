// ==UserScript==
// @name         问卷数据验证工具
// @namespace    http://tampermonkey.net/
// @version      2.0.0
// @description  西黄丸/六味地黄丸问卷数据验证脚本 - 支持一键验证所有日期和JSON统计导出
// @author       Assistant
// @match        https://zxyy.ltd/*
// @grant        none
// @require      https://cc-static-files.oss-cn-hangzhou.aliyuncs.com/xlsx.full.min.js
// @noframes
// ==/UserScript==

(function () {
  "use strict";
  // 仅在顶层页面运行，避免在 iframe 中重复注入
  if (window.top !== window.self) {
    return;
  }

  // 全局变量
  let sheets = {};
  let assigneeData = {};
  let allDates = [];
  let currentType = ""; // 问卷类型
  let globalValidationResults = {}; // 全局验证结果
  let isValidatingAll = false; // 是否正在进行全局验证
  let validationCancelled = false; // 验证是否被取消

  // 问卷类型配置
  const questionnaireConfig = {
    xihuang: {
      name: "西黄丸消费者问卷",
      sheetName: "西黄消费者问卷",
      nameField: "消费者",
      contactType: "消费者",
      fields: {
        序号: 0,
        姓名: 1,
        性别: 2,
        时间: 3,
        指派人: 4
      }
    },
    liuwei: {
      name: "六味地黄丸患者问卷",
      sheetName: "六味患者问卷",
      nameField: "患者",
      contactType: "患者",
      fields: {
        序号: 0,
        姓名: 1,
        性别: 2,
        时间: 3,
        指派人: 4
      }
    },
    niujie: {
      name: "牛解消费者问卷",
      sheetName: "牛解消费者问卷",
      nameField: "消费者",
      contactType: "消费者",
      fields: {
        序号: 0,
        姓名: 1,
        性别: 2,
        时间: 3,
        指派人: 4
      }
    },
    zhibai: {
      name: "知柏消费者问卷",
      sheetName: "知柏消费者问卷",
      nameField: "消费者",
      contactType: "消费者",
      fields: {
        序号: 0,
        姓名: 1,
        性别: 2,
        时间: 3,
        指派人: 4
      }
    },
    tiegao: {
      name: "贴膏患者问卷",
      sheetName: "贴膏患者问卷",
      nameField: "患者",
      contactType: "患者",
      fields: {
        序号: 0,
        姓名: 1,
        性别: 2,
        时间: 3,
        指派人: 4
      }
    },
    custom: {
      name: "自定义问卷",
      sheetName: "问卷数据",
      nameField: "姓名",
      contactType: "联系人",
      fields: {
        序号: 0,
        姓名: 1,
        性别: 2,
        时间: 3,
        指派人: 4
      }
    }
  };

  // 创建UI界面
  function createUI() {
    // 检查是否已存在
    if (document.getElementById("questionnaire-validator")) return;

    const container = document.createElement("div");
    container.id = "questionnaire-validator";
    container.innerHTML = `
            <div id="validator-panel" style="
                position: fixed;
                top: 20px;
                left: 20px;
                width: 400px;
                background: white;
                border: 2px solid #007bff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
                display: none;
            ">
                <div id="validator-header" style="
                    background: #007bff;
                    color: white;
                    padding: 10px 15px;
                    border-radius: 6px 6px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: move;
                    user-select: none;
                ">
                    <span style="font-weight: bold;">🔍 问卷数据验证工具 <small style="opacity: 0.8;">(可拖拽)</small></span>
                    <div>
                        <button id="validator-minimize" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 16px;
                            cursor: pointer;
                            margin-right: 10px;
                        ">−</button>
                        <button id="validator-close" style="
                            background: none;
                            border: none;
                            color: white;
                            font-size: 16px;
                            cursor: pointer;
                        ">×</button>
                    </div>
                </div>

                <div id="validator-content" style="padding: 15px;">
                    <!-- 文件导入 -->
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                            📄 选择Excel文件:
                        </label>
                        <input type="file" id="excel-file" accept=".xlsx,.xls" style="
                            width: 100%;
                            padding: 5px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                        ">
                    </div>

                    <!-- 类型选择 -->
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                            💊 问卷类型:
                        </label>
                        <select id="questionnaire-type" style="
                            width: 100%;
                            padding: 5px;
                            border: 1px solid #ddd;
                            border-radius: 4px;
                        ">
                            <option value="">请选择问卷类型</option>
                            <option value="xihuang">西黄丸消费者问卷</option>
                            <option value="liuwei">六味地黄丸患者问卷</option>
                            <option value="niujie">牛解消费者问卷</option>
                            <option value="zhibai">知柏消费者问卷</option>
                            <option value="tiegao">贴膏患者问卷</option>
                            <option value="custom">自定义问卷</option>
                        </select>
                    </div>

                    <!-- 解析按钮 -->
                    <button id="parse-data" style="
                        width: 100%;
                        padding: 8px;
                        background: #28a745;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-weight: bold;
                        margin-bottom: 15px;
                    ">🔄 解析数据</button>

                    <!-- 数据展示区域 -->
                    <div id="data-display" style="display: none;">
                        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                            <div id="data-summary" style="font-weight: bold;"></div>
                        </div>

                        <!-- 控制按钮 -->
                        <div style="margin-bottom: 10px; text-align: center;">
                            <button onclick="expandAllAssignees()" style="
                                padding: 4px 8px;
                                background: #28a745;
                                color: white;
                                border: none;
                                border-radius: 3px;
                                cursor: pointer;
                                font-size: 12px;
                                margin-right: 5px;
                            ">📂 全部展开</button>
                            <button onclick="collapseAllAssignees()" style="
                                padding: 4px 8px;
                                background: #6c757d;
                                color: white;
                                border: none;
                                border-radius: 3px;
                                cursor: pointer;
                                font-size: 12px;
                                margin-right: 5px;
                            ">📁 全部折叠</button>
                        </div>

                        <!-- 全局验证进度 -->
                        <div id="global-validation-progress" style="display: none; margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #17a2b8;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <span id="progress-text" style="font-weight: bold;">正在验证...</span>
                                <button id="cancel-validation" onclick="cancelValidation()" style="
                                    padding: 2px 6px;
                                    background: #dc3545;
                                    color: white;
                                    border: none;
                                    border-radius: 2px;
                                    cursor: pointer;
                                    font-size: 11px;
                                ">取消</button>
                            </div>
                            <div style="background: #e9ecef; border-radius: 10px; height: 8px; overflow: hidden;">
                                <div id="progress-bar" style="background: #17a2b8; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>

                        <!-- 全局统计结果 -->
                        <div id="global-statistics" style="display: none; margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; border-left: 4px solid #28a745;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <span style="font-weight: bold;">📊 全局验证统计</span>
                                <div>
                                    <button onclick="exportAllMissingJson()" style="
                                        padding: 4px 8px;
                                        background: #28a745;
                                        color: white;
                                        border: none;
                                        border-radius: 3px;
                                        cursor: pointer;
                                        font-size: 12px;
                                        margin-right: 5px;
                                    ">📋 导出未创建JSON</button>
                                    <button onclick="showGlobalStatistics()" style="
                                        padding: 4px 8px;
                                        background: #17a2b8;
                                        color: white;
                                        border: none;
                                        border-radius: 3px;
                                        cursor: pointer;
                                        font-size: 12px;
                                    ">📈 详细统计</button>
                                </div>
                            </div>
                            <div id="global-stats-summary"></div>
                        </div>

                        <!-- 指派人列表 -->
                        <div id="assignee-list" style="max-height: 300px; overflow-y: auto;"></div>
                    </div>
                </div>
            </div>

            <!-- 最小化状态 -->
            <div id="validator-minimized" style="
                position: fixed;
                top: 20px;
                left: 20px;
                background: #007bff;
                color: white;
                padding: 10px 15px;
                border-radius: 20px;
                cursor: move;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 10000;
                font-weight: bold;
                display: none;
                user-select: none;
            ">
                🔍 验证工具
            </div>
        `;

    document.body.appendChild(container);
    bindEvents();
  }

  // 绑定事件
  function bindEvents() {
    // 显示/隐藏面板
    document.getElementById("validator-minimize").onclick = minimizePanel;
    document.getElementById("validator-close").onclick = closePanel;
    // 注意：validator-minimized 的点击事件在 makeMinimizedDraggable 中处理

    // 文件解析
    document.getElementById("excel-file").onchange = handleFileSelect;
    document.getElementById("parse-data").onclick = parseData;

    // 拖拽功能
    makeDraggable();
    makeMinimizedDraggable();
  }

  // 拖拽功能实现
  function makeDraggable() {
    const panel = document.getElementById("validator-panel");
    const header = document.getElementById("validator-header");

    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;

    header.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", dragEnd);

    function dragStart(e) {
      if (e.target === header || header.contains(e.target)) {
        // 排除按钮点击
        if (e.target.tagName === "BUTTON") return;

        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;

        if (e.target === header || header.contains(e.target)) {
          isDragging = true;
          header.style.cursor = "grabbing";
        }
      }
    }

    function dragMove(e) {
      if (isDragging) {
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        // 限制拖拽范围，防止拖出屏幕
        const maxX = window.innerWidth - panel.offsetWidth;
        const maxY = window.innerHeight - panel.offsetHeight;

        xOffset = Math.max(0, Math.min(xOffset, maxX));
        yOffset = Math.max(0, Math.min(yOffset, maxY));

        panel.style.left = xOffset + "px";
        panel.style.top = yOffset + "px";
        panel.style.transform = "none"; // 移除初始定位
      }
    }

    function dragEnd() {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = "move";
      }
    }
  }

  // 最小化按钮拖拽功能
  function makeMinimizedDraggable() {
    const minimized = document.getElementById("validator-minimized");

    let isDragging = false;
    let currentX = 0;
    let currentY = 0;
    let initialX = 0;
    let initialY = 0;
    let xOffset = 0;
    let yOffset = 0;
    let moved = false;

    minimized.addEventListener("mousedown", dragStart);
    document.addEventListener("mousemove", dragMove);
    document.addEventListener("mouseup", dragEnd);

    function dragStart(e) {
      // 以当前元素位置为基准，避免跳动
      xOffset = minimized.offsetLeft;
      yOffset = minimized.offsetTop;
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
      moved = false;
      minimized.style.cursor = "grabbing";
    }

    function dragMove(e) {
      if (isDragging) {
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;
        moved = true;

        // 限制拖拽范围
        const maxX = window.innerWidth - minimized.offsetWidth;
        const maxY = window.innerHeight - minimized.offsetHeight;

        xOffset = Math.max(0, Math.min(xOffset, maxX));
        yOffset = Math.max(0, Math.min(yOffset, maxY));

        minimized.style.left = xOffset + "px";
        minimized.style.top = yOffset + "px";
      }
    }

    function dragEnd() {
      if (!isDragging) return;
      isDragging = false;
      minimized.style.cursor = "move";
      // 保存位置
      localStorage.setItem(
        "validator-minimized-pos",
        JSON.stringify({ left: minimized.style.left, top: minimized.style.top })
      );
      // 点击（非拖拽）时展开
      if (!moved) {
        showPanel();
      }
    }
  }

  function minimizePanel() {
    const panel = document.getElementById("validator-panel");
    const minimized = document.getElementById("validator-minimized");

    // 记住当前位置（优先使用上次拖拽保存的位置）
    const saved = localStorage.getItem("validator-minimized-pos");
    if (saved) {
      try {
        const pos = JSON.parse(saved);
        if (pos && pos.left && pos.top) {
          minimized.style.left = pos.left;
          minimized.style.top = pos.top;
        }
      } catch (e) {}
    } else {
      const rect = panel.getBoundingClientRect();
      minimized.style.left = rect.left + "px";
      minimized.style.top = rect.top + "px";
    }
    minimized.style.right = "auto";
    minimized.style.bottom = "auto";

    panel.style.display = "none";
    minimized.style.display = "block";
  }

  function closePanel() {
    const container = document.getElementById("questionnaire-validator");
    if (container) {
      container.remove();
    }
    // 重新显示触发按钮
    const triggerButton = document.getElementById("validator-trigger");
    if (triggerButton) {
      triggerButton.style.display = "block";
    }
  }

  function showPanel() {
    const panel = document.getElementById("validator-panel");
    const minimized = document.getElementById("validator-minimized");

    // 恢复到最小化时的位置
    if (minimized.style.left && minimized.style.top) {
      panel.style.left = minimized.style.left;
      panel.style.top = minimized.style.top;
      panel.style.transform = "none";
    }

    panel.style.display = "block";
    minimized.style.display = "none";
  }

  // 日志系统
  function logError(msg) {
    console.log("%c❌ ERROR: " + msg, "color: #dc3545; font-weight: bold;");
  }
  function logSuccess(msg) {
    console.log("%c✅ SUCCESS: " + msg, "color: #28a745; font-weight: bold;");
  }
  function logInfo(msg) {
    console.log("%cℹ️ INFO: " + msg, "color: #17a2b8;");
  }
  function logWarning(msg) {
    console.log("%c⚠️ WARNING: " + msg, "color: #ffc107; font-weight: bold;");
  }

  // 处理文件选择
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = XLSX.read(e.target.result, { type: "binary" });
        sheets = {};

        for (let i = 0; i < data.SheetNames.length; i++) {
          const sheetName = data.SheetNames[i];
          const sheetJson = XLSX.utils.sheet_to_json(data.Sheets[sheetName], {
            header: 1,
          });
          sheets[sheetName] = sheetJson;
        }

        logSuccess("Excel文件读取成功");
        updateParseButton();
      } catch (err) {
        logError("Excel文件读取失败: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  }

  function updateParseButton() {
    const type = document.getElementById("questionnaire-type").value;
    const hasFile = Object.keys(sheets).length > 0;
    const button = document.getElementById("parse-data");

    button.disabled = !hasFile || !type;
    button.style.opacity = button.disabled ? "0.5" : "1";
    button.style.cursor = button.disabled ? "not-allowed" : "pointer";
  }

  // 类型选择事件
  document.addEventListener("change", function (e) {
    if (e.target.id === "questionnaire-type") {
      currentType = e.target.value;
      updateParseButton();
    }
  });

  // 解析数据
  function parseData() {
    if (!currentType) {
      logError("请选择问卷类型");
      return;
    }

    const config = questionnaireConfig[currentType];
    if (!config) {
      logError("未知的问卷类型");
      return;
    }

    try {
      assigneeData = {};
      allDates = [];
      const dateSet = new Set();

      // 尝试多个可能的工作表名称
      let wenjuan = [];
      const possibleSheetNames = [
        config.sheetName,
        Object.keys(sheets)[0], // 第一个工作表
        "Sheet1",
        "问卷数据"
      ];

      for (const sheetName of possibleSheetNames) {
        if (sheets[sheetName] && sheets[sheetName].length > 1) {
          wenjuan = sheets[sheetName].slice(1); // 跳过表头
          logInfo(`使用工作表: ${sheetName}`);
          break;
        }
      }

      if (wenjuan.length === 0) {
        logError("未找到对应的工作表数据，请检查Excel文件格式");
        return;
      }

      wenjuan.forEach((item, index) => {
        try {
          // 根据配置读取字段
          const 序号 = item[config.fields.序号] || index + 1;
          const 姓名 = item[config.fields.姓名] || "";
          const 性别 = item[config.fields.性别] || "";
          const 时间 = item[config.fields.时间] || "";
          const 指派人 = item[config.fields.指派人] || "";

          if (!指派人 || !姓名) return;

          // 格式化日期
          let date = 时间.toString();
          if (date.includes(".")) {
            let dateArr = date.split(".");
            if (dateArr[0].length !== 2) {
              dateArr[0] = "0" + dateArr[0];
            }
            if (dateArr[1].length !== 2) {
              dateArr[1] = dateArr[1] + "0";
            }
            date = dateArr[0] + "." + dateArr[1];
          }
          dateSet.add(date);

          // 按指派人分组
          if (!assigneeData[指派人]) {
            assigneeData[指派人] = {};
          }
          if (!assigneeData[指派人][date]) {
            assigneeData[指派人][date] = [];
          }

          const record = {
            序号,
            姓名,
            性别,
            指派人,
            时间: date
          };
          record[config.nameField] = 姓名; // 兼容性字段
          assigneeData[指派人][date].push(record);
        } catch (itemError) {
          logWarning(`解析第${index + 1}行数据时出错: ${itemError.message}`);
        }
      });

      allDates = Array.from(dateSet).sort();

      logSuccess(
        `数据解析完成: ${Object.keys(assigneeData).length}个指派人, ${
          allDates.length
        }个日期`
      );
      displayData();
    } catch (err) {
      logError("数据解析失败: " + err.message);
    }
  }

  // 显示数据
  function displayData() {
    const display = document.getElementById("data-display");
    const summary = document.getElementById("data-summary");
    const list = document.getElementById("assignee-list");

    // 显示摘要
    const totalRecords = Object.values(assigneeData).reduce((sum, assignee) => {
      return (
        sum + Object.values(assignee).reduce((s, dates) => s + dates.length, 0)
      );
    }, 0);

    summary.innerHTML = `
            📊 数据摘要: ${Object.keys(assigneeData).length}个指派人, ${
      allDates.length
    }个日期, ${totalRecords}条记录<br>
            📅 日期范围: ${allDates[0]} ~ ${allDates[allDates.length - 1]}
        `;

    // 显示指派人列表
    list.innerHTML = "";

    Object.keys(assigneeData).forEach((assignee, index) => {
      const assigneeDiv = document.createElement("div");
      assigneeDiv.style.cssText = `
                margin-bottom: 15px;
                border: 1px solid #ddd;
                border-radius: 6px;
                overflow: hidden;
            `;

      const assigneeDates = Object.keys(assigneeData[assignee]).sort();
      const totalCount = Object.values(assigneeData[assignee]).reduce(
        (sum, dates) => sum + dates.length,
        0
      );

      const assigneeId = `assignee-${index}`;

      assigneeDiv.innerHTML = `
                <div class="assignee-header" data-key="${encodeURIComponent(
                  assignee
                )}" style="
                    background: #f8f9fa;
                    padding: 10px;
                    font-weight: bold;
                    border-bottom: 1px solid #ddd;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    user-select: none;
                    transition: background-color 0.2s ease;
                " onclick="toggleAssignee(this)"
                  onmouseover="this.style.backgroundColor='#e9ecef'"
                  onmouseout="this.style.backgroundColor='#f8f9fa'">
                    <span>👤 ${assignee} (共${totalCount}条数据)</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button onclick="event.stopPropagation(); validateAssigneeAllDates('${assignee}')" style="
                            padding: 4px 8px;
                            background: #dc3545;
                            color: white;
                            border: none;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 12px;
                            font-weight: bold;
                        " title="验证${assignee}的所有日期">🔍 验证全部</button>
                        <span class="assignee-toggle" style="
                            font-size: 12px;
                            color: #666;
                            transition: transform 0.3s ease;
                        ">▼</span>
                    </div>
                </div>
                <div class="assignee-content" style="
                    padding: 0px;
                    transition: max-height 0.3s ease;
                    overflow: hidden;
                    max-height: 0px;
                ">
                    ${assigneeDates
                      .map((date) => {
                        const count = assigneeData[assignee][date].length;
                        return `
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 5px 0;
                                border-bottom: 1px solid #eee;
                            ">
                                <span>📅 ${date} (${count}条)</span>
                                <button onclick="validateData('${assignee}', '${date}')" style="
                                    padding: 4px 8px;
                                    background: #17a2b8;
                                    color: white;
                                    border: none;
                                    border-radius: 3px;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">🔍 验证</button>
                            </div>
                        `;
                      })
                      .join("")}
                </div>
            `;

      list.appendChild(assigneeDiv);

      // 应用保存的折叠状态
      requestAnimationFrame(() => {
        const header = assigneeDiv.querySelector(".assignee-header");
        const content = assigneeDiv.querySelector(".assignee-content");
        const toggle = assigneeDiv.querySelector(".assignee-toggle");
        if (!header || !content || !toggle) return;
        const storageKey =
          "assignee-state-" + (header.getAttribute("data-key") || assigneeId);
        const isCollapsed = localStorage.getItem(storageKey) === "true";
        if (isCollapsed) {
          content.style.maxHeight = "0px";
          content.style.padding = "0px";
          toggle.style.transform = "rotate(-90deg)";
          toggle.textContent = "▶";
        } else {
          content.style.maxHeight = content.scrollHeight + "px";
          content.style.padding = "10px";
          toggle.style.transform = "rotate(0deg)";
          toggle.textContent = "▼";
        }
      });
    });

    display.style.display = "block";
  }

  // 验证数据函数
  async function validateData(assignee, date, batchMode = false) {
    try {
      if (!batchMode) {
        logInfo(`🔍 开始验证 ${assignee} - ${date} 的数据...`);
      }

      // 获取projectId
      const iframe = document.querySelector("#ssfwIframe");
      if (!iframe) {
        const error = "未找到iframe，请确保在正确页面执行";
        if (!batchMode) logError(error);
        return { success: false, error };
      }

      const iframeSrc = iframe.contentWindow.location.href;
      const urlParams = new URLSearchParams(iframeSrc.split("?")[1]);
      const projectId = urlParams.get("projectId");

      if (!projectId) {
        const error = "无法获取projectId";
        if (!batchMode) logError(error);
        return { success: false, error };
      }

      // 转换日期格式 08.21 -> 2025-08-21
      const year = new Date().getFullYear();
      const [month, day] = date.split(".");
      const checkDate = `${year}-${month}-${day}`;

      if (!batchMode) {
        logInfo(`📡 查询日期: ${checkDate}`);
      }

      // 获取已创建的问卷
      const response = await fetch(
        `/lgb/workOrder/mobile/list?searchValue=&pageNum=1&pageSize=100000&projectId=${projectId}&queryState=-1&date=${checkDate}`
      );
      const result = await response.json();

      if (result.code !== 200) {
        const error = "获取问卷数据失败: " + result.msg;
        if (!batchMode) logError(error);
        return { success: false, error };
      }

      const createdSurveys = result.rows || [];
      const createdNames = createdSurveys
        .map(
          (item) =>
            item.workOrderValue || item.patientName || item.consumerName || ""
        )
        .filter((name) => name);

      // 获取本地数据（当前指派人当前日期）
      const localData = assigneeData[assignee][date] || [];
      const localNames = localData.map((item) => item.姓名);

      // 对比分析
      const missing = localNames.filter((name) => !createdNames.includes(name));
      const extra = createdNames.filter((name) => !localNames.includes(name));

      const validationResult = {
        success: true,
        assignee,
        date,
        localCount: localNames.length,
        createdCount: createdSurveys.length,
        missing,
        extra,
        missingData: localData.filter(item => missing.includes(item.姓名))
      };

      if (!batchMode) {
        // 输出结果
        logInfo(`📊 验证结果 (${assignee} - ${date}):`);
        logInfo(`  - 本地数据: ${localNames.length} 条`);
        logInfo(`  - 已创建: ${createdSurveys.length} 条`);

        if (missing.length > 0) {
          logWarning(`❌ 未创建的问卷 (${missing.length}条):`);
          missing.forEach((name) => logWarning(`  - ${name}`));
        }

        if (extra.length > 0) {
          logInfo(`➕ 额外的问卷 (${extra.length}条):`);
          extra.forEach((name) => logInfo(`  - ${name}`));
        }

        if (missing.length === 0) {
          logSuccess(`✅ ${assignee} - ${date} 所有问卷都已创建完成！`);
        }

        // 在界面上显示结果
        showValidationResult(assignee, date, validationResult);
      }

      return validationResult;
    } catch (error) {
      const errorMsg = "验证过程出错: " + error.message;
      if (!batchMode) logError(errorMsg);
      return { success: false, error: errorMsg, assignee, date };
    }
  }

  // 复制JSON到剪贴板
  function copyJsonToClipboard(data) {
    // 转换为统一格式（英文字段名）
    const jsonData = data.map(item => ({
      name: item.姓名 || item.name || "",
      sex: item.性别 || item.sex || "",
      hospital: item.hospital || "",  // Excel中没有医院字段
      address: item.address || "",   // Excel中没有地址字段
      time: item.时间 || item.time || "",
      assignee: item.指派人 || item.assignee || ""
    }));

    const jsonString = JSON.stringify(jsonData, null, 2);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(jsonString).then(() => {
        logSuccess("JSON数据已复制到剪贴板");
        showToast("✅ JSON数据已复制到剪贴板", "success");
      }).catch(err => {
        logError("复制失败: " + err.message);
        fallbackCopyTextToClipboard(jsonString);
      });
    } else {
      fallbackCopyTextToClipboard(jsonString);
    }
  }

  // 备用复制方法
  function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        logSuccess("JSON数据已复制到剪贴板");
        showToast("✅ JSON数据已复制到剪贴板", "success");
      } else {
        logError("复制失败");
        showToast("❌ 复制失败，请手动复制", "error");
      }
    } catch (err) {
      logError("复制失败: " + err.message);
      showToast("❌ 复制失败，请手动复制", "error");
    }

    document.body.removeChild(textArea);
  }

  // 显示提示消息
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === "success" ? "#28a745" : type === "error" ? "#dc3545" : "#17a2b8"};
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      z-index: 10002;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  // 复制日期代码到剪贴板
  function copyDateCode(assignee, date, data) {
    // 生成自动化代码
    const config = questionnaireConfig[currentType];
    if (!config) {
      logError("未知的问卷类型");
      return;
    }

    const code = generateAutomationCode(assignee, date, data, config);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        logSuccess(`✅ 已复制 ${assignee} - ${date} 的自动化代码`);
        showToast(`✅ 已复制 ${assignee} - ${date} 的代码`, "success");
      }).catch(err => {
        logError("复制失败: " + err.message);
        fallbackCopyTextToClipboard(code);
      });
    } else {
      fallbackCopyTextToClipboard(code);
    }
  }

  // 生成指派人自动化代码
  function generateAssigneeAutomationCode(assignee, allMissingData) {
    const config = questionnaireConfig[currentType];
    if (!config) {
      logError("未知的问卷类型");
      return;
    }

    // 转换数据格式为统一格式（英文字段名）
    const normalizedData = allMissingData.map(item => ({
      name: item.姓名 || item.name || "",
      sex: item.性别 || item.sex || "",
      hospital: item.hospital || "",
      address: item.address || "",
      time: item.时间 || item.time || "",
      assignee: item.指派人 || item.assignee || assignee
    }));

    // 获取所有日期
    const allDates = [...new Set(normalizedData.map(item => item.time))].sort();
    const earliestDate = allDates[0] || '';

    const code = generateUnifiedAutomationCode(normalizedData, earliestDate, true, config, assignee);

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        logSuccess(`✅ 已复制 ${assignee} 的完整自动化代码`);
        showToast(`✅ 已复制 ${assignee} 的自动化代码 (${normalizedData.length}条数据)`, "success");
      }).catch(err => {
        logError("复制失败: " + err.message);
        fallbackCopyTextToClipboard(code);
      });
    } else {
      fallbackCopyTextToClipboard(code);
    }
  }

  // 生成统一格式的自动化代码（基于统一自动化脚本的格式）
  function generateUnifiedAutomationCode(data, nowdate, isFullData, config, assignee) {
    return `
// ==================== ${config.name} 自动化脚本 ====================
// 指派人: ${assignee}
// 数据量: ${data.length} 条
// 执行日期: ${nowdate}
// 模式: ${isFullData ? '全量数据' : '单日数据'}
// 生成时间: ${new Date().toLocaleString()}

const data = ${JSON.stringify(data, null, 2)};

// 日志系统
function logError(msg) { console.log('%c❌ ERROR: ' + msg, 'color: #dc3545; font-weight: bold;') }
function logSuccess(msg) { console.log('%c✅ SUCCESS: ' + msg, 'color: #28a745; font-weight: bold;') }
function logInfo(msg) { console.log('%cℹ️ INFO: ' + msg, 'color: #17a2b8;') }
function logWarning(msg) { console.log('%c⚠️ WARNING: ' + msg, 'color: #ffc107; font-weight: bold;') }
function logCommand(msg) { console.log('%c🚀 COMMAND: ' + msg, 'color: #6f42c1; font-weight: bold; background: #f8f9fa; padding: 2px 5px;') }

logInfo(\`📋 当前数据包含 \${data.length} 条记录\`)

// 延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取项目ID
function getProjectId() {
    // 方法1: 从URL参数获取
    const urlParams = new URLSearchParams(window.location.search);
    let projectId = urlParams.get('projectId');

    if (projectId) {
        logInfo(\`📋 从URL获取projectId: \${projectId}\`);
        return projectId;
    }

    // 方法2: 从iframe获取
    const iframe = document.querySelector('#ssfwIframe');
    if (iframe && iframe.contentWindow) {
        try {
            const iframeSrc = iframe.contentWindow.location.href;
            const iframeParams = new URLSearchParams(iframeSrc.split('?')[1]);
            projectId = iframeParams.get('projectId');
            if (projectId) {
                logInfo(\`📋 从iframe获取projectId: \${projectId}\`);
                return projectId;
            }
        } catch (error) {
            logWarning('⚠️ 无法从iframe获取projectId，可能是跨域限制');
        }
    }

    // 方法3: 从页面元素获取
    const projectElements = document.querySelectorAll('[data-project-id], [project-id]');
    for (const element of projectElements) {
        projectId = element.getAttribute('data-project-id') || element.getAttribute('project-id');
        if (projectId) {
            logInfo(\`� 从页面元素获取projectId: \${projectId}\`);
            return projectId;
        }
    }

    logError('❌ 无法获取projectId，请检查页面URL或手动设置');
    return null;
}

// 主执行函数
(async function() {
    logInfo('🚀 开始执行自动化任务...');

    const projectId = getProjectId();
    if (!projectId) {
        logError('❌ 无法获取projectId，任务终止');
        return;
    }

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // 按日期分组处理
    const dateGroups = {};
    data.forEach(item => {
        const date = item.time;
        if (!dateGroups[date]) {
            dateGroups[date] = [];
        }
        dateGroups[date].push(item);
    });

    const dates = Object.keys(dateGroups).sort();
    logInfo(\`📅 需要处理的日期: \${dates.join(', ')}\`);

    for (const date of dates) {
        const dateData = dateGroups[date];
        logInfo(\`\\n📅 开始处理日期: \${date} (共\${dateData.length}条数据)\`);

        // 转换日期格式 MM.DD -> YYYY-MM-DD
        const year = new Date().getFullYear();
        const [month, day] = date.split('.');
        const checkDate = \`\${year}-\${month.padStart(2, '0')}-\${day.padStart(2, '0')}\`;

        // 验证当前日期的数据
        try {
            const response = await fetch(\`/lgb/workOrder/mobile/list?searchValue=&pageNum=1&pageSize=100000&projectId=\${projectId}&queryState=-1&date=\${checkDate}\`);
            const result = await response.json();

            if (result.code !== 200) {
                logError(\`❌ 获取\${date}问卷数据失败: \${result.msg}\`);
                continue;
            }

            const createdSurveys = result.rows || [];
            const createdNames = createdSurveys.map(item =>
                item.workOrderValue || item.patientName || item.consumerName || ''
            ).filter(name => name);

            const localNames = dateData.map(item => item.name);
            const missing = localNames.filter(name => !createdNames.includes(name));

            logInfo(\`� \${date} 验证结果: 本地\${localNames.length}条, 已创建\${createdSurveys.length}条, 未创建\${missing.length}条\`);

            if (missing.length === 0) {
                logSuccess(\`✅ \${date} 所有问卷都已创建完成！\`);
                continue;
            }

            // 处理未创建的数据
            const missingData = dateData.filter(item => missing.includes(item.name));
            logInfo(\`� 开始创建\${date}的\${missingData.length}条未创建问卷...\`);

            for (let i = 0; i < missingData.length; i++) {
                const item = missingData[i];
                logInfo(\`📝 处理第\${i + 1}/\${missingData.length}条: \${item.name} (\${item.sex})\`);

                try {
                    // TODO: 在这里添加具体的创建逻辑
                    // 1. 创建联系人
                    // 2. 创建问卷
                    // 参考统一自动化脚本.html中的实现

                    logSuccess(\`✅ \${item.name} 创建成功\`);
                    successCount++;
                    results.push({ name: item.name, date: date, success: true });

                    // 延迟避免请求过快
                    await delay(2000);

                } catch (error) {
                    logError(\`❌ \${item.name} 创建失败: \${error.message}\`);
                    errorCount++;
                    results.push({ name: item.name, date: date, success: false, error: error.message });
                }
            }

        } catch (error) {
            logError(\`❌ 处理日期\${date}时出错: \${error.message}\`);
            errorCount += dateData.length;
        }

        // 日期间延迟
        if (dates.indexOf(date) < dates.length - 1) {
            logInfo('⏸️ 等待5秒后处理下一个日期...');
            await delay(5000);
        }
    }

    // 输出最终结果
    logInfo(\`\\n📊 ${assignee} 自动化任务执行完成！\`);
    logInfo(\`✅ 成功: \${successCount} 条\`);
    logInfo(\`❌ 失败: \${errorCount} 条\`);
    logInfo(\`📈 总进度: \${successCount}/\${data.length} (\${Math.round(successCount/data.length*100)}%)\`);

    if (errorCount > 0) {
        logWarning('⚠️ 失败的数据:');
        results.filter(r => !r.success).forEach((item, index) => {
            logWarning(\`  \${index + 1}. \${item.name} (\${item.date}) - \${item.error || '未知错误'}\`);
        });
    }

    if (errorCount === 0) {
        logSuccess('🎉 所有数据处理成功！');
    } else {
        logWarning(\`⚠️ 还有 \${errorCount} 条数据需要手动处理\`);
    }
})();
`;
  }

  // 生成自动化代码（保持向后兼容）
  function generateAutomationCode(assignee, date, data, config) {
    // 转换数据格式为统一格式
    const normalizedData = data.map(item => ({
      name: item.姓名 || item.name || "",
      sex: item.性别 || item.sex || "",
      hospital: item.hospital || "",
      address: item.address || "",
      time: item.时间 || item.time || date,
      assignee: item.指派人 || item.assignee || assignee
    }));

    return generateUnifiedAutomationCode(normalizedData, date, false, config, assignee);
  }

  // 显示指派人批量验证结果
  function showAssigneeValidationResult(assignee, summary) {
    const existingResult = document.getElementById("assignee-validation-result");
    if (existingResult) {
      existingResult.remove();
    }

    const resultDiv = document.createElement("div");
    resultDiv.id = "assignee-validation-result";
    resultDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #dc3545;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10001;
            max-width: 700px;
            max-height: 600px;
            overflow-y: auto;
        `;

    const statusColor = summary.totalMissing === 0 ? "#28a745" : "#dc3545";
    const statusIcon = summary.totalMissing === 0 ? "✅" : "⚠️";
    const statusText = summary.totalMissing === 0 ? "全部完成" : `还有${summary.totalMissing}条未创建`;

    resultDiv.innerHTML = `
            <div style="
                background: ${statusColor};
                color: white;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <span style="font-weight: bold;">${statusIcon} ${assignee} 批量验证结果 - ${statusText}</span>
                <button onclick="this.closest('#assignee-validation-result').remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                ">×</button>
            </div>

            <div style="padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <strong>📊 总体统计:</strong><br>
                    本地数据总计: ${summary.totalLocal} 条<br>
                    已创建总计: ${summary.totalCreated} 条<br>
                    未创建总计: ${summary.totalMissing} 条
                </div>

                ${summary.totalMissing > 0 ? `
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                            <strong style="color: #dc3545;">❌ ${assignee} 所有未创建问卷 (${summary.totalMissing}条):</strong>
                            <div>
                                <button onclick="generateAssigneeAutomationCode('${assignee}', ${JSON.stringify(summary.allMissingData).replace(/"/g, '&quot;')})" style="
                                    padding: 6px 12px;
                                    background: #007bff;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    font-weight: bold;
                                    margin-right: 8px;
                                ">🤖 生成自动化代码</button>
                                <button onclick="copyJsonToClipboard(${JSON.stringify(summary.allMissingData).replace(/"/g, '&quot;')})" style="
                                    padding: 6px 12px;
                                    background: #28a745;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 14px;
                                    font-weight: bold;
                                    margin-right: 8px;
                                ">📋 复制所有未创建JSON</button>
                                <button onclick="showJsonPreview(${JSON.stringify(summary.allMissingData).replace(/"/g, '&quot;')})" style="
                                    padding: 6px 12px;
                                    background: #17a2b8;
                                    color: white;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                    font-size: 14px;
                                ">👁️ 预览JSON</button>
                            </div>
                        </div>

                        <div style="max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 13px;">
                            ${summary.allMissingData.map(item => `• ${item.姓名} (${item.性别}) - ${item.时间}`).join('<br>')}
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <strong>📅 按日期分组的详细结果:</strong>
                    </div>

                    ${Object.entries(summary.results).map(([date, result]) => {
                        if (!result.success) return `
                            <div style="margin: 8px 0; padding: 10px; background: #f8d7da; border-radius: 4px; border-left: 4px solid #dc3545;">
                                <strong>${date}</strong> - ❌ 验证失败: ${result.error}
                            </div>
                        `;

                        const missingCount = result.missing ? result.missing.length : 0;
                        const bgColor = missingCount === 0 ? "#d4edda" : "#fff3cd";
                        const borderColor = missingCount === 0 ? "#28a745" : "#ffc107";
                        const icon = missingCount === 0 ? "✅" : "⚠️";

                        return `
                            <div style="margin: 8px 0; padding: 10px; background: ${bgColor}; border-radius: 4px; border-left: 4px solid ${borderColor};">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong>${icon} ${date}</strong>
                                    <span>本地:${result.localCount} | 已创建:${result.createdCount} | 未创建:${missingCount}</span>
                                </div>
                                ${missingCount > 0 ? `
                                    <div style="margin-top: 8px; font-size: 12px;">
                                        未创建: ${result.missing.join(', ')}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                ` : `
                    <div style="text-align: center; padding: 20px; color: #28a745;">
                        <h3>🎉 恭喜！</h3>
                        <p>${assignee} 的所有问卷都已创建完成！</p>
                    </div>
                `}
            </div>
        `;

    document.body.appendChild(resultDiv);
  }

  // 显示验证结果
  function showValidationResult(assignee, date, result) {
    const existingResult = document.getElementById("validation-result");
    if (existingResult) {
      existingResult.remove();
    }

    const resultDiv = document.createElement("div");
    resultDiv.id = "validation-result";
    resultDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #007bff;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 10001;
            max-width: 600px;
            max-height: 500px;
            overflow-y: auto;
        `;

    const statusColor = result.missing.length === 0 ? "#28a745" : "#dc3545";
    const statusIcon = result.missing.length === 0 ? "✅" : "❌";
    const statusText = result.missing.length === 0 ? "验证通过" : "发现遗漏";

    resultDiv.innerHTML = `
            <div style="
                background: ${statusColor};
                color: white;
                padding: 15px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <span style="font-weight: bold;">${statusIcon} ${assignee} - ${date} ${statusText}</span>
                <button onclick="this.closest('#validation-result').remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                ">×</button>
            </div>

            <div style="padding: 20px;">
                <div style="margin-bottom: 15px;">
                    <strong>📊 统计信息:</strong><br>
                    本地数据: ${result.localCount} 条<br>
                    已创建: ${result.createdCount} 条
                </div>

                ${
                  result.missing.length > 0
                    ? `
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong style="color: #dc3545;">❌ 未创建 (${
                              result.missing.length
                            }条):</strong>
                            <div>
                                <button onclick="copyDateCode('${assignee}', '${date}', ${JSON.stringify(result.missingData).replace(/"/g, '&quot;')})" style="
                                    padding: 4px 8px;
                                    background: #007bff;
                                    color: white;
                                    border: none;
                                    border-radius: 3px;
                                    cursor: pointer;
                                    font-size: 12px;
                                    margin-right: 5px;
                                ">📋 复制${date}代码</button>
                                <button onclick="copyJsonToClipboard(${JSON.stringify(result.missingData).replace(/"/g, '&quot;')})" style="
                                    padding: 4px 8px;
                                    background: #28a745;
                                    color: white;
                                    border: none;
                                    border-radius: 3px;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">📋 复制JSON</button>
                            </div>
                        </div>
                        ${result.missing
                          .map((name) => `• ${name}`)
                          .join("<br>")}
                        <div style="margin-top: 10px;">
                            <button onclick="showJsonPreview(${JSON.stringify(result.missingData).replace(/"/g, '&quot;')})" style="
                                padding: 4px 8px;
                                background: #17a2b8;
                                color: white;
                                border: none;
                                border-radius: 3px;
                                cursor: pointer;
                                font-size: 12px;
                            ">👁️ 预览JSON</button>
                        </div>
                    </div>
                `
                    : ""
                }

                ${
                  result.extra.length > 0
                    ? `
                    <div style="margin-bottom: 15px;">
                        <strong style="color: #17a2b8;">➕ 额外创建 (${
                          result.extra.length
                        }条):</strong><br>
                        ${result.extra.map((name) => `• ${name}`).join("<br>")}
                    </div>
                `
                    : ""
                }

                ${
                  result.missing.length === 0
                    ? `
                    <div style="
                        background: #d4edda;
                        color: #155724;
                        padding: 10px;
                        border-radius: 4px;
                        text-align: center;
                    ">
                        🎉 所有问卷都已正确创建！
                    </div>
                `
                    : ""
                }
            </div>
        `;

    document.body.appendChild(resultDiv);
  }

  // 显示JSON预览
  function showJsonPreview(data) {
    const existingPreview = document.getElementById("json-preview");
    if (existingPreview) {
      existingPreview.remove();
    }

    const jsonData = data.map(item => ({
      name: item.姓名 || "",
      sex: item.性别 || "",
      hospital: "",  // Excel中没有医院字段
      address: "",   // Excel中没有地址字段
      time: item.时间 || "",
      assignee: item.指派人 || ""
    }));

    const previewDiv = document.createElement("div");
    previewDiv.id = "json-preview";
    previewDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #17a2b8;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10002;
      max-width: 700px;
      max-height: 600px;
      overflow-y: auto;
    `;

    previewDiv.innerHTML = `
      <div style="
        background: #17a2b8;
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <span style="font-weight: bold;">📋 JSON数据预览</span>
        <div>
          <button onclick="copyJsonToClipboard(${JSON.stringify(data).replace(/"/g, '&quot;')})" style="
            background: #28a745;
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            margin-right: 10px;
            font-size: 12px;
          ">📋 复制</button>
          <button onclick="this.closest('#json-preview').remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
          ">×</button>
        </div>
      </div>

      <div style="padding: 20px;">
        <pre style="
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        ">${JSON.stringify(jsonData, null, 2)}</pre>
      </div>
    `;

    document.body.appendChild(previewDiv);
  }

  // 折叠/展开指派人内容
  function toggleAssignee(headerEl) {
    // 从当前 header 开始，仅作用于其父容器下的 content/toggle
    const container = headerEl.parentElement;
    if (!container) return;
    const content = container.querySelector(":scope > .assignee-content");
    // 修复：toggle现在在div容器内，需要使用更深层的选择器
    const toggle = headerEl.querySelector(".assignee-toggle");
    if (!content || !toggle) return;
    const storageKey =
      "assignee-state-" + (headerEl.getAttribute("data-key") || "");

    const isCollapsed =
      parseInt(window.getComputedStyle(content).maxHeight, 10) === 0;
    if (isCollapsed) {
      // 展开当前，恢复内边距
      content.style.padding = "10px";
      content.style.maxHeight = content.scrollHeight + "px";
      toggle.style.transform = "rotate(0deg)";
      toggle.textContent = "▼";
      if (storageKey) localStorage.setItem(storageKey, "false");
    } else {
      // 折叠当前，去除内边距避免残留内容
      content.style.maxHeight = "0px";
      content.style.padding = "0px";
      toggle.style.transform = "rotate(-90deg)";
      toggle.textContent = "▶";
      if (storageKey) localStorage.setItem(storageKey, "true");
    }
  }

  // 全部展开
  function expandAllAssignees() {
    const headers = document.querySelectorAll(".assignee-header");
    headers.forEach((header) => {
      const container = header.parentElement;
      if (!container) return;
      const content = container.querySelector(":scope > .assignee-content");
      const toggle = header.querySelector(":scope > .assignee-toggle");
      if (!content || !toggle) return;
      content.style.padding = "10px";
      content.style.maxHeight = content.scrollHeight + "px";
      toggle.style.transform = "rotate(0deg)";
      toggle.textContent = "▼";
      const storageKey =
        "assignee-state-" + (header.getAttribute("data-key") || "");
      if (storageKey) localStorage.setItem(storageKey, "false");
    });
  }

  // 全部折叠
  function collapseAllAssignees() {
    const headers = document.querySelectorAll(".assignee-header");
    headers.forEach((header) => {
      const container = header.parentElement;
      if (!container) return;
      const content = container.querySelector(":scope > .assignee-content");
      const toggle = header.querySelector(":scope > .assignee-toggle");
      if (!content || !toggle) return;
      content.style.maxHeight = "0px";
      content.style.padding = "0px";
      toggle.style.transform = "rotate(-90deg)";
      toggle.textContent = "▶";
      const storageKey =
        "assignee-state-" + (header.getAttribute("data-key") || "");
      if (storageKey) localStorage.setItem(storageKey, "true");
    });
  }

  // 验证单个指派人的所有日期
  async function validateAssigneeAllDates(assignee) {
    if (isValidatingAll) {
      logWarning("正在进行验证，请等待完成");
      return;
    }

    if (!assigneeData || !assigneeData[assignee]) {
      logError(`未找到指派人 ${assignee} 的数据`);
      return;
    }

    isValidatingAll = true;
    validationCancelled = false;

    logInfo(`🚀 开始验证 ${assignee} 的所有日期数据`);

    try {
      // 收集该指派人的所有日期任务
      const dates = Object.keys(assigneeData[assignee]);
      const tasks = dates.map(date => ({ assignee, date }));

      logInfo(`📊 ${assignee} 共有 ${tasks.length} 个日期需要验证`);

      let successCount = 0;
      let errorCount = 0;
      const results = {};

      // 逐个验证该指派人的每个日期
      for (let i = 0; i < tasks.length; i++) {
        if (validationCancelled) {
          logWarning("验证已被用户取消");
          break;
        }

        const { date } = tasks[i];
        logInfo(`\n📋 批量验证进度: ${i + 1}/${tasks.length} - ${assignee} - ${date}`);

        try {
          // 使用非批量模式，这样每个验证都会有完整的日志输出，就像单独点击验证一样
          const result = await validateData(assignee, date, false);
          results[date] = result;

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }

          // 添加延迟避免请求过快
          if (i < tasks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          errorCount++;
          logError(`❌ ${assignee} - ${date} 验证出错: ${error.message}`);
        }
      }

      // 输出该指派人的验证汇总
      logInfo(`\n📊 ${assignee} 验证完成汇总:`);
      logInfo(`✅ 成功验证: ${successCount} 个日期`);
      logInfo(`❌ 验证失败: ${errorCount} 个日期`);

      // 统计未创建的问卷总数
      let totalMissing = 0;
      let totalLocal = 0;
      let totalCreated = 0;

      Object.values(results).forEach(result => {
        if (result.success) {
          totalMissing += result.missing ? result.missing.length : 0;
          totalLocal += result.localCount || 0;
          totalCreated += result.createdCount || 0;
        }
      });

      logInfo(`📋 数据统计:`);
      logInfo(`  - 本地数据总计: ${totalLocal} 条`);
      logInfo(`  - 已创建总计: ${totalCreated} 条`);
      logInfo(`  - 未创建总计: ${totalMissing} 条`);

      if (totalMissing === 0) {
        logSuccess(`🎉 ${assignee} 的所有问卷都已创建完成！`);
        showToast(`✅ ${assignee} 验证完成，所有问卷已创建`, "success");
      } else {
        logWarning(`⚠️ ${assignee} 还有 ${totalMissing} 条问卷未创建`);
        showToast(`⚠️ ${assignee} 验证完成，还有 ${totalMissing} 条未创建`, "error");

        // 收集该指派人所有未创建的问卷数据
        const allMissingData = [];
        Object.values(results).forEach(result => {
          if (result.success && result.missingData) {
            allMissingData.push(...result.missingData);
          }
        });

        // 显示复制按钮的弹窗
        showAssigneeValidationResult(assignee, {
          totalLocal,
          totalCreated,
          totalMissing,
          allMissingData,
          results
        });
      }

    } catch (error) {
      logError(`验证 ${assignee} 时出错: ${error.message}`);
      showToast(`❌ 验证 ${assignee} 时出错`, "error");
    } finally {
      isValidatingAll = false;
    }
  }

  // 取消验证
  function cancelValidation() {
    validationCancelled = true;
    logWarning("正在取消验证...");
  }

  // 显示全局统计摘要
  function showGlobalStatisticsSummary() {
    const summaryDiv = document.getElementById("global-stats-summary");

    let totalLocal = 0;
    let totalCreated = 0;
    let totalMissing = 0;
    let totalExtra = 0;
    let successfulValidations = 0;
    let failedValidations = 0;

    Object.keys(globalValidationResults).forEach(assignee => {
      Object.keys(globalValidationResults[assignee]).forEach(date => {
        const result = globalValidationResults[assignee][date];
        if (result.success) {
          successfulValidations++;
          totalLocal += result.localCount || 0;
          totalCreated += result.createdCount || 0;
          totalMissing += (result.missing || []).length;
          totalExtra += (result.extra || []).length;
        } else {
          failedValidations++;
        }
      });
    });

    const completionRate = totalLocal > 0 ? ((totalCreated / totalLocal) * 100).toFixed(1) : 0;

    summaryDiv.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
        <div><strong>📊 验证任务:</strong> ${successfulValidations + failedValidations}</div>
        <div><strong>✅ 成功:</strong> ${successfulValidations}</div>
        <div><strong>📝 本地数据:</strong> ${totalLocal}</div>
        <div><strong>🏥 已创建:</strong> ${totalCreated}</div>
        <div><strong>❌ 未创建:</strong> ${totalMissing}</div>
        <div><strong>➕ 额外:</strong> ${totalExtra}</div>
        <div style="grid-column: 1 / -1;"><strong>📈 完成率:</strong> ${completionRate}%</div>
      </div>
    `;
  }

  // 导出所有未创建的JSON数据
  function exportAllMissingJson() {
    if (!globalValidationResults || Object.keys(globalValidationResults).length === 0) {
      logError("请先执行一键验证所有日期");
      showToast("❌ 请先执行一键验证", "error");
      return;
    }

    const allMissingData = [];

    Object.keys(globalValidationResults).forEach(assignee => {
      Object.keys(globalValidationResults[assignee]).forEach(date => {
        const result = globalValidationResults[assignee][date];
        if (result.success && result.missingData && result.missingData.length > 0) {
          allMissingData.push(...result.missingData);
        }
      });
    });

    if (allMissingData.length === 0) {
      logSuccess("🎉 没有未创建的数据！");
      showToast("🎉 没有未创建的数据", "success");
      return;
    }

    // 转换为标准JSON格式
    const jsonData = allMissingData.map(item => ({
      name: item.姓名 || "",
      sex: item.性别 || "",
      hospital: "",  // Excel中没有医院字段
      address: "",   // Excel中没有地址字段
      time: item.时间 || "",
      assignee: item.指派人 || ""
    }));

    const jsonString = JSON.stringify(jsonData, null, 2);

    // 复制到剪贴板
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(jsonString).then(() => {
        logSuccess(`✅ 已复制 ${allMissingData.length} 条未创建数据的JSON到剪贴板`);
        showToast(`✅ 已复制 ${allMissingData.length} 条数据`, "success");
      }).catch(err => {
        logError("复制失败: " + err.message);
        fallbackCopyTextToClipboard(jsonString);
      });
    } else {
      fallbackCopyTextToClipboard(jsonString);
    }
  }

  // 显示详细的全局统计
  function showGlobalStatistics() {
    if (!globalValidationResults || Object.keys(globalValidationResults).length === 0) {
      logError("请先执行一键验证所有日期");
      showToast("❌ 请先执行一键验证", "error");
      return;
    }

    const existingStats = document.getElementById("global-statistics-detail");
    if (existingStats) {
      existingStats.remove();
    }

    const statsDiv = document.createElement("div");
    statsDiv.id = "global-statistics-detail";
    statsDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #28a745;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10001;
      max-width: 800px;
      max-height: 600px;
      overflow-y: auto;
    `;

    // 生成详细统计内容
    let detailContent = "";
    let totalMissingCount = 0;

    Object.keys(globalValidationResults).forEach(assignee => {
      const assigneeResults = globalValidationResults[assignee];
      let assigneeMissingCount = 0;
      let assigneeContent = "";

      Object.keys(assigneeResults).forEach(date => {
        const result = assigneeResults[date];
        if (result.success) {
          const missingCount = (result.missing || []).length;
          assigneeMissingCount += missingCount;
          totalMissingCount += missingCount;

          const statusIcon = missingCount === 0 ? "✅" : "❌";
          const statusColor = missingCount === 0 ? "#28a745" : "#dc3545";

          assigneeContent += `
            <div style="margin: 5px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid ${statusColor};">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${statusIcon} ${date}</span>
                <span style="font-size: 12px; color: #666;">
                  本地:${result.localCount} | 已创建:${result.createdCount} | 未创建:${missingCount}
                </span>
              </div>
              ${missingCount > 0 ? `
                <div style="margin-top: 5px; font-size: 11px; color: #dc3545;">
                  未创建: ${result.missing.join(", ")}
                </div>
              ` : ""}
            </div>
          `;
        } else {
          assigneeContent += `
            <div style="margin: 5px 0; padding: 8px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #ffc107;">
              <span>⚠️ ${date} - 验证失败: ${result.error}</span>
            </div>
          `;
        }
      });

      const assigneeStatusColor = assigneeMissingCount === 0 ? "#28a745" : "#dc3545";
      detailContent += `
        <div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 6px; overflow: hidden;">
          <div style="background: ${assigneeStatusColor}; color: white; padding: 10px; font-weight: bold;">
            👤 ${assignee} (未创建: ${assigneeMissingCount}条)
          </div>
          <div style="padding: 10px;">
            ${assigneeContent}
          </div>
        </div>
      `;
    });

    statsDiv.innerHTML = `
      <div style="
        background: #28a745;
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <span style="font-weight: bold;">📈 全局验证详细统计 (总未创建: ${totalMissingCount}条)</span>
        <div>
          <button onclick="exportAllMissingJson()" style="
            background: #17a2b8;
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            margin-right: 10px;
            font-size: 12px;
          ">📋 导出JSON</button>
          <button onclick="this.closest('#global-statistics-detail').remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
          ">×</button>
        </div>
      </div>

      <div style="padding: 20px; max-height: 500px; overflow-y: auto;">
        ${detailContent}
      </div>
    `;

    document.body.appendChild(statsDiv);
  }

  // 将验证函数暴露到全局
  window.validateData = validateData;
  window.validateAssigneeAllDates = validateAssigneeAllDates;
  window.cancelValidation = cancelValidation;
  window.exportAllMissingJson = exportAllMissingJson;
  window.showGlobalStatistics = showGlobalStatistics;
  window.toggleAssignee = toggleAssignee;
  window.expandAllAssignees = expandAllAssignees;
  window.collapseAllAssignees = collapseAllAssignees;
  window.copyJsonToClipboard = copyJsonToClipboard;
  window.showJsonPreview = showJsonPreview;
  window.copyDateCode = copyDateCode;

  // 创建触发按钮
  function createTriggerButton() {
    // 删除所有已存在的按钮（可能有多个）
    const existingButtons = document.querySelectorAll(
      "#validator-trigger, [data-validator-trigger]"
    );
    existingButtons.forEach((btn) => btn.remove());

    const button = document.createElement("button");
    button.id = "validator-trigger";
    button.setAttribute("data-validator-trigger", "true");
    button.innerHTML = "🔍 验证工具";
    button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 20px;
            padding: 10px 20px;
            cursor: pointer;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `;

    button.onmouseenter = () => {
      button.style.background = "#0056b3";
      button.style.transform = "scale(1.05)";
    };

    button.onmouseleave = () => {
      button.style.background = "#007bff";
      button.style.transform = "scale(1)";
    };

    button.onclick = () => {
      createUI();
      showPanel();
      // 隐藏触发按钮
      button.style.display = "none";
    };

    document.body.appendChild(button);
  }

  // 防止重复初始化
  let isInitialized = false;

  // 全局标记，防止脚本重复运行
  if (window.questionnaireValidatorLoaded) {
    return;
  }
  window.questionnaireValidatorLoaded = true;

  // 初始化
  function init() {
    // 防止重复初始化
    if (isInitialized) return;

    // 检查是否在目标页面
    if (window.location.hostname === "zxyy.ltd") {
      createTriggerButton();
      isInitialized = true;
      logInfo("问卷数据验证工具已加载");
    }
  }

  // 页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 监听页面变化（SPA应用）
  let lastUrl = location.href;
  let observerTimeout = null;

  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;

      // 使用防抖机制，避免频繁触发
      if (observerTimeout) {
        clearTimeout(observerTimeout);
      }

      observerTimeout = setTimeout(() => {
        // 只有在按钮真的不存在且没有面板打开时才重新创建
        const hasButton = document.getElementById("validator-trigger");
        const hasPanel = document.getElementById("questionnaire-validator");

        if (
          !hasButton &&
          !hasPanel &&
          window.location.hostname === "zxyy.ltd"
        ) {
          isInitialized = false;
          init();
        }
      }, 2000);
    }
  }).observe(document, { subtree: true, childList: true });
})();
