const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 深度分析Excel文件的内部结构
function deepAnalyzeExcelFile(filePath) {
  console.log(`\n=== 深度分析: ${path.basename(filePath)} ===`);
  
  try {
    // 获取文件信息
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / 1024 / 1024;
    console.log(`文件大小: ${fileSizeMB.toFixed(2)} MB`);
    
    // 读取文件为Buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // 1. 分析ZIP结构（.xlsx是ZIP格式）
    console.log('\n📦 ZIP结构分析:');
    try {
      // 检查ZIP头部
      const zipHeader = fileBuffer.slice(0, 4);
      const isValidZip = zipHeader[0] === 0x50 && zipHeader[1] === 0x4b;
      console.log(`ZIP格式: ${isValidZip ? '✅ 有效' : '❌ 无效'}`);
      
      // 简单的ZIP内容分析
      const zipContent = fileBuffer.toString('binary');
      const mediaCount = (zipContent.match(/xl\/media\//g) || []).length;
      const drawingCount = (zipContent.match(/xl\/drawings\//g) || []).length;
      const sharedStringsSize = zipContent.includes('xl/sharedStrings.xml') ? 
        (zipContent.match(/xl\/sharedStrings\.xml/g) || []).length : 0;
      
      console.log(`媒体文件数量: ${mediaCount}`);
      console.log(`绘图对象数量: ${drawingCount}`);
      console.log(`共享字符串: ${sharedStringsSize > 0 ? '存在' : '不存在'}`);
      
    } catch (error) {
      console.log(`ZIP分析失败: ${error.message}`);
    }
    
    // 2. 解析Excel工作簿
    console.log('\n📋 Excel结构分析:');
    let workbook;
    try {
      workbook = XLSX.read(fileBuffer, { type: "buffer" });
      console.log(`工作表数量: ${workbook.SheetNames.length}`);
      console.log(`工作表名称: ${workbook.SheetNames.join(', ')}`);
    } catch (error) {
      console.log(`Excel解析失败: ${error.message}`);
      return;
    }
    
    // 3. 分析每个工作表
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n--- 工作表 ${index + 1}: ${sheetName} ---`);
      
      try {
        const worksheet = workbook.Sheets[sheetName];
        
        // 基本信息
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const rowCount = range.e.r + 1;
        const colCount = range.e.c + 1;
        
        console.log(`数据范围: ${worksheet['!ref'] || '空'}`);
        console.log(`行数: ${rowCount}, 列数: ${colCount}`);
        
        // 特殊对象分析
        if (worksheet['!merges']) {
          console.log(`合并单元格: ${worksheet['!merges'].length} 个`);
        }
        
        if (worksheet['!drawings']) {
          console.log(`绘图对象: 存在`);
        }
        
        if (worksheet['!images']) {
          console.log(`图片对象: 存在`);
        }
        
        // 数据密度分析
        const cellCount = Object.keys(worksheet).filter(key => !key.startsWith('!')).length;
        const expectedCells = rowCount * colCount;
        const density = expectedCells > 0 ? (cellCount / expectedCells * 100) : 0;
        
        console.log(`实际单元格数: ${cellCount}`);
        console.log(`预期单元格数: ${expectedCells}`);
        console.log(`数据密度: ${density.toFixed(2)}%`);
        
        // 计算每行平均大小
        const avgSizePerRow = fileSizeMB / rowCount;
        console.log(`每行平均大小: ${avgSizePerRow.toFixed(3)} MB`);
        
        // 异常检测
        if (avgSizePerRow > 5) {
          console.log(`⚠️ 警告: 每行数据过大，可能包含大量图片或复杂格式`);
        }
        
        if (density < 50 && cellCount > 1000) {
          console.log(`⚠️ 警告: 数据密度低但单元格数量多，可能存在大量空单元格`);
        }
        
        // 尝试转换数据（测试内存使用）
        console.log('\n🧠 内存使用测试:');
        try {
          const startTime = Date.now();
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          const endTime = Date.now();
          
          console.log(`✅ 数据转换成功`);
          console.log(`转换时间: ${endTime - startTime}ms`);
          console.log(`实际数据行数: ${data.length}`);
          
          // 检查数据复杂度
          let totalCellContent = 0;
          let imageReferences = 0;
          
          data.slice(0, Math.min(10, data.length)).forEach(row => {
            if (Array.isArray(row)) {
              row.forEach(cell => {
                if (cell && typeof cell === 'string') {
                  totalCellContent += cell.length;
                  if (cell.includes('image') || cell.includes('图片') || cell.includes('picture')) {
                    imageReferences++;
                  }
                }
              });
            }
          });
          
          const avgCellContent = totalCellContent / Math.min(10 * colCount, data.length * colCount);
          console.log(`平均单元格内容长度: ${avgCellContent.toFixed(2)} 字符`);
          console.log(`图片引用数量: ${imageReferences}`);
          
        } catch (error) {
          if (error.message && error.message.includes("Invalid array length")) {
            console.log(`❌ 数据转换失败: 数组长度无效 - 文件结构过于复杂`);
          } else if (error.message && error.message.includes("out of memory")) {
            console.log(`❌ 数据转换失败: 内存不足`);
          } else {
            console.log(`❌ 数据转换失败: ${error.message}`);
          }
        }
        
      } catch (error) {
        console.log(`❌ 工作表分析失败: ${error.message}`);
      }
    });
    
    // 4. 处理建议
    console.log('\n💡 处理建议:');
    const avgSizePerRow = fileSizeMB / (workbook.Sheets[workbook.SheetNames[0]] ? 
      XLSX.utils.decode_range(workbook.Sheets[workbook.SheetNames[0]]['!ref'] || 'A1:A1').e.r + 1 : 1);
    
    if (avgSizePerRow > 5) {
      console.log('🔧 建议优化图片和媒体内容');
    }
    if (fileSizeMB > 400) {
      console.log('🔧 建议减少文件大小到400MB以下');
    }
    console.log('🔧 建议另存为新的.xlsx文件以优化格式');
    
  } catch (error) {
    console.log(`❌ 文件分析失败: ${error.message}`);
  }
}

// 分析三个文件
const files = [
  'public/data/8月盛邦药店拜访记录.xlsx',
  'public/data/李燕拜访.xlsx',
  'public/data/隆德济生药店拜访2509.xlsx'
];

console.log('🔬 Excel文件深度分析报告');
console.log('==========================');

files.forEach(file => {
  if (fs.existsSync(file)) {
    deepAnalyzeExcelFile(file);
  } else {
    console.log(`\n❌ 文件不存在: ${file}`);
  }
});

console.log('\n\n📋 分析总结');
console.log('============');
console.log('通过对比分析，我们可以找出：');
console.log('1. 哪个文件的内部结构最复杂');
console.log('2. 图片和媒体内容的差异');
console.log('3. 数据密度和处理难度的关系');
console.log('4. 为什么某些大文件可以处理而某些不行');
