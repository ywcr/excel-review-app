// ==================== 数据处理模块 ====================

/**
 * Excel文件处理类
 */
class ExcelProcessor {
  constructor() {
    this.sheets = {};
    this.currentSheets = {};
  }

  /**
   * 加载Excel文件
   */
  loadFile(files) {
    return new Promise((resolve, reject) => {
      if (!files || files.length === 0) {
        reject(new Error("没有选择文件"));
        return;
      }

      const fileName = files[0].name.split(".")[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const result = e.target.result;
          let workbook;

          if (result instanceof ArrayBuffer) {
            // 使用更可靠的ArrayBuffer解析方式
            workbook = XLSX.read(new Uint8Array(result), { type: "array" });
          } else {
            // 兼容旧实现的binary字符串
            workbook = XLSX.read(result, { type: "binary" });
          }

          this.sheets = {};

          for (let i = 0; i < workbook.SheetNames.length; i++) {
            const sheetName = workbook.SheetNames[i];
            const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
              header: 1,
            });
            this.sheets[sheetName] = sheet;
          }

          Logger.logSuccess(`✅ 文件加载成功: ${fileName}`);
          Logger.logInfo(`📊 工作表数量: ${workbook.SheetNames.length}`);

          resolve({
            fileName,
            sheets: this.sheets,
            sheetNames: workbook.SheetNames,
          });
        } catch (error) {
          Logger.logError(`文件解析失败: ${error.message}`);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("文件读取失败"));
      };

      // 优先使用ArrayBuffer读取，避免readAsBinaryString在部分浏览器中的兼容问题
      reader.readAsArrayBuffer(files[0]);
    });
  }

  /**
   * 获取工作表数据
   */
  getSheetData(sheetName) {
    return this.sheets[sheetName] || [];
  }

  /**
   * 获取所有工作表名称
   */
  getSheetNames() {
    return Object.keys(this.sheets);
  }
}

/**
 * Sheet匹配器类
 */
class SheetMatcher {
  constructor(config) {
    this.config = config;
  }

  /**
   * 查找匹配的Sheet
   */
  findMatchingSheet(sheets, preferences = {}) {
    const sheetNames = Object.keys(sheets);

    Logger.logInfo(`🔍 开始匹配Sheet，问卷类型: ${this.config.name}`);
    Logger.logInfo(`📋 可用Sheet: [${sheetNames.join(", ")}]`);
    Logger.logInfo(`🔑 匹配关键词: [${this.config.keywords.join(", ")}]`);

    // 1. 检查用户偏好设置
    const preferredSheet = preferences[this.config.type];
    if (preferredSheet && sheets[preferredSheet]) {
      Logger.logSuccess(`✅ 使用用户偏好Sheet: ${preferredSheet}`);
      return {
        found: true,
        sheetName: preferredSheet,
        reason: "user_preference",
      };
    }

    // 2. 精确匹配
    Logger.logInfo(`🎯 尝试精确匹配: ${this.config.sheetName}`);
    if (sheets[this.config.sheetName]) {
      Logger.logSuccess(`✅ 精确匹配成功: ${this.config.sheetName}`);
      return {
        found: true,
        sheetName: this.config.sheetName,
        reason: "exact_match",
      };
    }
    Logger.logWarning(`⚠️ 精确匹配失败`);

    // 3. 模糊匹配
    Logger.logInfo(`🔍 尝试模糊匹配...`);
    const fuzzyMatch = this.findFuzzyMatch(sheetNames, this.config.keywords);
    if (fuzzyMatch) {
      Logger.logSuccess(`✅ 模糊匹配成功: ${fuzzyMatch}`);
      return { found: true, sheetName: fuzzyMatch, reason: "fuzzy_match" };
    }
    Logger.logWarning(`⚠️ 模糊匹配失败`);

    // 4. 匹配失败
    Logger.logError(`❌ 所有匹配方式都失败了`);
    return {
      found: false,
      reason: `未找到包含产品关键词 [${this.config.keywords
        .filter((k) => CONFIG.productKeywords.includes(k))
        .join(", ")}] 的工作表`,
      availableSheets: sheetNames,
    };
  }

  /**
   * 模糊匹配
   */
  findFuzzyMatch(sheetNames, keywords) {
    let bestMatch = null;
    let maxScore = 0;

    const currentProductKeyword = keywords.find((k) =>
      CONFIG.productKeywords.includes(k)
    );

    Logger.logInfo(`🔍 模糊匹配详情：`);
    Logger.logInfo(`   产品关键词: ${currentProductKeyword || "无"}`);

    sheetNames.forEach((sheetName) => {
      let score = 0;
      let hasProductKeyword = false;
      let matchedKeywords = [];

      keywords.forEach((keyword) => {
        if (sheetName.includes(keyword)) {
          score++;
          matchedKeywords.push(keyword);
          if (CONFIG.productKeywords.includes(keyword)) {
            hasProductKeyword = true;
          }
        }
      });

      Logger.logInfo(
        `   "${sheetName}": 得分${score}, 产品关键词${
          hasProductKeyword ? "✅" : "❌"
        }, 匹配词[${matchedKeywords.join(", ")}]`
      );

      if (hasProductKeyword && score > maxScore) {
        maxScore = score;
        bestMatch = sheetName;
      }
    });

    Logger.logInfo(`🎯 最佳匹配: ${bestMatch || "无"} (得分: ${maxScore})`);

    return maxScore >= 2 && bestMatch ? bestMatch : null;
  }

  /**
   * 计算推荐分数
   */
  calculateRecommendScore(sheetName, keywords) {
    let score = 0;
    let hasProductKeyword = false;

    keywords.forEach((keyword) => {
      if (sheetName.includes(keyword)) {
        score++;
        if (CONFIG.productKeywords.includes(keyword)) {
          hasProductKeyword = true;
          score += 2; // 产品关键词额外加分
        }
      }
    });

    return hasProductKeyword ? score : 0;
  }
}

/**
 * 数据解析器类
 */
class DataParser {
  constructor(config) {
    this.config = config;
  }

  /**
   * 解析Sheet数据
   */
  parseSheetData(sheetData) {
    const wenjuan = sheetData.slice(1); // 跳过标题行

    if (wenjuan.length === 0) {
      throw new Error("工作表没有数据");
    }

    const all = [];

    wenjuan.forEach((row, index) => {
      if (!row || row.length === 0) return;

      const item = this.parseRow(row, index);
      if (item) {
        all.push(item);
      }
    });

    return this.processData(all);
  }

  /**
   * 解析单行数据
   */
  parseRow(row, index) {
    const item = {};

    // 根据问卷类型解析不同的列
    if (this.config.contactType === "患者") {
      if (this.config.columnFormat === "simple") {
        item.name = row[1] || `患者${index + 1}`;
        item.sex = row[2] || "男";
        item.time = row[3] || "";
        item.assignee = row[4] || "未指派";
      } else {
        item.name = row[0] || `患者${index + 1}`;
        item.sex = row[1] || "男";
        item.time = row[2] || "";
        item.assignee = row[3] || "未指派";
      }
    } else {
      // 消费者问卷
      if (this.config.columnFormat === "simple") {
        item.name = row[1] || `消费者${index + 1}`;
        item.sex = row[2] || "男";
        item.hospital = "";
        item.address = "";
        item.time = row[3] || "";
        item.assignee = row[4] || "未指派";
      } else {
        item.name = row[0] || `消费者${index + 1}`;
        item.sex = row[1] || "男";
        item.hospital = row[2] || "";
        item.address = row[3] || "";
        item.time = row[4] || "";
        item.assignee = row[5] || "未指派";
      }
    }

    // 数据清理
    item.time = Validator.formatDate(item.time);
    if (item.assignee) {
      item.assignee = item.assignee.toString().trim();
    }

    return item;
  }

  /**
   * 处理解析后的数据
   */
  processData(data) {
    // 按指派人分组
    const assigneeData = ArrayUtils.groupBy(data, "assignee");

    // 收集所有日期
    const dateSet = new Set();
    data.forEach((item) => {
      if (item.time) {
        dateSet.add(item.time);
      }
    });
    const allDates = Array.from(dateSet).sort();

    Logger.logSuccess(`✅ 数据解析完成`);
    Logger.logInfo(`📊 总记录数: ${data.length}`);
    Logger.logInfo(`👥 指派人数: ${Object.keys(assigneeData).length}`);
    Logger.logInfo(`📅 日期数量: ${allDates.length}`);

    return {
      data,
      assigneeData,
      allDates,
    };
  }
}

// 全局导出
window.ExcelProcessor = ExcelProcessor;
window.SheetMatcher = SheetMatcher;
window.DataParser = DataParser;
