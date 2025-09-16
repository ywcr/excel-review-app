const XLSX = require('xlsx');
const fs = require('fs');

// 模拟前端处理过程
function testFileProcessing(filePath) {
  console.log(`\n=== 测试文件处理: ${filePath} ===`);
  
  try {
    // 1. 读取文件为Buffer（模拟前端File.arrayBuffer()）
    console.log('步骤1: 读取文件...');
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`✅ 文件读取成功，大小: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // 2. 模拟前端的XLSX.read操作（只解析工作表信息）
    console.log('步骤2: 解析工作表信息...');
    let workbook;
    try {
      workbook = XLSX.read(fileBuffer, {
        type: "buffer",
        bookSheets: true, // 只解析工作表信息
        bookVBA: false,
        bookProps: false,
        bookFiles: false,
        bookDeps: false,
      });
      console.log(`✅ 工作表解析成功，找到 ${workbook.SheetNames.length} 个工作表`);
    } catch (error) {
      if (error.message && error.message.includes("Invalid array length")) {
        console.log(`❌ 解析失败: Excel 文件格式复杂，请尝试减少数据行数或简化工作表内容`);
        return false;
      }
      console.log(`❌ 解析失败: ${error.message}`);
      return false;
    }
    
    // 3. 选择第一个工作表进行详细解析
    console.log('步骤3: 解析工作表数据...');
    const firstSheetName = workbook.SheetNames[0];
    console.log(`选择工作表: ${firstSheetName}`);
    
    try {
      // 重新读取完整工作表数据
      const fullWorkbook = XLSX.read(fileBuffer, { type: "buffer" });
      const worksheet = fullWorkbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        console.log(`❌ 工作表 "${firstSheetName}" 不存在`);
        return false;
      }
      
      // 4. 转换为JSON数据（模拟前端处理）
      console.log('步骤4: 转换数据格式...');
      let data;
      try {
        data = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "", // 空单元格使用空字符串
          raw: false, // 不保留原始值
          dateNF: "yyyy-mm-dd", // 标准化日期格式
        });
        console.log(`✅ 数据转换成功，共 ${data.length} 行`);
      } catch (error) {
        if (error.message && error.message.includes("Invalid array length")) {
          console.log(`❌ 数据转换失败: 工作表数据过大，请减少数据行数或简化内容`);
          return false;
        }
        console.log(`❌ 数据转换失败: ${error.message}`);
        return false;
      }
      
      // 5. 检查数据行数限制
      console.log('步骤5: 检查数据限制...');
      if (data.length === 0) {
        console.log(`❌ 工作表为空`);
        return false;
      }
      
      if (data.length > 50000) {
        console.log(`❌ 数据行数过多 (${data.length} 行)，请减少到 50,000 行以内`);
        return false;
      }
      
      console.log(`✅ 数据行数检查通过: ${data.length} 行`);
      
      // 6. 内存使用估算
      console.log('步骤6: 内存使用分析...');
      const memoryUsage = process.memoryUsage();
      console.log(`当前内存使用: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`堆内存总量: ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
      
      // 7. 模拟图片提取（检查是否有图片相关内容）
      console.log('步骤7: 检查图片内容...');
      try {
        // 检查文件是否为ZIP格式（.xlsx）
        const u8 = new Uint8Array(fileBuffer.slice(0, 4));
        const isZip = u8.length === 4 && u8[0] === 0x50 && u8[1] === 0x4b && u8[2] === 0x03 && u8[3] === 0x04;
        
        if (isZip) {
          console.log(`✅ 文件格式: 标准 .xlsx (ZIP) 格式`);
          // 这里可以进一步检查ZIP内容，但为了简化就不做了
        } else {
          console.log(`⚠️  文件格式: 可能是 .xls 格式，图片验证可能受限`);
        }
      } catch (error) {
        console.log(`⚠️  图片检查失败: ${error.message}`);
      }
      
      console.log(`\n🎉 文件处理测试完成 - 成功！`);
      return true;
      
    } catch (error) {
      console.log(`❌ 工作表处理失败: ${error.message}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ 文件处理失败: ${error.message}`);
    return false;
  }
}

// 测试两个文件
const file1 = 'public/data/8月盛邦药店拜访记录.xlsx';
const file2 = 'public/data/李燕拜访.xlsx';

console.log('Excel文件处理测试');
console.log('==================');

const result1 = testFileProcessing(file1);
const result2 = testFileProcessing(file2);

console.log('\n=== 测试结果总结 ===');
console.log(`文件A (8月盛邦药店拜访记录.xlsx): ${result1 ? '✅ 成功' : '❌ 失败'}`);
console.log(`文件B (李燕拜访.xlsx): ${result2 ? '✅ 成功' : '❌ 失败'}`);

if (!result2) {
  console.log('\n🔧 建议的解决方案:');
  console.log('1. 检查文件B是否包含过多高分辨率图片');
  console.log('2. 尝试另存为新的.xlsx文件以优化格式');
  console.log('3. 减少文件中的图片数量或降低图片分辨率');
  console.log('4. 检查是否有复杂的格式或嵌入对象');
}
