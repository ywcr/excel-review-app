// 表头识别稳定性回归测试
const XLSX = require("xlsx");

// 模拟 validation-worker.js 中的表头识别逻辑
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

  console.log("🔍 表头识别测试 - 必填字段:", requiredFields);

  // 扫描前5行，寻找最匹配的表头行
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) {
      console.log(`第${i + 1}行: 空行，跳过`);
      continue;
    }

    // 清洗表头（去除换行、多余空格） - 与worker逻辑一致
    const cleanHeaders = row.map((h) =>
      String(h || "")
        .trim()
        .replace(/\n/g, "")
        .replace(/\s+/g, "")
    );

    console.log(`\n===== 第${i + 1}行分析 =====`);
    console.log("原始表头:", row.slice(0, 10));
    console.log("清洗后表头:", cleanHeaders.slice(0, 10));

    // 计算匹配分数
    let score = 0;
    const nonEmptyCount = cleanHeaders.filter((h) => h.length > 0).length;

    // 基础分：非空字段数量
    score += nonEmptyCount * 0.1;
    console.log(
      `非空字段数: ${nonEmptyCount}, 基础分: ${(nonEmptyCount * 0.1).toFixed(
        1
      )}`
    );

    // 必填字段匹配分
    let matchedFields = 0;
    const matchDetails = [];

    for (const required of requiredFields) {
      let matchType = null;
      let matchedHeader = null;

      const found = cleanHeaders.some((header) => {
        // 精确匹配
        if (header === required) {
          matchType = "精确匹配";
          matchedHeader = header;
          return true;
        }
        // 包含匹配
        if (header.includes(required) || required.includes(header)) {
          matchType = "包含匹配";
          matchedHeader = header;
          return true;
        }
        // 相似度匹配
        const similarity = calculateSimilarity(header, required);
        if (similarity > 0.8) {
          matchType = `相似度匹配(${(similarity * 100).toFixed(1)}%)`;
          matchedHeader = header;
          return true;
        }
        return false;
      });

      if (found) {
        score += 10;
        matchedFields++;
        matchDetails.push(`✓ ${required} -> ${matchedHeader} (${matchType})`);
      } else {
        matchDetails.push(`✗ ${required} (未匹配)`);
      }
    }

    matchDetails.forEach((detail) => console.log(`  ${detail}`));

    // 典型表头特征分
    const typicalKeywords = [
      "实施",
      "对接",
      "时间",
      "姓名",
      "机构",
      "渠道",
      "科室",
      "地址",
      "类型",
      "时长",
    ];
    const hasTypicalHeaders = cleanHeaders.some((header) =>
      typicalKeywords.some((keyword) => header.includes(keyword))
    );
    if (hasTypicalHeaders) {
      score += 5;
      console.log("典型表头特征分: +5");
    }

    console.log(`匹配字段数: ${matchedFields}/${requiredFields.length}`);
    console.log(`总分: ${score.toFixed(1)}`);

    // 更新最佳匹配
    if (score > bestMatch.score && nonEmptyCount >= 3) {
      bestMatch = { row, index: i, score };
      console.log("🎯 新的最佳匹配!");
    }
  }

  console.log(`\n🏆 最终结果:`);
  console.log(`最佳匹配行: 第${bestMatch.index + 1}行`);
  console.log(`最佳分数: ${bestMatch.score.toFixed(1)}`);

  return {
    headerRow: bestMatch.row,
    headerRowIndex: bestMatch.index,
    score: bestMatch.score,
  };
}

function testHeaderCleaningLogic() {
  console.log("\n🧪 表头清洗逻辑测试:");

  const testCases = [
    "实施\n人", // 换行符
    "实施 人", // 空格
    "实施\t人", // Tab
    "  实施人  ", // 前后空格
    "实施\n\n人", // 多个换行
    "实施   人   时间", // 多个空格
    "拜访开始\n时间", // 真实案例
  ];

  testCases.forEach((testCase) => {
    const cleaned = testCase.trim().replace(/\n/g, "").replace(/\s+/g, "");

    console.log(`"${testCase}" -> "${cleaned}"`);
  });
}

function createTestExcelWithHeaders() {
  console.log("\n📝 创建测试Excel文件...");

  const testData = [
    ["8月药店拜访记录表"], // 标题行
    [], // 空行
    [
      // 表头行（含换行符）
      "序号",
      "任务标题",
      "实施\n人",
      "对接人",
      "零售渠道",
      "渠道地址",
      "拜访开始\n时间",
      "拜访时长",
      "拜访事项\n（1）",
      "信息反馈（1）",
      "门头",
      "内部",
    ],
    [
      // 数据行
      1,
      "药店拜访",
      "张三",
      "李四",
      "康华药店",
      "北京市朝阳区xxx路",
      "2024-01-15 09:00",
      80,
      "产品推广",
      "效果良好",
      "图片1",
      "图片2",
    ],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(testData);
  XLSX.utils.book_append_sheet(wb, ws, "药店拜访");

  const filename = "./public/test-files/表头识别测试.xlsx";
  XLSX.writeFile(wb, filename);
  console.log(`测试文件已创建: ${filename}`);

  return filename;
}

async function runRegressionTest() {
  console.log("🚀 表头识别稳定性回归测试");
  console.log("=".repeat(50));

  // 1. 表头清洗逻辑测试
  testHeaderCleaningLogic();

  // 2. 创建测试文件
  const testFile = createTestExcelWithHeaders();

  // 3. 定义测试模板（基于validationRules.ts中的药店拜访模板）
  const template = {
    name: "药店拜访",
    requiredFields: ["实施人", "零售渠道", "拜访开始时间", "拜访时长"],
    sheetNames: ["药店拜访", "Sheet1", "工作表1"],
    fieldMappings: {
      序号: "serialNumber",
      任务标题: "taskTitle",
      实施人: "implementer",
      对接人: "contactPerson",
      零售渠道: "retailChannel",
      渠道地址: "channelAddress",
      拜访开始时间: "visitStartTime",
      拜访时长: "visitDuration",
      "拜访事项（1）": "visitItem1",
      "信息反馈（1）": "feedback1",
      "拜访事项（2）": "visitItem2",
      "信息反馈（2）": "feedback2",
      门头: "storefront",
      内部: "interior",
    },
  };

  console.log("\n📊 测试表头识别逻辑:");

  // 4. 测试表头识别
  const workbook = XLSX.readFile(testFile);
  const sheet = workbook.Sheets["药店拜访"];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const result = findHeaderRow(data, template);

  // 5. 验证结果
  console.log("\n✅ 回归测试结果:");
  console.log(`表头行索引: ${result.headerRowIndex} (期望: 2)`);
  console.log(`匹配分数: ${result.score.toFixed(1)} (期望: >40)`);

  const success = result.headerRowIndex === 2 && result.score > 40;
  console.log(`测试状态: ${success ? "✅ 通过" : "❌ 失败"}`);

  if (!success) {
    console.log("\n🚨 回归测试失败！需要检查表头识别逻辑");
    console.log("期望表头行为第3行（索引2），包含换行符的标准表头");
    process.exit(1);
  }

  console.log("\n🎉 所有回归测试通过！表头识别逻辑稳定可靠");
}

// 运行回归测试
runRegressionTest().catch(console.error);
