// Test script to verify sheet filtering functionality
console.log("🧪 测试工作表图片过滤功能");

// Mock test to verify the logic
function testSheetFiltering() {
  console.log("\n=== 测试场景 1: 无选择工作表 ===");
  const allSheets = ["Sheet1", "医院拜访数据", "备注"];
  const selectedSheet = null;
  
  const sheetsToProcess = selectedSheet 
    ? allSheets.filter(sheet => sheet === selectedSheet)
    : allSheets;
    
  console.log(`输入: 所有工作表 = ${JSON.stringify(allSheets)}`);
  console.log(`输入: 选择工作表 = ${selectedSheet}`);
  console.log(`结果: 处理工作表 = ${JSON.stringify(sheetsToProcess)}`);
  console.log(`✅ 预期: 处理所有工作表 - ${sheetsToProcess.length === 3 ? "通过" : "失败"}`);

  console.log("\n=== 测试场景 2: 选择特定工作表 ===");
  const selectedSheet2 = "医院拜访数据";
  const sheetsToProcess2 = selectedSheet2 
    ? allSheets.filter(sheet => sheet === selectedSheet2)
    : allSheets;
    
  console.log(`输入: 所有工作表 = ${JSON.stringify(allSheets)}`);
  console.log(`输入: 选择工作表 = ${selectedSheet2}`);
  console.log(`结果: 处理工作表 = ${JSON.stringify(sheetsToProcess2)}`);
  console.log(`✅ 预期: 仅处理选择的工作表 - ${sheetsToProcess2.length === 1 && sheetsToProcess2[0] === selectedSheet2 ? "通过" : "失败"}`);

  console.log("\n=== 测试场景 3: 选择不存在的工作表 ===");
  const selectedSheet3 = "不存在的工作表";
  const sheetsToProcess3 = selectedSheet3 
    ? allSheets.filter(sheet => sheet === selectedSheet3)
    : allSheets;
    
  console.log(`输入: 所有工作表 = ${JSON.stringify(allSheets)}`);
  console.log(`输入: 选择工作表 = ${selectedSheet3}`);
  console.log(`结果: 处理工作表 = ${JSON.stringify(sheetsToProcess3)}`);
  console.log(`✅ 预期: 无工作表被处理 - ${sheetsToProcess3.length === 0 ? "通过" : "失败"}`);
}

// Mock test for sheet file name mapping
function testSheetFileMapping() {
  console.log("\n=== 测试工作表文件名映射 ===");
  
  // Mock workbook.xml content
  const mockWorkbookXml = `
    <workbook>
      <sheets>
        <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
        <sheet name="医院拜访数据" sheetId="2" r:id="rId2"/>
        <sheet name="备注" sheetId="3" r:id="rId3"/>
      </sheets>
    </workbook>
  `;
  
  // Mock function to extract sheet file name
  function getSheetFileName(sheetName, xmlContent) {
    const sheetRegex = new RegExp(`<sheet[^>]*name="${sheetName}"[^>]*sheetId="([^"]*)"`, 'i');
    const match = xmlContent.match(sheetRegex);
    return match ? `sheet${match[1]}.xml` : null;
  }
  
  const testCases = [
    { sheetName: "Sheet1", expected: "sheet1.xml" },
    { sheetName: "医院拜访数据", expected: "sheet2.xml" },
    { sheetName: "备注", expected: "sheet3.xml" },
    { sheetName: "不存在", expected: null }
  ];
  
  testCases.forEach(({ sheetName, expected }) => {
    const result = getSheetFileName(sheetName, mockWorkbookXml);
    const passed = result === expected;
    console.log(`工作表 "${sheetName}" -> ${result} (预期: ${expected}) - ${passed ? "✅ 通过" : "❌ 失败"}`);
  });
}

// Run tests
testSheetFiltering();
testSheetFileMapping();

console.log("\n🎉 测试完成！");
