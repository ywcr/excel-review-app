#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const testFile = path.join(__dirname, '../public/data/李燕拜访.xlsx');
const buffer = fs.readFileSync(testFile);

console.log('寻找正确的XLSX读取选项...\n');

const testCases = [
  {
    name: '默认选项',
    options: { type: 'buffer' }
  },
  {
    name: '只设置type',
    options: { type: 'array' }
  },
  {
    name: '常用选项组合1',
    options: {
      type: 'buffer',
      cellDates: true,
      raw: false
    }
  },
  {
    name: '常用选项组合2',
    options: {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false
    }
  },
  {
    name: '移除所有book选项',
    options: {
      type: 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false,
      dense: false,
      sheetStubs: false
    }
  },
  {
    name: '只指定sheets',
    options: {
      type: 'buffer',
      sheets: ['Sheet1']
    }
  },
  {
    name: 'sheets + 基本选项',
    options: {
      type: 'buffer',
      sheets: ['Sheet1'],
      cellDates: true
    }
  },
  {
    name: 'sheets + 所有选项',
    options: {
      type: 'buffer',
      sheets: ['Sheet1'],
      cellDates: true,
      cellNF: false,
      cellText: false,
      dense: false,
      sheetStubs: false,
      raw: false
    }
  }
];

testCases.forEach((test, index) => {
  console.log(`\n测试 ${index + 1}: ${test.name}`);
  console.log('选项:', JSON.stringify(test.options));
  
  try {
    const arrayBuffer = test.options.type === 'array' ? new Uint8Array(buffer).buffer : buffer;
    const wb = XLSX.read(arrayBuffer, test.options);
    
    console.log('✅ 成功');
    console.log('  SheetNames:', wb.SheetNames);
    console.log('  Sheets存在:', !!wb.Sheets);
    
    if (wb.Sheets) {
      console.log('  工作表数量:', Object.keys(wb.Sheets).length);
      console.log('  Sheet1存在:', !!wb.Sheets['Sheet1']);
      
      if (wb.Sheets['Sheet1']) {
        const sheet = wb.Sheets['Sheet1'];
        console.log('  Sheet1 ref:', sheet['!ref'] || '无');
        
        // 尝试读取A1单元格
        if (sheet.A1) {
          console.log('  A1单元格:', sheet.A1.v || sheet.A1);
        }
      }
    }
  } catch (error) {
    console.log('❌ 失败:', error.message);
  }
});

console.log('\n\n结论：查找能正确加载Sheet1内容的选项组合');