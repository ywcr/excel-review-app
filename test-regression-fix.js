const XLSX = require('xlsx');
const fs = require('fs');

// 测试回归问题并找到兼容解决方案
function testRegressionFix() {
  console.log('🔧 测试回归问题并寻找兼容解决方案');
  console.log('=====================================');

  const files = [
    {
      name: '李燕拜访.xlsx',
      path: 'public/data/李燕拜访.xlsx',
      expectedSheet: 'Sheet1',
      issue: '之前无法解析，现在应该可以'
    },
    {
      name: '隆德济生药店拜访2509.xlsx', 
      path: 'public/data/隆德济生药店拜访2509.xlsx',
      expectedSheet: '正常的中文工作表名',
      issue: '之前正常，现在显示数字358'
    }
  ];

  const parseStrategies = [
    {
      name: "原始策略（包含cellNF/cellText）",
      options: {
        type: "array",
        cellDates: true,
        cellNF: false,
        cellText: false,
        dense: false,
        sheetStubs: false,
        bookVBA: false,
        bookSheets: false,
        bookProps: false,
        bookFiles: false,
        bookDeps: false,
        raw: false,
      }
    },
    {
      name: "修复策略（移除cellNF/cellText）",
      options: {
        type: "array",
        cellDates: true,
        // 移除了cellNF和cellText
        dense: false,
        sheetStubs: false,
        bookVBA: false,
        bookSheets: false,
        bookProps: false,
        bookFiles: false,
        bookDeps: false,
        raw: false,
      }
    },
    {
      name: "最简策略",
      options: {
        type: "array",
      }
    },
    {
      name: "buffer类型策略",
      options: {
        type: "buffer",
        cellDates: true,
      }
    }
  ];

  files.forEach(file => {
    console.log(`\n📁 测试文件: ${file.name}`);
    console.log(`期望: ${file.expectedSheet}`);
    console.log(`问题: ${file.issue}`);
    
    if (!fs.existsSync(file.path)) {
      console.log(`❌ 文件不存在: ${file.path}`);
      return;
    }

    const fileBuffer = fs.readFileSync(file.path);
    const fileSizeMB = fileBuffer.length / 1024 / 1024;
    console.log(`文件大小: ${fileSizeMB.toFixed(2)} MB`);

    parseStrategies.forEach((strategy, index) => {
      console.log(`\n  --- 策略${index + 1}: ${strategy.name} ---`);
      try {
        const workbook = XLSX.read(fileBuffer, strategy.options);
        
        console.log(`  ✅ 解析成功`);
        console.log(`  工作表名: ${JSON.stringify(workbook.SheetNames)}`);
        console.log(`  Sheets对象: ${workbook.Sheets ? '存在' : '不存在'}`);
        
        if (workbook.Sheets && workbook.SheetNames.length > 0) {
          const firstSheetName = workbook.SheetNames[0];
          const firstSheet = workbook.Sheets[firstSheetName];
          if (firstSheet) {
            console.log(`  第一个工作表范围: ${firstSheet['!ref'] || '无'}`);
            
            // 检查工作表名是否合理
            if (firstSheetName.match(/^\d+$/)) {
              console.log(`  ⚠️ 警告: 工作表名是纯数字，可能有问题`);
            } else {
              console.log(`  ✅ 工作表名看起来正常`);
            }
          }
        }
        
      } catch (error) {
        console.log(`  ❌ 解析失败: ${error.message}`);
      }
    });
  });

  // 寻找最佳策略
  console.log('\n🎯 寻找最佳兼容策略');
  console.log('====================');
  
  console.log('基于测试结果，我们需要找到一个策略：');
  console.log('1. 能够正确解析李燕拜访.xlsx（不出现Sheets对象为空）');
  console.log('2. 能够正确解析隆德济生药店拜访2509.xlsx（工作表名不是数字）');
  console.log('3. 保持对其他文件的兼容性');
}

// 运行测试
testRegressionFix();
