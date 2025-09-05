// 分析模板总汇.xlsx中的药店拜访工作表
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

function analyzePharmacySheet() {
  const templatePath = path.join(__dirname, "../public/data/模板总汇.xlsx");

  if (!fs.existsSync(templatePath)) {
    console.error("❌ 模板文件不存在！");
    return;
  }

  try {
    const buffer = fs.readFileSync(templatePath);
    const workbook = XLSX.read(buffer, { type: "buffer" });

    console.log("📊 所有工作表:");
    workbook.SheetNames.forEach((name, index) => {
      console.log(`  ${index + 1}. "${name}"`);
    });

    // 查找药店拜访相关的工作表
    const pharmacySheets = workbook.SheetNames.filter(
      (name) =>
        name.includes("药店") || name.includes("拜访") || name.includes("摆放")
    );

    console.log("\n🎯 药店相关工作表:");
    pharmacySheets.forEach((name) => {
      console.log(`  - "${name}"`);
    });

    // 分析每个相关工作表
    pharmacySheets.forEach((sheetName) => {
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
                  ? `"${cell.substring(0, 15)}${cell.length > 15 ? "..." : ""}"`
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
            str.includes("时长")
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

      // 检查是否有数据行
      let dataRowStart = -1;
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
              str !== "任务标题"
            );
          });
          if (hasData) {
            dataRowStart = i;
            break;
          }
        }
      }

      if (dataRowStart >= 0) {
        console.log(`\n📊 数据行从第${dataRowStart + 1}行开始`);
        console.log(`数据行示例:`, data[dataRowStart].slice(0, 8));
      } else {
        console.log("\n❌ 未找到数据行");
      }
    });
  } catch (error) {
    console.error("❌ 分析模板文件时出错:", error);
  }
}

// 运行分析
console.log("🚀 开始分析模板总汇.xlsx中的药店拜访工作表...\n");
analyzePharmacySheet();
console.log("\n✅ 分析完成！");
