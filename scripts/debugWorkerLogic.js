// 调试Worker表头识别逻辑
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

// 模拟Worker中的表头识别逻辑
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

function findHeaderRow(data, template) {
  const requiredFields = template.requiredFields || [];
  let bestMatch = { row: null, index: 0, score: 0 };

  console.log("🔍 查找表头行...");
  console.log("必填字段:", requiredFields);

  // 扫描前5行，寻找最匹配的表头行
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) {
      console.log(`第${i + 1}行: 空行，跳过`);
      continue;
    }

    // 清洗表头（去除换行、多余空格）
    const cleanHeaders = row.map((h) =>
      String(h || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "")
    );

    console.log(`\n第${i + 1}行分析:`);
    console.log("原始表头:", row.slice(0, 8));
    console.log("清洗后表头:", cleanHeaders.slice(0, 8));

    // 计算匹配分数
    let score = 0;
    const nonEmptyCount = cleanHeaders.filter((h) => h.length > 0).length;

    // 基础分：非空字段数量
    score += nonEmptyCount * 0.1;
    console.log(`非空字段数: ${nonEmptyCount}, 基础分: ${nonEmptyCount * 0.1}`);

    // 必填字段匹配分
    let matchedFields = 0;
    for (const required of requiredFields) {
      const found = cleanHeaders.some((header) => {
        // 精确匹配
        if (header === required) return true;
        // 包含匹配
        if (header.includes(required) || required.includes(header)) return true;
        // 相似度匹配
        return calculateSimilarity(header, required) > 0.8;
      });
      if (found) {
        score += 10;
        matchedFields++;
        console.log(`✓ 匹配必填字段: ${required}`);
      } else {
        console.log(`✗ 未匹配必填字段: ${required}`);
      }
    }

    // 典型表头特征分
    const hasTypicalHeaders = cleanHeaders.some(
      (header) =>
        header.includes("实施") ||
        header.includes("对接") ||
        header.includes("时间") ||
        header.includes("姓名") ||
        header.includes("机构") ||
        header.includes("渠道") ||
        header.includes("科室") ||
        header.includes("地址") ||
        header.includes("类型") ||
        header.includes("时长")
    );
    if (hasTypicalHeaders) {
      score += 5;
      console.log("✓ 包含典型表头特征 +5分");
    }

    console.log(
      `总分: ${score} (必填字段匹配: ${matchedFields}/${requiredFields.length})`
    );

    // 更新最佳匹配
    if (score > bestMatch.score && nonEmptyCount >= 3) {
      bestMatch = { row, index: i, score };
      console.log(`🎯 新的最佳匹配！`);
    }
  }

  console.log(`\n📊 最终结果:`);
  console.log(`最佳匹配行: 第${bestMatch.index + 1}行`);
  console.log(`匹配分数: ${bestMatch.score}`);
  console.log(`表头内容:`, bestMatch.row ? bestMatch.row.slice(0, 8) : "无");

  return {
    headerRow: bestMatch.row,
    headerRowIndex: bestMatch.index,
  };
}

// 模拟药店拜访模板
const pharmacyTemplate = {
  requiredFields: ["实施人", "零售渠道", "拜访开始时间", "拜访时长"],
  fieldMappings: {
    序号: "serialNumber",
    任务标题: "taskTitle",
    实施人: "implementer",
    对接人: "contactPerson",
    零售渠道: "retailChannel",
    渠道地址: "channelAddress",
    拜访开始时间: "visitStartTime",
    拜访时长: "visitDuration",
  },
};

function debugPharmacySheet() {
  const templatePath = path.join(__dirname, "../public/data/模板总汇.xlsx");

  if (!fs.existsSync(templatePath)) {
    console.error("❌ 模板文件不存在！");
    return;
  }

  try {
    const buffer = fs.readFileSync(templatePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheet = workbook.Sheets["药店拜访"];
    if (!sheet) {
      console.error('❌ 未找到"药店拜访"工作表');
      return;
    }

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log("📋 调试药店拜访工作表的表头识别逻辑");
    console.log("=".repeat(60));

    const result = findHeaderRow(data, pharmacyTemplate);

    if (result.headerRow) {
      console.log("\n✅ 表头识别成功！");

      // 计算数据行
      const dataRows = data.slice(result.headerRowIndex + 1);
      const nonEmptyDataRows = dataRows.filter(
        (row) => row && row.some((cell) => cell && String(cell).trim())
      );

      console.log(`\n📊 数据统计:`);
      console.log(`表头行索引: ${result.headerRowIndex}`);
      console.log(`总行数: ${data.length}`);
      console.log(`数据行数: ${dataRows.length}`);
      console.log(`非空数据行数: ${nonEmptyDataRows.length}`);

      if (nonEmptyDataRows.length > 0) {
        console.log(`\n📄 非空数据行示例:`);
        nonEmptyDataRows.slice(0, 3).forEach((row, index) => {
          console.log(
            `第${result.headerRowIndex + index + 2}行:`,
            row.slice(0, 6)
          );
        });
      } else {
        console.log("\n⚠️  没有找到非空数据行（这是正常的，因为这是模板文件）");
      }
    } else {
      console.log("\n❌ 表头识别失败！");
    }
  } catch (error) {
    console.error("❌ 调试时出错:", error);
  }
}

// 运行调试
console.log("🚀 开始调试Worker表头识别逻辑...\n");
debugPharmacySheet();
console.log("\n✅ 调试完成！");
