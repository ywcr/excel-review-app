const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// 分析Excel文件的函数
function analyzeExcelFile(filePath) {
  console.log(`\n=== 分析文件: ${path.basename(filePath)} ===`);

  try {
    // 获取文件信息
    const stats = fs.statSync(filePath);
    console.log(`文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    // 读取Excel文件
    const workbook = XLSX.readFile(filePath);

    console.log(`工作表数量: ${workbook.SheetNames.length}`);
    console.log(`工作表名称: ${workbook.SheetNames.join(", ")}`);

    // 分析每个工作表
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n--- 工作表 ${index + 1}: ${sheetName} ---`);

      try {
        const worksheet = workbook.Sheets[sheetName];

        // 获取工作表范围
        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:A1");
        const rowCount = range.e.r + 1;
        const colCount = range.e.c + 1;

        console.log(`数据范围: ${worksheet["!ref"] || "空"}`);
        console.log(`行数: ${rowCount}`);
        console.log(`列数: ${colCount}`);

        // 检查是否有合并单元格
        if (worksheet["!merges"]) {
          console.log(`合并单元格数量: ${worksheet["!merges"].length}`);
        }

        // 检查是否有图片或其他对象
        if (worksheet["!drawings"]) {
          console.log(`图片/绘图对象: 存在`);
        }

        // 转换为JSON来检查数据量
        try {
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          console.log(`实际数据行数: ${data.length}`);

          // 检查数据密度
          let nonEmptyRows = 0;
          let totalCells = 0;
          let nonEmptyCells = 0;

          data.forEach((row) => {
            if (row && row.length > 0) {
              const hasData = row.some(
                (cell) => cell !== undefined && cell !== null && cell !== ""
              );
              if (hasData) nonEmptyRows++;

              row.forEach((cell) => {
                totalCells++;
                if (cell !== undefined && cell !== null && cell !== "") {
                  nonEmptyCells++;
                }
              });
            }
          });

          console.log(`非空行数: ${nonEmptyRows}`);
          console.log(
            `数据密度: ${((nonEmptyCells / totalCells) * 100).toFixed(2)}%`
          );

          // 检查是否超过处理限制
          if (data.length > 50000) {
            console.log(
              `⚠️  警告: 数据行数 (${data.length}) 超过系统限制 (50,000 行)`
            );
          }
        } catch (dataError) {
          console.log(`❌ 数据转换失败: ${dataError.message}`);
        }
      } catch (sheetError) {
        console.log(`❌ 工作表分析失败: ${sheetError.message}`);
      }
    });
  } catch (error) {
    console.log(`❌ 文件分析失败: ${error.message}`);
  }
}

// 分析三个文件
const file1 = "public/data/8月盛邦药店拜访记录.xlsx";
const file2 = "public/data/李燕拜访.xlsx";
const file3 = "public/data/隆德济生药店拜访2509.xlsx";

console.log("Excel文件分析报告");
console.log("==================");

analyzeExcelFile(file1);
analyzeExcelFile(file2);
analyzeExcelFile(file3);

console.log("\n=== 总结 ===");
console.log("请检查以上分析结果，特别关注：");
console.log("1. 文件大小差异");
console.log("2. 数据行数是否超过50,000行限制");
console.log("3. 工作表结构差异");
console.log("4. 数据密度和复杂度");
