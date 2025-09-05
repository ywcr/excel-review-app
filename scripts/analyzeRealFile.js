// 分析真实的药店拜访记录文件
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

function analyzeRealFile() {
  const filePath = path.join(
    __dirname,
    "../public/test-files/8月盛邦药店拜访记录(11111111).xlsx"
  );

  if (!fs.existsSync(filePath)) {
    console.error("❌ 文件不存在！");
    return;
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    console.log("📊 所有工作表:");
    workbook.SheetNames.forEach((name, index) => {
      console.log(`  ${index + 1}. "${name}"`);
    });

    // 分析每个工作表
    workbook.SheetNames.forEach((sheetName) => {
      console.log(`\n📋 分析工作表: "${sheetName}"`);
      console.log("=".repeat(50));

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      console.log(`总行数: ${data.length}`);

      // 显示前10行数据
      for (let i = 0; i < Math.min(10, data.length); i++) {
        const row = data[i];
        if (row && row.length > 0) {
          console.log(
            `第${i + 1}行 (${row.length}列):`,
            row
              .slice(0, 8)
              .map((cell) =>
                typeof cell === "string"
                  ? `"${cell.substring(0, 20)}${cell.length > 20 ? "..." : ""}"`
                  : cell
              )
          );
        } else {
          console.log(`第${i + 1}行: [空行]`);
        }
      }

      // 分析可能的表头行
      console.log("\n🔍 表头分析:");
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const nonEmptyCount = row.filter(
          (cell) => cell && String(cell).trim()
        ).length;
        const hasTypicalHeaders = row.some((cell) => {
          const str = String(cell || "").toLowerCase();
          return (
            str.includes("实施") ||
            str.includes("对接") ||
            str.includes("时间") ||
            str.includes("渠道") ||
            str.includes("地址") ||
            str.includes("时长") ||
            str.includes("序号") ||
            str.includes("任务")
          );
        });

        console.log(
          `  第${i + 1}行: ${nonEmptyCount}个非空字段, 典型表头: ${
            hasTypicalHeaders ? "是" : "否"
          }`
        );
        if (hasTypicalHeaders) {
          console.log(`    表头内容:`, row.slice(0, 10));
        }
      }

      // 检查数据行
      let dataRowCount = 0;
      let firstDataRow = -1;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row && row.length > 5) {
          const hasData = row.some((cell) => {
            const str = String(cell || "").trim();
            return (
              str &&
              !str.includes("月") &&
              !str.includes("拜访记录") &&
              str !== "序号" &&
              str !== "任务标题" &&
              !str.includes("实施人")
            );
          });
          if (hasData) {
            if (firstDataRow === -1) firstDataRow = i;
            dataRowCount++;
          }
        }
      }

      console.log(`\n📊 数据统计:`);
      console.log(`数据行数量: ${dataRowCount}`);
      if (firstDataRow >= 0) {
        console.log(`首个数据行: 第${firstDataRow + 1}行`);
        console.log(`数据行示例:`, data[firstDataRow].slice(0, 8));
      }

      // 模拟Worker的表头识别逻辑
      console.log("\n🤖 模拟Worker表头识别:");
      const pharmacyTemplate = {
        requiredFields: ["实施人", "零售渠道", "拜访开始时间", "拜访时长"],
      };

      const headerResult = findHeaderRowSimulated(data, pharmacyTemplate);
      if (headerResult.row) {
        console.log(`✅ Worker会识别第${headerResult.index + 1}行为表头`);
        console.log(`匹配分数: ${headerResult.score}`);
        console.log(`数据行数: ${data.length - headerResult.index - 1}`);
      } else {
        console.log(`❌ Worker无法识别表头`);
      }
    });
  } catch (error) {
    console.error("❌ 分析文件时出错:", error);
  }
}

// 模拟Worker中的表头识别逻辑
function findHeaderRowSimulated(data, template) {
  const requiredFields = template.requiredFields || [];
  let bestMatch = { row: null, index: 0, score: 0 };

  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // 清洗表头
    const cleanHeaders = row.map((h) =>
      String(h || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "")
    );

    // 计算匹配分数
    let score = 0;
    const nonEmptyCount = cleanHeaders.filter((h) => h.length > 0).length;

    score += nonEmptyCount * 0.1;

    // 必填字段匹配分
    for (const required of requiredFields) {
      const found = cleanHeaders.some((header) => {
        if (header === required) return true;
        if (header.includes(required) || required.includes(header)) return true;
        return calculateSimilarity(header, required) > 0.8;
      });
      if (found) score += 10;
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
    if (hasTypicalHeaders) score += 5;

    if (score > bestMatch.score && nonEmptyCount >= 3) {
      bestMatch = { row, index: i, score };
    }
  }

  return bestMatch;
}

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

// 运行分析
console.log("🚀 开始分析真实的药店拜访记录文件...\n");
analyzeRealFile();
console.log("\n✅ 分析完成！");
