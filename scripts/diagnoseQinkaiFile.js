#!/usr/bin/env node

/**
 * 诊断秦凯拜访.xlsx文件无法加载的问题
 * 检查文件的各个方面，找出问题根源
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

console.log('🔍 开始诊断秦凯拜访.xlsx文件...\n');

// 文件路径
const filePath = path.join(__dirname, '../public/data/秦凯拜访.xlsx');

// 1. 检查文件是否存在
console.log('1️⃣ 检查文件存在性...');
if (!fs.existsSync(filePath)) {
  console.error('❌ 文件不存在:', filePath);
  process.exit(1);
}
console.log('✅ 文件存在');

// 2. 检查文件大小和权限
console.log('\n2️⃣ 检查文件属性...');
const stats = fs.statSync(filePath);
console.log(`   文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`   可读: ${stats.mode & fs.constants.R_OK ? '✅' : '❌'}`);
console.log(`   最后修改: ${stats.mtime.toLocaleString()}`);

// 3. 尝试不同的读取选项
console.log('\n3️⃣ 尝试不同的XLSX读取选项...');

const testOptions = [
  {
    name: '基础选项（只读工作表名）',
    options: {
      type: 'buffer',
      bookSheets: true
    }
  },
  {
    name: '完整选项（默认）',
    options: {
      type: 'buffer'
    }
  },
  {
    name: '优化选项（跳过样式）',
    options: {
      type: 'buffer',
      cellStyles: false,
      cellNF: false,
      cellDates: true
    }
  },
  {
    name: '最小选项（只读数据）',
    options: {
      type: 'buffer',
      cellStyles: false,
      cellNF: false,
      cellText: false,
      cellDates: false,
      sheetStubs: false,
      bookVBA: false,
      bookProps: false,
      bookSheets: false
    }
  },
  {
    name: '指定工作表选项',
    options: {
      type: 'buffer',
      sheets: ['Sheet1'],
      cellStyles: false
    }
  }
];

const fileBuffer = fs.readFileSync(filePath);

for (const test of testOptions) {
  console.log(`\n   测试: ${test.name}`);
  try {
    const startTime = Date.now();
    const workbook = XLSX.read(fileBuffer, test.options);
    const elapsed = Date.now() - startTime;
    
    console.log(`   ✅ 成功 (耗时: ${elapsed}ms)`);
    console.log(`      工作表: ${workbook.SheetNames.join(', ')}`);
    
    // 尝试访问Sheet1
    if (workbook.SheetNames.includes('Sheet1')) {
      const sheet = workbook.Sheets['Sheet1'];
      if (sheet) {
        console.log('      ✅ Sheet1 可访问');
        const range = sheet['!ref'];
        if (range) {
          console.log(`      数据范围: ${range}`);
        }
      } else {
        console.log('      ❌ Sheet1 存在但无法访问');
      }
    }
  } catch (error) {
    console.log(`   ❌ 失败: ${error.message}`);
    if (error.stack) {
      console.log(`      详细错误:\n${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
  }
}

// 4. 检查文件格式
console.log('\n4️⃣ 检查文件格式...');
const header = fileBuffer.slice(0, 8);
const isZip = header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
const isXLS = header[0] === 0xd0 && header[1] === 0xcf && header[2] === 0x11 && header[3] === 0xe0;

console.log(`   文件头: ${Array.from(header).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
console.log(`   是ZIP格式 (XLSX): ${isZip ? '✅' : '❌'}`);
console.log(`   是OLE格式 (XLS): ${isXLS ? '✅' : '❌'}`);

// 5. 尝试使用流式读取
console.log('\n5️⃣ 尝试流式读取...');
try {
  const stream = XLSX.stream.read(fileBuffer, { type: 'buffer' });
  console.log('   ✅ 流式读取成功');
  console.log(`   工作表数量: ${stream.SheetNames ? stream.SheetNames.length : '未知'}`);
} catch (error) {
  console.log(`   ❌ 流式读取失败: ${error.message}`);
}

// 6. 内存使用情况
console.log('\n6️⃣ 内存使用情况...');
const memUsage = process.memoryUsage();
console.log(`   RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
console.log(`   Heap Total: ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`);

// 7. 尝试分块读取
console.log('\n7️⃣ 尝试读取特定工作表...');
try {
  // 先只读取工作表名
  const wbNames = XLSX.read(fileBuffer, { 
    type: 'buffer', 
    bookSheets: true,
    bookProps: false,
    bookVBA: false
  });
  
  console.log(`   找到工作表: ${wbNames.SheetNames.join(', ')}`);
  
  // 然后只读取Sheet1
  if (wbNames.SheetNames.includes('Sheet1')) {
    console.log('   尝试单独读取Sheet1...');
    const wbSheet1 = XLSX.read(fileBuffer, {
      type: 'buffer',
      sheets: ['Sheet1'],
      cellStyles: false,
      cellNF: false,
      sheetStubs: false
    });
    
    const sheet = wbSheet1.Sheets['Sheet1'];
    if (sheet) {
      console.log('   ✅ Sheet1 读取成功');
      
      // 尝试获取一些基本信息
      const ref = sheet['!ref'];
      if (ref) {
        const range = XLSX.utils.decode_range(ref);
        console.log(`   行数: ${range.e.r - range.s.r + 1}`);
        console.log(`   列数: ${range.e.c - range.s.c + 1}`);
      }
    }
  }
} catch (error) {
  console.log(`   ❌ 分块读取失败: ${error.message}`);
}

// 8. 建议
console.log('\n💡 诊断建议:');
console.log('1. 如果文件超过500MB，可能需要增加Node.js内存限制');
console.log('   运行: NODE_OPTIONS="--max-old-space-size=4096" node <script>');
console.log('2. 考虑使用streaming API处理大文件');
console.log('3. 检查文件是否被其他程序占用或损坏');
console.log('4. 尝试用Excel/WPS重新保存文件');

console.log('\n✅ 诊断完成');