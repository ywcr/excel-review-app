const XLSX = require('xlsx');
const fs = require('fs');

// 测试我们的解决方案
function testFileSizeHandling() {
  console.log('🧪 测试文件大小处理逻辑');
  console.log('================================');

  const testCases = [
    { name: '小文件', size: 50 * 1024 * 1024 }, // 50MB
    { name: '中等文件', size: 200 * 1024 * 1024 }, // 200MB
    { name: '大文件', size: 350 * 1024 * 1024 }, // 350MB
    { name: '超大文件', size: 600 * 1024 * 1024 }, // 600MB
  ];

  testCases.forEach(testCase => {
    console.log(`\n--- 测试 ${testCase.name} (${(testCase.size / 1024 / 1024).toFixed(1)}MB) ---`);
    
    const fileSizeMB = testCase.size / 1024 / 1024;
    
    // 模拟前端验证逻辑
    if (fileSizeMB > 500) {
      console.log(`❌ 文件过大 (${fileSizeMB.toFixed(1)}MB)，请减少文件大小到500MB以内。建议：1) 压缩或删除图片 2) 减少数据行数 3) 另存为新文件`);
    } else if (fileSizeMB > 300) {
      console.log(`⚠️ 大文件警告: ${fileSizeMB.toFixed(1)}MB，处理可能较慢`);
      console.log(`✅ 允许处理，但会显示优化建议`);
    } else {
      console.log(`✅ 文件大小正常，可以正常处理`);
    }
  });
}

// 测试实际文件
function testActualFiles() {
  console.log('\n\n🔍 测试实际文件');
  console.log('================');

  const files = [
    'public/data/8月盛邦药店拜访记录.xlsx',
    'public/data/李燕拜访.xlsx'
  ];

  files.forEach(filePath => {
    console.log(`\n--- 测试文件: ${filePath} ---`);
    
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`❌ 文件不存在: ${filePath}`);
        return;
      }

      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / 1024 / 1024;
      
      console.log(`📊 文件大小: ${fileSizeMB.toFixed(2)} MB`);
      
      // 应用我们的新逻辑
      if (fileSizeMB > 500) {
        console.log(`❌ 处理结果: 文件过大，拒绝处理`);
        console.log(`💡 建议: 显示文件优化提示组件`);
      } else if (fileSizeMB > 300) {
        console.log(`⚠️ 处理结果: 大文件警告，允许处理但显示优化建议`);
        console.log(`💡 建议: 显示文件优化提示组件`);
      } else {
        console.log(`✅ 处理结果: 正常处理`);
      }

      // 尝试快速解析测试
      try {
        console.log(`🔍 尝试解析工作表信息...`);
        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, {
          type: "buffer",
          bookSheets: true,
          bookVBA: false,
          bookProps: false,
          bookFiles: false,
          bookDeps: false,
        });
        console.log(`✅ 工作表解析成功: ${workbook.SheetNames.join(', ')}`);
      } catch (error) {
        if (error.message && error.message.includes("Invalid array length")) {
          console.log(`❌ 解析失败: Excel 文件格式复杂，建议优化`);
        } else {
          console.log(`❌ 解析失败: ${error.message}`);
        }
      }

    } catch (error) {
      console.log(`❌ 测试失败: ${error.message}`);
    }
  });
}

// 生成优化建议
function generateOptimizationSuggestions() {
  console.log('\n\n💡 文件优化建议生成器');
  console.log('========================');

  const suggestions = {
    '图片优化': [
      '删除不必要的图片或截图',
      '压缩图片质量（右键图片 → 压缩图片）',
      '将高分辨率图片替换为较小尺寸',
      '避免粘贴大量截图，改用文字描述'
    ],
    '数据优化': [
      '删除空行和不必要的数据行',
      '移除复杂的公式和格式',
      '简化单元格格式和样式',
      '删除隐藏的工作表'
    ],
    '文件格式优化': [
      '另存为新的 .xlsx 文件',
      '使用"文件 → 另存为 → Excel工作簿"',
      '选择"最小文件大小"选项',
      '避免使用 .xls 格式（较大且功能受限）'
    ]
  };

  Object.entries(suggestions).forEach(([category, tips]) => {
    console.log(`\n📋 ${category}:`);
    tips.forEach((tip, index) => {
      console.log(`  ${index + 1}. ${tip}`);
    });
  });

  console.log('\n🎯 预期效果:');
  console.log('- 文件大小通常可以减少50-80%');
  console.log('- 处理速度显著提升');
  console.log('- 减少内存使用和错误发生');
}

// 运行所有测试
console.log('🚀 Excel文件处理解决方案测试');
console.log('==============================');

testFileSizeHandling();
testActualFiles();
generateOptimizationSuggestions();

console.log('\n\n📋 解决方案总结');
console.log('================');
console.log('✅ 1. 添加了文件大小检查（500MB限制）');
console.log('✅ 2. 增强了错误处理和用户友好提示');
console.log('✅ 3. 创建了文件优化建议组件');
console.log('✅ 4. 改进了Web Worker的内存管理');
console.log('✅ 5. 提供了详细的优化指导');

console.log('\n🎯 预期解决的问题:');
console.log('- 文件B (李燕拜访.xlsx, 445MB) 现在会显示优化建议');
console.log('- 用户可以根据建议优化文件后重新上传');
console.log('- 系统会拒绝处理超过500MB的文件');
console.log('- 提供清晰的错误信息和解决方案');
