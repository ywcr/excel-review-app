const fs = require("fs");
const JSZip = require("jszip");
const path = require("path");

async function testWorkerDISPIMG() {
  const filePath = path.resolve(
    __dirname,
    "../public/data/8月盛邦药店拜访记录(2).xlsx"
  );

  console.log("🔍 测试Worker的DISPIMG解析逻辑\n");

  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`);
    return;
  }

  try {
    const buffer = fs.readFileSync(filePath);
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(buffer);

    // 模拟Worker的getPositionFromDISPIMGWorker函数
    async function getPositionFromDISPIMGWorker(
      dispimgId,
      zipContent,
      selectedSheet = null
    ) {
      try {
        console.log(`🔍 Worker查找DISPIMG公式中的图片ID: ${dispimgId}`);
        if (selectedSheet) {
          console.log(`🎯 Worker只在工作表 "${selectedSheet}" 中查找`);
        }

        // 查找工作表文件
        let worksheetFiles = Object.keys(zipContent.files).filter(
          (name) => name.startsWith("xl/worksheets/") && name.endsWith(".xml")
        );

        console.log(`📄 找到工作表文件: ${worksheetFiles.join(", ")}`);

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

                console.log(
                  `📋 找到工作表: ${sheetName} (sheetId: ${sheetId}, rId: ${rId})`
                );

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
                      console.log(
                        `🔍 Worker找到工作表映射: ${sheetName} (${rId}) -> ${targetSheetFile}`
                      );
                      break;
                    }
                  }
                }
              }

              if (targetSheetFile) {
                worksheetFiles = worksheetFiles.filter((file) =>
                  file.endsWith(targetSheetFile)
                );
                console.log(
                  `🎯 Worker过滤到目标工作表文件: ${targetSheetFile}`
                );
              } else {
                console.warn(
                  `⚠️ Worker无法找到工作表 "${selectedSheet}" 对应的文件`
                );
              }
            }
          } catch (error) {
            console.warn("Worker获取工作表文件名失败:", error);
          }
        }

        const allPositions = [];

        for (const worksheetFile of worksheetFiles) {
          console.log(`🔍 搜索工作表文件: ${worksheetFile}`);
          const worksheetXml = await zipContent
            .file(worksheetFile)
            ?.async("text");
          if (!worksheetXml) {
            console.log(`❌ 无法读取工作表文件: ${worksheetFile}`);
            continue;
          }

          console.log(`📄 工作表XML大小: ${worksheetXml.length} 字符`);

          // 查找包含目标dispimgId的DISPIMG公式
          const cellRegex = /<c[^>]*r="([^"]*)"[^>]*>([\s\S]*?)<\/c>/g;
          let match;
          let cellCount = 0;
          let foundCount = 0;

          while ((match = cellRegex.exec(worksheetXml)) !== null) {
            cellCount++;
            const cellRef = match[1];
            const cellContent = match[2];

            // 在单元格内容中查找DISPIMG公式
            const formulaMatch = cellContent.match(
              /<f[^>]*>(.*?DISPIMG.*?)<\/f>/
            );
            if (formulaMatch) {
              const formula = formulaMatch[1];

              // 提取DISPIMG中的图片ID - 支持两种格式：直接双引号和HTML实体编码
              let idMatch = formula.match(/DISPIMG\(&quot;([^&]*?)&quot;,/); // HTML实体编码格式
              if (!idMatch) {
                idMatch = formula.match(/DISPIMG\("([^"]*?)",/); // 直接双引号格式
              }
              if (idMatch) {
                foundCount++;
                if (foundCount <= 3) {
                  console.log(
                    `🔍 找到DISPIMG公式 ${foundCount}: ${cellRef} -> ${idMatch[1]}`
                  );
                }

                if (idMatch[1] === dispimgId) {
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
                        column === "M"
                          ? "门头"
                          : column === "N"
                          ? "内部"
                          : "图片",
                    });
                    console.log(`✅ 匹配到目标ID: ${dispimgId} -> ${cellRef}`);
                  }
                }
              }
            }
          }

          console.log(
            `📊 工作表 ${worksheetFile}: 处理了 ${cellCount} 个单元格，找到 ${foundCount} 个DISPIMG公式`
          );
        }

        if (allPositions.length === 0) {
          console.log(`❌ Worker未找到DISPIMG公式中的图片ID: ${dispimgId}`);
          return null;
        }

        console.log(
          `✅ Worker找到DISPIMG公式位置: ${dispimgId} -> ${allPositions[0].position}`
        );
        return allPositions[0];
      } catch (error) {
        console.error("Worker查找DISPIMG位置失败:", error);
        return null;
      }
    }

    // 测试几个已知的图片ID
    const testIds = [
      "ID_8D9330E6EC914995848A93FBDFEF09E6",
      "ID_C5E0F99FE0854B708B48F6AEC3A06AC9",
    ];

    for (const testId of testIds) {
      console.log(`\n${"=".repeat(60)}`);
      console.log(`测试图片ID: ${testId}`);
      console.log(`${"=".repeat(60)}`);

      // 测试不指定工作表
      console.log("\n🔍 测试1: 不指定工作表");
      const result1 = await getPositionFromDISPIMGWorker(testId, zipContent);
      console.log("结果:", result1);

      // 测试指定工作表
      console.log('\n🔍 测试2: 指定工作表 "药店拜访"');
      const result2 = await getPositionFromDISPIMGWorker(
        testId,
        zipContent,
        "药店拜访"
      );
      console.log("结果:", result2);
    }
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

testWorkerDISPIMG().catch(console.error);
