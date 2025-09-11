const fs = require("fs");
const JSZip = require("jszip");
const path = require("path");

async function analyzeDISPIMGFormulas() {
  const file1Path = path.resolve(
    __dirname,
    "../public/data/8月盛邦药店拜访记录(2).xlsx"
  );
  const file2Path = path.resolve(
    __dirname,
    "../public/data/8月盛邦药店拜访记录(11111111).xlsx"
  );

  console.log("🔍 深入分析DISPIMG公式的位置映射\n");

  const files = [
    {
      path: file1Path,
      name: "8月盛邦药店拜访记录(2).xlsx",
      shortName: "file1",
    },
    {
      path: file2Path,
      name: "8月盛邦药店拜访记录(11111111).xlsx",
      shortName: "file2",
    },
  ];

  const analysisResults = [];

  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      console.error(`❌ 文件不存在: ${file.path}`);
      continue;
    }

    console.log(`\n📄 分析文件: ${file.name}`);
    console.log("=".repeat(60));

    try {
      const buffer = fs.readFileSync(file.path);
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(buffer);

      const worksheetXml = await zipContent
        .file("xl/worksheets/sheet1.xml")
        ?.async("text");
      if (!worksheetXml) {
        console.log("❌ 无法读取工作表文件");
        continue;
      }

      console.log("🔍 分析DISPIMG公式位置...");
      console.log(`📄 工作表XML大小: ${worksheetXml.length} 字符`);

      // 先快速检查是否包含DISPIMG
      const quickCheck = worksheetXml.includes("DISPIMG");
      console.log(`🔍 快速检查包含DISPIMG: ${quickCheck}`);

      // 查找所有DISPIMG公式及其位置
      const formulaPositions = [];
      const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
      let match;
      let cellCount = 0;

      while ((match = cellRegex.exec(worksheetXml)) !== null) {
        cellCount++;
        if (cellCount <= 5) {
          console.log(`🔍 处理单元格 ${cellCount}: ${match[1]}`);
        }
        const cellRef = match[1];
        const cellContent = match[2];

        // 在单元格内容中查找DISPIMG公式
        const formulaMatch = cellContent.match(/<f[^>]*>(.*?DISPIMG.*?)<\/f>/);
        if (formulaMatch) {
          const formula = formulaMatch[1];

          // 提取DISPIMG中的图片ID
          const idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/);
          if (idMatch) {
            formulaPositions.push({
              position: cellRef,
              imageId: idMatch[1],
              formula: formula,
            });
          }
        }
      }

      console.log(`📊 总共处理了 ${cellCount} 个单元格`);
      console.log(`📊 找到 ${formulaPositions.length} 个DISPIMG公式`);

      // 分析位置分布
      const positionStats = {};
      const rowStats = {};
      const columnStats = {};

      formulaPositions.forEach((item) => {
        // 统计位置
        positionStats[item.position] = (positionStats[item.position] || 0) + 1;

        // 解析行列
        const cellMatch = item.position.match(/^([A-Z]+)(\d+)$/);
        if (cellMatch) {
          const column = cellMatch[1];
          const row = parseInt(cellMatch[2]);

          rowStats[row] = (rowStats[row] || 0) + 1;
          columnStats[column] = (columnStats[column] || 0) + 1;
        }
      });

      console.log("\n📍 位置分布统计:");

      // 显示前10个最常见的位置
      const topPositions = Object.entries(positionStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      console.log("  前10个位置:");
      topPositions.forEach(([pos, count]) => {
        console.log(`    ${pos}: ${count}次`);
      });

      // 行分布
      const rowEntries = Object.entries(rowStats).sort(
        ([a], [b]) => parseInt(a) - parseInt(b)
      );
      console.log("\n📏 行分布:");
      console.log(
        `  行数范围: ${Math.min(
          ...Object.keys(rowStats).map(Number)
        )} - ${Math.max(...Object.keys(rowStats).map(Number))}`
      );
      console.log("  前10行:");
      rowEntries.slice(0, 10).forEach(([row, count]) => {
        console.log(`    第${row}行: ${count}个公式`);
      });

      // 列分布
      console.log("\n📐 列分布:");
      const columnEntries = Object.entries(columnStats).sort();
      console.log("  涉及的列:");
      columnEntries.forEach(([col, count]) => {
        console.log(`    列${col}: ${count}个公式`);
      });

      // 检查是否所有公式都在A1
      const allInA1 = formulaPositions.every((item) => item.position === "A1");
      if (allInA1) {
        console.log("\n⚠️ 警告: 所有DISPIMG公式都在A1位置！");
        console.log("   这可能导致位置映射失败");
      } else {
        console.log("\n✅ DISPIMG公式分布在不同位置");
      }

      // 显示前5个公式的详细信息
      console.log("\n🔍 前5个公式详情:");
      formulaPositions.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. 位置: ${item.position}`);
        console.log(`     图片ID: ${item.imageId}`);
        console.log(`     公式: ${item.formula.substring(0, 80)}...`);
      });

      analysisResults.push({
        fileName: file.shortName,
        fullName: file.name,
        totalFormulas: formulaPositions.length,
        allInA1: allInA1,
        positionCount: Object.keys(positionStats).length,
        rowRange:
          rowEntries.length > 0
            ? {
                min: Math.min(...Object.keys(rowStats).map(Number)),
                max: Math.max(...Object.keys(rowStats).map(Number)),
              }
            : null,
        columns: Object.keys(columnStats),
        samplePositions: formulaPositions.slice(0, 5).map((item) => ({
          position: item.position,
          imageId: item.imageId,
        })),
      });
    } catch (error) {
      console.error(`❌ 分析失败: ${file.name}`, error.message);
    }
  }

  // 对比分析
  if (analysisResults.length === 2) {
    console.log("\n\n🔄 对比分析");
    console.log("=".repeat(60));

    const [result1, result2] = analysisResults;

    console.log("\n📊 关键差异:");

    console.log(`\n${result1.fullName}:`);
    console.log(`  公式总数: ${result1.totalFormulas}`);
    console.log(`  不同位置数: ${result1.positionCount}`);
    console.log(`  全部在A1: ${result1.allInA1 ? "是" : "否"}`);
    if (result1.rowRange) {
      console.log(
        `  行范围: ${result1.rowRange.min} - ${result1.rowRange.max}`
      );
    }
    console.log(`  涉及列: ${result1.columns.join(", ")}`);

    console.log(`\n${result2.fullName}:`);
    console.log(`  公式总数: ${result2.totalFormulas}`);
    console.log(`  不同位置数: ${result2.positionCount}`);
    console.log(`  全部在A1: ${result2.allInA1 ? "是" : "否"}`);
    if (result2.rowRange) {
      console.log(
        `  行范围: ${result2.rowRange.min} - ${result2.rowRange.max}`
      );
    }
    console.log(`  涉及列: ${result2.columns.join(", ")}`);

    console.log("\n🎯 问题诊断:");

    if (result1.allInA1 && !result2.allInA1) {
      console.log(`❌ ${result1.fullName} 的所有DISPIMG公式都在A1位置`);
      console.log("   这会导致位置映射失败，因为无法确定图片的实际位置");
      console.log('   Worker会跳过这些图片，显示"未找到位置映射"');
    } else if (!result1.allInA1 && result2.allInA1) {
      console.log(`❌ ${result2.fullName} 的所有DISPIMG公式都在A1位置`);
      console.log("   这会导致位置映射失败，因为无法确定图片的实际位置");
      console.log('   Worker会跳过这些图片，显示"未找到位置映射"');
    } else if (result1.allInA1 && result2.allInA1) {
      console.log("❌ 两个文件的DISPIMG公式都在A1位置");
      console.log("   这表明可能是Excel文件格式或生成方式的问题");
    } else {
      console.log("✅ 两个文件的DISPIMG公式都有正确的位置分布");
      console.log("   位置映射失败可能是其他原因");
    }

    console.log("\n💡 解决建议:");
    if (result1.allInA1 || result2.allInA1) {
      console.log("1. 检查Excel文件是否正确保存了图片位置信息");
      console.log("2. 尝试重新插入图片并保存文件");
      console.log("3. 确认使用的是WPS Office或兼容的Excel版本");
      console.log("4. 考虑使用备用的位置估算方法");
    }
  }

  console.log("\n✅ 分析完成！");
}

analyzeDISPIMGFormulas().catch(console.error);
