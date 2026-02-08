// 🚀 Excel Validation Worker - 前端解析主流程
//
// 此Worker负责纯前端Excel验证，包括：
// - Excel文件解析和数据验证
// - WPS Excel图片按工作表过滤
// - 图片清晰度和重复性检测
// - 无需上传文件到服务器，保护数据安全

// Worker Version: 1.0.6 - 表头选择优化（匹配+列数双重验证）
const WORKER_VERSION = "1.0.6";
console.log("🔧 Validation Worker Version:", WORKER_VERSION);
console.log("📋 表头搜索范围: 前10行（完全匹配立即返回）");

importScripts("/vendor/xlsx.full.min.js");
importScripts("/vendor/jszip.min.js");

// 📊 加载新的可疑度评分系统 （方案B）
try {
  importScripts("/image-suspicion-scorer.js");
  console.log("✅ 可疑度评分系统加载成功");
} catch (error) {
  console.warn("⚠️ 可疑度评分系统加载失败，将使用旧系统", error);
}

// 尝试加载 blockhash-core.js，如果失败则跳过图片验证
let blockHashAvailable = false;
try {
  // 尝试多种路径方式，兼容不同浏览器
  try {
    importScripts("./blockhash-core.js");
  } catch (e1) {
    try {
      importScripts("/blockhash-core.js");
    } catch (e2) {
      importScripts(self.location.origin + "/blockhash-core.js");
    }
  }
  blockHashAvailable = true;
} catch (error) {
  console.warn("blockhash-core.js 加载失败，图片验证功能将被禁用:", error);
  // 提供一个空的 blockhash 函数作为后备
  self.blockhash = function () {
    return null;
  };
  blockHashAvailable = false;
}

// Worker message types
const MESSAGE_TYPES = {
  VALIDATE_EXCEL: "VALIDATE_EXCEL",
  VALIDATE_IMAGES: "VALIDATE_IMAGES",
  PROGRESS: "PROGRESS",
  RESULT: "RESULT",
  ERROR: "ERROR",
  CANCEL: "CANCEL",
  DEBUG_LOG: "DEBUG_LOG", // 新增：调试日志消息类型
};

// Performance configuration
const PERFORMANCE_CONFIG = {
  CHUNK_SIZE: 1000, // 每次处理的行数
  PROGRESS_INTERVAL: 100, // 进度更新间隔（毫秒）
  MEMORY_THRESHOLD: 100 * 1024 * 1024, // 100MB内存阈值
  MAX_ROWS_IN_MEMORY: 10000, // 内存中最大行数
};

// 范围矫正配置（可随时调整阈值）
const RANGE_CORRECTION_CONFIG = {
  ENABLED: true,
  ROW_THRESHOLD: 5000, // 超过该行数时尝试按实际单元格矫正
};

// Image duplicate detection configuration
const IMAGE_DUP_CONFIG = {
  BLOCKHASH_BITS: 12,
  HAMMING_THRESHOLD: 12,
  NEAR_THRESHOLD_MARGIN: 4,
  MAD_SIZE: 64,
  USE_SSIM: true,
  SSIM_GOOD: 0.7,
  SSIM_STRICT: 0.85,
};

// Mobile-like dimension heuristics (configurable)
// 🔧 方案A快速修复：放宽阈值以支持微信压缩图和现代全面屏手机
const MOBILE_DIMENSION_CONFIG = {
  ENABLED: true,
  MIN_SHORT_SIDE: 480, // 从720降到480 - 支持压缩后的图片
  MIN_LONG_SIDE: 640, // 从1280降到640 - 兼容早期手机
  MIN_MEGAPIXELS: 0.5, // 从2降到0.5 - 允许微信/QQ压缩图
  ALLOWED_ASPECTS: [
    { ratio: 4 / 3, tolerance: 0.1 }, // 传统手机比例
    { ratio: 3 / 4, tolerance: 0.1 },
    { ratio: 16 / 9, tolerance: 0.1 }, // 标准宽屏
    { ratio: 9 / 16, tolerance: 0.1 },
    { ratio: 18 / 9, tolerance: 0.1 }, // 全面屏 (2:1)
    { ratio: 9 / 18, tolerance: 0.1 },
    { ratio: 19.5 / 9, tolerance: 0.1 }, // iPhone X/11/12/13 系列
    { ratio: 9 / 19.5, tolerance: 0.1 },
    { ratio: 20 / 9, tolerance: 0.1 }, // 小米/OPPO/Vivo等
    { ratio: 9 / 20, tolerance: 0.1 },
    { ratio: 21 / 9, tolerance: 0.12 }, // Sony Xperia等超宽屏
    { ratio: 9 / 21, tolerance: 0.12 },
    { ratio: 1, tolerance: 0.05 }, // 正方形 (Instagram裁剪等)
  ],
};

// Global state
let isValidationCancelled = false;
let templateFromMainThread = null;

// Worker现在完全依赖从主线程传入的模板，不再维护内置模板
// 这确保了UI和Worker使用完全相同的模板定义

// 🚀 统一日志系统
const ImageDebugLogger = {
  // 日志级别
  LEVELS: {
    INFO: "INFO",
    WARN: "WARN",
    ERROR: "ERROR",
    DEBUG: "DEBUG",
  },

  // 处理阶段标识
  STAGES: {
    FILE_PARSE: "FILE_PARSE",
    ZIP_EXTRACT: "ZIP_EXTRACT",
    SHEET_IDENTIFY: "SHEET_IDENTIFY",
    IMAGE_EXTRACT: "IMAGE_EXTRACT",
    POSITION_MAP: "POSITION_MAP",
    IMAGE_PROCESS: "IMAGE_PROCESS",
    QUALITY_CHECK: "QUALITY_CHECK",
    DUPLICATE_CHECK: "DUPLICATE_CHECK",
    MEMORY_MONITOR: "MEMORY_MONITOR",
  },

  // 发送日志到主线程
  log(level, stage, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      stage,
      message,
      data,
      prefix: "[IMAGE_DEBUG]",
    };

    // 发送到主线程显示
    postMessage({
      type: MESSAGE_TYPES.DEBUG_LOG,
      data: logEntry,
    });

    // 同时在Worker控制台输出
    const consoleMsg = `${logEntry.prefix} [${timestamp}] [${level}] [${stage}] ${message}`;
    switch (level) {
      case this.LEVELS.ERROR:
        console.error(consoleMsg, data);
        break;
      case this.LEVELS.WARN:
        console.warn(consoleMsg, data);
        break;
      case this.LEVELS.DEBUG:
        console.debug(consoleMsg, data);
        break;
      default:
        console.log(consoleMsg, data);
    }
  },

  // 便捷方法
  info(stage, message, data) {
    this.log(this.LEVELS.INFO, stage, message, data);
  },
  warn(stage, message, data) {
    this.log(this.LEVELS.WARN, stage, message, data);
  },
  error(stage, message, data) {
    this.log(this.LEVELS.ERROR, stage, message, data);
  },
  debug(stage, message, data) {
    this.log(this.LEVELS.DEBUG, stage, message, data);
  },

  // 性能监控
  startTimer(stage) {
    const key = `timer_${stage}`;
    this[key] = performance.now();
    this.debug(stage, `开始计时: ${stage}`);
  },

  endTimer(stage, message = "") {
    const key = `timer_${stage}`;
    if (this[key]) {
      const duration = performance.now() - this[key];
      this.info(stage, `${message || stage} 耗时: ${duration.toFixed(2)}ms`);
      delete this[key];
      return duration;
    }
    return 0;
  },

  // 内存使用监控
  logMemoryUsage(stage, context = "") {
    if (typeof performance !== "undefined" && performance.memory) {
      const memory = performance.memory;
      const memoryInfo = {
        usedJSHeapSize: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + "MB",
        totalJSHeapSize:
          (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + "MB",
        jsHeapSizeLimit:
          (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + "MB",
        context,
      };
      this.info(
        this.STAGES.MEMORY_MONITOR,
        `内存使用情况 ${context}`,
        memoryInfo
      );

      // 内存警告
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      if (usedMB > 500) {
        this.warn(
          this.STAGES.MEMORY_MONITOR,
          `内存使用过高: ${usedMB.toFixed(2)}MB`
        );
      }
    }
  },
};

// Streaming validation function
async function validateExcelStreaming(fileBuffer, taskName, selectedSheet) {
  isValidationCancelled = false;

  // 开始整体计时和内存监控
  ImageDebugLogger.startTimer("TOTAL_VALIDATION");
  ImageDebugLogger.logMemoryUsage(
    ImageDebugLogger.STAGES.FILE_PARSE,
    "验证开始"
  );

  const fileSizeMB = fileBuffer.byteLength / 1024 / 1024;
  const fileSizeGB = fileSizeMB / 1024;
  const isLargeFile = fileSizeMB > 100;
  const isVeryLargeFile = fileSizeMB > 1024; // 1GB+
  const isHugeFile = fileSizeMB > 2048; // 2GB+

  ImageDebugLogger.info(
    ImageDebugLogger.STAGES.FILE_PARSE,
    `开始验证Excel文件`,
    {
      fileSize:
        fileSizeMB > 1024
          ? `${fileSizeGB.toFixed(2)}GB`
          : `${fileSizeMB.toFixed(2)}MB`,
      taskName,
      selectedSheet: selectedSheet || "未指定",
      isLargeFile,
      isVeryLargeFile,
      isHugeFile,
    }
  );

  // For large files, add memory warnings with different levels
  if (isHugeFile) {
    ImageDebugLogger.warn(
      ImageDebugLogger.STAGES.FILE_PARSE,
      `检测到超大文件 (${fileSizeGB.toFixed(2)}GB)，处理时间可能较长`,
      {
        estimatedTime: "10-30分钟",
        currentSize: `${fileSizeGB.toFixed(2)}GB`,
        optimizations: ["最简解析模式", "单工作表处理", "内存优化"],
      }
    );
  } else if (isVeryLargeFile) {
    ImageDebugLogger.warn(
      ImageDebugLogger.STAGES.FILE_PARSE,
      `检测到大文件 (${fileSizeGB.toFixed(2)}GB)，将使用优化处理模式`,
      {
        estimatedTime: "5-15分钟",
        currentSize: `${fileSizeGB.toFixed(2)}GB`,
        optimizations: ["简化解析选项", "分块处理", "内存监控"],
      }
    );
  } else if (isLargeFile) {
    ImageDebugLogger.warn(
      ImageDebugLogger.STAGES.FILE_PARSE,
      `检测到较大文件 (${fileSizeMB.toFixed(0)}MB)，将使用优化处理模式`,
      {
        estimatedTime: "1-5分钟",
        currentSize: `${fileSizeMB.toFixed(2)}MB`,
        optimizations: ["分块处理", "内存监控", "垃圾回收"],
      }
    );
  }

  try {
    // 🚀 立即发送进度，让用户知道开始解析
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 10, message: "正在解析Excel文件..." },
    });

    let workbook;
    try {
      ImageDebugLogger.startTimer("EXCEL_PARSE");

      // 根据文件大小选择不同的解析策略
      let parseOptions;

      if (fileBuffer.byteLength > 500 * 1024 * 1024) {
        // 超大文件（>500MB）：使用最简单的解析选项
        const sizeMB = fileBuffer.byteLength / 1024 / 1024;
        const sizeGB = sizeMB / 1024;
        ImageDebugLogger.warn(
          ImageDebugLogger.STAGES.FILE_PARSE,
          `检测到超大文件 (${
            sizeGB > 1 ? sizeGB.toFixed(2) + "GB" : sizeMB.toFixed(0) + "MB"
          })，使用最简解析选项`,
          {
            fileSize:
              sizeGB > 1 ? `${sizeGB.toFixed(2)}GB` : `${sizeMB.toFixed(0)}MB`,
            strategy: "minimal_parsing",
          }
        );
        // 发送更明确的进度信息
        postMessage({
          type: MESSAGE_TYPES.PROGRESS,
          data: {
            progress: 8,
            message: `正在解析超大文件 (${
              sizeGB > 1 ? sizeGB.toFixed(1) + "GB" : sizeMB.toFixed(0) + "MB"
            })，请耐心等待...`,
          },
        });
        parseOptions = {
          type: "array",
        };
        // 无论文件大小，只要指定了工作表，就仅解析该工作表
        if (selectedSheet) {
          parseOptions.sheets = [selectedSheet];
        }
      } else {
        // 普通文件：使用优化的解析选项
        ImageDebugLogger.info(
          ImageDebugLogger.STAGES.FILE_PARSE,
          "使用标准解析选项",
          {
            fileSize: `${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`,
          }
        );
        parseOptions = {
          type: "array",
          cellDates: true,
          cellNF: false, // main 分支的内存优化
          // cellText: false 会导致某些工作表无法被解析（如"药店拜访"），已移除
          dense: false, // 使用稀疏数组格式，节省内存
          sheetStubs: false, // 不包含空单元格
          bookVBA: false,
          // bookSheets 必须移除或设为 false，否则不会解析 Sheets 对象
          bookProps: false,
          bookFiles: false,
          bookDeps: false,
          raw: false,
        };

        // 无论文件大小，只要指定了工作表，就仅解析该工作表
        if (selectedSheet) {
          parseOptions.sheets = [selectedSheet];
        }
      }

      ImageDebugLogger.debug(
        ImageDebugLogger.STAGES.FILE_PARSE,
        "开始解析Excel文件",
        { parseOptions }
      );

      workbook = XLSX.read(fileBuffer, parseOptions);

      const parseTime = ImageDebugLogger.endTimer(
        "EXCEL_PARSE",
        "Excel文件解析"
      );
      ImageDebugLogger.logMemoryUsage(
        ImageDebugLogger.STAGES.FILE_PARSE,
        "Excel解析完成"
      );

      ImageDebugLogger.info(
        ImageDebugLogger.STAGES.FILE_PARSE,
        "Excel文件解析完成",
        {
          sheetNames: workbook.SheetNames,
          sheetCount: workbook.SheetNames.length,
          hasSheets: workbook.Sheets ? true : false,
          availableSheets: workbook.Sheets ? Object.keys(workbook.Sheets) : [],
          parseTime: `${parseTime.toFixed(2)}ms`,
        }
      );
    } catch (error) {
      ImageDebugLogger.error(
        ImageDebugLogger.STAGES.FILE_PARSE,
        "Excel文件解析失败",
        {
          error: error.message,
          stack: error.stack,
          fileSize: `${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`,
        }
      );

      if (error.message && error.message.includes("Invalid array length")) {
        throw new Error(
          "Excel 文件格式复杂，请尝试减少数据行数或简化工作表内容"
        );
      }
      throw new Error(`解析 Excel 文件失败: ${error.message}`);
    }

    if (isValidationCancelled) return;

    // 获取工作表名称
    ImageDebugLogger.startTimer("SHEET_IDENTIFY");

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      ImageDebugLogger.error(
        ImageDebugLogger.STAGES.SHEET_IDENTIFY,
        "Excel文件中没有找到任何工作表"
      );
      throw new Error("Excel 文件中没有找到任何工作表");
    }

    ImageDebugLogger.info(
      ImageDebugLogger.STAGES.SHEET_IDENTIFY,
      "开始工作表识别和选择",
      {
        availableSheets: workbook.SheetNames,
        requestedSheet: selectedSheet || "未指定",
        totalSheets: workbook.SheetNames.length,
      }
    );

    // 智能工作表选择逻辑（修复：无法明确匹配时弹出选择器）
    let targetSheet = selectedSheet || null;
    let isConfidentMatch = false;

    const availableSheets = workbook.SheetNames || [];

    // 如果用户明确指定且存在，直接使用
    if (targetSheet && availableSheets.includes(targetSheet)) {
      isConfidentMatch = true;
      ImageDebugLogger.info(
        ImageDebugLogger.STAGES.SHEET_IDENTIFY,
        `使用指定工作表: ${targetSheet}`
      );
    } else {
      // 尝试根据模板匹配工作表
      const template = templateFromMainThread;
      if (template && template.sheetNames && template.sheetNames.length > 0) {
        const matchedSheets = findAllMatchingSheets(
          availableSheets,
          template.sheetNames
        );
        if (matchedSheets.length === 1) {
          // 只有一个匹配，直接使用
          targetSheet = matchedSheets[0];
          isConfidentMatch = true;
          ImageDebugLogger.info(
            ImageDebugLogger.STAGES.SHEET_IDENTIFY,
            `自动匹配到工作表: ${targetSheet}`,
            {
              templateSheetNames: template.sheetNames,
              matchedSheet: targetSheet,
            }
          );
        } else if (matchedSheets.length > 1) {
          // 多个匹配，需要用户选择
          ImageDebugLogger.debug(
            ImageDebugLogger.STAGES.SHEET_IDENTIFY,
            "匹配到多个sheet，需要用户选择",
            {
              matchedSheets,
              templateSheetNames: template.sheetNames,
            }
          );
          // 不设置 isConfidentMatch，让后面的逺辑触发选择器
        } else {
          ImageDebugLogger.debug(
            ImageDebugLogger.STAGES.SHEET_IDENTIFY,
            "需要用户选择工作表（模板匹配失败）",
            {
              requestedSheet: selectedSheet || "未指定",
              sheetExists: false,
            }
          );
        }
      } else {
        ImageDebugLogger.debug(
          ImageDebugLogger.STAGES.SHEET_IDENTIFY,
          "需要用户选择工作表（无模板可匹配）",
          {
            requestedSheet: selectedSheet || "未指定",
            sheetExists: availableSheets.includes(targetSheet || ""),
          }
        );
      }
    }

    // 如果仍无法明确匹配，触发选择器（不再静默使用第一个Sheet）
    if (!isConfidentMatch) {
      ImageDebugLogger.info(
        ImageDebugLogger.STAGES.SHEET_IDENTIFY,
        "无法自动匹配工作表，触发用户选择",
        { requestedSheet: selectedSheet || "未指定", availableSheets }
      );
      sendResult({
        needSheetSelection: true,
        availableSheets: availableSheets.map((name) => ({
          name,
          hasData: !!(
            workbook.Sheets &&
            workbook.Sheets[name] &&
            workbook.Sheets[name]["!ref"]
          ),
        })),
      });
      return;
    }

    const sheetName = targetSheet;
    ImageDebugLogger.endTimer("SHEET_IDENTIFY", "工作表识别完成");

    // 获取目标工作表 - 直接从已解析的工作簿中获取
    let worksheet;
    try {
      // 调试：检查 workbook.Sheets 对象状态
      console.log("[DEBUG] 尝试获取工作表:", {
        targetSheetName: sheetName,
        availableSheetNames: workbook.SheetNames,
        hasSheets: !!workbook.Sheets,
        sheetsKeys: workbook.Sheets ? Object.keys(workbook.Sheets) : [],
        sheetNameMatch: workbook.SheetNames.includes(sheetName),
      });

      const sheetsObj = workbook.Sheets || undefined;
      const sheetKeys = sheetsObj ? Object.keys(sheetsObj) : [];
      const normalizedTarget = (sheetName || "").trim();

      // 先尝试精确/去空格匹配 key
      if (sheetsObj) {
        const directKey = sheetKeys.find(
          (k) => k === sheetName || k.trim() === normalizedTarget
        );
        if (directKey) {
          worksheet = sheetsObj[directKey];
        } else {
          worksheet = sheetsObj[sheetName];
        }
      }

      // 如果 Sheets 中没有对应的键，但 SheetNames 包含该名称，尝试单表重读
      if (!worksheet && workbook.SheetNames.includes(sheetName)) {
        ImageDebugLogger.warn(
          ImageDebugLogger.STAGES.SHEET_IDENTIFY,
          "目标工作表未在Sheets对象中，尝试单表重读",
          { sheetName, sheetKeys }
        );
        try {
          const wb2 = XLSX.read(fileBuffer, {
            type: "array",
            cellDates: true,
            cellNF: false,
            // cellText: false 会导致某些工作表无法被解析，已移除
            dense: false,
            sheetStubs: false,
            raw: false,
            sheets: [sheetName],
          });
          if (wb2 && wb2.Sheets) {
            worksheet = wb2.Sheets[sheetName] || null;
          }
          if (worksheet) {
            console.log(
              "[DEBUG] 单表重读成功:",
              worksheet["!ref"] || "无范围信息"
            );
          }
        } catch (reReadErr) {
          console.warn("[WARN] 单表重读失败:", reReadErr);
        }
      }

      // 仍然失败：退回到第一个存在于 Sheets 的工作表
      if (!worksheet && sheetsObj) {
        const firstExistingSheetName = sheetKeys.find((n) => !!sheetsObj[n]);
        if (firstExistingSheetName) {
          worksheet = sheetsObj[firstExistingSheetName];
          console.log(
            `工作表 "${sheetName}" 不存在，使用存在的工作表: "${firstExistingSheetName}"`
          );
        }
      }

      if (!worksheet) {
        throw new Error(`无法获取工作表: ${sheetName}`);
      }

      console.log("工作表获取成功:", worksheet["!ref"] || "无范围信息");
    } catch (error) {
      console.error("获取工作表失败:", error);
      throw new Error(`获取工作表失败: ${error.message}`);
    }

    if (isValidationCancelled) return;

    // 检查工作表是否为空
    if (!worksheet || !worksheet["!ref"]) {
      throw new Error("工作表为空或无有效数据");
    }

    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 20, message: "分析工作表结构..." },
    });

    // 转换为数组格式进行流式处理（自动矫正异常范围）
    let data;
    try {
      // 基础选项
      const jsonOptions = {
        header: 1,
        defval: "", // 空单元格使用空字符串
        raw: false, // 不保留原始值
        dateNF: "yyyy-mm-dd", // 标准化日期格式
      };

      // 如果声明范围疑似覆盖整表（如 1048576 行或 XFD 列），或超过阈值，则按实际单元格纠正范围
      try {
        const declaredRef = worksheet["!ref"] || "";
        const looksFullGrid =
          /1048576/.test(declaredRef) || /XFD/i.test(declaredRef);
        let declaredRows = 0;
        try {
          if (declaredRef) {
            const drTmp = XLSX.utils.decode_range(declaredRef);
            declaredRows = drTmp.e.r - drTmp.s.r + 1;
          }
        } catch (_) {}

        const needsCorrection =
          RANGE_CORRECTION_CONFIG.ENABLED &&
          ((declaredRef && looksFullGrid) ||
            declaredRows > RANGE_CORRECTION_CONFIG.ROW_THRESHOLD);

        if (needsCorrection) {
          // 计算实际存在的最小/最大行列（仅统计真正存在的单元格键，忽略以 ! 开头的元数据）
          let minR = Number.POSITIVE_INFINITY,
            minC = Number.POSITIVE_INFINITY,
            maxR = -1,
            maxC = -1;
          for (const addr in worksheet) {
            if (!Object.prototype.hasOwnProperty.call(worksheet, addr))
              continue;
            if (addr[0] === "!") continue;
            const decoded = XLSX.utils.decode_cell(addr);
            if (decoded.r < minR) minR = decoded.r;
            if (decoded.c < minC) minC = decoded.c;
            if (decoded.r > maxR) maxR = decoded.r;
            if (decoded.c > maxC) maxC = decoded.c;
          }
          if (maxR >= 0 && maxC >= 0) {
            // 以声明的起点作为下限，避免上方留白导致截断
            let startR = 0;
            let startC = 0;
            try {
              const dr = XLSX.utils.decode_range(declaredRef);
              startR = dr.s.r;
              startC = dr.s.c;
            } catch (_) {}
            const corrected = XLSX.utils.encode_range(
              {
                r: Math.min(startR, isFinite(minR) ? minR : startR),
                c: Math.min(startC, isFinite(minC) ? minC : startC),
              },
              { r: maxR, c: maxC }
            );

            jsonOptions.range = corrected;
            ImageDebugLogger.warn(
              ImageDebugLogger.STAGES.FILE_PARSE,
              "检测到异常或超阈值的工作表声明范围，已自动按实际单元格矫正",
              {
                declaredRef,
                declaredRows,
                threshold: RANGE_CORRECTION_CONFIG.ROW_THRESHOLD,
                correctedRef: corrected,
              }
            );
          }
        }
      } catch (rangeFixErr) {
        // 矫正失败不影响后续流程，继续按默认范围读取
        ImageDebugLogger.debug(
          ImageDebugLogger.STAGES.FILE_PARSE,
          "范围矫正尝试失败，按原范围读取",
          { error: rangeFixErr && rangeFixErr.message }
        );
      }

      data = XLSX.utils.sheet_to_json(worksheet, jsonOptions);
    } catch (error) {
      if (error.message && error.message.includes("Invalid array length")) {
        throw new Error("工作表数据过大，请减少数据行数或简化内容");
      }
      throw new Error(`转换工作表数据失败: ${error.message}`);
    }

    if (data.length === 0) {
      throw new Error("工作表为空");
    }

    // 检查数据行数，防止处理过大的数据集
    if (data.length > 50000) {
      throw new Error(
        `数据行数过多 (${data.length} 行)，请减少到 50,000 行以内`
      );
    }

    // 接收从主线程传递的完整模板
    const template = templateFromMainThread;

    if (!template) {
      throw new Error(
        `未找到任务模板: ${taskName}，请确保从主线程传入了完整的模板`
      );
    }

    // 验证模板的必需字段
    if (!template.requiredFields || !Array.isArray(template.requiredFields)) {
      throw new Error(`任务模板格式错误: ${taskName}，缺少必需字段定义`);
    }

    // 智能查找表头行（扫描前5行）
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 25, message: "查找表头行..." },
    });

    const { headerRow, headerRowIndex } = findHeaderRow(data, template);

    if (!headerRow) {
      throw new Error("未找到有效的表头行");
    }

    // 验证表头
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 30, message: "验证表头..." },
    });

    const headerValidation = validateHeaderRow(headerRow, template);

    if (!headerValidation.isValid) {
      ImageDebugLogger.warn(
        ImageDebugLogger.STAGES.FILE_PARSE,
        "表头验证失败",
        {
          missingFields: headerValidation.missingFields,
          headerRow: headerRow,
          template: template.requiredFields,
        }
      );
      return {
        isValid: false,
        headerValidation,
        errors: [],
        summary: { totalRows: 0, validRows: 0, errorCount: 0 },
        usedSheetName: sheetName,
      };
    }

    if (isValidationCancelled) return;

    // 流式验证数据行（跳过表头前的所有行）
    const dataRows = data.slice(headerRowIndex + 1);
    const errors = await validateRowsStreaming(
      dataRows,
      template,
      headerRow,
      headerRowIndex
    );

    if (isValidationCancelled) return;

    // 执行跨行验证（unique、frequency、dateInterval）
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: { progress: 80, message: "执行跨行验证..." },
    });

    const crossRowErrors = await validateCrossRows(
      dataRows,
      template,
      headerRow,
      headerRowIndex
    );
    errors.push(...crossRowErrors);

    if (isValidationCancelled) return;

    const totalRows = dataRows.length;
    const errorCount = errors.length;
    const validRows = totalRows - new Set(errors.map((e) => e.row)).size;

    return {
      isValid: errorCount === 0,
      headerValidation,
      errors,
      summary: {
        totalRows,
        validRows,
        errorCount,
      },
      usedSheetName: sheetName,
    };
  } catch (error) {
    throw new Error(`验证失败: ${error.message}`);
  }
}

// 智能查找表头行 - 基于必需字段直接匹配
function findHeaderRow(data, template) {
  const requiredFields = template.requiredFields || [];
  let bestMatch = { row: null, index: 0, matchedCount: 0, nonEmptyCount: 0 };

  console.log("🔍 [findHeaderRow] 开始查找表头", {
    dataRows: data.length,
    requiredFields: requiredFields,
    searchRange: `前${Math.min(10, data.length)}行`,
  });

  // 扫描前3行，寻找包含最多必需字段的行（兼容有标题行的Excel）
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // 清洗表头（去除换行、多余空格）
    const cleanHeaders = row.map((h) =>
      String(h || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "")
    );

    const nonEmptyCount = cleanHeaders.filter((h) => h.length > 0).length;

    // 如果非空列太少，跳过
    if (nonEmptyCount < 3) {
      console.log(
        `🔍 [findHeaderRow] 第${i + 1}行: 跳过（非空列太少: ${nonEmptyCount}）`
      );
      continue;
    }

    // 统计匹配的必需字段数量
    let matchedCount = 0;
    const matchedFields = [];

    for (const required of requiredFields) {
      // 清洗必需字段名（与 validateHeaderRow 保持一致）
      const cleanedRequired = String(required || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "");

      const found = cleanHeaders.some((header) => {
        // 精确匹配
        if (header === cleanedRequired) return true;
        // 包含匹配
        if (
          header.includes(cleanedRequired) ||
          cleanedRequired.includes(header)
        )
          return true;
        // 相似度匹配
        return calculateSimilarity(header, cleanedRequired) > 0.8;
      });

      if (found) {
        matchedCount++;
        matchedFields.push(required);
      }
    }

    console.log(
      `🔍 [findHeaderRow] 第${i + 1}行: 匹配字段=${matchedCount}/${
        requiredFields.length
      }, 非空列=${nonEmptyCount}, 匹配: [${matchedFields.join(", ")}]`
    );

    // 表头选择逻辑：
    // 1. 必须完全匹配所有必需字段
    // 2. 非空列数量必须足够（>= 必需字段数的2倍，或至少8列）
    //    这样可以排除只有少量列的标题行/汇总行
    const minNonEmptyCols = Math.max(requiredFields.length * 2, 8);

    if (
      matchedCount === requiredFields.length &&
      nonEmptyCount >= minNonEmptyCols
    ) {
      console.log(
        `🔍 [findHeaderRow] ✓ 第${
          i + 1
        }行完全匹配且列数充足(${nonEmptyCount}>=${minNonEmptyCols})，选为表头`
      );
      return {
        headerRow: row,
        headerRowIndex: i,
      };
    }

    // 记录最佳匹配（优先匹配字段多，其次非空列多）
    if (
      matchedCount > bestMatch.matchedCount ||
      (matchedCount === bestMatch.matchedCount &&
        nonEmptyCount > bestMatch.nonEmptyCount)
    ) {
      bestMatch = { row, index: i, matchedCount, nonEmptyCount };
    }
  }

  console.log("🔍 [findHeaderRow] 查找完成", {
    选中行: bestMatch.row ? `第${bestMatch.index + 1}行` : "无",
    匹配字段数: `${bestMatch.matchedCount}/${requiredFields.length}`,
    非空列数: bestMatch.nonEmptyCount,
    foundHeader: bestMatch.row ? "是" : "否",
  });

  return {
    headerRow: bestMatch.row,
    headerRowIndex: bestMatch.index,
  };
}

// 计算字符串相似度
function calculateSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;

  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return (maxLen - matrix[len1][len2]) / maxLen;
}

// 验证表头行（针对已找到的表头行数组）
function validateHeaderRow(headerRow, template) {
  if (!headerRow || !Array.isArray(headerRow)) {
    return {
      isValid: false,
      missingFields: template.requiredFields || [],
      unmatchedFields: [],
      suggestions: [],
      headerRowIndex: -1,
    };
  }

  // 清洗表头：去换行、去空格
  const actualHeaders = headerRow
    .map((h) =>
      String(h || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "")
    )
    .filter((h) => h);

  // 同步构建一个"清洗后的 fieldMappings"，用于同义列名的匹配
  const cleanedFieldMappings = {};
  if (template.fieldMappings) {
    Object.keys(template.fieldMappings).forEach((key) => {
      const cleanedKey = String(key || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "");
      cleanedFieldMappings[cleanedKey] = template.fieldMappings[key];
    });
  }

  const missingFields = [];

  for (const required of template.requiredFields || []) {
    const cleanedRequired = String(required || "")
      .trim()
      .replace(/\n/g, "")
      .replace(/\s+/g, "");

    let found = false;

    // 1. 精确匹配
    if (actualHeaders.includes(cleanedRequired)) {
      found = true;
    }

    // 2. 同义词匹配
    if (!found && cleanedFieldMappings[cleanedRequired]) {
      const synonyms = cleanedFieldMappings[cleanedRequired];
      for (const synonym of synonyms) {
        const cleanedSynonym = String(synonym || "")
          .trim()
          .replace(/\n/g, "")
          .replace(/\s+/g, "");
        if (actualHeaders.includes(cleanedSynonym)) {
          found = true;
          break;
        }
      }
    }

    // 3. 包含匹配
    if (!found) {
      found = actualHeaders.some(
        (header) =>
          header.includes(cleanedRequired) || cleanedRequired.includes(header)
      );
    }

    // 4. 相似度匹配
    if (!found) {
      found = actualHeaders.some(
        (header) => calculateSimilarity(header, cleanedRequired) > 0.8
      );
    }

    if (!found) {
      missingFields.push(required);
    }
  }

  // 为缺失字段生成匹配建议
  const suggestions = [];
  for (const missing of missingFields) {
    const cleanedMissing = String(missing || "")
      .trim()
      .replace(/\n/g, "")
      .replace(/\s+/g, "");

    let bestMatch = { actual: "", similarity: 0 };

    for (const header of actualHeaders) {
      const similarity = calculateSimilarity(header, cleanedMissing);
      if (similarity > bestMatch.similarity && similarity >= 0.3) {
        bestMatch = { actual: header, similarity };
      }
    }

    if (bestMatch.actual && bestMatch.similarity > 0) {
      suggestions.push({
        expected: missing,
        actual: bestMatch.actual,
        similarity: bestMatch.similarity,
      });
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    unmatchedFields: [],
    suggestions,
    headerRowIndex: 0, // 已经找到的表头行
  };
}

// 流式验证数据行
async function validateRowsStreaming(
  rows,
  template,
  headerRow,
  headerRowIndex
) {
  const errors = [];
  const fieldMapping = createFieldMapping(headerRow, template);
  const totalRows = rows.length;

  // 分块处理数据
  for (let i = 0; i < totalRows; i += PERFORMANCE_CONFIG.CHUNK_SIZE) {
    if (isValidationCancelled) break;

    const chunk = rows.slice(
      i,
      Math.min(i + PERFORMANCE_CONFIG.CHUNK_SIZE, totalRows)
    );
    const chunkErrors = [];

    // 处理当前块
    for (let j = 0; j < chunk.length; j++) {
      const row = chunk[j];
      const rowNumber = headerRowIndex + i + j + 2; // 基于表头位置计算正确的行号

      if (!row || row.every((cell) => !cell)) continue; // 跳过空行

      const rowErrors = validateSingleRow(
        row,
        fieldMapping,
        template,
        rowNumber
      );
      chunkErrors.push(...rowErrors);
    }

    errors.push(...chunkErrors);

    // 更新进度
    const progress = 40 + Math.floor(((i + chunk.length) / totalRows) * 40);
    postMessage({
      type: MESSAGE_TYPES.PROGRESS,
      data: {
        progress,
        message: `验证数据行 ${i + chunk.length}/${totalRows}...`,
      },
    });

    // 让出控制权，避免阻塞
    await new Promise((resolve) => setTimeout(resolve, 1));
  }

  return errors;
}

// 跨行验证函数
async function validateCrossRows(
  dataRows,
  template,
  headerRow,
  headerRowIndex
) {
  console.log("\n🔄 [CrossRowValidation] 开始跨行验证", {
    templateName: template.name,
    totalDataRows: dataRows.length,
    headerRowIndex,
    totalRules: template.validationRules?.length || 0,
  });

  const errors = [];
  const fieldMapping = createFieldMapping(headerRow, template);

  console.log("📍 [CrossRowValidation] 字段映射:", {
    fieldMappingSize: fieldMapping.size,
    mappings: Array.from(fieldMapping.entries()),
  });

  // 将数据行转换为对象格式
  const processedRows = dataRows
    .map((row, index) => ({
      data: parseRowData(row, fieldMapping),
      rowNumber: headerRowIndex + index + 2,
      originalRow: row,
    }))
    .filter((item) => !Object.values(item.data).every((v) => !v));

  console.log("📊 [CrossRowValidation] 处理后的行数:", {
    originalRows: dataRows.length,
    processedRows: processedRows.length,
    filteredOut: dataRows.length - processedRows.length,
  });

  // 筛选跨行验证规则
  const crossRowRules = (template.validationRules || []).filter((rule) =>
    ["unique", "frequency", "dateInterval", "sameImplementer", "conditionalDateInterval"].includes(
      rule.type
    )
  );

  console.log("📋 [CrossRowValidation] 跨行验证规则:", {
    totalRules: template.validationRules?.length || 0,
    crossRowRulesCount: crossRowRules.length,
    rules: crossRowRules.map((r) => ({
      field: r.field,
      type: r.type,
      params: r.params,
    })),
  });

  // 执行各种跨行验证规则
  for (const rule of crossRowRules) {
    if (isValidationCancelled) break;

    console.log(`\n📌 [CrossRowValidation] 处理规则:`, {
      field: rule.field,
      type: rule.type,
      params: rule.params,
    });

    let ruleErrors = [];
    switch (rule.type) {
      case "unique":
        ruleErrors = validateUnique(rule, processedRows, fieldMapping);
        break;
      case "frequency":
        ruleErrors = validateFrequency(rule, processedRows, fieldMapping);
        break;
      case "dateInterval":
        ruleErrors = validateDateInterval(rule, processedRows, fieldMapping);
        break;
      case "sameImplementer":
        ruleErrors = validateSameImplementer(rule, processedRows, fieldMapping);
        break;
      case "conditionalDateInterval":
        ruleErrors = validateConditionalDateInterval(rule, processedRows, fieldMapping);
        break;
    }

    console.log(`  ✓ 规则执行完成，发现${ruleErrors.length}个错误`);
    errors.push(...ruleErrors);
  }

  console.log(
    `\n✅ [CrossRowValidation] 跨行验证完成，共发现${errors.length}个错误\n`
  );
  return errors;
}

// 格式化日期用于验证 - 与服务端逻辑一致
function formatDateForValidation(value) {
  if (!value) return value;

  const str = value.toString().trim();

  // Extract date part from formats like "2025.8.1\n08：00"
  const dateMatch = str.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (dateMatch) {
    const [, year, month, day] = dateMatch;
    const formatted = `${year}-${month.padStart(2, "0")}-${day.padStart(
      2,
      "0"
    )}`;
    return formatted;
  }

  // Handle Chinese date format: 2025年11月1日 -> keep as is (parseDate will handle it)
  const chineseDateMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
  if (chineseDateMatch) {
    // Return as-is, parseDate function will handle Chinese format
    return value;
  }

  return value;
}

// 解析行数据为对象
function parseRowData(row, fieldMapping) {
  const data = {};

  fieldMapping.forEach((colIndex, fieldName) => {
    let value = row[colIndex];

    // Auto-format date/time fields for further validation
    if (
      fieldName === "visit_time" ||
      fieldName === "拜访开始时间" ||
      fieldName === "拜访开始\n时间"
    ) {
      const originalValue = value;
      value = formatDateForValidation(value);
      // Store both original and formatted values for different validation purposes
      data[fieldName + "_original"] = originalValue;
    }

    // 自动格式化日期时间字段
    if (fieldName.includes("time") || fieldName.includes("Time")) {
      if (value && typeof value === "number") {
        // Excel日期数字转换
        const date = new Date((value - 25569) * 86400 * 1000);
        value = date.toISOString().slice(0, 16).replace("T", " ");
      }
    }

    data[fieldName] = value;
  });

  return data;
}

// 唯一性验证 - 与服务端逻辑保持一致
function validateUnique(rule, rows, fieldMapping) {
  const errors = [];
  const { params = {} } = rule;
  const { scope } = params; // scope: "day", "global", "task"
  const columnIndex = fieldMapping.get(rule.field);

  if (columnIndex === undefined) return errors;

  if (scope === "day") {
    // 按日期分组的唯一性验证（如：同一药店1日内不能重复拜访）
    const dailyGroups = new Map(); // date -> Set<uniqueKey>
    const rowTracker = new Map(); // "date_uniqueKey" -> rowNumber[]

    for (const { data, rowNumber } of rows) {
      const value = data[rule.field];
      if (!value) continue;

      // 获取日期字段
      const dateValue =
        data["visitStartTime"] ||
        data["拜访开始时间"] ||
        data["拜访开始\n时间"] ||
        data["visit_date"] ||
        data["拜访日期"];

      if (!dateValue) continue;

      const date = parseDate(dateValue);
      if (!date) continue;

      // 格式化日期
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      // 获取地址信息
      const address = data["channelAddress"] || data["渠道地址"] || "";

      // 创建唯一标识：结合店铺名称和地址
      const normalizedValue = String(value).trim().toLowerCase();
      const normalizedAddress = String(address).trim().toLowerCase();
      const uniqueKey = `${normalizedValue}|${normalizedAddress}`;

      const trackingKey = `${dateStr}_${uniqueKey}`;

      if (!dailyGroups.has(dateStr)) {
        dailyGroups.set(dateStr, new Set());
      }

      if (!rowTracker.has(trackingKey)) {
        rowTracker.set(trackingKey, []);
      }

      rowTracker.get(trackingKey).push(rowNumber);

      // 检查是否重复
      if (dailyGroups.get(dateStr).has(uniqueKey)) {
        // 找到第一次出现的行号
        const firstOccurrence = rowTracker.get(trackingKey)[0];

        errors.push({
          row: rowNumber,
          column: XLSX.utils.encode_col(columnIndex),
          field: rule.field,
          value,
          message: `${
            rule.message
          }（与第${firstOccurrence}行重复，同一店铺：${value}${
            address ? ` - ${address}` : ""
          }）`,
          errorType: rule.type,
        });
      } else {
        dailyGroups.get(dateStr).add(uniqueKey);
      }
    }
  } else if (scope === "global" || scope === "task" || !scope) {
    // 全局唯一性验证（global、task 或默认）
    const seenValues = new Set();
    const duplicateValues = new Set();

    // 第一遍：找出所有重复值
    for (const { data } of rows) {
      const value = data[rule.field];
      if (value && String(value).trim()) {
        const normalizedValue = String(value).trim().toLowerCase();
        if (seenValues.has(normalizedValue)) {
          duplicateValues.add(normalizedValue);
        } else {
          seenValues.add(normalizedValue);
        }
      }
    }

    // 第二遍：为所有重复值报错
    for (const { data, rowNumber } of rows) {
      const value = data[rule.field];
      if (value && String(value).trim()) {
        const normalizedValue = String(value).trim().toLowerCase();
        if (duplicateValues.has(normalizedValue)) {
          errors.push({
            row: rowNumber,
            column: XLSX.utils.encode_col(columnIndex),
            field: rule.field,
            value,
            message: rule.message,
            errorType: rule.type,
          });
        }
      }
    }
  }

  return errors;
}

// 频次验证 - 与服务端逻辑保持一致
function validateFrequency(rule, rows, fieldMapping) {
  const errors = [];
  const { params = {} } = rule;
  const { maxPerDay, groupBy, countBy } = params;
  const columnIndex = fieldMapping.get(rule.field);

  if (columnIndex === undefined) {
    return errors;
  }

  // 按实施人分组统计每日计数
  const dailyCounts = new Map(); // implementer -> Map<dateStr, Set<countByValue>>
  const rowTracker = new Map(); // implementer -> Array<{date, rowNumber}>

  let processedRows = 0;
  let validRows = 0;

  for (const { data, rowNumber } of rows) {
    processedRows++;
    // 尽量容错不同列名的实施人字段
    let implementer = data[groupBy]; // 实施人
    if (!implementer && groupBy === "implementer") {
      implementer = data["实施人"] || data["执行人"] || data["执行人员"];
    }

    if (processedRows <= 5) {
    }

    if (!implementer) continue;

    // 尝试多个可能的日期字段（与服务端一致）
    const dateValue =
      data["visitStartTime"] ||
      data["拜访开始时间"] ||
      data["拜访开始\n时间"] ||
      data["visit_date"] ||
      data["拜访日期"] ||
      data["visit_time"] ||
      data["拜访时间"] ||
      // 问卷类任务的日期字段
      data["surveyTime"] ||
      data["调研时间"] ||
      data["实施时间"] ||
      data["调查时间"] ||
      data["问卷时间"] ||
      data["访问时间"] ||
      data["填写时间"];

    if (processedRows <= 5) {
    }

    if (!dateValue) continue;
    validRows++;

    const date = parseDate(dateValue);
    if (processedRows <= 5) {
    }
    if (!date) continue;

    // 使用本地日期字符串避免时区问题（与服务端一致）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    if (!dailyCounts.has(implementer)) {
      dailyCounts.set(implementer, new Map());
      rowTracker.set(implementer, []);
    }

    const implementerCounts = dailyCounts.get(implementer);

    if (countBy) {
      // 使用 countBy 字段进行去重计数（如：按药店名称计数）
      const countByValue = data[countBy];
      if (!countByValue) continue;

      if (!implementerCounts.has(dateStr)) {
        implementerCounts.set(dateStr, new Set());
      }

      const dateCountSet = implementerCounts.get(dateStr);
      const normalizedCountByValue = String(countByValue).trim().toLowerCase();
      dateCountSet.add(normalizedCountByValue);

      const currentCount = dateCountSet.size;

      rowTracker.get(implementer).push({ date: dateStr, rowNumber });

      // 只有超过限制时才报错（与服务端一致）
      if (currentCount > maxPerDay) {
        errors.push({
          row: rowNumber,
          column: XLSX.utils.encode_col(columnIndex),
          field: rule.field,
          value: implementer,
          message: `${rule.message}（${dateStr}当日第${currentCount}家，超过${maxPerDay}家限制）`,
          errorType: rule.type,
        });
      }
    } else {
      // 传统计数方式（每行计数一次）
      const currentCount = implementerCounts.get(dateStr) || 0;
      implementerCounts.set(dateStr, currentCount + 1);

      rowTracker.get(implementer).push({ date: dateStr, rowNumber });

      // 只有超过限制时才报错（与服务端一致）
      if (currentCount + 1 > maxPerDay) {
        errors.push({
          row: rowNumber,
          column: XLSX.utils.encode_col(columnIndex),
          field: rule.field,
          value: implementer,
          message: `${rule.message}（${dateStr}当日第${
            currentCount + 1
          }家，超过${maxPerDay}家限制）`,
          errorType: rule.type,
        });
      }
    }
  }

  if (errors.length > 0) {
  }

  return errors;
}

// 日期间隔验证：按实施人+目标分组，检查日期间隔
function validateDateInterval(rule, rows, fieldMapping) {
  console.log("\n🔍 [DateInterval] 开始验证规则:", {
    field: rule.field,
    params: rule.params,
    message: rule.message,
    totalRows: rows.length,
  });

  const errors = [];
  const { params = {} } = rule;
  const { days, groupBy } = params;
  const columnIndex = fieldMapping.get(rule.field);

  console.log("📍 [DateInterval] 参数检查:", {
    days,
    groupBy,
    columnIndex,
    hasColumnIndex: columnIndex !== undefined,
  });

  if (columnIndex === undefined) {
    console.warn("⚠️ [DateInterval] 找不到列索引，跳过验证");
    return errors;
  }

  // 按 实施人 + 目标(groupBy) 分组
  const groups = new Map();

  for (const { data, rowNumber } of rows) {
    const groupValue = data[groupBy];
    const implementer = data["implementer"] || data["实施人"];

    // 从rule.field读取日期值
    const dateValue = data[rule.field];

    console.log(`📝 [DateInterval] 处理第${rowNumber}行:`, {
      rowNumber,
      groupValue,
      implementer,
      dateValue,
      dateValueType: typeof dateValue,
      ruleField: rule.field,
      dataKeys: Object.keys(data),
    });

    if (!groupValue || !implementer) {
      console.log(`  ⊘ 跳过（缺少分组值或实施人）`);
      continue;
    }

    if (!dateValue) {
      console.log(`  ⊘ 跳过（缺少日期值）`);
      continue;
    }

    const date = parseDate(dateValue);

    console.log(`  ✓ 解析结果:`, {
      date: date ? date.toISOString().split("T")[0] : null,
      groupValue,
      implementer,
    });

    if (!date) {
      console.warn(`  ⚠️ 日期解析失败`);
      continue;
    }

    // 创建唯一键：实施人+目标
    const uniqueKey = `${implementer}|${groupValue}`;

    if (!groups.has(uniqueKey)) {
      groups.set(uniqueKey, []);
    }

    groups.get(uniqueKey).push({
      date,
      rowNumber,
      implementer,
      target: groupValue,
    });

    console.log(`  ✓ 添加到分组: ${uniqueKey}`);
  }

  console.log("\n📊 [DateInterval] 分组统计:", {
    totalGroups: groups.size,
    groups: Array.from(groups.entries()).map(([key, visits]) => ({
      key,
      visitCount: visits.length,
      dates: visits.map((v) => v.date.toISOString().split("T")[0]),
    })),
  });

  // 检查每个分组内的日期间隔
  console.log(`\n🔎 [DateInterval] 开始检查日期间隔（要求≥${days}天）...`);

  for (const [uniqueKey, visits] of groups) {
    // 按日期排序
    visits.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log(`\n检查分组: ${uniqueKey} (${visits.length}次访问)`);

    for (let i = 1; i < visits.length; i++) {
      const current = visits[i];
      const previous = visits[i - 1];

      const daysDiff = Math.floor(
        (current.date.getTime() - previous.date.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      console.log(
        `  比较: 第${previous.rowNumber}行 → 第${current.rowNumber}行`,
        {
          previousDate: previous.date.toISOString().split("T")[0],
          currentDate: current.date.toISOString().split("T")[0],
          daysDiff,
          requiredDays: days,
          isViolation: daysDiff < days,
        }
      );

      if (daysDiff < days) {
        // 从uniqueKey中提取信息 (format: "implementer|target")
        const parts = uniqueKey.split("|");
        const implementer = parts[0];
        const target = parts[1];

        const error = {
          row: current.rowNumber,
          column: XLSX.utils.encode_col(columnIndex),
          field: rule.field,
          value: target,
          message: `${rule.message}（与第${previous.rowNumber}行冲突，实施人：${implementer}，目标：${target}）`,
          errorType: rule.type,
        };

        console.log(`  ❌ 发现违规！`, error);
        errors.push(error);
      } else {
        console.log(`  ✓ 符合规则`);
      }
    }
  }

  console.log(`\n✅ [DateInterval] 验证完成，发现${errors.length}个错误\n`);
  return errors;
}

// 条件性日期间隔验证：根据条件字段值应用不同的日期间隔限制
function validateConditionalDateInterval(rule, rows, fieldMapping) {
  console.log("\n🔍 [ConditionalDateInterval] 开始验证规则:", {
    field: rule.field,
    params: rule.params,
    message: rule.message,
    totalRows: rows.length,
  });

  const errors = [];
  const { params = {} } = rule;
  const { groupBy, conditionField, conditions, defaultDays = 3 } = params;
  const columnIndex = fieldMapping.get(rule.field);

  console.log("📍 [ConditionalDateInterval] 参数检查:", {
    groupBy,
    conditionField,
    conditions,
    defaultDays,
    columnIndex,
    hasColumnIndex: columnIndex !== undefined,
  });

  if (columnIndex === undefined) {
    console.warn("⚠️ [ConditionalDateInterval] 找不到列索引，跳过验证");
    return errors;
  }

  // 按目标(groupBy，如医院名称)分组
  const groups = new Map();

  for (const { data, rowNumber } of rows) {
    // 获取分组字段值（如医院名称）
    let groupValue = data[groupBy];
    if (!groupValue && groupBy === "hospitalName") {
      groupValue = data["医疗机构名称"] || data["医疗机构\n名称"] || data["医院名称"];
    }

    // 获取条件字段值（如医疗类型）
    let conditionValue = data[conditionField];
    if (!conditionValue && conditionField === "medicalType") {
      conditionValue = data["医疗类型"];
    }

    // 从rule.field读取日期值
    let dateValue = data[rule.field];
    if (!dateValue && rule.field === "visitStartTime") {
      dateValue = data["拜访开始时间"] || data["拜访开始\n时间"];
    }

    console.log(`📝 [ConditionalDateInterval] 处理第${rowNumber}行:`, {
      rowNumber,
      groupValue,
      conditionValue,
      dateValue,
      dateValueType: typeof dateValue,
    });

    if (!groupValue) {
      console.log(`  ⊘ 跳过（缺少分组值）`);
      continue;
    }

    if (!dateValue) {
      console.log(`  ⊘ 跳过（缺少日期值）`);
      continue;
    }

    const date = parseDate(dateValue);

    if (!date) {
      console.warn(`  ⚠️ 日期解析失败`);
      continue;
    }

    // 使用医院名称作为唯一键
    const uniqueKey = groupValue;

    if (!groups.has(uniqueKey)) {
      groups.set(uniqueKey, []);
    }

    groups.get(uniqueKey).push({
      date,
      rowNumber,
      conditionValue: conditionValue || "",
      target: groupValue,
    });

    console.log(`  ✓ 添加到分组: ${uniqueKey}, 条件: ${conditionValue}`);
  }

  console.log("\n📊 [ConditionalDateInterval] 分组统计:", {
    totalGroups: groups.size,
  });

  // 检查每个分组内的日期间隔
  console.log(`\n🔎 [ConditionalDateInterval] 开始检查日期间隔...`);

  for (const [uniqueKey, visits] of groups) {
    // 按日期排序
    visits.sort((a, b) => a.date.getTime() - b.date.getTime());

    console.log(`\n检查分组: ${uniqueKey} (${visits.length}次访问)`);

    for (let i = 1; i < visits.length; i++) {
      const current = visits[i];
      const previous = visits[i - 1];

      const daysDiff = Math.floor(
        (current.date.getTime() - previous.date.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      // 根据条件字段获取对应的间隔天数
      const conditionConfig = conditions[current.conditionValue] || conditions[previous.conditionValue];
      const requiredDays = conditionConfig ? conditionConfig.days : defaultDays;
      const customMessage = conditionConfig ? conditionConfig.message : rule.message;

      console.log(
        `  比较: 第${previous.rowNumber}行 → 第${current.rowNumber}行`,
        {
          previousDate: previous.date.toISOString().split("T")[0],
          currentDate: current.date.toISOString().split("T")[0],
          daysDiff,
          conditionValue: current.conditionValue,
          requiredDays,
          isViolation: daysDiff < requiredDays,
        }
      );

      if (daysDiff < requiredDays) {
        const error = {
          row: current.rowNumber,
          column: XLSX.utils.encode_col(columnIndex),
          field: rule.field,
          value: current.target,
          message: `${customMessage}（与第${previous.rowNumber}行冲突，间隔${daysDiff}天，要求≥${requiredDays}天）`,
          errorType: rule.type,
        };

        console.log(`  ❌ 发现违规！`, error);
        errors.push(error);
      } else {
        console.log(`  ✓ 符合规则`);
      }
    }
  }

  console.log(`\n✅ [ConditionalDateInterval] 验证完成，发现${errors.length}个错误\n`);
  return errors;
}

// 同一目标需由同一人拜访验证
function validateSameImplementer(rule, rows, fieldMapping) {
  console.log("\n🔍 [SameImplementer] 开始验证规则:", {
    field: rule.field,
    params: rule.params,
    message: rule.message,
    totalRows: rows.length,
  });

  const errors = [];
  const { params = {} } = rule;
  const { targetField, implementerField } = params;
  const columnIndex = fieldMapping.get(rule.field);

  if (columnIndex === undefined) {
    console.warn("⚠️ [SameImplementer] 找不到目标列索引，跳过验证");
    return errors;
  }

  // 获取实施人列索引
  const implementerIndex =
    fieldMapping.get(implementerField) ||
    fieldMapping.get("实施人") ||
    fieldMapping.get("implementer");

  if (implementerIndex === undefined) {
    console.warn("⚠️ [SameImplementer] 找不到实施人列索引，跳过验证");
    return errors;
  }

  // 按目标（如药店名称）分组，记录每个目标对应的实施人
  // Map: targetValue -> { firstImplementer, firstRowNumber, rows: [{rowNumber, implementer}] }
  const targetGroups = new Map();

  for (const { data, rowNumber } of rows) {
    const targetValue = data[rule.field];
    const implementerValue = data["implementer"] || data["实施人"];

    if (!targetValue || !implementerValue) continue;

    const targetKey = String(targetValue).trim().toLowerCase();
    const implementer = String(implementerValue).trim();

    if (!targetGroups.has(targetKey)) {
      targetGroups.set(targetKey, {
        firstImplementer: implementer,
        firstRowNumber: rowNumber,
        rows: [],
      });
    }

    targetGroups.get(targetKey).rows.push({ rowNumber, implementer });
  }

  console.log("📊 [SameImplementer] 分组统计:", {
    totalGroups: targetGroups.size,
    groups: Array.from(targetGroups.entries())
      .slice(0, 10)
      .map(([key, group]) => ({
        target: key,
        firstImplementer: group.firstImplementer,
        visitCount: group.rows.length,
      })),
  });

  // 检查每个目标分组，确保只有一个实施人
  for (const [targetKey, group] of targetGroups) {
    const { firstImplementer, firstRowNumber, rows: groupRows } = group;

    for (const { rowNumber, implementer } of groupRows) {
      // 忽略大小写比较实施人
      if (implementer.toLowerCase() !== firstImplementer.toLowerCase()) {
        // 找到原始的目标值用于显示
        const originalRow = rows.find((r) => r.rowNumber === rowNumber);
        const originalTarget = originalRow
          ? originalRow.data[rule.field]
          : targetKey;

        const error = {
          row: rowNumber,
          column: XLSX.utils.encode_col(columnIndex),
          field: rule.field,
          value: originalTarget,
          message: `${rule.message}（第${firstRowNumber}行由"${firstImplementer}"拜访，第${rowNumber}行由"${implementer}"拜访）`,
          errorType: rule.type,
        };

        console.log(`  ❌ 发现违规！`, error);
        errors.push(error);
      }
    }
  }

  console.log(`\n✅ [SameImplementer] 验证完成，发现${errors.length}个错误\n`);
  return errors;
}

// 提取日期字符串
function extractDate(value) {
  if (!value) return null;

  const dateStr = String(value).trim();

  // 尝试提取日期部分
  const dateMatch = dateStr.match(/(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/);
  return dateMatch ? dateMatch[1] : null;
}

// 解析日期 - 与服务端逻辑一致
function parseDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    // Excel日期序列号
    return new Date((value - 25569) * 86400 * 1000);
  }

  if (typeof value === "string") {
    let str = value.trim();
    const originalStr = str;

    // 清理日期字符串：提取日期部分，移除时间和换行符
    if (str.includes("\n")) {
      str = str.split("\n")[0].trim();
    }

    // 替换中文冒号为英文冒号
    str = str.replace(/：/g, ":");

    // Handle Excel date numbers (days since 1900-01-01)
    if (/^\d+(\.\d+)?$/.test(str)) {
      const excelDate = parseFloat(str);
      // Excel epoch is 1900-01-01, but Excel incorrectly treats 1900 as a leap year
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(
        excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000
      );
      return isNaN(date.getTime()) ? null : date;
    }

    // Handle Chinese date format: 2025年11月1日 or 2025年11月1
    const chineseDateMatch = str.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日?$/);
    if (chineseDateMatch) {
      const year = parseInt(chineseDateMatch[1], 10);
      const month = parseInt(chineseDateMatch[2], 10);
      const day = parseInt(chineseDateMatch[3], 10);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      console.log(
        `  ✓ 中文日期解析成功: ${str} -> ${date.toISOString().split("T")[0]}`
      );
      return date;
    }

    // Handle various date formats
    let date;

    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      // Parse date components to avoid timezone issues
      const [year, month, day] = str.split("-").map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed
    }
    // Try datetime format (YYYY-MM-DD HH:MM)
    else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
      date = new Date(str);
    }
    // Try dot-separated format (YYYY.M.D)
    else if (/^\d{4}\.\d{1,2}\.\d{1,2}$/.test(str)) {
      const [year, month, day] = str.split(".").map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed
    }
    // Try other common formats
    else {
      date = new Date(str);
    }

    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

// 检查是否包含时间组件 - 与服务端逻辑一致
function checkHasTimeComponent(value) {
  if (!value) return false;

  const str = value.toString().trim();

  // 检查是否包含时间格式 (支持中文和英文冒号)
  const timePatterns = [
    /\d{1,2}[:：]\d{2}/, // HH:MM or HH：MM (Chinese colon)
    /\d{1,2}[:：]\d{2}[:：]\d{2}/, // HH:MM:SS or HH：MM：SS
    /\s+\d{1,2}[:：]\d{2}/, // Space followed by time
    /\n\d{1,2}[:：]\d{2}/, // Newline followed by time
  ];

  return timePatterns.some((pattern) => pattern.test(str));
}

// 创建字段映射
function createFieldMapping(headerRow, template) {
  const mapping = new Map();

  headerRow.forEach((header, index) => {
    if (header) {
      // 清洗表头（去除换行、多余空格）
      const headerStr = String(header)
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "");

      // 直接映射
      mapping.set(header, index);
      mapping.set(headerStr, index);

      // 检查字段映射
      const fieldMappings = template.fieldMappings || {};
      let mappedField = fieldMappings[header] || fieldMappings[headerStr];

      // 如果没有直接匹配，尝试相似度匹配
      if (!mappedField) {
        for (const [templateField, mappedName] of Object.entries(
          fieldMappings
        )) {
          if (calculateSimilarity(headerStr, templateField) > 0.8) {
            mappedField = mappedName;
            break;
          }
        }
      }

      if (mappedField) {
        mapping.set(mappedField, index);
      }
    }
  });

  return mapping;
}

// 验证单行数据
function validateSingleRow(row, fieldMapping, template, rowNumber) {
  const errors = [];

  if (!row || !Array.isArray(row)) {
    return errors;
  }

  // 遍历所有验证规则
  for (const rule of template.validationRules || []) {
    // 跳过跨行验证规则（这些在 validateCrossRows 中处理）
    if (["unique", "frequency", "dateInterval"].includes(rule.type)) {
      continue;
    }

    const colIndex = fieldMapping.get(rule.field);
    if (colIndex === undefined) continue;

    const value = row[colIndex];
    const error = validateField(
      value,
      rule,
      rowNumber,
      colIndex,
      undefined // rowData - 暂时不需要
    );

    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

// 基于工作表的分块行级验证（减少单次内存峰值）
async function validateRowsChunked(sheet, template, headerRowIndex) {
  const errors = [];
  // 解析表范围
  const ref = sheet["!ref"];
  if (!ref) return errors;
  const range = XLSX.utils.decode_range(ref);
  const totalRows = Math.max(0, range.e.r - (headerRowIndex + 1) + 1);
  if (totalRows <= 0) return errors;

  // 构建字段映射
  const headerOnly = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    range: {
      s: { r: headerRowIndex, c: 0 },
      e: { r: headerRowIndex, c: range.e.c },
    },
  });
  const headerRow = headerOnly[0] || [];
  const fieldMapping = createFieldMapping(headerRow, template);

  // 从数据起始行开始按块读取
  const startRow = headerRowIndex + 1;
  const chunkSize = PERFORMANCE_CONFIG.CHUNK_SIZE;

  for (let r = startRow; r <= range.e.r; r += chunkSize) {
    if (isValidationCancelled) break;
    const end = Math.min(r + chunkSize - 1, range.e.r);
    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
      range: { s: { r, c: 0 }, e: { r: end, c: range.e.c } },
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((cell) => !cell)) continue;
      for (const rule of template.validationRules || []) {
        const colIndex = fieldMapping.get(rule.field);
        if (colIndex === undefined) continue;
        const value = row[colIndex];
        const rowNumber = r + i + 1; // 工作表实际行号
        const error = validateField(
          value,
          rule,
          rowNumber,
          colIndex,
          undefined
        );
        if (error) errors.push(error);
      }
    }

    const processed = Math.min(end, range.e.r) - startRow + 1;
    const progress = 60 + Math.floor((processed / totalRows) * 20);
    sendProgress(`验证数据行 ${processed}/${totalRows}...`, progress);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return errors;
}

// Large file handling functions
async function readFileInChunks(file) {
  const fileSizeMB = file.size / (1024 * 1024);

  // 根据文件大小动态调整块大小
  let CHUNK_SIZE;
  if (fileSizeMB > 1000) {
    CHUNK_SIZE = 32 * 1024 * 1024; // 超大文件使用32MB块
  } else if (fileSizeMB > 500) {
    CHUNK_SIZE = 48 * 1024 * 1024; // 大文件使用48MB块
  } else {
    CHUNK_SIZE = 64 * 1024 * 1024; // 中等文件使用64MB块
  }

  const chunks = [];
  let offset = 0;

  ImageDebugLogger.info(
    ImageDebugLogger.STAGES.FILE_PARSE,
    `开始分块读取大文件`,
    {
      totalSize: `${fileSizeMB.toFixed(2)}MB`,
      chunkSize: `${(CHUNK_SIZE / 1024 / 1024).toFixed(0)}MB`,
      estimatedChunks: Math.ceil(file.size / CHUNK_SIZE),
      optimizationLevel:
        fileSizeMB > 1000 ? "最高" : fileSizeMB > 500 ? "高" : "标准",
    }
  );

  while (offset < file.size) {
    if (isValidationCancelled) {
      throw new Error("文件读取已取消");
    }

    const chunk = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size));
    const chunkBuffer = await readChunkAsArrayBuffer(chunk);
    chunks.push(new Uint8Array(chunkBuffer));

    offset += CHUNK_SIZE;
    const progress = Math.min((offset / file.size) * 20, 20); // 0-20% for file reading
    const progressPercent = Math.round((offset / file.size) * 100);

    sendProgress(
      `读取文件 ${progressPercent}% (${chunks.length}/${Math.ceil(
        file.size / CHUNK_SIZE
      )} 块)...`,
      progress
    );

    // 对于超大文件，更频繁地进行垃圾回收
    if (fileSizeMB > 1000 && chunks.length % 2 === 0) {
      if (typeof gc === "function") {
        gc();
        ImageDebugLogger.debug(
          ImageDebugLogger.STAGES.FILE_PARSE,
          `强制垃圾回收 (块 ${chunks.length})`
        );
      }
    } else if (typeof gc === "function" && chunks.length % 5 === 0) {
      gc();
    }

    // Monitor memory usage
    ImageDebugLogger.logMemoryUsage(
      ImageDebugLogger.STAGES.FILE_PARSE,
      `读取块 ${chunks.length}/${Math.ceil(file.size / CHUNK_SIZE)}`
    );

    // 检查内存使用情况，如果过高则警告
    if (typeof performance !== "undefined" && performance.memory) {
      const memoryUsageMB = performance.memory.usedJSHeapSize / 1024 / 1024;
      if (memoryUsageMB > 800) {
        ImageDebugLogger.warn(
          ImageDebugLogger.STAGES.FILE_PARSE,
          `内存使用较高: ${memoryUsageMB.toFixed(0)}MB`,
          {
            currentChunk: chunks.length,
            totalChunks: Math.ceil(file.size / CHUNK_SIZE),
          }
        );
      }
    }
  }

  // Combine chunks into single ArrayBuffer
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let position = 0;

  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.length;
  }

  // Clear chunks array to free memory
  chunks.length = 0;

  ImageDebugLogger.info(ImageDebugLogger.STAGES.FILE_PARSE, `文件读取完成`, {
    totalSize: `${(totalLength / 1024 / 1024).toFixed(2)}MB`,
  });

  return result.buffer;
}

async function readChunkAsArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

// Main message handler
self.onmessage = async function (e) {
  const { type, data } = e.data;

  try {
    switch (type) {
      case MESSAGE_TYPES.CANCEL:
        isValidationCancelled = true;
        break;

      case MESSAGE_TYPES.VALIDATE_EXCEL:
        await validateExcel(data);
        break;
      case MESSAGE_TYPES.VALIDATE_IMAGES:
        await validateImages(data);
        break;
      default:
        sendError(`Unknown message type: ${type}`);
    }
  } catch (error) {
    sendError(error.message);
  }
};

// Excel validation function
async function validateExcel(data) {
  const {
    fileBuffer,
    file,
    taskName,
    selectedSheet,
    template,
    includeImages,
    enableWatermarkDetection,
    isLargeFile,
  } = data;

  // 🚀 立即发送进度反馈，避免用户感觉延迟
  postMessage({
    type: MESSAGE_TYPES.PROGRESS,
    data: { progress: 8, message: "Worker已就绪，开始处理..." },
  });

  // 接收从主线程传递的完整模板
  if (template) {
    templateFromMainThread = template;
  }

  try {
    let actualFileBuffer;

    if (isLargeFile && file) {
      // For large files, read File object in chunks
      ImageDebugLogger.info(
        ImageDebugLogger.STAGES.FILE_PARSE,
        `处理大文件: ${file.name}`,
        {
          fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
          isLargeFile: true,
        }
      );

      // Read file in worker thread
      actualFileBuffer = await readFileInChunks(file);
    } else {
      // For small files, use provided buffer
      actualFileBuffer = fileBuffer;
    }

    // 直接调用修复后的 validateExcelStreaming 函数
    const result = await validateExcelStreaming(
      actualFileBuffer,
      taskName,
      selectedSheet
    );

    // 如果需要包含图片验证
    if (includeImages && result) {
      try {
        // 优先使用解析流程最终确定的工作表名称
        const sheetForImages =
          result && result.usedSheetName ? result.usedSheetName : selectedSheet;
        sendProgress("🚀 前端解析：正在验证图片...", 85);
        const imageValidationResult = await validateImagesInternal(
          actualFileBuffer,
          sheetForImages || null,
          enableWatermarkDetection || false
        );
        result.imageValidation = imageValidationResult;
      } catch (imageError) {
        console.warn("图片验证失败:", imageError);
        result.imageValidation = {
          totalImages: 0,
          blurryImages: 0,
          duplicateGroups: 0,
          results: [],
          warning: "图片验证失败: " + imageError.message,
        };
      }
    }

    sendResult(result);
  } catch (error) {
    console.error("validateExcel错误:", error);
    sendError(error.message);
  }
}

// Internal image validation function (shared logic)
async function validateImagesInternal(
  fileBuffer,
  selectedSheet = null,
  enableWatermarkDetection = false
) {
  ImageDebugLogger.startTimer("IMAGE_VALIDATION_TOTAL");
  ImageDebugLogger.logMemoryUsage(
    ImageDebugLogger.STAGES.IMAGE_EXTRACT,
    "图片验证开始"
  );

  ImageDebugLogger.info(
    ImageDebugLogger.STAGES.IMAGE_EXTRACT,
    "开始图片验证流程",
    {
      fileSize: fileBuffer
        ? `${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`
        : "未知",
      selectedSheet: selectedSheet || "未指定",
      blockHashAvailable,
    }
  );

  // 如果 blockhash 不可用，返回空结果
  if (
    !blockHashAvailable ||
    !self.blockhash ||
    typeof self.blockhash.bmvbhash !== "function"
  ) {
    ImageDebugLogger.warn(
      ImageDebugLogger.STAGES.IMAGE_EXTRACT,
      "图片验证跳过：blockhash 不可用",
      {
        blockHashAvailable,
        selfBlockhash: !!self.blockhash,
        bmvbhashFunction: typeof self.blockhash?.bmvbhash,
      }
    );
    return {
      images: [],
      duplicates: [],
      errors: [],
      summary: {
        totalImages: 0,
        duplicateGroups: 0,
        totalDuplicates: 0,
      },
    };
  }

  try {
    ImageDebugLogger.startTimer("ZIP_EXTRACT");
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(fileBuffer);
    ImageDebugLogger.endTimer("ZIP_EXTRACT", "ZIP文件解压");

    ImageDebugLogger.info(
      ImageDebugLogger.STAGES.ZIP_EXTRACT,
      "ZIP文件解压完成",
      {
        totalFiles: Object.keys(zipContent.files).length,
        hasMediaFolder: !!zipContent.folder("xl/media"),
      }
    );

    // Extract images from xl/media and get position info from drawing relationships
    const images = [];
    const mediaFolder = zipContent.folder("xl/media");

    ImageDebugLogger.startTimer("POSITION_MAP");
    // Try to get drawing relationships to map images to positions
    const imagePositions = await extractImagePositions(
      zipContent,
      selectedSheet
    );
    ImageDebugLogger.endTimer("POSITION_MAP", "图片位置映射");

    // 针对常见任务类型做一次位置合理性过滤，避免误解析到非目标列
    (function applyExpectedColumnFilter() {
      try {
        if (!selectedSheet) return;
        const sheet = String(selectedSheet);
        let expectedCols = null;
        if (sheet.includes("药店") || sheet.includes("藥店")) {
          expectedCols = ["M", "N"]; // 门头/内部
        } else if (sheet.includes("医院") || sheet.includes("醫院")) {
          expectedCols = ["O", "P"]; // 医院门头照/科室照片
        } else if (sheet.includes("科室")) {
          expectedCols = ["N", "O"]; // 科室拜访
        }
        if (!expectedCols) return;

        // 仅当过滤后仍有结果时才覆盖，避免误删全部映射
        let filteredCount = 0;
        let originalCount = 0;
        const filtered = new Map();
        imagePositions.forEach((list, key) => {
          const safeList = Array.isArray(list) ? list : [];
          originalCount += safeList.length;
          const newList = safeList.filter(
            (p) =>
              p &&
              typeof p.column === "string" &&
              expectedCols.includes(p.column)
          );
          if (newList.length > 0) {
            filtered.set(key, newList);
            filteredCount += newList.length;
          }
        });
        if (filtered.size > 0 && filteredCount > 0) {
          // 只有当过滤掉了可疑列且仍保留了大部分期望列时才应用
          if (
            filteredCount <= originalCount &&
            filteredCount / Math.max(1, originalCount) >= 0.5
          ) {
            imagePositions.clear();
            filtered.forEach((v, k) => imagePositions.set(k, v));
            ImageDebugLogger.info(
              ImageDebugLogger.STAGES.POSITION_MAP,
              "已按任务类型过滤图片列",
              {
                selectedSheet,
                expectedCols,
                originalCount,
                filteredCount,
              }
            );
          }
        }
      } catch (e) {
        console.warn("应用图片列过滤失败:", e);
      }
    })();

    ImageDebugLogger.info(
      ImageDebugLogger.STAGES.POSITION_MAP,
      "图片位置映射完成",
      {
        positionMappings: imagePositions.size,
        mappedImages: Array.from(imagePositions.keys()),
        detailsForDebugging: Array.from(imagePositions.entries()).map(
          ([key, positions]) => ({
            key,
            positionCount: positions.length,
            positions: positions.map((p) => `${p.column}${p.row}`).join(", "),
          })
        ),
      }
    );

    if (mediaFolder) {
      ImageDebugLogger.startTimer("IMAGE_EXTRACT");
      const imagePromises = [];
      let imageCounter = 0;

      // 先收集所有图片文件，确保索引正确
      const imageFiles = [];
      mediaFolder.forEach((relativePath, file) => {
        if (file.dir) return;
        const fileName = file.name.toLowerCase();
        if (
          fileName.endsWith(".png") ||
          fileName.endsWith(".jpg") ||
          fileName.endsWith(".jpeg") ||
          fileName.endsWith(".gif") ||
          fileName.endsWith(".bmp") ||
          fileName.endsWith(".tif") ||
          fileName.endsWith(".tiff") ||
          fileName.endsWith(".webp") ||
          fileName.endsWith(".jfif") ||
          fileName.endsWith(".svg") ||
          fileName.endsWith(".emf") ||
          fileName.endsWith(".wmf")
        ) {
          imageFiles.push({ relativePath, file });
        }
      });

      // 按文件路径排序，确保顺序一致
      imageFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

      ImageDebugLogger.info(
        ImageDebugLogger.STAGES.IMAGE_EXTRACT,
        "发现图片文件",
        {
          totalImageFiles: imageFiles.length,
          imageFileNames: imageFiles.map((f) => f.relativePath),
          supportedFormats: [
            "png",
            "jpg",
            "jpeg",
            "gif",
            "bmp",
            "tif",
            "tiff",
            "webp",
            "jfif",
            "svg",
            "emf",
            "wmf",
          ],
        }
      );

      // 检测同名不同后缀的图片文件
      const fileNameGroups = new Map(); // basename -> [full filenames]
      imageFiles.forEach(({ relativePath }) => {
        const baseName = relativePath.replace(/\.[^.]+$/, ""); // remove extension
        if (!fileNameGroups.has(baseName)) {
          fileNameGroups.set(baseName, []);
        }
        fileNameGroups.get(baseName).push(relativePath);
      });

      const duplicateBaseNames = Array.from(fileNameGroups.entries()).filter(
        ([, files]) => files.length > 1
      );

      if (duplicateBaseNames.length > 0) {
        ImageDebugLogger.warn(
          ImageDebugLogger.STAGES.IMAGE_EXTRACT,
          "检测到同名不同后缀的图片文件",
          {
            count: duplicateBaseNames.length,
            details: duplicateBaseNames.map(([baseName, files]) => ({
              baseName,
              files,
              hasMappingForAll: files.map((f) => ({
                file: f,
                hasMapping: imagePositions.has(f),
              })),
            })),
          }
        );
      }

      // 处理每个图片文件（使用精确解析结果；无法解析时保持未知）
      imageFiles.forEach(({ relativePath, file }, index) => {
        imagePromises.push(
          file
            .async("uint8array")
            .then((data) => {
              ImageDebugLogger.debug(
                ImageDebugLogger.STAGES.IMAGE_EXTRACT,
                `处理图片文件: ${relativePath}`,
                {
                  index,
                  fileSize: `${(data.length / 1024).toFixed(2)}KB`,
                  fileName: relativePath,
                }
              );

              // 支持同一媒体文件的多次放置：位置列表
              let posList = imagePositions.get(relativePath);
              if (!posList) {
                posList = imagePositions.get(`xl/media/${relativePath}`);
              }

              // 如果没有找到位置映射，尝试查找同名不同后缀的图片位置
              if (!posList || posList.length === 0) {
                const baseNameWithoutExt = relativePath.replace(/\.[^.]+$/, "");
                const allKeys = Array.from(imagePositions.keys());
                const similarKeys = allKeys.filter((key) => {
                  const keyBase = key.replace(/\.[^.]+$/, "");
                  return keyBase === baseNameWithoutExt && key !== relativePath;
                });

                if (similarKeys.length > 0) {
                  const similarKey = similarKeys[0];
                  posList = imagePositions.get(similarKey);
                  if (posList && posList.length > 0) {
                    ImageDebugLogger.warn(
                      ImageDebugLogger.STAGES.IMAGE_EXTRACT,
                      `使用相似文件名的位置映射: ${relativePath}`,
                      {
                        originalFile: relativePath,
                        similarFile: similarKey,
                        positions: posList
                          .map((p) => `${p.column}${p.row}`)
                          .join(", "),
                        reason:
                          "同名不同后缀的图片，Excel中可能只引用了其中一个",
                      }
                    );
                  }
                }
              }

              if (Array.isArray(posList) && posList.length > 0) {
                ImageDebugLogger.info(
                  ImageDebugLogger.STAGES.IMAGE_EXTRACT,
                  `找到位置映射: ${relativePath}`,
                  {
                    positionCount: posList.length,
                    positions: posList.map((p) => ({
                      position: p.position,
                      row: p.row,
                      column: p.column,
                    })),
                  }
                );

                posList.forEach((positionInfo, dupIdx) => {
                  const imageInfo = {
                    id:
                      positionInfo && positionInfo.position
                        ? positionInfo.position
                        : `${relativePath}#${dupIdx}`,
                    name: relativePath,
                    size: data.length,
                    data: data,
                    position: positionInfo ? positionInfo.position : undefined,
                    row: positionInfo ? positionInfo.row : undefined,
                    column: positionInfo ? positionInfo.column : undefined,
                  };
                  images.push(imageInfo);

                  ImageDebugLogger.debug(
                    ImageDebugLogger.STAGES.IMAGE_EXTRACT,
                    `添加图片到处理队列`,
                    {
                      imageId: imageInfo.id,
                      position: imageInfo.position,
                      size: `${(imageInfo.size / 1024).toFixed(2)}KB`,
                    }
                  );
                });
              } else {
                ImageDebugLogger.warn(
                  ImageDebugLogger.STAGES.IMAGE_EXTRACT,
                  `未找到位置映射: ${relativePath}`,
                  {
                    fileName: relativePath,
                    index,
                    fileSize: `${(data.length / 1024).toFixed(2)}KB`,
                    availablePositions: Array.from(imagePositions.keys()),
                    reason: "跳过该条图片处理",
                  }
                );
                // 未找到位置映射，跳过该条图片处理，不使用位置估算
              }
            })
            .catch((error) => {
              ImageDebugLogger.error(
                ImageDebugLogger.STAGES.IMAGE_EXTRACT,
                `图片文件处理失败: ${relativePath}`,
                {
                  error: error.message,
                  stack: error.stack,
                  fileName: relativePath,
                  index,
                }
              );
            })
        );
      });

      // 等待所有图片处理完成（图片已在异步处理内直接推入 images）
      await Promise.all(imagePromises);
      ImageDebugLogger.endTimer("IMAGE_EXTRACT", "图片提取完成");

      ImageDebugLogger.info(
        ImageDebugLogger.STAGES.IMAGE_EXTRACT,
        "图片提取阶段完成",
        {
          totalExtracted: images.length,
          totalFiles: imageFiles.length,
          extractionRate: `${(
            (images.length / imageFiles.length) *
            100
          ).toFixed(1)}%`,
        }
      );
    }

    // 验证位置一致性
    ImageDebugLogger.startTimer("POSITION_VALIDATION");
    let positionInconsistencies = 0;
    images.forEach((img, i) => {
      // 仅记录位置不一致，用于排查；不强制修改，避免覆盖真实锚点
      if (img.position && img.row) {
        const expectedPosition = `${img.column || "N"}${img.row}`;
        if (img.position !== expectedPosition) {
          positionInconsistencies++;
          ImageDebugLogger.warn(
            ImageDebugLogger.STAGES.POSITION_MAP,
            `位置不一致: ${img.name}`,
            {
              displayedPosition: img.position,
              expectedPosition,
              row: img.row,
              column: img.column,
              imageIndex: i,
            }
          );
        }
      }
    });
    ImageDebugLogger.endTimer("POSITION_VALIDATION", "位置验证完成");

    ImageDebugLogger.info(
      ImageDebugLogger.STAGES.POSITION_MAP,
      "位置验证结果",
      {
        totalImages: images.length,
        positionInconsistencies,
        consistencyRate: `${(
          ((images.length - positionInconsistencies) / images.length) *
          100
        ).toFixed(1)}%`,
      }
    );

    sendProgress(`找到 ${images.length} 张图片，正在分析...`, 30);
    ImageDebugLogger.logMemoryUsage(
      ImageDebugLogger.STAGES.IMAGE_PROCESS,
      "开始图片质量分析"
    );

    if (images.length === 0) {
      ImageDebugLogger.warn(
        ImageDebugLogger.STAGES.IMAGE_EXTRACT,
        "没有找到任何图片文件"
      );
      return {
        totalImages: 0,
        blurryImages: 0,
        duplicateGroups: 0,
        results: [],
      };
    }

    // Validate images with real algorithms
    ImageDebugLogger.startTimer("QUALITY_CHECK");
    const results = [];

    // 串行处理避免内存溢出（700+张图片时并发会导致崩溃）
    const concurrency = 1; // 强制串行处理，避免内存问题

    ImageDebugLogger.info(
      ImageDebugLogger.STAGES.QUALITY_CHECK,
      "开始图片质量检测",
      {
        totalImages: images.length,
        concurrency,
        processingMode: "串行处理（避免内存溢出）",
      }
    );

    let completed = 0;
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      await Promise.all(
        batch.map(async (image) => {
          const imageStartTime = performance.now();
          try {
            ImageDebugLogger.debug(
              ImageDebugLogger.STAGES.QUALITY_CHECK,
              `分析图片: ${image.name}`,
              {
                imageId: image.id,
                size: `${(image.size / 1024).toFixed(2)}KB`,
                position: image.position,
              }
            );

            const sharpness = await calculateImageSharpness(image.data);
            const hashInfo = await calculateImageHash(image.data);

            const processingTime = performance.now() - imageStartTime;

            const result = {
              id: image.id,
              sharpness,
              isBlurry: sharpness < 60,
              hash: hashInfo.hash,
              duplicates: [],
              position: image.position,
              row: image.row,
              column: image.column,
              // 移除imageData存储以避免内存溢出（700+张图片时会导致崩溃）
              mimeType: image.name.toLowerCase().endsWith(".png")
                ? "image/png"
                : image.name.toLowerCase().endsWith(".jpg") ||
                  image.name.toLowerCase().endsWith(".jpeg")
                ? "image/jpeg"
                : "image/png",
              size: image.data.length,
              width: hashInfo.width,
              height: hashInfo.height,
            };
            // 尺寸/比例校验（启发式判断是否像手机拍摄）
            if (
              MOBILE_DIMENSION_CONFIG.ENABLED &&
              hashInfo.width &&
              hashInfo.height
            ) {
              const longSide = Math.max(hashInfo.width, hashInfo.height);
              const shortSide = Math.min(hashInfo.width, hashInfo.height);
              const megapixels = (hashInfo.width * hashInfo.height) / 1_000_000;
              const aspect = longSide / shortSide;

              const aspectOk = MOBILE_DIMENSION_CONFIG.ALLOWED_ASPECTS.some(
                ({ ratio, tolerance }) => {
                  return Math.abs(aspect - ratio) <= tolerance * ratio;
                }
              );

              const isLowPixel =
                megapixels < MOBILE_DIMENSION_CONFIG.MIN_MEGAPIXELS;
              const sizeOk =
                shortSide >= MOBILE_DIMENSION_CONFIG.MIN_SHORT_SIDE &&
                longSide >= MOBILE_DIMENSION_CONFIG.MIN_LONG_SIDE &&
                !isLowPixel;

              result.megapixels = Number(megapixels.toFixed(2));
              result.dimensionOK = !!(aspectOk && sizeOk);
              if (isLowPixel) {
                result.isLowPixel = true;
              }
              if (!result.dimensionOK) {
                const problems = [];
                if (!aspectOk)
                  problems.push(`非典型手机比例(≈${aspect.toFixed(2)}:1)`);
                if (
                  shortSide < MOBILE_DIMENSION_CONFIG.MIN_SHORT_SIDE ||
                  longSide < MOBILE_DIMENSION_CONFIG.MIN_LONG_SIDE
                )
                  problems.push(
                    `分辨率过低(${hashInfo.width}x${hashInfo.height})`
                  );
                if (isLowPixel)
                  problems.push(`像素不足(${result.megapixels}MP)`);
                result.dimensionIssue = problems.join("; ");

                // 为尺寸异常的图片生成小预览，便于前端查看
                const thumb = await createThumbnail(
                  image.data,
                  512,
                  result.mimeType || "image/jpeg",
                  0.85
                );
                if (thumb) {
                  result.imageData = thumb; // Uint8Array，sendResult 会用 transferable 优化
                }
              }
            }

            // 额外：模糊图片也生成预览
            if (result.isBlurry && !result.imageData) {
              const thumb = await createThumbnail(
                image.data,
                512,
                result.mimeType || "image/jpeg",
                0.85
              );
              if (thumb) result.imageData = thumb;
            }

            // 🎯 方案B：使用新的统一评分系统
            try {
              const exif = exifQuickScan(image.data, result.mimeType);

              // 尝试使用新评分系统
              if (typeof calculateImageSuspicionScore === "function") {
                const suspicionResult = calculateImageSuspicionScore({
                  width: hashInfo.width,
                  height: hashInfo.height,
                  megapixels:
                    result.megapixels ||
                    (hashInfo.width * hashInfo.height) / 1_000_000,
                  mimeType: result.mimeType,
                  sizeBytes: image.data.length,
                  exif,
                  hasBorder: result.hasBorder || false,
                  borderSides: result.borderSides || [],
                  borderWidth: result.borderWidth || {},
                  hasWatermark: result.hasWatermark || false,
                  watermarkRegions: result.watermarkRegions || [],
                  watermarkConfidence: result.watermarkConfidence || 0,
                });

                // 将新的评分结果添加到result中
                result.suspicionScore = suspicionResult.suspicionScore;
                result.suspicionLevel = suspicionResult.suspicionLevel;
                result.suspicionLabel = suspicionResult.suspicionLabel;
                result.suspicionColor = suspicionResult.suspicionColor;
                result.suspicionFactors = suspicionResult.factors;

                // 保留旧的webLikelihood以兼容现有UI
                result.webLikelihood = suspicionResult.suspicionScore / 100;
                result.webReasons = suspicionResult.factors;
              } else {
                // 回退到旧系统
                const webEval = scoreWebLikelihood({
                  mimeType: result.mimeType,
                  width: hashInfo.width,
                  height: hashInfo.height,
                  megapixels:
                    result.megapixels ||
                    (hashInfo.width * hashInfo.height) / 1_000_000,
                  exif,
                  sizeBytes: image.data.length,
                  hashFrequency: undefined,
                });
                result.webLikelihood = webEval.webLikelihood;
                result.webReasons = webEval.reasons;
              }
            } catch (scoringError) {
              console.warn(`评分系统失败: ${image.name}`, scoringError);
            }

            // 边框检测
            try {
              const borderInfo = await detectSolidBorder(image.data);
              if (borderInfo.hasBorder) {
                result.hasBorder = borderInfo.hasBorder;
                result.borderSides = borderInfo.borderSides;
                result.borderWidth = borderInfo.borderWidth;

                // 为存在边框的图片生成缩略图，便于前端查看
                if (!result.imageData) {
                  const thumb = await createThumbnail(
                    image.data,
                    512,
                    result.mimeType || "image/jpeg",
                    0.85
                  );
                  if (thumb) result.imageData = thumb;
                }
              }
            } catch (borderError) {
              console.warn(`边框检测失败: ${image.name}`, borderError);
            }

            // 水印检测（仅当启用时）
            console.log(
              "[调试] 水印检测开关状态:",
              enableWatermarkDetection,
              "| 图片:",
              image.name
            );
            if (enableWatermarkDetection) {
              console.log("[调试] 开始执行水印检测 -", image.name);
              try {
                const watermarkInfo = await detectWatermarkTwoBranch(
                  image.data
                );
                console.log(`[水印检测] ${image.name} 结果:`, {
                  confidence: watermarkInfo.watermarkConfidence,
                  level: watermarkInfo.watermarkLevel,
                  hasWatermark: watermarkInfo.hasWatermark,
                  details: watermarkInfo.analysisDetails,
                });

                if (watermarkInfo.hasWatermark) {
                  result.hasWatermark = watermarkInfo.hasWatermark;
                  result.watermarkLevel = watermarkInfo.watermarkLevel; // 新增
                  result.watermarkRegions = watermarkInfo.watermarkRegions;
                  result.watermarkConfidence =
                    watermarkInfo.watermarkConfidence;

                  // 为有水印的图片生成缩略图
                  if (!result.imageData) {
                    const thumb = await createThumbnail(
                      image.data,
                      512,
                      result.mimeType || "image/jpeg",
                      0.85
                    );
                    if (thumb) result.imageData = thumb;
                  }
                }
              } catch (watermarkError) {
                console.warn(`水印检测失败: ${image.name}`, watermarkError);
              }
            }

            results.push(result);

            ImageDebugLogger.debug(
              ImageDebugLogger.STAGES.QUALITY_CHECK,
              `图片分析完成: ${image.name}`,
              {
                sharpness: sharpness.toFixed(2),
                isBlurry: result.isBlurry,
                hashLength: result.hash ? result.hash.length : 0,
                processingTime: `${processingTime.toFixed(2)}ms`,
              }
            );
          } catch (error) {
            ImageDebugLogger.error(
              ImageDebugLogger.STAGES.QUALITY_CHECK,
              `图片分析失败: ${image.name}`,
              {
                error: error.message,
                stack: error.stack,
                imageId: image.id,
                size: `${(image.size / 1024).toFixed(2)}KB`,
              }
            );
            results.push({
              id: image.id,
              sharpness: 0,
              isBlurry: true,
              hash: "",
              duplicates: [],
              position: image.position,
              row: image.row,
              column: image.column,
            });
          } finally {
            completed++;
            const progress = 30 + (completed / images.length) * 60;
            sendProgress(
              `正在分析图片 ${completed}/${images.length}...`,
              progress
            );

            // 定期记录进度和内存使用
            if (completed % 10 === 0 || completed === images.length) {
              ImageDebugLogger.info(
                ImageDebugLogger.STAGES.QUALITY_CHECK,
                `质量检测进度更新`,
                {
                  completed,
                  total: images.length,
                  progress: `${((completed / images.length) * 100).toFixed(
                    1
                  )}%`,
                }
              );
              ImageDebugLogger.logMemoryUsage(
                ImageDebugLogger.STAGES.QUALITY_CHECK,
                `处理了${completed}张图片`
              );
            }
          }
        })
      );

      // 内存清理和让出控制权（处理大量图片时防止崩溃）
      if (typeof self.gc === "function") {
        self.gc(); // 强制垃圾回收（如果可用）
        ImageDebugLogger.debug(
          ImageDebugLogger.STAGES.MEMORY_MONITOR,
          "执行强制垃圾回收"
        );
      }

      // 增加处理间隔，让浏览器有时间回收内存
      await new Promise((r) => setTimeout(r, 100));
    }

    ImageDebugLogger.endTimer("QUALITY_CHECK", "图片质量检测完成");
    const qualityStats = {
      totalProcessed: results.length,
      successfulAnalysis: results.filter((r) => r.sharpness > 0).length,
      failedAnalysis: results.filter((r) => r.sharpness === 0).length,
      blurryCount: results.filter((r) => r.isBlurry).length,
    };
    ImageDebugLogger.info(
      ImageDebugLogger.STAGES.QUALITY_CHECK,
      "质量检测统计",
      qualityStats
    );

    sendProgress("正在检测重复图片...", 95);
    ImageDebugLogger.startTimer("DUPLICATE_CHECK");

    // Detect duplicates (simplified)
    ImageDebugLogger.info(
      ImageDebugLogger.STAGES.DUPLICATE_CHECK,
      "开始重复检测",
      {
        totalImages: results.length,
        hashAlgorithm: "blockhash",
        detectionMethod: "汉明距离比较",
      }
    );

    // 构建图片数据映射用于二次确认
    const imageDataMap = new Map();
    for (const img of images) {
      imageDataMap.set(img.id, img.data);
    }
    await detectDuplicates(results, imageDataMap);
    ImageDebugLogger.endTimer("DUPLICATE_CHECK", "重复检测完成");

    // 保障：对标记为重复的图片补充缩略图预览
    try {
      for (const r of results) {
        if (r.duplicates && r.duplicates.length > 0 && !r.imageData) {
          const data = imageDataMap.get(r.id);
          if (data) {
            const thumb = await createThumbnail(
              data,
              512,
              r.mimeType || "image/jpeg",
              0.85
            );
            if (thumb) r.imageData = thumb;
          }
        }
      }
    } catch (e) {
      console.warn("为重复图片生成缩略图失败:", e);
    }

    // 调试：输出重复检测结果
    const duplicateResults = results.filter((r) => r.duplicates.length > 0);
    ImageDebugLogger.info(
      ImageDebugLogger.STAGES.DUPLICATE_CHECK,
      "重复检测结果",
      {
        totalDuplicates: duplicateResults.length,
        duplicateDetails: duplicateResults.map((r) => ({
          id: r.id,
          position: r.position,
          duplicateCount: r.duplicates.length,
          duplicateIds: r.duplicates.map((d) => d.id),
        })),
      }
    );

    const blurryImages = results.filter((r) => r.isBlurry).length;
    const duplicateGroups = countDuplicateGroups(results);

    // 最终统计和总结
    const finalStats = {
      totalImages: images.length,
      blurryImages,
      duplicateGroups,
      processingSuccess: true,
    };

    ImageDebugLogger.endTimer("IMAGE_VALIDATION_TOTAL", "图片验证总流程完成");
    ImageDebugLogger.logMemoryUsage(
      ImageDebugLogger.STAGES.IMAGE_PROCESS,
      "验证完成"
    );
    ImageDebugLogger.info(
      ImageDebugLogger.STAGES.IMAGE_PROCESS,
      "图片验证最终结果",
      finalStats
    );

    return {
      totalImages: images.length,
      blurryImages,
      duplicateGroups,
      results,
    };
  } catch (error) {
    ImageDebugLogger.error(
      ImageDebugLogger.STAGES.IMAGE_PROCESS,
      "图片验证流程失败",
      {
        error: error.message,
        stack: error.stack,
        fileSize: fileBuffer
          ? `${(fileBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`
          : "未知",
        selectedSheet: selectedSheet || "未指定",
        stage: "图片验证主流程",
      }
    );
    ImageDebugLogger.logMemoryUsage(
      ImageDebugLogger.STAGES.IMAGE_PROCESS,
      "验证失败时"
    );
    throw error;
  }
}

// Image validation function (for direct image validation requests)
async function validateImages(data) {
  const { fileBuffer, file, isLargeFile } = data;

  let actualFileBuffer;

  if (isLargeFile && file) {
    // For large files, read File object in chunks
    ImageDebugLogger.info(
      ImageDebugLogger.STAGES.IMAGE_EXTRACT,
      `处理大文件图片验证: ${file.name}`,
      {
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        isLargeFile: true,
      }
    );

    actualFileBuffer = await readFileInChunks(file);
  } else {
    actualFileBuffer = fileBuffer;
  }

  // 如果 blockhash 不可用，返回空结果
  if (
    !blockHashAvailable ||
    !self.blockhash ||
    typeof self.blockhash.bmvbhash !== "function"
  ) {
    console.warn("图片验证跳过：blockhash 不可用");
    sendResult({
      images: [],
      duplicates: [],
      errors: [],
      summary: {
        totalImages: 0,
        duplicateGroups: 0,
        totalDuplicates: 0,
      },
    });
    return;
  }

  sendProgress("正在提取图片...", 10);

  try {
    const result = await validateImagesInternal(actualFileBuffer);
    sendResult(result);
  } catch (error) {
    sendError(`图片验证失败: ${error.message}`);
  }
}

// Image analysis functions

// 计算图片清晰度（基于 Laplacian 方差的模糊检测）
async function calculateImageSharpness(imageData) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return 50; // 默认中等清晰度
    }

    const blob = new Blob([imageData]);
    const bitmap = await createImageBitmap(blob);

    // 缩放到合适尺寸以提高性能（短边不超过256px）
    const scale = Math.min(256 / Math.min(bitmap.width, bitmap.height), 1);
    const width = Math.floor(bitmap.width * scale);
    const height = Math.floor(bitmap.height * scale);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return 50;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imagePixelData = ctx.getImageData(0, 0, width, height);
    const data = imagePixelData.data;

    // 转换为灰度并计算 Laplacian 方差
    const gray = new Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const grayValue = Math.round(
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      );
      gray[i / 4] = grayValue;
    }

    // Laplacian 卷积核 (3x3)
    const laplacian = [
      [0, -1, 0],
      [-1, 4, -1],
      [0, -1, 0],
    ];

    let variance = 0;
    let count = 0;

    // 应用 Laplacian 卷积（跳过边界像素）
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let ky = 0; ky < 3; ky++) {
          for (let kx = 0; kx < 3; kx++) {
            const px = x + kx - 1;
            const py = y + ky - 1;
            sum += gray[py * width + px] * laplacian[ky][kx];
          }
        }
        variance += sum * sum;
        count++;
      }
    }

    // 计算方差并映射到 0-100 分数
    const laplacianVariance = count > 0 ? variance / count : 0;

    // 将方差映射到 0-100 的清晰度分数
    // 经验值：方差 > 500 通常是清晰图片，< 100 通常是模糊图片
    const sharpnessScore = Math.min(100, Math.max(0, laplacianVariance / 10));

    return sharpnessScore;
  } catch (error) {
    console.warn("清晰度计算失败:", error);
    return 50; // 默认中等清晰度
  }
}

// 计算图片感知哈希（基于blockhash算法）
async function calculateImageHash(imageData) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return { hash: "", width: 0, height: 0 };
    }
    const blob = new Blob([imageData]);
    const bitmap = await createImageBitmap(blob);

    const width = bitmap.width;
    const height = bitmap.height;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { hash: "", width, height };

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close(); // 立即释放bitmap资源

    const imagePixelData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 使用更高位数的 blockhash 提升区分度
    const hash = blockhash.bmvbhash(
      imagePixelData,
      IMAGE_DUP_CONFIG.BLOCKHASH_BITS
    );

    // 清理canvas资源
    canvas.width = 0;
    canvas.height = 0;

    return { hash, width, height };
  } catch (error) {
    console.warn("感知哈希计算失败:", error);
    return { hash: "", width: 0, height: 0 }; // 返回空哈希，避免误判
  }
}

// 检测图片纯色边框
async function detectSolidBorder(imageData) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return { hasBorder: false, borderSides: [], borderWidth: {} };
    }

    const blob = new Blob([imageData]);
    const bitmap = await createImageBitmap(blob);

    const width = bitmap.width;
    const height = bitmap.height;

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      bitmap.close();
      return { hasBorder: false, borderSides: [], borderWidth: {} };
    }

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const imagePixelData = ctx.getImageData(0, 0, width, height);
    const data = imagePixelData.data;

    // 边框检测配置
    const BORDER_COLOR_TOLERANCE = 15; // 颜色容差（适中的容差）
    const BORDER_CONSISTENCY_RATIO = 0.9; // 90%的像素需要符合条件（平衡的阈值）
    const BORDER_MIN_WIDTH = 2; // 最小边框宽度（过滤1px的细线）
    const BORDER_MAX_WIDTH = 40; // 最大边框宽度（适当提高以检测更宽的边框）
    const BORDER_BRIGHTNESS_DIFF_THRESHOLD = 30; // 亮度差异阈值（提高到30，更严格的边界判断）

    const borderSides = [];
    const borderWidth = {};

    // 检测上边框
    const topBorder = detectBorderEdge(
      data,
      width,
      height,
      "top",
      BORDER_COLOR_TOLERANCE,
      BORDER_CONSISTENCY_RATIO,
      BORDER_BRIGHTNESS_DIFF_THRESHOLD
    );
    if (topBorder >= BORDER_MIN_WIDTH && topBorder <= BORDER_MAX_WIDTH) {
      borderSides.push("top");
      borderWidth.top = topBorder;
    }

    // 检测下边框
    const bottomBorder = detectBorderEdge(
      data,
      width,
      height,
      "bottom",
      BORDER_COLOR_TOLERANCE,
      BORDER_CONSISTENCY_RATIO,
      BORDER_BRIGHTNESS_DIFF_THRESHOLD
    );
    if (bottomBorder >= BORDER_MIN_WIDTH && bottomBorder <= BORDER_MAX_WIDTH) {
      borderSides.push("bottom");
      borderWidth.bottom = bottomBorder;
    }

    // 检测左边框
    const leftBorder = detectBorderEdge(
      data,
      width,
      height,
      "left",
      BORDER_COLOR_TOLERANCE,
      BORDER_CONSISTENCY_RATIO,
      BORDER_BRIGHTNESS_DIFF_THRESHOLD
    );
    if (leftBorder >= BORDER_MIN_WIDTH && leftBorder <= BORDER_MAX_WIDTH) {
      borderSides.push("left");
      borderWidth.left = leftBorder;
    }

    // 检测右边框
    const rightBorder = detectBorderEdge(
      data,
      width,
      height,
      "right",
      BORDER_COLOR_TOLERANCE,
      BORDER_CONSISTENCY_RATIO,
      BORDER_BRIGHTNESS_DIFF_THRESHOLD
    );
    if (rightBorder >= BORDER_MIN_WIDTH && rightBorder <= BORDER_MAX_WIDTH) {
      borderSides.push("right");
      borderWidth.right = rightBorder;
    }

    // 清理canvas资源
    canvas.width = 0;
    canvas.height = 0;

    return {
      hasBorder: borderSides.length > 0,
      borderSides,
      borderWidth,
    };
  } catch (error) {
    console.warn("边框检测失败:", error);
    return { hasBorder: false, borderSides: [], borderWidth: {} };
  }
}

// 检测单条边的边框
function detectBorderEdge(
  data,
  width,
  height,
  side,
  tolerance,
  consistencyRatio,
  brightnessDiffThreshold
) {
  let maxScanDepth;
  let getPixelIndex;
  let scanLength;

  switch (side) {
    case "top":
      maxScanDepth = Math.min(height, 50); // 最多扫按50行
      scanLength = width;
      getPixelIndex = (depth, offset) => (depth * width + offset) * 4;
      break;
    case "bottom":
      maxScanDepth = Math.min(height, 50);
      scanLength = width;
      getPixelIndex = (depth, offset) =>
        ((height - 1 - depth) * width + offset) * 4;
      break;
    case "left":
      maxScanDepth = Math.min(width, 50); // 最多扫按50列
      scanLength = height;
      getPixelIndex = (depth, offset) => (offset * width + depth) * 4;
      break;
    case "right":
      maxScanDepth = Math.min(width, 50);
      scanLength = height;
      getPixelIndex = (depth, offset) =>
        (offset * width + (width - 1 - depth)) * 4;
      break;
    default:
      return 0;
  }

  let borderStartDepth = -1;
  let lastLineBrightness = null;

  // 从外向内逐行/列扫描
  for (let depth = 0; depth < maxScanDepth; depth++) {
    // 获取当前行/列的所有像素颜色
    const colors = [];
    for (let offset = 0; offset < scanLength; offset++) {
      const idx = getPixelIndex(depth, offset);
      colors.push([data[idx], data[idx + 1], data[idx + 2]]);
    }

    // 计算当前行/列的平均亮度
    const currentBrightness =
      colors.reduce(
        (sum, color) =>
          sum + (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]),
        0
      ) / colors.length;

    // 检查这行/列是否是纯色边框
    if (isSolidColorLine(colors, tolerance, consistencyRatio)) {
      if (borderStartDepth === -1) {
        borderStartDepth = depth;
      }
      lastLineBrightness = currentBrightness;
      continue;
    } else {
      // 遇到非纯色行/列
      if (depth === 0) {
        // 第一行/列就不是纯色，无边框
        return 0;
      }

      // 检查边框与内容的对比度（避免将内部的白色区域误判为边框）
      if (lastLineBrightness !== null) {
        const brightnessDiff = Math.abs(currentBrightness - lastLineBrightness);
        // 如果亮度差异很小，说明不是真正的边界，可能是内部区域
        if (brightnessDiff < brightnessDiffThreshold) {
          return 0;
        }
      }

      return depth;
    }
  }

  // 如果扫描到最大深度都是纯色，可能不是边框而是大面积纯色区域
  // 返回0表示不认为是边框
  return 0;
}

// 检查一行/列像素是否为纯色
function isSolidColorLine(colors, tolerance, consistencyRatio) {
  if (colors.length === 0) return false;

  // 计算平均颜色
  const avgColor = [0, 0, 0];
  for (const color of colors) {
    avgColor[0] += color[0];
    avgColor[1] += color[1];
    avgColor[2] += color[2];
  }
  avgColor[0] = Math.round(avgColor[0] / colors.length);
  avgColor[1] = Math.round(avgColor[1] / colors.length);
  avgColor[2] = Math.round(avgColor[2] / colors.length);

  // 检查有多少像素在容差范围内
  let consistentPixels = 0;
  for (const color of colors) {
    const rDiff = Math.abs(color[0] - avgColor[0]);
    const gDiff = Math.abs(color[1] - avgColor[1]);
    const bDiff = Math.abs(color[2] - avgColor[2]);

    // 使用最大色差作为判断标准（允许轻微渐变）
    if (rDiff <= tolerance && gDiff <= tolerance && bDiff <= tolerance) {
      consistentPixels++;
    }
  }

  // 检查一致性比例是否达到阈值
  const ratio = consistentPixels / colors.length;
  return ratio >= consistencyRatio;
}

// 检测图片水印（边缘文字/图案检测）
async function detectWatermark(imageData) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return {
        hasWatermark: false,
        watermarkRegions: [],
        watermarkConfidence: 0,
      };
    }

    const blob = new Blob([imageData]);
    const bitmap = await createImageBitmap(blob);

    // 性能优化：降采样到合理尺寸
    const maxSize = 800;
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.floor(bitmap.width * scale);
    const height = Math.floor(bitmap.height * scale);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      bitmap.close();
      return {
        hasWatermark: false,
        watermarkRegions: [],
        watermarkConfidence: 0,
      };
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imagePixelData = ctx.getImageData(0, 0, width, height);
    const data = imagePixelData.data;

    // 定义检测区域：9宫格策略（外围一圈+底部中心）
    const regionRatio = 0.15;
    const regions = [
      // 顶部两角
      {
        x: 0,
        y: 0,
        width: Math.floor(width * regionRatio),
        height: Math.floor(height * regionRatio),
        name: "topLeft",
      },
      {
        x: Math.floor(width * (1 - regionRatio)),
        y: 0,
        width: Math.floor(width * regionRatio),
        height: Math.floor(height * regionRatio),
        name: "topRight",
      },
      // 左右中间
      {
        x: 0,
        y: Math.floor(height * 0.4),
        width: Math.floor(width * regionRatio),
        height: Math.floor(height * 0.2),
        name: "leftMiddle",
      },
      {
        x: Math.floor(width * (1 - regionRatio)),
        y: Math.floor(height * 0.4),
        width: Math.floor(width * regionRatio),
        height: Math.floor(height * 0.2),
        name: "rightMiddle",
      },
      // 底部三个区域
      {
        x: 0,
        y: Math.floor(height * (1 - regionRatio)),
        width: Math.floor(width * regionRatio),
        height: Math.floor(height * regionRatio),
        name: "bottomLeft",
      },
      {
        x: Math.floor(width * (1 - regionRatio)),
        y: Math.floor(height * (1 - regionRatio)),
        width: Math.floor(width * regionRatio),
        height: Math.floor(height * regionRatio),
        name: "bottomRight",
      },
      {
        x: Math.floor(width * 0.35),
        y: Math.floor(height * 0.9),
        width: Math.floor(width * 0.3),
        height: Math.floor(height * 0.1),
        name: "centerBottom",
      },
    ];

    // 检测每个区域
    const watermarkRegions = [];
    let totalConfidence = 0;

    for (const region of regions) {
      const features = analyzeWatermarkRegion(data, width, height, region);

      // 判断是否为水印
      if (isWatermarkRegion(features)) {
        watermarkRegions.push(region.name);
        totalConfidence += features.confidence;
      }
    }

    // 清理canvas资源
    canvas.width = 0;
    canvas.height = 0;

    const hasWatermark = watermarkRegions.length > 0;
    const watermarkConfidence =
      watermarkRegions.length > 0
        ? totalConfidence / watermarkRegions.length
        : 0;

    return {
      hasWatermark,
      watermarkRegions,
      watermarkConfidence,
    };
  } catch (error) {
    console.warn("水印检测失败:", error);
    return {
      hasWatermark: false,
      watermarkRegions: [],
      watermarkConfidence: 0,
    };
  }
}

// 分析区域的水印特征
function analyzeWatermarkRegion(data, width, height, region) {
  const { x, y, width: w, height: h } = region;

  // 提取区域像素
  const regionPixels = [];
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) {
      if (row >= 0 && row < height && col >= 0 && col < width) {
        const idx = (row * width + col) * 4;
        regionPixels.push([
          data[idx],
          data[idx + 1],
          data[idx + 2],
          data[idx + 3],
        ]);
      }
    }
  }

  if (regionPixels.length === 0) {
    return { confidence: 0, edgeDensity: 0, variance: 0, hasText: false };
  }

  // 1. 计算边缘密度（使用Sobel算子）
  let edgeCount = 0;
  const edgeThreshold = 30;

  for (let row = y + 1; row < y + h - 1; row++) {
    for (let col = x + 1; col < x + w - 1; col++) {
      if (row >= 0 && row < height && col >= 0 && col < width) {
        const idx = (row * width + col) * 4;

        // 简化的Sobel算子（仅计算亮度梯度）
        const centerGray =
          0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const rightIdx = (row * width + col + 1) * 4;
        const rightGray =
          0.299 * data[rightIdx] +
          0.587 * data[rightIdx + 1] +
          0.114 * data[rightIdx + 2];
        const bottomIdx = ((row + 1) * width + col) * 4;
        const bottomGray =
          0.299 * data[bottomIdx] +
          0.587 * data[bottomIdx + 1] +
          0.114 * data[bottomIdx + 2];

        const gx = Math.abs(rightGray - centerGray);
        const gy = Math.abs(bottomGray - centerGray);
        const magnitude = Math.sqrt(gx * gx + gy * gy);

        if (magnitude > edgeThreshold) {
          edgeCount++;
        }
      }
    }
  }

  const edgeDensity = edgeCount / regionPixels.length;

  // 2. 计算灰度方差（检测图案/文字对比度）
  const grayValues = regionPixels.map(
    (pixel) => 0.299 * pixel[0] + 0.587 * pixel[1] + 0.114 * pixel[2]
  );
  const mean =
    grayValues.reduce((sum, val) => sum + val, 0) / grayValues.length;
  const variance =
    grayValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    grayValues.length;

  // 3. 检测半透明特征（水印常见特征）
  let semiTransparentCount = 0;
  for (const pixel of regionPixels) {
    if (pixel[3] < 230) {
      // alpha < 230
      semiTransparentCount++;
    }
  }
  const semiTransparentRatio = semiTransparentCount / regionPixels.length;

  // 4. 综合判断
  let confidence = 0;

  // 边缘密度贡献（文字/图案特征）
  if (edgeDensity > 0.05) confidence += 30;
  else if (edgeDensity > 0.03) confidence += 20;
  else if (edgeDensity > 0.01) confidence += 10;

  // 方差贡献（对比度）
  if (variance > 800) confidence += 25;
  else if (variance > 500) confidence += 15;
  else if (variance > 200) confidence += 5;

  // 半透明特征贡献
  if (semiTransparentRatio > 0.3) confidence += 25;
  else if (semiTransparentRatio > 0.1) confidence += 15;

  // 亮度检查（水印通常较浅或较深）
  if (mean < 100 || mean > 200) confidence += 20;

  return {
    confidence: Math.min(100, confidence),
    edgeDensity,
    variance,
    semiTransparentRatio,
    hasText: edgeDensity > 0.02 && variance > 300,
  };
}

// 判断是否为水印区域
function isWatermarkRegion(features) {
  // 综合判断：置信度达到阈值
  return features.confidence >= 50;
}

// 轻量EXIF快速扫描（仅JPEG）：查找APP1/Exif和常见标签关键字（近似）
function exifQuickScan(imageData, mimeType) {
  try {
    const out = {
      hasExif: false,
      make: false,
      model: false,
      software: null,
      dateTimeOriginal: false,
    };
    if (!mimeType || !/jpe?g/i.test(mimeType)) return out;
    // 为减少开销，仅扫描前256KB
    const head = imageData.subarray(0, Math.min(imageData.length, 256 * 1024));
    const td = new TextDecoder("latin1");
    const txt = td.decode(head);
    if (txt.includes("Exif\x00\x00")) out.hasExif = true;
    if (/Make\x00|Make\u0000|Make/.test(txt)) out.make = true;
    if (/Model\x00|Model\u0000|Model/.test(txt)) out.model = true;
    const swMatch = txt.match(/Software[^\0]{0,40}/);
    if (swMatch) out.software = swMatch[0];
    if (/DateTimeOriginal/.test(txt)) out.dateTimeOriginal = true;
    return out;
  } catch {
    return {
      hasExif: false,
      make: false,
      model: false,
      software: null,
      dateTimeOriginal: false,
    };
  }
}

// 网图嫌疑度评分（0~1）
// 🔧 方案A快速修复：调整权重以减少误判
function scoreWebLikelihood({
  mimeType,
  width,
  height,
  megapixels,
  exif,
  sizeBytes,
  hashFrequency,
}) {
  let score = 0;
  const reasons = [];

  // EXIF - 降低权重（EXIF可伪造，微信会剥离）
  if (exif?.hasExif && (exif.make || exif.model) && exif.dateTimeOriginal) {
    score -= 1;
    reasons.push("有EXIF(品牌/机型/拍摄时间)"); // 从-2改为-1
  } else if (!exif?.hasExif) {
    score += 1;
    reasons.push("无EXIF"); // 从+2改为+1（考虑微信剥离EXIF）
  }
  if (
    exif?.software &&
    /photoshop|illustrator|adobe|gimp/i.test(exif.software)
  ) {
    score += 2;
    reasons.push(`专业编辑软件:${exif.software.slice(0, 20)}`);
  } else if (exif?.software && /meitu|美图|picsart/i.test(exif.software)) {
    score += 1;
    reasons.push(`美化软件:${exif.software.slice(0, 20)}`);
  } else if (exif?.software && /wechat|微信|qq/i.test(exif.software)) {
    score += 0;
    reasons.push("社交软件处理"); // 社交软件处理不扣分
  }

  // 格式 - 降低WebP权重（现代格式）
  if (/gif/i.test(mimeType || "")) {
    score += 2;
    reasons.push("GIF格式");
  } else if (/webp/i.test(mimeType || "")) {
    score += 1;
    reasons.push("WebP格式"); // 从+2改为+1
  }
  if (/png/i.test(mimeType || "") && (megapixels || 0) < 1) {
    score += 1;
    reasons.push("小像素PNG");
  }

  // 尺寸/比例 - 扩大手机比例判断范围
  const longSide = Math.max(width || 0, height || 0),
    shortSide = Math.min(width || 0, height || 0);
  const aspect = shortSide > 0 ? longSide / shortSide : 0;
  const approx = (x, y, tol) => Math.abs(x - y) <= tol * y;
  // 增加更多手机比例
  const isPhoneAspect =
    approx(aspect, 4 / 3, 0.1) ||
    approx(aspect, 3 / 4, 0.1) ||
    approx(aspect, 16 / 9, 0.1) ||
    approx(aspect, 9 / 16, 0.1) ||
    approx(aspect, 18 / 9, 0.1) ||
    approx(aspect, 9 / 18, 0.1) ||
    approx(aspect, 19.5 / 9, 0.1) ||
    approx(aspect, 9 / 19.5, 0.1) ||
    approx(aspect, 20 / 9, 0.1) ||
    approx(aspect, 9 / 20, 0.1) ||
    approx(aspect, 1, 0.05); // 正方形

  if (!isPhoneAspect && (megapixels || 0) < 1.0) {
    score += 2;
    reasons.push(`非常见手机比例(${aspect.toFixed(2)}:1)+低像素`);
  } else if ((megapixels || 0) >= 2.0 && isPhoneAspect) {
    score -= 1;
    reasons.push("像素/比例似手机");
  }

  // 压缩强度
  if (megapixels && megapixels > 0) {
    const kbPerMP = sizeBytes / 1024 / megapixels;
    if (megapixels < 1.0 && kbPerMP < 120) {
      score += 1;
      reasons.push(`强压缩(${kbPerMP.toFixed(0)}KB/MP)`);
    }
  }

  // 重复图片不会再作为网图判断依据

  // 调整评分公式：从(score+3)/8改为(score+2)/6，降低基线偏移
  const webLikelihood = Math.max(0, Math.min(1, (score + 2) / 6));
  return { webLikelihood, reasons };
}

// 生成小预览（避免内存暴涨），返回 Uint8Array 数据
async function createThumbnail(
  imageData,
  maxSide = 512,
  mimeType = "image/jpeg",
  quality = 0.85
) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return null;
    }
    const blob = new Blob([imageData]);
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(maxSide / Math.max(bitmap.width, bitmap.height), 1);
    const w = Math.max(1, Math.floor(bitmap.width * scale));
    const h = Math.max(1, Math.floor(bitmap.height * scale));
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const outBlob = await canvas.convertToBlob({ type: mimeType, quality });
    const buf = await outBlob.arrayBuffer();
    // 释放
    canvas.width = 0;
    canvas.height = 0;
    return new Uint8Array(buf);
  } catch (err) {
    console.warn("缩略图生成失败:", err);
    return null;
  }
}

// 二次确认：32x32 灰度平均绝对差（MAD），0-255 越小越相似
async function averageAbsDiffFromImageData(imageDataA, imageDataB) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return Infinity;
    }
    const w = IMAGE_DUP_CONFIG.MAD_SIZE,
      h = IMAGE_DUP_CONFIG.MAD_SIZE;
    const [bmA, bmB] = await Promise.all([
      createImageBitmap(new Blob([imageDataA])),
      createImageBitmap(new Blob([imageDataB])),
    ]);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return Infinity;

    ctx.drawImage(bmA, 0, 0, w, h);
    const a = ctx.getImageData(0, 0, w, h).data;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bmB, 0, 0, w, h);
    const b = ctx.getImageData(0, 0, w, h).data;

    bmA.close();
    bmB.close();

    let sum = 0,
      count = 0;
    for (let i = 0; i < a.length; i += 4) {
      const ga = Math.round(0.299 * a[i] + 0.587 * a[i + 1] + 0.114 * a[i + 2]);
      const gb = Math.round(0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2]);
      sum += Math.abs(ga - gb);
      count++;
    }
    return sum / count;
  } catch {
    return Infinity;
  }
}

// 结构相似度 SSIM（简化实现，窗口均值/方差估计，返回 0-1）
async function computeSSIM(imageDataA, imageDataB, size = 64) {
  if (
    typeof OffscreenCanvas === "undefined" ||
    typeof createImageBitmap === "undefined"
  ) {
    return 0;
  }

  const [bmA, bmB] = await Promise.all([
    createImageBitmap(new Blob([imageDataA])),
    createImageBitmap(new Blob([imageDataB])),
  ]);

  const w = size,
    h = size;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;

  // 渲染并获取灰度
  const getGray = (bm) => {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bm, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const g = new Float32Array(w * h);
    for (let i = 0; i < d.length; i += 4) {
      g[i / 4] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
    return g;
  };

  const A = getGray(bmA);
  const B = getGray(bmB);
  bmA.close();
  bmB.close();

  // 全图 SSIM（简化，无滑动窗口）
  const N = A.length;
  let meanA = 0,
    meanB = 0;
  for (let i = 0; i < N; i++) {
    meanA += A[i];
    meanB += B[i];
  }
  meanA /= N;
  meanB /= N;

  let varA = 0,
    varB = 0,
    cov = 0;
  for (let i = 0; i < N; i++) {
    const da = A[i] - meanA;
    const db = B[i] - meanB;
    varA += da * da;
    varB += db * db;
    cov += da * db;
  }
  varA /= N - 1;
  varB /= N - 1;
  cov /= N - 1;

  // SSIM 公式常数
  const L = 255;
  const k1 = 0.01,
    k2 = 0.03;
  const C1 = k1 * L * (k1 * L);
  const C2 = k2 * L * (k2 * L);

  const numerator = (2 * meanA * meanB + C1) * (2 * cov + C2);
  const denominator = (meanA * meanA + meanB * meanB + C1) * (varA + varB + C2);
  if (denominator === 0) return 0;
  let ssim = numerator / denominator;
  if (!isFinite(ssim)) ssim = 0;
  // Clamp 0..1
  return Math.max(0, Math.min(1, ssim));
}

// 简化哈希生成（仅调试用途；不参与视觉重复判定）
function generateSimpleHashFromImageData(imageData) {
  let hash = 0;
  const step = Math.max(1, Math.floor(imageData.length / 64));
  for (let i = 0; i < imageData.length; i += step) {
    hash = ((hash << 5) - hash + imageData[i]) & 0xffffffff;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").substring(0, 16);
}

// Helper functions
function selectBestSheet(sheetNames, preferredNames) {
  for (const preferred of preferredNames) {
    const found = sheetNames.find(
      (name) =>
        name === preferred ||
        name.includes(preferred) ||
        preferred.includes(name)
    );
    if (found) return found;
  }
  return sheetNames[0] || null;
}

// 智能工作表匹配函数 - 返回第一个匹配项（兼容旧逻辑）
function findMatchingSheet(availableSheets, templateSheetNames) {
  const matches = findAllMatchingSheets(availableSheets, templateSheetNames);
  return matches.length > 0 ? matches[0] : null;
}

// 获取所有匹配的工作表
function findAllMatchingSheets(availableSheets, templateSheetNames) {
  if (!templateSheetNames || templateSheetNames.length === 0) {
    return [];
  }

  const matched = [];

  // 1. 精确匹配
  for (const templateName of templateSheetNames) {
    const found = availableSheets.filter((sheet) => sheet === templateName);
    found.forEach((sheet) => {
      if (!matched.includes(sheet)) {
        matched.push(sheet);
      }
    });
  }

  // 2. 包含匹配
  for (const templateName of templateSheetNames) {
    const found = availableSheets.filter(
      (sheetName) =>
        sheetName.includes(templateName) || templateName.includes(sheetName)
    );
    found.forEach((sheet) => {
      if (!matched.includes(sheet)) {
        matched.push(sheet);
      }
    });
  }

  // 3. 模糊匹配（去除空格、特殊字符后比较）
  for (const templateName of templateSheetNames) {
    const normalizedTemplate = templateName
      .replace(/[\s\-_]/g, "")
      .toLowerCase();
    const found = availableSheets.filter((sheetName) => {
      const normalizedSheet = sheetName.replace(/[\s\-_]/g, "").toLowerCase();
      return (
        normalizedSheet.includes(normalizedTemplate) ||
        normalizedTemplate.includes(normalizedSheet)
      );
    });
    found.forEach((sheet) => {
      if (!matched.includes(sheet)) {
        matched.push(sheet);
      }
    });
  }

  // 如果没有匹配到，返回所有有数据的sheet
  if (matched.length === 0) {
    // 这里只返回空数组，让调用者处理
    return [];
  }

  return matched;
}

function validateHeaders(sheet, template) {
  let data;
  try {
    data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });
  } catch (error) {
    if (error.message && error.message.includes("Invalid array length")) {
      throw new Error("工作表数据过大，请减少数据行数");
    }
    throw error;
  }
  if (data.length === 0) {
    return {
      isValid: false,
      missingFields: template.requiredFields,
      unmatchedFields: [],
      suggestions: [],
      headerRowIndex: -1,
    };
  }

  // 使用智能表头识别
  const { headerRow, headerRowIndex } = findHeaderRow(data, template);
  if (!headerRow) {
    return {
      isValid: false,
      missingFields: template.requiredFields,
      unmatchedFields: [],
      suggestions: [],
      headerRowIndex: -1,
    };
  }

  // 清洗表头：去换行、去空格
  const actualHeaders = headerRow
    .map((h) =>
      String(h || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "")
    )
    .filter((h) => h);

  // 同步构建一个"清洗后的 fieldMappings"，用于同义列名的匹配
  const cleanedFieldMappings = {};
  if (template.fieldMappings) {
    Object.keys(template.fieldMappings).forEach((key) => {
      const cleanedKey = String(key || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "");
      cleanedFieldMappings[cleanedKey] = template.fieldMappings[key];
    });
  }

  const missingFields = [];

  for (const required of template.requiredFields) {
    const cleanedRequired = String(required || "")
      .trim()
      .replace(/\n/g, "")
      .replace(/\s+/g, "");

    // 目标内部字段（英文标准名），用于同义词映射匹配
    const targetInternal = cleanedFieldMappings[cleanedRequired] || null;

    // 1) 直接字符串与相似度匹配
    let found = actualHeaders.some((actual) => {
      if (actual === cleanedRequired) return true;
      if (actual.includes(cleanedRequired) || cleanedRequired.includes(actual))
        return true;
      return calculateSimilarity(actual, cleanedRequired) > 0.8;
    });

    // 2) 同义词映射匹配：如果某个表头经过映射后得到与目标内部字段相同，则视为命中
    if (!found && targetInternal) {
      found = actualHeaders.some((actual) => {
        const mapped = cleanedFieldMappings[actual];
        return mapped && mapped === targetInternal;
      });
    }

    if (!found) {
      missingFields.push(required);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    unmatchedFields: [],
    suggestions: [],
    headerRowIndex,
  };
}

function validateRows(sheet, template, headerRowIndexOverride) {
  const errors = [];
  let data;
  try {
    data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });
  } catch (error) {
    if (error.message && error.message.includes("Invalid array length")) {
      throw new Error("工作表数据过大，请减少数据行数");
    }
    throw error;
  }

  if (data.length === 0) return errors;

  // 决定表头行索引
  let headerRowIndex = 0;
  if (
    typeof headerRowIndexOverride === "number" &&
    headerRowIndexOverride >= 0
  ) {
    headerRowIndex = headerRowIndexOverride;
  }

  const headerRow = data[headerRowIndex] || [];
  const fieldMapping = new Map();

  // 清洗表头并构建映射（支持换行和空格）
  headerRow.forEach((header, index) => {
    const raw = String(header || "").trim();
    if (!raw) return;
    const cleaned = raw.replace(/\n/g, "").replace(/\s+/g, "");

    fieldMapping.set(raw, index);
    fieldMapping.set(cleaned, index);

    const mappedField =
      template.fieldMappings[raw] || template.fieldMappings[cleaned];
    if (mappedField) {
      fieldMapping.set(mappedField, index);
    }
  });

  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every((cell) => !cell)) continue;

    // 解析行数据以获取格式化后的值
    const rowData = {};
    fieldMapping.forEach((colIndex, fieldName) => {
      let value = row[colIndex];

      // Auto-format date/time fields for further validation
      if (
        fieldName === "visit_time" ||
        fieldName === "拜访开始时间" ||
        fieldName === "拜访开始\n时间"
      ) {
        const originalValue = value;
        value = formatDateForValidation(value);
        // Store both original and formatted values for different validation purposes
        rowData[fieldName + "_original"] = originalValue;
      }

      rowData[fieldName] = value;
    });

    for (const rule of template.validationRules) {
      const columnIndex = fieldMapping.get(rule.field);
      if (columnIndex === undefined) continue;

      const value = row[columnIndex];
      const error = validateField(value, rule, i + 1, columnIndex, rowData);

      if (error) {
        errors.push(error);
      }
    }
  }

  return errors;
}

function validateField(value, rule, row, column, rowData) {
  const columnLetter = XLSX.utils.encode_col(column);

  switch (rule.type) {
    case "required":
      if (!value || String(value).trim() === "") {
        return {
          row,
          column: columnLetter,
          field: rule.field,
          value,
          message: rule.message,
          errorType: rule.type,
        };
      }
      break;

    case "dateFormat":
      // Use original value for date format validation (like server-side)
      const originalValue =
        rowData && rowData[rule.field + "_original"]
          ? rowData[rule.field + "_original"]
          : value;

      if (row <= 8) {
      }

      if (originalValue) {
        const hasTimeComponent = checkHasTimeComponent(originalValue);
        if (row <= 8) {
        }

        if (!rule.params?.allowTimeComponent && hasTimeComponent) {
          if (row <= 8) {
          }
          return {
            row,
            column: columnLetter,
            field: rule.field,
            value: originalValue,
            message: rule.message,
            errorType: rule.type,
          };
        }
      }
      break;

    case "medicalLevel":
      if (value && !isValidMedicalLevel(value, rule.params)) {
        return {
          row,
          column: columnLetter,
          field: rule.field,
          value,
          message: rule.message,
          errorType: rule.type,
        };
      }
      break;

    case "duration":
      if (value && !isValidDuration(value, rule.params)) {
        return {
          row,
          column: columnLetter,
          field: rule.field,
          value,
          message: rule.message,
          errorType: rule.type,
        };
      }
      break;

    case "timeRange":
      if (value && !isValidTimeRange(value, rule.params)) {
        return {
          row,
          column: columnLetter,
          field: rule.field,
          value,
          message: rule.message,
          errorType: rule.type,
        };
      }
      break;

    case "minValue":
      if (value && !isValidMinValue(value, rule.params)) {
        return {
          row,
          column: columnLetter,
          field: rule.field,
          value,
          message: rule.message,
          errorType: rule.type,
        };
      }
      break;

    case "prohibitedContent":
      if (value && typeof value === "string") {
        const content = value.trim();
        if (content && rule.params?.prohibitedTerms) {
          const prohibitedTerms = rule.params.prohibitedTerms;
          for (const term of prohibitedTerms) {
            if (content.includes(term)) {
              return {
                row,
                column: columnLetter,
                field: rule.field,
                value,
                message: `${rule.message}：发现禁用词汇"${term}"`,
                errorType: rule.type,
              };
            }
          }
        }
      }
      break;

    case "addressFormat":
      if (value && typeof value === "string") {
        const addressError = validateAddressFormat(value, rule.params);
        if (addressError) {
          console.log(
            `❌ [地址格式] 行${row} 字段"${rule.field}"地址不完整: ${value}`
          );
          return {
            row,
            column: columnLetter,
            field: rule.field,
            value,
            message: `${rule.message}：${addressError}`,
            errorType: rule.type,
          };
        }
      }
      break;

    case "contentSimilarity":
      if (value && typeof value === "string") {
        const content = value.trim();
        if (content && rule.params?.templates) {
          const similarityResult = validateContentSimilarity(
            content,
            rule.params.templates,
            rule.params.threshold || 0.8
          );
          if (!similarityResult.isValid) {
            console.log(
              `❌ [内容相似度] 行${row} 字段"${rule.field}"与模板差异过大: ${similarityResult.maxSimilarity.toFixed(2)}`
            );
            return {
              row,
              column: columnLetter,
              field: rule.field,
              value,
              message: `${rule.message}（最高匹配度：${(similarityResult.maxSimilarity * 100).toFixed(0)}%）`,
              errorType: rule.type,
            };
          }
        }
      }
      break;
  }

  return null;
}

// 地址格式验证
function validateAddressFormat(address, params) {
  if (!address) return null;

  const trimmedAddress = address.trim();
  const minLength = params?.minLength || 10;

  // 检查地址长度
  if (trimmedAddress.length < minLength) {
    return `地址过短（当前${trimmedAddress.length}字符，至少需要${minLength}字符）`;
  }

  // 检查是否包含省/市级关键词
  const provinceKeywords = ["省", "市", "自治区", "特别行政区"];
  const hasProvince = provinceKeywords.some((kw) => trimmedAddress.includes(kw));

  // 检查是否包含区/县级关键词
  const districtKeywords = ["区", "县", "市", "旗", "盟"];
  const hasDistrict = districtKeywords.some((kw) => trimmedAddress.includes(kw));

  // 检查是否包含街道/路/号等关键词
  const streetKeywords = ["路", "街", "道", "巷", "弄", "号", "栋", "楼", "室", "层", "单元", "大厦", "广场", "小区", "村", "镇", "乡"];
  const hasStreet = streetKeywords.some((kw) => trimmedAddress.includes(kw));

  // 必须同时包含省市级、区县级和街道级信息
  if (!hasProvince) {
    return "缺少省/市信息";
  }
  if (!hasDistrict) {
    return "缺少区/县信息";
  }
  if (!hasStreet) {
    return "缺少街道/门牌号信息";
  }

  return null; // 验证通过
}

// 内容相似度验证
function validateContentSimilarity(content, templates, threshold) {
  if (!templates || templates.length === 0) {
    return { isValid: true, maxSimilarity: 1 };
  }

  let maxSimilarity = 0;

  for (const template of templates) {
    const similarity = calculateContentSimilarity(content, template);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
    }
    // 如果已经达到阈值，提前返回
    if (maxSimilarity >= threshold) {
      return { isValid: true, maxSimilarity };
    }
  }

  return { isValid: maxSimilarity >= threshold, maxSimilarity };
}

// 计算两个字符串的相似度（使用 Levenshtein 编辑距离）
function calculateContentSimilarity(str1, str2) {
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // 如果一个字符串包含另一个，给予较高相似度
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return minLen / maxLen;
  }

  // 计算 Levenshtein 编辑距离
  const distance = levenshteinDistanceForContent(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);

  return 1 - distance / maxLen;
}

// Levenshtein 编辑距离算法（用于内容相似度）
function levenshteinDistanceForContent(str1, str2) {
  const m = str1.length;
  const n = str2.length;

  // 创建距离矩阵
  const dp = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // 初始化第一行和第一列
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // 填充矩阵
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // 删除
          dp[i][j - 1] + 1, // 插入
          dp[i - 1][j - 1] + 1 // 替换
        );
      }
    }
  }

  return dp[m][n];
}

// 日期格式验证 - 简化版本，主要用于基本验证
function isValidDate(value) {
  if (!value) return true; // 空值由required规则处理

  // 如果是数字（Excel日期序列号），直接认为有效
  if (typeof value === "number") {
    return value > 0;
  }

  // 使用 parseDate 函数来验证日期是否能正确解析
  const parsedDate = parseDate(value);
  return parsedDate !== null;
}

// 持续时间验证
function isValidDuration(value, params) {
  if (!value) return true;

  const duration = parseDuration(value);
  if (duration === null) return false;

  const { minMinutes } = params;
  return duration >= minMinutes;
}

// 解析持续时间，支持多种格式
// 支持: "60", "60分钟", "60 分钟", "1.5小时", "90min", "1h30m" 等
function parseDuration(value) {
  if (value === null || value === undefined || value === "") return null;

  const str = String(value).trim();
  if (!str) return null;

  // 尝试直接转换为数字（纯数字格式）
  const directNumber = Number(str);
  if (!isNaN(directNumber) && directNumber >= 0) {
    return directNumber;
  }

  // 匹配带中文单位的格式
  // 匹配: "60分钟", "60 分钟", "1.5小时", "90分" 等
  const chineseMinuteMatch = str.match(
    /^([0-9]+\.?[0-9]*)\s*(?:分钟?|min|mins|minutes?)$/i
  );
  if (chineseMinuteMatch) {
    const minutes = parseFloat(chineseMinuteMatch[1]);
    return !isNaN(minutes) && minutes >= 0 ? minutes : null;
  }

  const chineseHourMatch = str.match(
    /^([0-9]+\.?[0-9]*)\s*(?:小时|时|hour|hours?|h)$/i
  );
  if (chineseHourMatch) {
    const hours = parseFloat(chineseHourMatch[1]);
    return !isNaN(hours) && hours >= 0 ? hours * 60 : null;
  }

  // 匹配复合格式: "1小时30分钟", "1h30m", "1时30分" 等
  const compositeMatch = str.match(
    /^([0-9]+)\s*(?:小时|时|h)\s*([0-9]+)\s*(?:分钟?|m)$/i
  );
  if (compositeMatch) {
    const hours = parseInt(compositeMatch[1], 10);
    const minutes = parseInt(compositeMatch[2], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      return hours * 60 + minutes;
    }
  }

  // 如果都不匹配，返回null
  return null;
}

// 时间范围验证
function isValidTimeRange(value, params) {
  if (!value) return true;

  const timeStr = String(value).trim();
  const { startHour, endHour } = params;

  // 提取时间部分
  let timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) {
    // 尝试从日期时间中提取
    timeMatch = timeStr.match(
      /\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\s+(\d{1,2}):(\d{2})/
    );
  }

  // 如果没有找到时间部分，说明只有日期，默认通过验证
  if (!timeMatch) return true;

  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;

  return hour >= startHour && hour <= endHour;
}

// 最小值验证
function isValidMinValue(value, params) {
  if (!value) return true;

  const numValue = Number(value);
  if (isNaN(numValue)) return false;

  const { minValue } = params;
  return numValue >= minValue;
}

function isValidMedicalLevel(value, params) {
  if (!value || !params) return false;

  const str = String(value).trim();
  const { allowedLevels = [], allowedSuffixes = [] } = params;

  const hasLevel = allowedLevels.some((level) => str.includes(level));
  return hasLevel;
}

function generateSimpleHash(data) {
  // Simple hash for demo (in real implementation would use proper image hashing)
  let hash = 0;
  for (let i = 0; i < Math.min(data.length, 1000); i++) {
    hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
  }
  return hash.toString(16);
}

async function detectDuplicates(results, imageDataMap) {
  // 使用汉明距离检测视觉相似图片（动态阈值 + 近阈值二次确认）
  const threshold = IMAGE_DUP_CONFIG.HAMMING_THRESHOLD;
  const nearMargin = IMAGE_DUP_CONFIG.NEAR_THRESHOLD_MARGIN;
  const madThreshold = 10; // MAD阈值（与 64x64 尺寸配套可适当上调或下调）

  // 过滤掉空哈希的图片（视觉哈希计算失败的）
  const validResults = results.filter((r) => r.hash && r.hash.length > 0);
  const skippedCount = results.length - validResults.length;

  if (skippedCount > 0) {
    console.warn(`⚠️ ${skippedCount} 张图片的视觉哈希计算失败，跳过重复检测`);
  }

  if (validResults.length === 0) {
    console.warn("⚠️ 没有图片成功计算视觉哈希，无法进行重复检测");
    return;
  }

  for (let i = 0; i < validResults.length; i++) {
    for (let j = i + 1; j < validResults.length; j++) {
      const hash1 = validResults[i].hash;
      const hash2 = validResults[j].hash;

      if (hash1 && hash2 && hash1.length === hash2.length) {
        const distance = calculateHammingDistanceHex(hash1, hash2);

        // 第一阶段：严格阈值直接进入二次/三次确认
        if (distance <= threshold + nearMargin) {
          // 哈希值接近，进行二次确认以避免误报
          const dataA = imageDataMap.get(validResults[i].id);
          const dataB = imageDataMap.get(validResults[j].id);
          let mad = Infinity;

          if (dataA && dataB) {
            try {
              mad = await averageAbsDiffFromImageData(dataA, dataB);
            } catch (e) {
              console.warn(`[MAD] 计算失败:`, e);
              mad = Infinity;
            }
          }

          // 若在严格阈值内且MAD通过，直接判定；
          // 若在近阈值带内，且启用SSIM，则再用SSIM确认提升准确性
          let ssim = 0;
          if (
            IMAGE_DUP_CONFIG.USE_SSIM &&
            isFinite(mad) &&
            distance > threshold // 仅在近阈值段再跑SSIM
          ) {
            try {
              ssim = await computeSSIM(dataA, dataB, 64);
            } catch (e) {
              console.warn("SSIM 计算失败:", e);
            }
          }

          const madOk = !isFinite(mad) ? true : mad <= madThreshold;
          const ssimOk =
            !IMAGE_DUP_CONFIG.USE_SSIM ||
            distance <= threshold ||
            ssim >= IMAGE_DUP_CONFIG.SSIM_GOOD;

          if (!(madOk && ssimOk)) {
            continue;
          }

          // 标记为重复，包含位置信息
          const duplicateJ = {
            id: validResults[j].id,
            position: validResults[j].position,
            row: validResults[j].row,
            column: validResults[j].column,
          };
          const duplicateI = {
            id: validResults[i].id,
            position: validResults[i].position,
            row: validResults[i].row,
            column: validResults[i].column,
          };

          // 检查是否已经存在，避免重复添加
          const existsInI = validResults[i].duplicates.some(
            (d) => d.id === validResults[j].id
          );
          const existsInJ = validResults[j].duplicates.some(
            (d) => d.id === validResults[i].id
          );

          if (!existsInI) {
            validResults[i].duplicates.push(duplicateJ);
          }
          if (!existsInJ) {
            validResults[j].duplicates.push(duplicateI);
          }
        }
      }
    }
  }
}

// 计算汉明距离（用于十六进制哈希字符串）
function calculateHammingDistanceHex(hash1, hash2) {
  if (!hash1 || !hash2 || hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const a = parseInt(hash1[i], 16);
    const b = parseInt(hash2[i], 16);
    let xor = a ^ b;

    // 计算XOR结果中的1的个数（汉明距离）
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

// 保留原有的字符串汉明距离函数（向后兼容）
function calculateHammingDistance(hash1, hash2) {
  if (hash1.length !== hash2.length) return Infinity;

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

function countDuplicateGroups(results) {
  const visited = new Set();
  let groups = 0;

  for (const result of results) {
    if (visited.has(result.id) || result.duplicates.length === 0) {
      continue;
    }

    groups++;
    const queue = [result.id];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;

      visited.add(current);
      const currentResult = results.find((r) => r.id === current);
      if (currentResult) {
        queue.push(
          ...currentResult.duplicates
            .map((dup) => dup.id)
            .filter((id) => !visited.has(id))
        );
      }
    }
  }

  return groups;
}

// Extract image positions by parsing Excel drawings XML accurately
async function extractImagePositions(zipContent, selectedSheet = null) {
  const imagePositions = new Map(); // key: 'xl/media/imageN.ext' -> Array<{ position, row, column }>

  try {
    // Helper to read a file as string if exists
    const readTextIfExists = async (path) => {
      const file = zipContent.file(path);
      if (!file) return null;
      try {
        return await file.async("string");
      } catch {
        return null;
      }
    };

    // Helper: parse XML safely
    const parseXml = (xmlText) => {
      // 在 Worker 中使用简单的正则表达式解析 XML
      // 这是一个简化的 XML 解析器，专门用于处理我们需要的 Excel XML 结构
      return {
        getElementsByTagName: (tagName) => {
          const elements = [];
          const regex = new RegExp(
            `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
            "g"
          );
          const selfClosingRegex = new RegExp(`<${tagName}[^>]*\\/>`, "g");

          let match;

          // 处理自闭合标签
          while ((match = selfClosingRegex.exec(xmlText)) !== null) {
            const element = createSimpleElement(match[0], tagName);
            elements.push(element);
          }

          // 处理普通标签
          while ((match = regex.exec(xmlText)) !== null) {
            const element = createSimpleElement(match[0], tagName, match[1]);
            elements.push(element);
          }

          return elements;
        },
      };
    };

    // 创建简单的元素对象
    const createSimpleElement = (fullMatch, tagName, content = "") => {
      return {
        tagName: tagName,
        textContent: content.replace(/<[^>]*>/g, "").trim(),
        getAttribute: (attrName) => {
          const attrRegex = new RegExp(`${attrName}="([^"]*)"`, "i");
          const match = fullMatch.match(attrRegex);
          return match ? match[1] : null;
        },
        getElementsByTagName: (childTagName) => {
          const childElements = [];
          const childRegex = new RegExp(
            `<${childTagName}[^>]*>([\\s\\S]*?)<\\/${childTagName}>`,
            "g"
          );
          const childSelfClosingRegex = new RegExp(
            `<${childTagName}[^>]*\\/>`,
            "g"
          );

          let match;

          // 处理自闭合子标签
          while ((match = childSelfClosingRegex.exec(content)) !== null) {
            const childElement = createSimpleElement(match[0], childTagName);
            childElements.push(childElement);
          }

          // 处理普通子标签
          while ((match = childRegex.exec(content)) !== null) {
            const childElement = createSimpleElement(
              match[0],
              childTagName,
              match[1]
            );
            childElements.push(childElement);
          }

          return childElements;
        },
      };
    };

    const columnIndexToLetter = (index) => {
      // Excel columns are 0-based here; convert to letters
      let n = Number(index);
      if (Number.isNaN(n) || n < 0) n = 0;
      let result = "";
      n = n + 1; // convert to 1-based
      while (n > 0) {
        const rem = (n - 1) % 26;
        result = String.fromCharCode(65 + rem) + result;
        n = Math.floor((n - 1) / 26);
      }
      return result;
    };

    // Helper function to get sheet file name from sheet name
    const getSheetFileName = async (sheetName) => {
      if (!sheetName) return null;

      try {
        const workbookXmlText = await readTextIfExists("xl/workbook.xml");
        if (!workbookXmlText) return null;

        const workbookXml = parseXml(workbookXmlText);
        const sheets = workbookXml.getElementsByTagName("sheet");

        for (let i = 0; i < sheets.length; i++) {
          const sheet = sheets[i];
          const name = sheet.getAttribute("name");
          const rId = sheet.getAttribute("r:id");

          if (name === sheetName && rId) {
            // 通过workbook.xml.rels找到实际的文件名
            const workbookRelsText = await readTextIfExists(
              "xl/_rels/workbook.xml.rels"
            );
            if (workbookRelsText) {
              const relRegex = new RegExp(
                `<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]*)"`,
                "g"
              );
              const relMatch = relRegex.exec(workbookRelsText);
              if (relMatch) {
                const relTarget = relMatch[1]; // 例如: "worksheets/sheet1.xml"
                return relTarget.split("/").pop(); // 提取文件名: "sheet1.xml"
              }
            }
          }
        }
      } catch (error) {
        console.warn("Failed to get sheet file name:", error);
      }

      return null;
    };

    // 首先尝试处理 WPS 的 cellimages.xml 结构
    const cellimagesResult = await extractFromCellImagesWorker(
      zipContent,
      readTextIfExists,
      parseXml,
      columnIndexToLetter,
      selectedSheet
    );
    if (cellimagesResult.size > 0) {
      return cellimagesResult;
    }

    // 标准 OOXML 解析路径（包含 header/footer 与 absoluteAnchor 支持）
    // Iterate all worksheets to find drawing relationships
    const worksheetsFolder = zipContent.folder("xl/worksheets");
    if (!worksheetsFolder) return imagePositions;

    const sheetFiles = [];
    worksheetsFolder.forEach((relativePath, file) => {
      if (file.dir) return;
      if (relativePath.endsWith(".xml") && relativePath.startsWith("sheet")) {
        sheetFiles.push(relativePath);
      }
    });

    // Filter by selected sheet if specified
    let targetSheetFiles = sheetFiles.sort();
    if (selectedSheet) {
      const targetSheetFile = await getSheetFileName(selectedSheet);
      if (targetSheetFile) {
        targetSheetFiles = sheetFiles.filter(
          (file) => file === targetSheetFile
        );
      } else {
        console.warn(
          `⚠️ 无法找到工作表 "${selectedSheet}" 对应的文件，已跳过其他工作表的图片解析`
        );
        // 严格模式：当指定了工作表但无法映射到具体文件时，不解析其它工作表
        return imagePositions; // 为空
      }
    }

    for (const sheetFile of targetSheetFiles) {
      const sheetPath = `xl/worksheets/${sheetFile}`;

      const sheetXmlText = await readTextIfExists(sheetPath);
      if (!sheetXmlText) {
        continue;
      }
      const sheetXml = parseXml(sheetXmlText);
      if (!sheetXml) {
        continue;
      }

      // Find drawing r:id in sheet xml（工作表图层图片）
      const drawingEl = sheetXml.getElementsByTagName("drawing")[0];
      const drawingRelId = drawingEl
        ? drawingEl.getAttribute("r:id") || drawingEl.getAttribute("rel:id")
        : null;
      if (drawingEl && drawingRelId) {
      }

      // Resolve sheet rels to drawing path（包括 headerFooter 图）
      const sheetRelsPath = `xl/worksheets/_rels/${sheetFile}.rels`;
      const sheetRelsText = await readTextIfExists(sheetRelsPath);
      if (!sheetRelsText) continue;
      const sheetRelsXml = parseXml(sheetRelsText);
      if (!sheetRelsXml) continue;

      const rels = sheetRelsXml.getElementsByTagName("Relationship");
      let drawingTarget = null;
      const headerFooterTargets = [];
      for (let i = 0; i < rels.length; i++) {
        const r = rels[i];
        const idAttr = r.getAttribute("Id") || r.getAttribute("id");
        const target = r.getAttribute("Target");
        const type = r.getAttribute("Type") || "";
        if (idAttr && idAttr === drawingRelId) {
          drawingTarget = target;
        }
        // 识别 header/footer 图片关系
        if (
          type.includes("/headerFooter") ||
          (target && target.includes("header") && target.endsWith(".xml"))
        ) {
          headerFooterTargets.push(target);
        }
      }
      if (!drawingTarget && headerFooterTargets.length === 0) continue;

      // Normalize drawing path (can be '../drawings/drawing1.xml')
      let drawingPath = drawingTarget;
      if (drawingPath) {
        if (drawingPath.startsWith("../"))
          drawingPath = drawingPath.replace(/^\.\.\//, "xl/");
        if (!drawingPath.startsWith("xl/"))
          drawingPath = `xl/worksheets/${drawingPath}`; // fallback
      }

      // 处理 header/footer 媒体：它们可能不在 drawings 下，而在页面设置中引用
      if (headerFooterTargets.length > 0) {
        for (const hfTargetRaw of headerFooterTargets) {
          let hfTarget = hfTargetRaw || "";
          if (hfTarget.startsWith("../"))
            hfTarget = hfTarget.replace(/^\.\.\//, "xl/");
          if (!hfTarget.startsWith("xl/"))
            hfTarget = `xl/worksheets/${hfTarget}`;
          const hfXmlText = await readTextIfExists(hfTarget);
          if (!hfXmlText) continue;
          const hfXml = parseXml(hfXmlText);
          if (!hfXml) continue;
          // header/footer 图通常没有单元格锚点，记录为 absolute（位置未知）
          const blips = hfXml.getElementsByTagName("a:blip");
          for (let i = 0; i < blips.length; i++) {
            const embedId =
              blips[i].getAttribute("r:embed") ||
              blips[i].getAttribute("rel:embed") ||
              blips[i].getAttribute("embed");
            if (!embedId) continue;
            // 解析对应 rels 文件以拿到 media 路径
            const hfFileName = hfTarget.substring(
              hfTarget.lastIndexOf("/") + 1
            );
            const hfRelsPath = hfTarget.replace(
              hfFileName,
              `_rels/${hfFileName}.rels`
            );
            const hfRelsText = await readTextIfExists(hfRelsPath);
            if (!hfRelsText) continue;
            const hfRelsXml = parseXml(hfRelsText);
            if (!hfRelsXml) continue;
            const rels2 = hfRelsXml.getElementsByTagName("Relationship");
            let mediaKey = null;
            for (let j = 0; j < rels2.length; j++) {
              const r2 = rels2[j];
              const id2 = r2.getAttribute("Id") || r2.getAttribute("id");
              if (id2 === embedId) {
                const target2 = r2.getAttribute("Target") || "";
                mediaKey = target2.replace(/^.*\//, "");
                break;
              }
            }
            if (mediaKey) {
              const list = imagePositions.get(mediaKey) || [];
              list.push({
                position: undefined,
                row: undefined,
                column: undefined,
              });
              imagePositions.set(mediaKey, list);
            }
          }
        }
      }

      if (!drawingPath) continue;
      const drawingXmlText = await readTextIfExists(drawingPath);
      if (!drawingXmlText) continue;
      const drawingXml = parseXml(drawingXmlText);
      if (!drawingXml) continue;

      // Load drawing rels to map r:embed -> media path
      const drawingFileName = drawingPath.substring(
        drawingPath.lastIndexOf("/") + 1
      );
      const drawingRelsPath = drawingPath.replace(
        "drawings/" + drawingFileName,
        `drawings/_rels/${drawingFileName}.rels`
      );
      const drawingRelsText = await readTextIfExists(drawingRelsPath);
      const embedRelMap = new Map(); // rId -> media key (basename like 'image1.png')
      if (drawingRelsText) {
        const drawingRelsXml = parseXml(drawingRelsText);
        if (drawingRelsXml) {
          const dRels = drawingRelsXml.getElementsByTagName("Relationship");
          for (let i = 0; i < dRels.length; i++) {
            const dr = dRels[i];
            const id = dr.getAttribute("Id") || dr.getAttribute("id");
            let target = dr.getAttribute("Target") || "";
            if (!id || !target) continue;
            const basename = target.replace(/^.*\//, "");

            embedRelMap.set(id, basename);
            console.log(
              `[Drawing Rels] rId: ${id} -> basename: ${basename} (from target: ${target})`
            );
          }
        }
      }

      // Drawing anchors: support xdr:twoCellAnchor and xdr:oneCellAnchor
      // 尝试不同的命名空间前缀
      const anchorSelectors = [
        "xdr:twoCellAnchor",
        "xdr:oneCellAnchor",
        "xdr:absoluteAnchor",
        "twoCellAnchor",
        "oneCellAnchor",
        "absoluteAnchor",
      ];

      let anchors = [];
      for (const selector of anchorSelectors) {
        const elements = drawingXml.getElementsByTagName(selector);
        if (elements.length > 0) {
          anchors = Array.from(elements);

          break;
        }
      }

      for (let i = 0; i < anchors.length; i++) {
        const anchor = anchors[i];

        // Skip absolute anchors (no estimation allowed)
        const tagNameLower = (anchor.tagName || "").toLowerCase();
        if (tagNameLower.includes("absoluteanchor")) {
          console.warn("检测到 absoluteAnchor，无法精确定位到单元格，跳过");
          continue;
        }

        // 尝试不同的命名空间前缀查找from元素
        const fromSelectors = ["xdr:from", "from"];
        let fromEl = null;
        for (const selector of fromSelectors) {
          fromEl = anchor.getElementsByTagName(selector)[0];
          if (fromEl) break;
        }

        let colIdx = 0;
        let rowIdx = 0;
        if (fromEl) {
          // 尝试不同的命名空间前缀查找col和row元素
          const colSelectors = ["xdr:col", "col"];
          const rowSelectors = ["xdr:row", "row"];

          let colEl = null,
            rowEl = null;
          for (const selector of colSelectors) {
            colEl = fromEl.getElementsByTagName(selector)[0];
            if (colEl) break;
          }
          for (const selector of rowSelectors) {
            rowEl = fromEl.getElementsByTagName(selector)[0];
            if (rowEl) break;
          }

          if (colEl && colEl.textContent)
            colIdx = parseInt(colEl.textContent, 10) || 0;
          if (rowEl && rowEl.textContent)
            rowIdx = parseInt(rowEl.textContent, 10) || 0;
        }

        // 尝试不同的命名空间前缀查找blip元素
        const blipSelectors = ["a:blip", "blip"];
        let blipEls = null;
        for (const selector of blipSelectors) {
          blipEls = anchor.getElementsByTagName(selector);
          if (blipEls.length > 0) break;
        }

        if (!blipEls || blipEls.length === 0) continue;

        const embedId =
          blipEls[0].getAttribute("r:embed") ||
          blipEls[0].getAttribute("rel:embed") ||
          blipEls[0].getAttribute("embed");
        if (!embedId) continue;
        const mediaKeyFromRel = embedRelMap.get(embedId);

        if (!mediaKeyFromRel) continue;

        const excelRow = rowIdx + 1; // convert to 1-based
        const excelColLetter = columnIndexToLetter(colIdx);
        const position = `${excelColLetter}${excelRow}`;

        const list = imagePositions.get(mediaKeyFromRel) || [];
        list.push({ position, row: excelRow, column: excelColLetter });
        imagePositions.set(mediaKeyFromRel, list);
        console.log(
          `[Image Position] Set mapping: ${mediaKeyFromRel} -> ${position} (${excelColLetter}${excelRow})`
        );
        console.log(
          `[Image Position] Current mappings for ${mediaKeyFromRel}:`,
          list
        );
      }
    }

    return imagePositions;
  } catch (error) {
    console.warn("无法提取图片位置信息:", error);
    return new Map();
  }
}

// 备用的位置提取函数，确保总是返回有效位置
function extractPositionFromPath(imagePath, index) {
  // 启发式方法：基于图片索引计算位置
  const estimatedRow = 4 + index * 5; // 从第4行开始，每张图片间隔5行
  const column = "A"; // 假设图片在A列

  return {
    position: `${column}${estimatedRow}`,
    row: estimatedRow,
    column: column,
  };
}

// Worker 专用的 XML 解析器（使用正则表达式）
function parseXmlWorker(xmlText) {
  return {
    getElementsByTagName: (tagName) => {
      const elements = [];
      const regex = new RegExp(
        `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
        "g"
      );
      const selfClosingRegex = new RegExp(`<${tagName}[^>]*\\/>`, "g");

      let match;

      // 处理自闭合标签
      while ((match = selfClosingRegex.exec(xmlText)) !== null) {
        const element = createSimpleElementWorker(match[0], tagName);
        elements.push(element);
      }

      // 处理普通标签
      while ((match = regex.exec(xmlText)) !== null) {
        const element = createSimpleElementWorker(match[0], tagName, match[1]);
        elements.push(element);
      }

      return elements;
    },
  };
}

// 创建简单的元素对象（Worker版本）
function createSimpleElementWorker(fullMatch, tagName, content = "") {
  return {
    tagName: tagName,
    textContent: content.replace(/<[^>]*>/g, "").trim(),
    getAttribute: (attrName) => {
      const attrRegex = new RegExp(`${attrName}="([^"]*)"`, "i");
      const match = fullMatch.match(attrRegex);
      return match ? match[1] : null;
    },
    getElementsByTagName: (childTagName) => {
      const childElements = [];
      const childRegex = new RegExp(
        `<${childTagName}[^>]*>([\\s\\S]*?)<\\/${childTagName}>`,
        "g"
      );
      const childSelfClosingRegex = new RegExp(
        `<${childTagName}[^>]*\\/>`,
        "g"
      );

      let match;

      // 处理自闭合子标签
      while ((match = childSelfClosingRegex.exec(content)) !== null) {
        const childElement = createSimpleElementWorker(match[0], childTagName);
        childElements.push(childElement);
      }

      // 处理普通子标签
      while ((match = childRegex.exec(content)) !== null) {
        const childElement = createSimpleElementWorker(
          match[0],
          childTagName,
          match[1]
        );
        childElements.push(childElement);
      }

      return childElements;
    },
  };
}

// 从 WPS 的 cellimages.xml 提取图片位置 (Worker版本)
async function extractFromCellImagesWorker(
  zipContent,
  readTextIfExists,
  parseXml,
  columnIndexToLetter,
  selectedSheet = null
) {
  const imagePositions = new Map();

  try {
    // 检查是否存在 cellimages.xml

    const cellimagesXmlText = await readTextIfExists("xl/cellimages.xml");
    if (!cellimagesXmlText) {
      return imagePositions;
    }

    const cellimagesRelsText = await readTextIfExists(
      "xl/_rels/cellimages.xml.rels"
    );
    if (!cellimagesRelsText) {
      return imagePositions;
    }

    const cellimagesRelsXml = parseXmlWorker(cellimagesRelsText);
    if (!cellimagesRelsXml) return imagePositions;

    // 构建关系映射 rId -> 图片文件名
    const embedRelMap = new Map();
    const rels = cellimagesRelsXml.getElementsByTagName("Relationship");
    for (let i = 0; i < rels.length; i++) {
      const rel = rels[i];
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) {
        // target 格式: "media/image1.jpeg"
        const basename = target.replace(/^.*\//, "");
        embedRelMap.set(id, basename);
      }
    }

    // 分析表格结构以确定列映射模式
    const tableStructure = await analyzeTableStructureWorker(
      zipContent,
      readTextIfExists,
      parseXml
    );

    // WPS 的 cellimages.xml 包含图片但没有位置信息
    // 我们需要使用智能位置估算
    const cellimagesXml = parseXmlWorker(cellimagesXmlText);
    if (!cellimagesXml) return imagePositions;

    const cellImages = cellimagesXml.getElementsByTagName("etc:cellImage");
    for (let i = 0; i < cellImages.length; i++) {
      const cellImage = cellImages[i];
      const blipEl = cellImage.getElementsByTagName("a:blip")[0];
      if (!blipEl) continue;

      const embedId = blipEl.getAttribute("r:embed");
      if (!embedId) continue;

      const mediaKey = embedRelMap.get(embedId);
      if (!mediaKey) continue;

      // 尝试从DISPIMG公式获取精确位置
      const dispimgId = cellImage.getAttribute("name");
      let positionInfo = null;

      if (dispimgId) {
        positionInfo = await getPositionFromDISPIMGWorker(
          dispimgId,
          zipContent,
          selectedSheet
        );

        // 检查是否有重复图片
        if (positionInfo && positionInfo.isDuplicate) {
          console.warn(`🚨 Worker检测到重复图片: ${dispimgId}`);
          console.warn(`   主位置: ${positionInfo.position}`);
          if (positionInfo.duplicates) {
            positionInfo.duplicates.forEach((dup, index) => {
              console.warn(`   重复位置 ${index + 1}: ${dup.position}`);
            });
          }

          // 可以在这里添加重复图片的处理逻辑
          // 例如：记录到验证结果中，或者抛出警告
        }
      }

      // 如果DISPIMG方法失败，回退到智能位置估算
      if (!positionInfo) {
        positionInfo = calculateImagePositionWorker(i, tableStructure);
        positionInfo.method = "index_estimation";
        positionInfo.confidence = "medium";
      } else {
        positionInfo.method = "dispimg_formula";
        positionInfo.confidence = "high";
      }

      // 如果指定了 selectedSheet，但无法通过 DISPIMG 精确定位到该工作表，则不接受估算位置，直接跳过
      if (
        selectedSheet &&
        positionInfo &&
        positionInfo.method !== "dispimg_formula"
      ) {
        continue;
      }

      const list = imagePositions.get(mediaKey) || [];
      // 将主位置与重复位置一并记录到映射中，确保前端能显示所有重复位置
      const pushUnique = (pos) => {
        if (!pos || !pos.position) return;
        if (!list.some((p) => p.position === pos.position)) {
          list.push({
            position: pos.position,
            row: pos.row,
            column: pos.column,
          });
        }
      };
      pushUnique(positionInfo);
      if (Array.isArray(positionInfo.duplicates)) {
        positionInfo.duplicates.forEach((dupPos) => pushUnique(dupPos));
      }
      imagePositions.set(mediaKey, list);
    }

    return imagePositions;
  } catch (error) {
    console.warn("Worker 无法提取 WPS 图片位置信息:", error);
    return new Map();
  }
}

// 分析表格结构以确定列映射模式 (Worker版本)
async function analyzeTableStructureWorker(
  zipContent,
  readTextIfExists,
  parseXml
) {
  try {
    // 预定义的结构模式
    const structurePatterns = {
      药店拜访: {
        visitType: "药店拜访",
        imageColumns: ["M", "N"],
        columnMappings: { M: "门头", N: "内部" },
        imagesPerRecord: 2,
        dataStartRow: 4,
      },
      医院拜访类: {
        visitType: "医院拜访类",
        imageColumns: ["O", "P"],
        columnMappings: { O: "医院门头照", P: "科室照片" },
        imagesPerRecord: 2,
        dataStartRow: 4,
      },
      科室拜访: {
        visitType: "科室拜访",
        imageColumns: ["N", "O"],
        columnMappings: { N: "医院门头照", O: "内部照片" },
        imagesPerRecord: 2,
        dataStartRow: 4,
      },
    };

    // 尝试读取工作表数据来分析结构
    const sharedStringsText = await readTextIfExists("xl/sharedStrings.xml");

    // 如果无法读取工作表数据，返回默认结构
    if (!sharedStringsText) {
      return structurePatterns["药店拜访"];
    }

    // 解析共享字符串以检测表头内容
    const sharedStringsXml = parseXmlWorker(sharedStringsText);
    const strings = [];
    if (sharedStringsXml) {
      const siElements = sharedStringsXml.getElementsByTagName("si");
      for (let i = 0; i < siElements.length; i++) {
        const tElement = siElements[i].getElementsByTagName("t")[0];
        if (tElement && tElement.textContent) {
          strings.push(tElement.textContent);
        }
      }
    }

    // 检测表头中的关键词来判断拜访类型
    const headerText = strings.join(" ").toLowerCase();

    // 根据表头内容判断拜访类型
    if (headerText.includes("医院门头照") && headerText.includes("科室照片")) {
      return structurePatterns["医院拜访类"];
    } else if (headerText.includes("科室") && headerText.includes("内部照片")) {
      return structurePatterns["科室拜访"];
    } else if (headerText.includes("门头") && headerText.includes("内部")) {
      return structurePatterns["药店拜访"];
    }

    // 默认返回药店拜访模式

    return structurePatterns["药店拜访"];
  } catch (error) {
    console.warn("Worker 表格结构分析失败，使用默认结构:", error);
    return {
      visitType: "药店拜访",
      imageColumns: ["M", "N"],
      columnMappings: { M: "门头", N: "内部" },
      imagesPerRecord: 2,
      dataStartRow: 4,
    };
  }
}

// 从DISPIMG公式获取精确位置 (Worker版本) - 支持检测重复图片
async function getPositionFromDISPIMGWorker(
  dispimgId,
  zipContent,
  selectedSheet = null
) {
  try {
    if (selectedSheet) {
    }

    // 查找工作表文件
    let worksheetFiles = Object.keys(zipContent.files).filter(
      (name) => name.startsWith("xl/worksheets/") && name.endsWith(".xml")
    );

    // 如果指定了selectedSheet，获取对应的工作表文件
    if (selectedSheet) {
      try {
        const workbookXml = await zipContent
          .file("xl/workbook.xml")
          ?.async("text");
        if (workbookXml) {
          const sheetRegex =
            /<sheet[^>]*name="([^"]*)"[^>]*sheetId="([^"]*)"[^>]*r:id="([^"]*)"/g;
          let match;
          let targetSheetFile = null;

          while ((match = sheetRegex.exec(workbookXml)) !== null) {
            const sheetName = match[1];
            const sheetId = match[2];
            const rId = match[3];

            if (sheetName === selectedSheet) {
              // 通过workbook.xml.rels找到实际的文件名
              const workbookRelsXml = await zipContent
                .file("xl/_rels/workbook.xml.rels")
                ?.async("text");
              if (workbookRelsXml) {
                const relRegex = new RegExp(
                  `<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]*)"`,
                  "g"
                );
                const relMatch = relRegex.exec(workbookRelsXml);
                if (relMatch) {
                  const relTarget = relMatch[1]; // 例如: "worksheets/sheet1.xml"
                  targetSheetFile = relTarget.split("/").pop(); // 提取文件名: "sheet1.xml"

                  break;
                }
              }
            }
          }

          if (targetSheetFile) {
            worksheetFiles = worksheetFiles.filter((file) =>
              file.endsWith(targetSheetFile)
            );
          } else {
            console.warn(
              `⚠️ Worker无法找到工作表 "${selectedSheet}" 对应的文件`
            );
            // 当明确指定了工作表但无法映射时，避免跨表扫描，直接放弃定位
            return null;
          }
        }
      } catch (error) {
        console.warn("Worker获取工作表文件名失败:", error);
      }
    }

    const allPositions = [];

    for (const worksheetFile of worksheetFiles) {
      const worksheetXml = await zipContent.file(worksheetFile)?.async("text");
      if (!worksheetXml) continue;

      // 查找包含目标dispimgId的DISPIMG公式
      // 修复：使用更精确的正则表达式来匹配XML结构
      const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
      let match;

      while ((match = cellRegex.exec(worksheetXml)) !== null) {
        const cellRef = match[1];
        const cellContent = match[2];

        // 在单元格内容中查找DISPIMG公式
        const formulaMatch = cellContent.match(/<f[^>]*>(.*?DISPIMG.*?)<\/f>/);
        if (formulaMatch) {
          const formula = formulaMatch[1];

          // 提取DISPIMG中的图片ID - 支持两种格式：直接双引号和HTML实体编码
          let idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/); // HTML实体编码格式
          if (!idMatch) {
            idMatch = formula.match(/DISPIMG\("([^"]*?)",/); // 直接双引号格式
          }
          if (idMatch && idMatch[1] === dispimgId) {
            // 解析单元格引用
            const cellMatch = cellRef.match(/^([A-Z]+)(\d+)$/);
            if (cellMatch) {
              const column = cellMatch[1];
              const row = parseInt(cellMatch[2]);

              allPositions.push({
                position: cellRef,
                row: row,
                column: column,
                type:
                  column === "M" ? "门头" : column === "N" ? "内部" : "图片",
              });
            }
          }
        }
      }
    }

    if (allPositions.length === 0) {
      return null;
    }

    // 检测重复图片
    if (allPositions.length > 1) {
      console.warn(
        `⚠️ Worker检测到重复图片ID: ${dispimgId}，出现在 ${allPositions.length} 个位置:`
      );
      allPositions.forEach((pos, index) => {
        console.warn(`   ${index + 1}. ${pos.position}`);
      });

      // 返回第一个位置，并标记为重复
      return {
        ...allPositions[0],
        duplicates: allPositions.slice(1),
        isDuplicate: true,
      };
    }

    return allPositions[0];
  } catch (error) {
    console.warn("Worker从DISPIMG公式获取位置失败:", error);
    return null;
  }
}

// 智能计算图片位置 (Worker版本)
function calculateImagePositionWorker(imageIndex, tableStructure) {
  const { imageColumns, columnMappings, imagesPerRecord, dataStartRow } =
    tableStructure;

  // 计算记录索引和图片在记录中的位置
  const recordIndex = Math.floor(imageIndex / imagesPerRecord);
  const imageInRecord = imageIndex % imagesPerRecord;

  // 计算行号（保持简单估算，避免引入额外偏差）
  const row = dataStartRow + recordIndex;

  // 获取列和类型
  const column = imageColumns[imageInRecord] || imageColumns[0];
  const type = columnMappings[column] || `图片${imageInRecord + 1}`;

  return {
    position: `${column}${row}`,
    row,
    column,
    type,
  };
}

// Communication functions
function sendProgress(message, progress) {
  self.postMessage({
    type: MESSAGE_TYPES.PROGRESS,
    data: { message, progress },
  });
}

function sendResult(result) {
  // 使用 Transferable Objects 传递二进制，避免大数据结构克隆导致内存爆
  const transferList = [];
  try {
    const resultsArray = Array.isArray(result?.results)
      ? result.results
      : Array.isArray(result?.imageValidation?.results)
      ? result.imageValidation.results
      : null;

    if (resultsArray) {
      for (const r of resultsArray) {
        const buf = r?.imageData && r.imageData.buffer;
        if (buf instanceof ArrayBuffer) {
          transferList.push(buf);
        }
      }
    }
  } catch (e) {
    // 忽略收集传输列表时的错误，回退为普通发送
  }

  try {
    if (transferList.length > 0) {
      self.postMessage(
        {
          type: MESSAGE_TYPES.RESULT,
          data: result,
        },
        transferList
      );
    } else {
      self.postMessage({
        type: MESSAGE_TYPES.RESULT,
        data: result,
      });
    }
  } catch (e) {
    // 如果因为某些字段无法克隆，尝试去除图片二进制，仅返回摘要，避免中断主流程
    try {
      const sanitized = JSON.parse(
        JSON.stringify(result, (key, value) => {
          if (key === "imageData") return undefined;
          return value;
        })
      );
      self.postMessage({ type: MESSAGE_TYPES.RESULT, data: sanitized });
    } catch (e2) {
      self.postMessage({
        type: MESSAGE_TYPES.ERROR,
        data: {
          message: `图片结果传输失败: ${
            e instanceof Error ? e.message : String(e)
          }`,
        },
      });
    }
  }
}

function sendError(message) {
  self.postMessage({
    type: MESSAGE_TYPES.ERROR,
    data: { message },
  });
}
/**
 * 高级水印检测算�?
 * 基于深层像素分析的水印检测，模拟"去水�?工具的检测原�?
 *
 * 核心技术：
 * 1. 频域分析 - 检测重复模式和周期性水�?
 * 2. 多尺度梯度分�?- 检测文字和logo的边缘特�?
 * 3. 局部二值模�?LBP) - 检测纹理异�?
 * 4. 颜色通道差异 - 检测人工添加的水印
 * 5. HSV空间分析 - 检测饱和度和亮度异�?
 * 6. 边缘连通性分�?- 区分自然边缘和水印边�?
 */

// ==================== 主检测函�?====================

/**
 * 高级水印检�?- 使用多种像素级分析技�?
 * @param {Uint8Array} imageData - 图片数据
 * @returns {Promise<Object>} 检测结�?
 */
async function detectWatermarkAdvanced(imageData) {
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return {
        hasWatermark: false,
        watermarkRegions: [],
        watermarkConfidence: 0,
        detectionMethod: "unsupported",
        analysisDetails: {},
      };
    }
    console.log("[水印检测] 开始高级检测流程...");
    const startTime = performance.now();

    const blob = new Blob([imageData]);
    const bitmap = await createImageBitmap(blob);

    console.log(`[水印检测] 原始图片尺寸: ${bitmap.width}x${bitmap.height}px`);

    // 性能优化：降采样到合理尺寸（但保持足够细节用于分析）
    const maxSize = 2000; // 提高到2000以更好地检测小水印（特别是Excel中的图片）
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.floor(bitmap.width * scale);
    const height = Math.floor(bitmap.height * scale);

    console.log(
      `[水印检测] 分析尺寸: ${width}x${height}px (缩放比例: ${(
        scale * 100
      ).toFixed(1)}%)`
    );

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      bitmap.close();
      return {
        hasWatermark: false,
        watermarkRegions: [],
        watermarkConfidence: 0,
      };
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imagePixelData = ctx.getImageData(0, 0, width, height);
    const data = imagePixelData.data;

    // ==================== 多种分析方法并行执行 ====================

    console.log("[水印检测] 执行像素级分�?..");

    // 1. 频域分析 - 检测重复模�?
    const frequencyAnalysis = analyzeFrequencyDomain(data, width, height);

    // 2. 梯度一致性分�?- 检测不自然的边�?
    const gradientAnalysis = analyzeGradientConsistency(data, width, height);

    // 3. 纹理特征分析 - 使用简化的LBP
    const textureAnalysis = analyzeTexturePattern(data, width, height);

    // 4. 颜色通道差异分析
    const colorChannelAnalysis = analyzeColorChannelDifference(
      data,
      width,
      height
    );

    // 5. 区域对比分析 - 检测特定区域的异常
    const regionAnalysis = analyzeRegionsAdvanced(data, width, height);

    // 6. 透明度分析（如果有alpha通道�?
    const alphaAnalysis = analyzeAlphaChannel(data, width, height);

    console.log("[水印检测] 分析结果:", {
      frequency: frequencyAnalysis.score,
      gradient: gradientAnalysis.score,
      texture: textureAnalysis.score,
      colorChannel: colorChannelAnalysis.score,
      region: regionAnalysis.score,
      alpha: alphaAnalysis.score,
    });

    // ==================== 综合评分 ====================

    const weights = {
      frequency: 0.25, // 频域分析权重（适度增加）
      gradient: 0.2, // 梯度分析权重（恢复一些权重）
      texture: 0.2, // 纹理分析权重（降低，避免过度依赖）
      colorChannel: 0.15, // 颜色通道权重（恢复）
      region: 0.15, // 区域分析权重（恢复）
      alpha: 0.05, // 透明度权重
    };

    const totalScore =
      frequencyAnalysis.score * weights.frequency +
      gradientAnalysis.score * weights.gradient +
      textureAnalysis.score * weights.texture +
      colorChannelAnalysis.score * weights.colorChannel +
      regionAnalysis.score * weights.region +
      alphaAnalysis.score * weights.alpha;

    const confidence = Math.min(100, Math.max(0, totalScore));

    // 收集检测到水印的区�?
    const watermarkRegions = [
      ...regionAnalysis.detectedRegions,
      ...gradientAnalysis.suspiciousRegions,
      ...textureAnalysis.anomalyRegions,
    ];

    // 去重
    const uniqueRegions = [...new Set(watermarkRegions)];

    const hasWatermark = confidence >= 50; // 提高阈值以减少误报，同时保持maxSize=2000保留细节

    const processingTime = (performance.now() - startTime).toFixed(2);
    console.log(
      `[水印检测] 完成！耗时: ${processingTime}ms, 置信�? ${confidence.toFixed(
        2
      )}`
    );

    // 清理资源
    canvas.width = 0;
    canvas.height = 0;

    return {
      hasWatermark,
      watermarkRegions: uniqueRegions,
      watermarkConfidence: confidence,
      detectionMethod: "advanced_pixel_analysis",
      processingTime: parseFloat(processingTime),
      analysisDetails: {
        frequencyScore: frequencyAnalysis.score.toFixed(2),
        gradientScore: gradientAnalysis.score.toFixed(2),
        textureScore: textureAnalysis.score.toFixed(2),
        colorChannelScore: colorChannelAnalysis.score.toFixed(2),
        regionScore: regionAnalysis.score.toFixed(2),
        alphaScore: alphaAnalysis.score.toFixed(2),
        dominantFeatures: getDominantFeatures({
          frequency: frequencyAnalysis.score,
          gradient: gradientAnalysis.score,
          texture: textureAnalysis.score,
          colorChannel: colorChannelAnalysis.score,
          region: regionAnalysis.score,
          alpha: alphaAnalysis.score,
        }),
      },
    };
  } catch (error) {
    console.error("[水印检测] 失败:", error);
    return {
      hasWatermark: false,
      watermarkRegions: [],
      watermarkConfidence: 0,
      detectionMethod: "error",
      error: error.message,
    };
  }
}

// ==================== 频域分析 ====================

/**
 * 频域分析 - 检测重复模式和周期性水�?
 * 原理：水印通常是重复或半透明的图案，在频域中会产生特定的频率响应
 */
function analyzeFrequencyDomain(data, width, height) {
  try {
    // 转换为灰度图
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      gray[i] =
        0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }

    // 简化的频域分析：检测周期性模�?
    // 使用水平和垂直方向的自相�?
    let horizontalPeriodicity = 0;
    let verticalPeriodicity = 0;

    // 水平方向自相关（检测重复的水平水印�?
    const hSteps = [10, 20, 30, 50, 80]; // 检测不同周�?
    for (const step of hSteps) {
      if (step >= width / 2) continue;
      let correlation = 0;
      let count = 0;

      for (let y = 0; y < height; y += 5) {
        // 采样以提高性能
        for (let x = 0; x < width - step; x += 5) {
          const idx1 = y * width + x;
          const idx2 = y * width + x + step;
          correlation += Math.abs(gray[idx1] - gray[idx2]);
          count++;
        }
      }

      const avgCorrelation = count > 0 ? correlation / count : 255;
      // 相关性高（差异小）说明可能有重复模式
      if (avgCorrelation < 15) {
        horizontalPeriodicity += (15 - avgCorrelation) * 2;
      }
    }

    // 垂直方向自相关（检测重复的垂直水印�?
    const vSteps = [10, 20, 30, 50, 80];
    for (const step of vSteps) {
      if (step >= height / 2) continue;
      let correlation = 0;
      let count = 0;

      for (let y = 0; y < height - step; y += 5) {
        for (let x = 0; x < width; x += 5) {
          const idx1 = y * width + x;
          const idx2 = (y + step) * width + x;
          correlation += Math.abs(gray[idx1] - gray[idx2]);
          count++;
        }
      }

      const avgCorrelation = count > 0 ? correlation / count : 255;
      if (avgCorrelation < 15) {
        verticalPeriodicity += (15 - avgCorrelation) * 2;
      }
    }

    const maxPeriodicity = Math.max(horizontalPeriodicity, verticalPeriodicity);
    const score = Math.min(100, maxPeriodicity);

    return {
      score,
      horizontalPeriodicity,
      verticalPeriodicity,
      details: `H:${horizontalPeriodicity.toFixed(
        1
      )} V:${verticalPeriodicity.toFixed(1)}`,
    };
  } catch (error) {
    console.warn("[频域分析] 失败:", error);
    return { score: 0, horizontalPeriodicity: 0, verticalPeriodicity: 0 };
  }
}

// ==================== 梯度一致性分�?====================

/**
 * 梯度一致性分�?- 检测不自然的边�?
 * 原理：水印的边缘通常与图片内容的边缘在梯度方向上不一�?
 */
function analyzeGradientConsistency(data, width, height) {
  try {
    // 计算全图Sobel梯度
    const gradientMagnitude = new Float32Array(width * height);
    const gradientDirection = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        // 获取周围8个像素的灰度�?
        const tl =
          0.299 * data[((y - 1) * width + (x - 1)) * 4] +
          0.587 * data[((y - 1) * width + (x - 1)) * 4 + 1] +
          0.114 * data[((y - 1) * width + (x - 1)) * 4 + 2];
        const tc =
          0.299 * data[((y - 1) * width + x) * 4] +
          0.587 * data[((y - 1) * width + x) * 4 + 1] +
          0.114 * data[((y - 1) * width + x) * 4 + 2];
        const tr =
          0.299 * data[((y - 1) * width + (x + 1)) * 4] +
          0.587 * data[((y - 1) * width + (x + 1)) * 4 + 1] +
          0.114 * data[((y - 1) * width + (x + 1)) * 4 + 2];

        const ml =
          0.299 * data[(y * width + (x - 1)) * 4] +
          0.587 * data[(y * width + (x - 1)) * 4 + 1] +
          0.114 * data[(y * width + (x - 1)) * 4 + 2];
        const mr =
          0.299 * data[(y * width + (x + 1)) * 4] +
          0.587 * data[(y * width + (x + 1)) * 4 + 1] +
          0.114 * data[(y * width + (x + 1)) * 4 + 2];

        const bl =
          0.299 * data[((y + 1) * width + (x - 1)) * 4] +
          0.587 * data[((y + 1) * width + (x - 1)) * 4 + 1] +
          0.114 * data[((y + 1) * width + (x - 1)) * 4 + 2];
        const bc =
          0.299 * data[((y + 1) * width + x) * 4] +
          0.587 * data[((y + 1) * width + x) * 4 + 1] +
          0.114 * data[((y + 1) * width + x) * 4 + 2];
        const br =
          0.299 * data[((y + 1) * width + (x + 1)) * 4] +
          0.587 * data[((y + 1) * width + (x + 1)) * 4 + 1] +
          0.114 * data[((y + 1) * width + (x + 1)) * 4 + 2];

        // Sobel算子
        const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const direction = Math.atan2(gy, gx);

        const pixelIdx = y * width + x;
        gradientMagnitude[pixelIdx] = magnitude;
        gradientDirection[pixelIdx] = direction;
      }
    }

    // 分析梯度一致�?- 检�?孤立"的边缘（可能是水印）
    let inconsistentEdges = 0;
    let totalEdges = 0;
    const edgeThreshold = 30;

    const suspiciousRegions = [];

    // 定义检测区域（边缘和角落）
    const regions = [
      {
        name: "topLeft",
        x: 0,
        y: 0,
        w: Math.floor(width * 0.2),
        h: Math.floor(height * 0.2),
      },
      {
        name: "topRight",
        x: Math.floor(width * 0.8),
        y: 0,
        w: Math.floor(width * 0.2),
        h: Math.floor(height * 0.2),
      },
      {
        name: "bottomLeft",
        x: 0,
        y: Math.floor(height * 0.8),
        w: Math.floor(width * 0.2),
        h: Math.floor(height * 0.2),
      },
      {
        name: "bottomRight",
        x: Math.floor(width * 0.8),
        y: Math.floor(height * 0.8),
        w: Math.floor(width * 0.2),
        h: Math.floor(height * 0.2),
      },
      {
        name: "centerBottom",
        x: Math.floor(width * 0.35),
        y: Math.floor(height * 0.85),
        w: Math.floor(width * 0.3),
        h: Math.floor(height * 0.15),
      },
    ];

    for (const region of regions) {
      let regionEdges = 0;
      let regionInconsistent = 0;

      for (
        let y = region.y + 2;
        y < Math.min(region.y + region.h - 2, height - 2);
        y++
      ) {
        for (
          let x = region.x + 2;
          x < Math.min(region.x + region.w - 2, width - 2);
          x++
        ) {
          const idx = y * width + x;

          if (gradientMagnitude[idx] > edgeThreshold) {
            regionEdges++;
            totalEdges++;

            // 检查周�?个邻居的梯度方向
            const neighbors = [
              gradientDirection[(y - 1) * width + (x - 1)],
              gradientDirection[(y - 1) * width + x],
              gradientDirection[(y - 1) * width + (x + 1)],
              gradientDirection[y * width + (x - 1)],
              gradientDirection[y * width + (x + 1)],
              gradientDirection[(y + 1) * width + (x - 1)],
              gradientDirection[(y + 1) * width + x],
              gradientDirection[(y + 1) * width + (x + 1)],
            ];

            const currentDir = gradientDirection[idx];
            let similarNeighbors = 0;

            for (const neighborDir of neighbors) {
              const dirDiff = Math.abs(currentDir - neighborDir);
              // 考虑角度的周期�?
              const normalizedDiff = Math.min(dirDiff, 2 * Math.PI - dirDiff);
              if (normalizedDiff < Math.PI / 4) {
                // 45度以内认为相�?
                similarNeighbors++;
              }
            }

            // 如果周围相似方向的邻居少�?个，认为是不一致的边缘
            if (similarNeighbors < 3) {
              inconsistentEdges++;
              regionInconsistent++;
            }
          }
        }
      }

      // 如果该区域不一致边缘比例较高，标记为可�?
      if (regionEdges > 50 && regionInconsistent / regionEdges > 0.4) {
        suspiciousRegions.push(region.name);
      }
    }

    const inconsistencyRatio =
      totalEdges > 0 ? inconsistentEdges / totalEdges : 0;
    const score = Math.min(100, inconsistencyRatio * 200); // 放大评分

    return {
      score,
      inconsistentEdges,
      totalEdges,
      inconsistencyRatio,
      suspiciousRegions,
    };
  } catch (error) {
    console.warn("[梯度分析] 失败:", error);
    return {
      score: 0,
      inconsistentEdges: 0,
      totalEdges: 0,
      suspiciousRegions: [],
    };
  }
}

// ==================== 纹理特征分析 ====================

/**
 * 纹理特征分析 - 使用简化的局部二值模�?LBP)
 * 原理：水印会改变局部纹理特征的分布
 */
function analyzeTexturePattern(data, width, height) {
  try {
    // 简化的LBP：计算每个像素与�?邻域的关�?
    const lbpHistogram = new Array(256).fill(0);
    let totalPixels = 0;

    const anomalyRegions = [];
    const regionSize = 50; // 分块大小
    const regionScores = [];

    // 分块计算LBP
    for (let ry = 0; ry < Math.floor(height / regionSize); ry++) {
      for (let rx = 0; rx < Math.floor(width / regionSize); rx++) {
        const regionLBP = new Array(256).fill(0);
        let regionPixels = 0;

        const startX = rx * regionSize + 1;
        const startY = ry * regionSize + 1;
        const endX = Math.min(startX + regionSize - 2, width - 1);
        const endY = Math.min(startY + regionSize - 2, height - 1);

        for (let y = startY; y < endY; y++) {
          for (let x = startX; x < endX; x++) {
            const idx = (y * width + x) * 4;
            const center =
              0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

            // 计算LBP�?
            let lbpValue = 0;
            const neighbors = [
              [x - 1, y - 1],
              [x, y - 1],
              [x + 1, y - 1],
              [x - 1, y],
              [x + 1, y],
              [x - 1, y + 1],
              [x, y + 1],
              [x + 1, y + 1],
            ];

            for (let i = 0; i < neighbors.length; i++) {
              const [nx, ny] = neighbors[i];
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nidx = (ny * width + nx) * 4;
                const neighborGray =
                  0.299 * data[nidx] +
                  0.587 * data[nidx + 1] +
                  0.114 * data[nidx + 2];
                if (neighborGray >= center) {
                  lbpValue |= 1 << i;
                }
              }
            }

            regionLBP[lbpValue]++;
            regionPixels++;
            lbpHistogram[lbpValue]++;
            totalPixels++;
          }
        }

        // 计算该区域的纹理复杂�?
        let entropy = 0;
        for (let i = 0; i < 256; i++) {
          if (regionLBP[i] > 0) {
            const p = regionLBP[i] / regionPixels;
            entropy -= p * Math.log2(p);
          }
        }

        regionScores.push({
          x: rx,
          y: ry,
          entropy,
          startX: rx * regionSize,
          startY: ry * regionSize,
        });
      }
    }

    // 计算整体纹理�?
    let globalEntropy = 0;
    for (let i = 0; i < 256; i++) {
      if (lbpHistogram[i] > 0) {
        const p = lbpHistogram[i] / totalPixels;
        globalEntropy -= p * Math.log2(p);
      }
    }

    // 找出熵异常的区域（可能是水印�?
    const avgEntropy =
      regionScores.reduce((sum, r) => sum + r.entropy, 0) / regionScores.length;
    const stdEntropy = Math.sqrt(
      regionScores.reduce(
        (sum, r) => sum + Math.pow(r.entropy - avgEntropy, 2),
        0
      ) / regionScores.length
    );

    for (const region of regionScores) {
      // 熵明显低于平均值（纹理简单，可能是水印）
      if (region.entropy < avgEntropy - stdEntropy * 0.5) {
        // 判断位置（边缘区域更可疑�?
        const isEdgeRegion =
          region.x === 0 ||
          region.x === Math.floor(width / regionSize) - 1 ||
          region.y === 0 ||
          region.y === Math.floor(height / regionSize) - 1;

        if (isEdgeRegion || region.entropy < avgEntropy - stdEntropy * 1.0) {
          const regionName = determineRegionName(
            region.startX,
            region.startY,
            width,
            height
          );
          if (!anomalyRegions.includes(regionName)) {
            anomalyRegions.push(regionName);
          }
        }
      }
    }

    // 评分：基于异常区域数量和全局�?
    const anomalyScore = anomalyRegions.length * 15;
    const entropyScore = Math.max(0, (8 - globalEntropy) * 10); // 熵低可能是水�?
    const score = Math.min(100, anomalyScore + entropyScore);

    return {
      score,
      globalEntropy,
      avgEntropy,
      anomalyRegions,
      anomalyCount: anomalyRegions.length,
    };
  } catch (error) {
    console.warn("[纹理分析] 失败:", error);
    return { score: 0, globalEntropy: 0, avgEntropy: 0, anomalyRegions: [] };
  }
}

// ==================== 颜色通道差异分析 ====================

/**
 * 颜色通道差异分析
 * 原理：人工添加的水印可能在RGB三通道中表现不一�?
 */
function analyzeColorChannelDifference(data, width, height) {
  try {
    let rDiff = 0,
      gDiff = 0,
      bDiff = 0;
    let totalPixels = 0;

    // 计算相邻像素在各通道的差�?
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const rightIdx = (y * width + x + 1) * 4;
        const downIdx = ((y + 1) * width + x) * 4;

        // 水平方向
        rDiff += Math.abs(data[idx] - data[rightIdx]);
        gDiff += Math.abs(data[idx + 1] - data[rightIdx + 1]);
        bDiff += Math.abs(data[idx + 2] - data[rightIdx + 2]);

        // 垂直方向
        rDiff += Math.abs(data[idx] - data[downIdx]);
        gDiff += Math.abs(data[idx + 1] - data[downIdx + 1]);
        bDiff += Math.abs(data[idx + 2] - data[downIdx + 2]);

        totalPixels += 2;
      }
    }

    const avgRDiff = rDiff / totalPixels;
    const avgGDiff = gDiff / totalPixels;
    const avgBDiff = bDiff / totalPixels;

    // 计算通道间的不平衡度
    const avgDiff = (avgRDiff + avgGDiff + avgBDiff) / 3;
    const variance =
      Math.pow(avgRDiff - avgDiff, 2) +
      Math.pow(avgGDiff - avgDiff, 2) +
      Math.pow(avgBDiff - avgDiff, 2);

    const channelImbalance = Math.sqrt(variance / 3);

    // 水印通常导致某个通道差异更大
    const score = Math.min(100, channelImbalance * 5);

    return {
      score,
      avgRDiff,
      avgGDiff,
      avgBDiff,
      channelImbalance,
    };
  } catch (error) {
    console.warn("[颜色通道分析] 失败:", error);
    return {
      score: 0,
      avgRDiff: 0,
      avgGDiff: 0,
      avgBDiff: 0,
      channelImbalance: 0,
    };
  }
}

// ==================== 区域高级分析 ====================

/**
 * 区域高级分析 - 综合多个特征
 */
function analyzeRegionsAdvanced(data, width, height) {
  try {
    const regions = [
      {
        name: "topLeft",
        x: 0,
        y: 0,
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.15),
      },
      {
        name: "topRight",
        x: Math.floor(width * 0.85),
        y: 0,
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.15),
      },
      {
        name: "bottomLeft",
        x: 0,
        y: Math.floor(height * 0.85),
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.15),
      },
      {
        name: "bottomRight",
        x: Math.floor(width * 0.85),
        y: Math.floor(height * 0.85),
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.15),
      },
      {
        name: "centerBottom",
        x: Math.floor(width * 0.35),
        y: Math.floor(height * 0.9),
        w: Math.floor(width * 0.3),
        h: Math.floor(height * 0.1),
      },
      {
        name: "leftMiddle",
        x: 0,
        y: Math.floor(height * 0.4),
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.2),
      },
      {
        name: "rightMiddle",
        x: Math.floor(width * 0.85),
        y: Math.floor(height * 0.4),
        w: Math.floor(width * 0.15),
        h: Math.floor(height * 0.2),
      },
    ];

    const detectedRegions = [];
    let totalScore = 0;

    for (const region of regions) {
      const features = analyzeRegionPixelFeatures(data, width, height, region);

      if (features.score > 50) {
        detectedRegions.push(region.name);
        totalScore += features.score;
      }
    }

    const avgScore =
      detectedRegions.length > 0 ? totalScore / detectedRegions.length : 0;

    return {
      score: avgScore,
      detectedRegions,
      detectedCount: detectedRegions.length,
    };
  } catch (error) {
    console.warn("[区域分析] 失败:", error);
    return { score: 0, detectedRegions: [], detectedCount: 0 };
  }
}

/**
 * 分析单个区域的像素特�?
 */
function analyzeRegionPixelFeatures(data, width, height, region) {
  const { x, y, w, h } = region;

  let edgePixels = 0;
  let lowContrastPixels = 0;
  let semiTransparentPixels = 0;
  let totalPixels = 0;

  let sumBrightness = 0;
  let sumSaturation = 0;

  for (let row = y; row < y + h && row < height; row++) {
    for (let col = x; col < x + w && col < width; col++) {
      const idx = (row * width + col) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // 亮度
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      sumBrightness += brightness;

      // 饱和�?
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max > 0 ? (max - min) / max : 0;
      sumSaturation += saturation;

      // 半透明检�?
      if (a < 230) {
        semiTransparentPixels++;
      }

      // 边缘检测（简化版�?
      if (col < x + w - 1 && row < y + h - 1) {
        const rightIdx = (row * width + col + 1) * 4;
        const downIdx = ((row + 1) * width + col) * 4;

        const rightBrightness =
          0.299 * data[rightIdx] +
          0.587 * data[rightIdx + 1] +
          0.114 * data[rightIdx + 2];
        const downBrightness =
          0.299 * data[downIdx] +
          0.587 * data[downIdx + 1] +
          0.114 * data[downIdx + 2];

        const gradientH = Math.abs(brightness - rightBrightness);
        const gradientV = Math.abs(brightness - downBrightness);

        if (gradientH > 25 || gradientV > 25) {
          edgePixels++;
        }

        // 低对比度检�?
        if (gradientH < 5 && gradientV < 5) {
          lowContrastPixels++;
        }
      }

      totalPixels++;
    }
  }

  if (totalPixels === 0) {
    return { score: 0 };
  }

  const avgBrightness = sumBrightness / totalPixels;
  const avgSaturation = sumSaturation / totalPixels;
  const edgeDensity = edgePixels / totalPixels;
  const lowContrastRatio = lowContrastPixels / totalPixels;
  const semiTransparentRatio = semiTransparentPixels / totalPixels;

  // 综合评分
  let score = 0;

  // 边缘密度：文字水印通常有较高边缘密�?
  if (edgeDensity > 0.05) score += 25;
  else if (edgeDensity > 0.03) score += 15;
  else if (edgeDensity > 0.01) score += 8;

  // 半透明：水印常见特�?
  if (semiTransparentRatio > 0.2) score += 30;
  else if (semiTransparentRatio > 0.05) score += 15;

  // 饱和度：水印通常饱和度较�?
  if (avgSaturation < 0.3) score += 15;
  else if (avgSaturation < 0.5) score += 8;

  // 亮度：水印通常较浅或较�?
  if (avgBrightness < 80 || avgBrightness > 200) score += 15;
  else if (avgBrightness < 100 || avgBrightness > 180) score += 8;

  // 低对比度：大面积低对比度可能是半透明水印
  if (lowContrastRatio > 0.6 && edgeDensity > 0.02) score += 15;

  return {
    score: Math.min(100, score),
    edgeDensity,
    avgBrightness,
    avgSaturation,
    semiTransparentRatio,
    lowContrastRatio,
  };
}

// ==================== 透明度通道分析 ====================

/**
 * Alpha通道分析
 * 原理：水印经常使用alpha通道实现半透明效果
 */
function analyzeAlphaChannel(data, width, height) {
  try {
    let semiTransparentPixels = 0;
    let transparentRegions = [];
    let totalPixels = width * height;

    // 统计alpha值分�?
    const alphaHistogram = new Array(256).fill(0);

    for (let i = 3; i < data.length; i += 4) {
      const alpha = data[i];
      alphaHistogram[alpha]++;

      if (alpha < 230 && alpha > 25) {
        // 半透明范围
        semiTransparentPixels++;
      }
    }

    const semiTransparentRatio = semiTransparentPixels / totalPixels;

    // 检查是否有大量特定alpha值（水印常用固定alpha�?
    let maxAlphaCount = 0;
    let dominantAlpha = 255;

    for (let i = 0; i < 256; i++) {
      if (i !== 255 && alphaHistogram[i] > maxAlphaCount) {
        maxAlphaCount = alphaHistogram[i];
        dominantAlpha = i;
      }
    }

    const dominantAlphaRatio = maxAlphaCount / totalPixels;

    // 评分
    let score = 0;

    if (semiTransparentRatio > 0.15) score += 40;
    else if (semiTransparentRatio > 0.08) score += 25;
    else if (semiTransparentRatio > 0.03) score += 15;

    // 如果有显著的特定alpha值（除了255），可能是水�?
    if (dominantAlpha < 255 && dominantAlphaRatio > 0.05) {
      score += 30;
    }

    return {
      score: Math.min(100, score),
      semiTransparentRatio,
      dominantAlpha,
      dominantAlphaRatio,
    };
  } catch (error) {
    console.warn("[Alpha通道分析] 失败:", error);
    return {
      score: 0,
      semiTransparentRatio: 0,
      dominantAlpha: 255,
      dominantAlphaRatio: 0,
    };
  }
}

// ==================== 辅助函数 ====================

/**
 * 根据坐标确定区域名称
 */
function determineRegionName(x, y, width, height) {
  const xRatio = x / width;
  const yRatio = y / height;

  if (yRatio < 0.33) {
    if (xRatio < 0.33) return "topLeft";
    if (xRatio > 0.67) return "topRight";
    return "topCenter";
  } else if (yRatio > 0.67) {
    if (xRatio < 0.33) return "bottomLeft";
    if (xRatio > 0.67) return "bottomRight";
    return "bottomCenter";
  } else {
    if (xRatio < 0.33) return "leftMiddle";
    if (xRatio > 0.67) return "rightMiddle";
    return "center";
  }
}

/**
 * 获取主导特征
 */
function getDominantFeatures(scores) {
  const features = Object.entries(scores)
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .filter((f) => f.score > 30)
    .map((f) => f.name);

  return features.length > 0 ? features : ["none"];
}

// ========= 两分支融合水印检测（Repeated + Single） BEGIN =========
async function detectWatermarkTwoBranch(imageData) {
  const startTime = performance.now();
  try {
    if (
      typeof OffscreenCanvas === "undefined" ||
      typeof createImageBitmap === "undefined"
    ) {
      return {
        hasWatermark: false,
        watermarkRegions: [],
        watermarkConfidence: 0,
      };
    }

    const CFG = {
      preprocess: { maxSize: 1200, edgeThreshold: 30 },
      gating: {
        centerEdgePenalty: { centerRatio: 0.7, factor: 0.5 },
        uniformRegionPenalty: { regionScore: 75, whiteness: 12, factor: 0.65 },
        lowAnglePenalty: { angleCoherence: 25, factor: 0.75 },
      },
      repeated: {
        angles: [-45, -30, -15, 0, 15, 30, 45],
        thresholds: { periodicity: 58, angleCoherence: 55, whiteness: 25 },
        weights: {
          periodicity: 0.5,
          angleCoherence: 0.25,
          whiteness: 0.15,
          strokeWidth: 0.1,
        },
        pass: 45,
      },
      single: {
        roi: { edgeBand: 0.15, cornerBox: 0.2 },
        thresholds: {
          textlikeness: 65,
          overlayConsistency: 30,
          alphaLike: 18,
          positionMin: 55,
          strokeWidthMax: 11,
        },
        weights: {
          textlikeness: 0.4,
          overlayConsistency: 0.25,
          position: 0.2,
          alphaLike: 0.15,
        },
        pass: 36,
      },
      fusion: {
        scale: { repeated: 0.7, single: 0.75, baseline: 1.2 },
        decision: 40,
      },
    };

    const blob = new Blob([imageData]);
    const bitmap = await createImageBitmap(blob);
    const maxSize = CFG.preprocess.maxSize;
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.floor(bitmap.width * scale);
    const height = Math.floor(bitmap.height * scale);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // 基础特征
    const gray = vw_toGrayscale(data);
    const grad = vw_computeGradients(gray, width, height);
    const edgeMap = vw_buildEdgeMap(
      grad.mag,
      width,
      height,
      CFG.preprocess.edgeThreshold
    );

    const edgeInfo = vw_analyzeEdgeDistribution(data, width, height);
    const regionInfo = vw_analyzeRegionConsistency(data, width, height);
    const colorInfo = vw_analyzeColorFeatures(data, width, height);
    const alphaInfo = vw_analyzeAlphaFeatures(data);

    // Repeated 分支
    const periodicity = vw_computePeriodicityScore(
      edgeMap,
      width,
      height,
      CFG.repeated.angles
    );
    const angleCoh = vw_computeAngleCoherence(
      grad.ori,
      grad.mag,
      width,
      height,
      CFG.preprocess.edgeThreshold
    );
    const whiteness = vw_computeWhitenessNearEdges(
      data,
      edgeMap,
      width,
      height
    );
    const strokeWidth = vw_estimateStrokeWidth(edgeMap, width, height);
    const strokeScore = vw_mapStrokeWidthToScore(strokeWidth);

    let repeatedScore = 0;
    let repeatedPassed = false;
    if (
      periodicity >= CFG.repeated.thresholds.periodicity &&
      angleCoh >= CFG.repeated.thresholds.angleCoherence &&
      whiteness >= CFG.repeated.thresholds.whiteness
    ) {
      repeatedScore =
        CFG.repeated.weights.periodicity * periodicity +
        CFG.repeated.weights.angleCoherence * angleCoh +
        CFG.repeated.weights.whiteness * whiteness +
        CFG.repeated.weights.strokeWidth * strokeScore;
      repeatedPassed = repeatedScore >= CFG.repeated.pass;
    }

    // Single 分支
    const singleFeat = vw_analyzeSingleWatermark(
      gray,
      data,
      edgeMap,
      grad,
      width,
      height,
      CFG.single
    );
    let singleScore = 0;
    let singlePassed = false;
    if (
      singleFeat.textlikeness >= CFG.single.thresholds.textlikeness &&
      singleFeat.positionWeight >= CFG.single.thresholds.positionMin &&
      strokeWidth <= CFG.single.thresholds.strokeWidthMax &&
      (singleFeat.alphaLike >= CFG.single.thresholds.alphaLike ||
        singleFeat.overlayConsistency >=
          CFG.single.thresholds.overlayConsistency)
    ) {
      singleScore =
        CFG.single.weights.textlikeness * singleFeat.textlikeness +
        CFG.single.weights.overlayConsistency * singleFeat.overlayConsistency +
        CFG.single.weights.position * singleFeat.positionWeight +
        CFG.single.weights.alphaLike * singleFeat.alphaLike;
      singlePassed = singleScore >= CFG.single.pass;
    }

    // Baseline 与惩罚（方案4增强版）
    let baseline = 0;
    if (edgeInfo.positionScore > 30) baseline += edgeInfo.positionScore * 0.4;
    if (regionInfo.score > 20) baseline += regionInfo.score * 0.2;
    if (colorInfo.uniformity > 0.6 || colorInfo.isMonochromatic)
      baseline += colorInfo.score * 0.25;
    if (alphaInfo.score > 15) baseline += alphaInfo.score * 0.15;
    baseline = Math.min(baseline, 100);

    if (edgeInfo.centerRatio >= CFG.gating.centerEdgePenalty.centerRatio)
      baseline *= CFG.gating.centerEdgePenalty.factor;
    if (
      regionInfo.score >= CFG.gating.uniformRegionPenalty.regionScore &&
      whiteness < CFG.gating.uniformRegionPenalty.whiteness
    )
      baseline *= CFG.gating.uniformRegionPenalty.factor;
    if (angleCoh < CFG.gating.lowAnglePenalty.angleCoherence)
      baseline *= CFG.gating.lowAnglePenalty.factor;

    const confidence = Math.min(
      100,
      Math.max(
        CFG.fusion.scale.repeated * (repeatedPassed ? repeatedScore : 0),
        CFG.fusion.scale.single * (singlePassed ? singleScore : 0),
        CFG.fusion.scale.baseline * baseline
      )
    );

    // 🔍 详细调试日志
    console.log("[水印检测详情]", {
      图片尺寸: `${width}×${height}`,
      Repeated分支: {
        periodicity,
        angleCoh,
        whiteness,
        strokeWidth,
        strokeScore,
        repeatedScore,
        repeatedPassed,
      },
      Single分支: { ...singleFeat, singleScore, singlePassed },
      Baseline: {
        edgeInfo,
        regionInfo: regionInfo.score,
        colorInfo: colorInfo.score,
        alphaInfo: alphaInfo.score,
        baseline,
      },
      最终置信度: confidence,
      判定结果: confidence >= CFG.fusion.decision ? "有水印" : "无水印",
    });

    const processingTime = parseFloat(
      (performance.now() - startTime).toFixed(2)
    );
    const hasWatermark = confidence >= CFG.fusion.decision;

    return {
      hasWatermark,
      watermarkRegions: regionInfo.regions || [],
      watermarkConfidence: confidence,
      detectionMethod: "two-branch-fusion",
      processingTime,
      analysisDetails: {
        frequencyScore: periodicity.toFixed(2),
        textureScore: angleCoh.toFixed(2),
        gradientScore: edgeInfo.positionScore.toFixed(2),
        regionScore: (regionInfo.score || 0).toFixed(2),
        colorChannelScore: colorInfo.score.toFixed(2),
        alphaScore: (alphaInfo.score || 0).toFixed(2),
      },
    };
  } catch (e) {
    return {
      hasWatermark: false,
      watermarkRegions: [],
      watermarkConfidence: 0,
      detectionMethod: "two-branch-fusion-error",
      error: e?.message,
    };
  }
}

function vw_toGrayscale(data) {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0, j = 0; i < data.length; i += 4, j++)
    gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return gray;
}
function vw_computeGradients(gray, w, h) {
  const mag = new Float32Array(w * h),
    ori = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - 1 - w] -
        2 * gray[i - w] -
        gray[i + 1 - w] +
        gray[i - 1 + w] +
        2 * gray[i + w] +
        gray[i + 1 + w];
      const gy =
        -gray[i - 1 - w] -
        2 * gray[i - 1] -
        gray[i - 1 + w] +
        gray[i + 1 - w] +
        2 * gray[i + 1] +
        gray[i + 1 + w];
      mag[i] = Math.hypot(gx, gy);
      let a = (Math.atan2(gy, gx) * 180) / Math.PI;
      if (a < 0) a += 180;
      ori[i] = a;
    }
  }
  return { mag, ori };
}
function vw_buildEdgeMap(mag, w, h, thr) {
  const e = new Uint8Array(w * h);
  for (let i = 0; i < mag.length; i++) e[i] = mag[i] > thr ? 1 : 0;
  return e;
}
function vw_computeAngleCoherence(ori, mag, w, h, thr) {
  const bins = 12,
    hist = new Float32Array(bins);
  for (let i = 0; i < ori.length; i++) {
    if (mag[i] > thr) {
      let b = Math.floor((ori[i] / 180) * bins);
      if (b >= bins) b = bins - 1;
      hist[b] += 1;
    }
  }
  const sum = hist.reduce((a, b) => a + b, 0);
  if (!sum) return 0;
  const sorted = [...hist].sort((a, b) => a - b);
  const med = sorted[Math.floor(bins / 2)];
  const mx = Math.max(...hist);
  const ratio = mx / (med + 1e-6);
  return Math.max(0, Math.min(100, (ratio - 1) * 20));
}
function vw_computePeriodicityScore(edge, w, h, angles) {
  const diag = Math.ceil(Math.hypot(w, h));
  const scores = [];
  const step = 2;
  for (const deg of angles) {
    const rad = (deg * Math.PI) / 180,
      cos = Math.cos(rad),
      sin = Math.sin(rad);
    const bins = new Float32Array(diag + 1);
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = y * w + x;
        if (edge[i]) {
          const u = Math.floor(x * cos + y * sin + diag / 2);
          if (u >= 0 && u <= diag) bins[u] += 1;
        }
      }
    }
    let peak = 0,
      baseSum = 0,
      baseCnt = 0;
    const minLag = 8,
      maxLag = Math.min(150, Math.floor(diag / 3));
    for (let lag = minLag; lag < maxLag; lag++) {
      let c = 0;
      for (let i = 0; i + lag < bins.length; i += 2)
        c += bins[i] * bins[i + lag];
      if (c > peak) peak = c;
      baseSum += c;
      baseCnt++;
    }
    const base = baseCnt ? baseSum / baseCnt : 0;
    const s = base > 0 ? peak / base : 0;
    const score = Math.max(0, Math.min(100, (s - 1) * 25));
    scores.push(score);
  }
  return Math.max(...scores, 0);
}
function vw_computeWhitenessNearEdges(rgba, edge, w, h) {
  let white = 0,
    total = 0;
  const tol = 12;
  for (let y = 0; y < h; y += 2) {
    for (let x = 0; x < w; x += 2) {
      const i = y * w + x;
      if (!edge[i]) continue;
      const idx = i * 4;
      const r = rgba[idx],
        g = rgba[idx + 1],
        b = rgba[idx + 2];
      const maxc = Math.max(r, g, b),
        minc = Math.min(r, g, b);
      if (maxc - minc <= tol && maxc >= 200) white++;
      total++;
    }
  }
  return total ? Math.min(100, (white / total) * 100) : 0;
}
function vw_estimateStrokeWidth(edge, w, h) {
  let runSum = 0,
    runCnt = 0;
  for (let y = 0; y < h; y += 2) {
    let x = 0;
    while (x < w) {
      while (x < w && !edge[y * w + x]) x++;
      let len = 0;
      while (x < w && edge[y * w + x]) {
        len++;
        x++;
      }
      if (len > 0) {
        runSum += len;
        runCnt++;
      }
    }
  }
  return runCnt ? runSum / runCnt : 0;
}
function vw_mapStrokeWidthToScore(w) {
  if (w <= 0) return 0;
  const center = 2.5,
    spread = 1.5;
  const s = Math.exp(-Math.pow((w - center) / spread, 2));
  return Math.round(s * 100);
}
function vw_analyzeSingleWatermark(gray, rgba, edge, grad, w, h, cfg) {
  const eb = Math.floor(Math.min(w, h) * cfg.roi.edgeBand);
  const cb = Math.floor(Math.min(w, h) * cfg.roi.cornerBox);
  const rois = [
    { name: "左上", x: 0, y: 0, w: cb, h: cb, posW: 100 },
    { name: "右上", x: w - cb, y: 0, w: cb, h: cb, posW: 100 },
    { name: "左下", x: 0, y: h - cb, w: cb, h: cb, posW: 100 },
    { name: "右下", x: w - cb, y: h - cb, w: cb, h: cb, posW: 100 },
    { name: "上边", x: 0, y: 0, w, w: w, h: eb, posW: 60 },
    { name: "下边", x: 0, y: h - eb, w: w, h: eb, posW: 60 },
    { name: "左边", x: 0, y: 0, w: eb, h: h, posW: 60 },
    { name: "右边", x: w - eb, y: 0, w: eb, h: h, posW: 60 },
  ];
  let best = {
    name: "",
    textlikeness: 0,
    overlayConsistency: 0,
    positionWeight: 0,
    alphaLike: 0,
  };
  for (const r of rois) {
    const feat = vw_computeROITextAndOverlay(gray, rgba, edge, grad, w, h, r);
    const tl = feat.textlikeness,
      oc = feat.overlayConsistency,
      al = feat.alphaLike,
      pw = r.posW;
    const tmp = 0.4 * tl + 0.25 * oc + 0.2 * pw + 0.15 * al;
    const bestScore =
      0.4 * best.textlikeness +
      0.25 * best.overlayConsistency +
      0.2 * best.positionWeight +
      0.15 * best.alphaLike;
    if (tmp > bestScore) {
      best = {
        name: r.name,
        textlikeness: tl,
        overlayConsistency: oc,
        positionWeight: pw,
        alphaLike: al,
      };
    }
  }
  return best;
}
function vw_computeROITextAndOverlay(gray, rgba, edge, grad, w, h, roi) {
  const step = 2;
  let edges = 0,
    total = 0;
  const bins = 8;
  const hist = new Float32Array(bins);
  let sum = 0,
    sum2 = 0,
    brightEdgeCnt = 0;
  for (let y = roi.y; y < roi.y + roi.h; y += step) {
    for (let x = roi.x; x < roi.x + roi.w; x += step) {
      if (x <= 0 || y <= 0 || x >= w - 1 || y >= h - 1) continue;
      const i = y * w + x;
      const g = grad.mag[i];
      if (g > 25) {
        edges++;
        let b = Math.floor((grad.ori[i] / 180) * bins);
        if (b >= bins) b = bins - 1;
        hist[b] += 1;
        const idx = i * 4;
        const r = rgba[idx],
          gg = rgba[idx + 1],
          bb = rgba[idx + 2];
        const maxc = Math.max(r, gg, bb),
          minc = Math.min(r, gg, bb);
        if (maxc - minc < 12 && maxc > 200) brightEdgeCnt++;
      }
      total++;
      sum += gray[i];
      sum2 += gray[i] * gray[i];
    }
  }
  const edgeDensity = total ? edges / total : 0;
  const variance = total ? sum2 / total - Math.pow(sum / total, 2) : 0;
  const histSum = hist.reduce((a, b) => a + b, 0);
  const maxBin = histSum ? Math.max(...hist) : 0;
  const textlikeness = Math.min(
    100,
    edgeDensity * 350 + (histSum ? (maxBin / histSum) * 100 : 0)
  );
  const overlayConsistency = Math.min(
    100,
    Math.max(0, 50 - variance) * 1.2 +
      (edges > 0 ? (brightEdgeCnt / edges) * 40 : 0)
  );
  const alphaLike = Math.max(
    0,
    Math.min(100, sum / Math.max(1, total) / 2 - edgeDensity * 50)
  );
  return { textlikeness, overlayConsistency, alphaLike };
}
function vw_analyzeColorFeatures(data, width, height) {
  const colorCounts = new Map();
  let total = 0;
  const step = 5;
  for (let i = 0; i < data.length; i += 4 * step) {
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
    total++;
  }
  const unique = colorCounts.size;
  let maxCount = 0;
  for (const v of colorCounts.values()) {
    if (v > maxCount) maxCount = v;
  }
  const domRatio = total ? maxCount / total : 0;
  const isMono = unique < total * 0.05 || domRatio > 0.7;
  const uniformity = Math.max(0, 1 - unique / (total * 0.1));
  let score = 0;
  if (isMono) score += 40;
  score += uniformity * 60;
  return { uniformity, isMonochromatic: isMono, score: Math.min(100, score) };
}
function vw_analyzeRegionConsistency(data, width, height) {
  const regions = ["左上", "右上", "左下", "右下", "中心"];
  const regionSize = Math.min(width, height) * 0.2;
  const regionScores = [];
  const detectedRegions = [];
  const positions = [
    { x: 0, y: 0, name: "左上" },
    { x: width - regionSize, y: 0, name: "右上" },
    { x: 0, y: height - regionSize, name: "左下" },
    { x: width - regionSize, y: height - regionSize, name: "右下" },
    { x: (width - regionSize) / 2, y: (height - regionSize) / 2, name: "中心" },
  ];
  positions.forEach((r) => {
    const s = vw_analyzeRegionUniformity(
      data,
      width,
      height,
      r.x,
      r.y,
      regionSize
    );
    regionScores.push(s);
    if (s > 30) detectedRegions.push(r.name);
  });
  const avg = regionScores.length
    ? regionScores.reduce((a, b) => a + b, 0) / regionScores.length
    : 0;
  return { score: avg, regions: detectedRegions };
}
function vw_analyzeRegionUniformity(data, width, height, startX, startY, size) {
  const colors = [];
  let alphaCount = 0;
  for (let y = startY; y < Math.min(startY + size, height); y++) {
    for (let x = startX; x < Math.min(startX + size, width); x++) {
      const idx = (y * width + x) * 4;
      colors.push({
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3],
      });
      if (data[idx + 3] < 255) alphaCount++;
    }
  }
  if (colors.length === 0) return 0;
  const avgR = colors.reduce((s, c) => s + c.r, 0) / colors.length;
  const avgG = colors.reduce((s, c) => s + c.g, 0) / colors.length;
  const avgB = colors.reduce((s, c) => s + c.b, 0) / colors.length;
  const variance =
    colors.reduce(
      (sum, c) =>
        sum +
        Math.pow(c.r - avgR, 2) +
        Math.pow(c.g - avgG, 2) +
        Math.pow(c.b - avgB, 2),
      0
    ) / colors.length;
  const uniformityScore = Math.max(0, 100 - variance / 100);
  const alphaBonus = (alphaCount / colors.length) * 20;
  return Math.min(uniformityScore + alphaBonus, 100);
}
function vw_analyzeAlphaFeatures(data) {
  let semi = 0,
    full = 0,
    opaque = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a === 0) full++;
    else if (a < 255) semi++;
    else opaque++;
  }
  const total = data.length / 4;
  const ratio = total ? semi / total : 0;
  let score = 0;
  if (ratio > 0.1 && ratio < 0.9) score = ratio * 100;
  return {
    semiTransparentRatio: ratio,
    fullyTransparentRatio: total ? full / total : 0,
    opaqueRatio: total ? opaque / total : 0,
    score: Math.min(score, 100),
  };
}
function vw_analyzeEdgeDistribution(data, width, height) {
  let edgeCount = 0,
    cornerEdges = 0,
    borderEdges = 0,
    centerEdges = 0;
  const cornerSize = Math.min(width, height) * 0.25;
  const borderSize = Math.min(width, height) * 0.15;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const gx =
        -data[idx - 4 - width * 4] -
        2 * data[idx - width * 4] -
        data[idx + 4 - width * 4] +
        data[idx - 4 + width * 4] +
        2 * data[idx + width * 4] +
        data[idx + 4 + width * 4];
      const gy =
        -data[idx - 4 - width * 4] -
        2 * data[idx - 4] -
        data[idx - 4 + width * 4] +
        data[idx + 4 - width * 4] +
        2 * data[idx + 4] +
        data[idx + 4 + width * 4];
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > 30) {
        edgeCount++;
        const isCorner =
          (x < cornerSize || x > width - cornerSize) &&
          (y < cornerSize || y > height - cornerSize);
        const isBorder =
          x < borderSize ||
          x > width - borderSize ||
          y < borderSize ||
          y > height - borderSize;
        if (isCorner) cornerEdges++;
        else if (isBorder) borderEdges++;
        else centerEdges++;
      }
    }
  }
  const total = width * height;
  const density = (edgeCount / total) * 100;
  const cornerRatio = edgeCount ? cornerEdges / edgeCount : 0;
  const borderRatio = edgeCount ? borderEdges / edgeCount : 0;
  const centerRatio = edgeCount ? centerEdges / edgeCount : 0;
  let positionScore = 0;
  if (centerRatio < 0.6) {
    positionScore = (cornerRatio * 50 + borderRatio * 30) * (density / 5);
  } else {
    positionScore = density * 0.2;
  }
  return {
    density,
    positionScore: Math.min(positionScore, 100),
    cornerRatio,
    borderRatio,
    centerRatio,
  };
}
// ========= 两分支融合水印检测（Repeated + Single） END =========

// ==================== 导出函数 ====================

// 在worker环境中，直接替换原有的detectWatermark函数
if (typeof self !== "undefined" && typeof detectWatermark === "undefined") {
  self.detectWatermark = detectWatermarkAdvanced;
}
